import { requireSupabase } from '../supabase'

import {
  MOVEMENT_SELECT,
  PRODUCT_SELECT,
  TABLES,
} from './schema'

import { computeSummary, withStockStatus } from './stockStatus'

function assertBusinessId(businessId) {
  if (!businessId) {
    throw new Error('business_id is required. Sign in and load an owned business first.')
  }
}

function toNumber(value, label) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`)
  }

  return parsed
}

function validateNonNegative(value, label) {
  const parsed = toNumber(value, label)

  if (parsed < 0) {
    throw new Error(`${label} cannot be negative.`)
  }

  return parsed
}

/* -------------------------------------------------------
   LIST PRODUCTS
------------------------------------------------------- */

export async function listProducts(businessId) {
  assertBusinessId(businessId)

  const client = requireSupabase()

  const { data, error } = await client
    .from(TABLES.products)
    .select(PRODUCT_SELECT)
    .eq('business_id', businessId)
    .order('product_name', { ascending: true })

  if (error) throw error

  const products = (data ?? []).map(withStockStatus)

  return {
    products,
    summary: computeSummary(products),
  }
}

/* -------------------------------------------------------
   CREATE PRODUCT
------------------------------------------------------- */

export async function createProduct(businessId, input) {
  assertBusinessId(businessId)

  const productName = String(input.product_name ?? '').trim()
  const sku = String(input.sku ?? '').trim()
  const description = String(input.description ?? '').trim()

  const sellingPrice = validateNonNegative(
    input.selling_price,
    'Selling price'
  )

  const openingStock = validateNonNegative(
    input.opening_stock ?? 0,
    'Opening stock'
  )

  const reorderLevel = validateNonNegative(
    input.reorder_level ?? 0,
    'Reorder level'
  )

  if (!productName) throw new Error('Product name is required.')
  if (!sku) throw new Error('SKU is required.')

  const client = requireSupabase()

  const { data: product, error } = await client
    .from(TABLES.products)
    .insert({
      business_id: businessId,
      product_name: productName,
      sku,
      description: description || null,
      selling_price: sellingPrice,
      stock_quantity: openingStock,
      reorder_level: reorderLevel,
    })
    .select(PRODUCT_SELECT)
    .single()

  if (error) throw error

  if (!product) {
    throw new Error('Product insert did not return a confirmed row.')
  }

  let movementWarning = null

  if (openingStock > 0) {
    const { error: movementError } = await client
      .from(TABLES.inventoryMovements)
      .insert({
        business_id: businessId,
        product_id: product.id,
        movement_type: 'stock_in',
        quantity: openingStock,
        notes: 'Opening stock',
        reference: null,
      })
      .select('id')
      .single()

    if (movementError) {
      movementWarning =
        `Product was created, but the opening stock movement was not recorded: ${movementError.message}.`
    }
  }

  return {
    product: withStockStatus(product),
    movementWarning,
  }
}

/* -------------------------------------------------------
   UPDATE PRODUCT DETAILS
   Stock quantity is intentionally preserved.
------------------------------------------------------- */

export async function updateProduct(businessId, productId, input) {
  assertBusinessId(businessId)

  if (!productId) {
    throw new Error('Product id is required.')
  }

  const productName = String(input.product_name ?? '').trim()
  const sku = String(input.sku ?? '').trim()
  const description = String(input.description ?? '').trim()

  const sellingPrice = validateNonNegative(
    input.selling_price,
    'Selling price'
  )

  const reorderLevel = validateNonNegative(
    input.reorder_level ?? 0,
    'Reorder level'
  )

  if (!productName) throw new Error('Product name is required.')
  if (!sku) throw new Error('SKU is required.')

  const client = requireSupabase()

  const { data: product, error } = await client
    .from(TABLES.products)
    .update({
      product_name: productName,
      sku,
      description: description || null,
      selling_price: sellingPrice,
      reorder_level: reorderLevel,
    })
    .eq('id', productId)
    .eq('business_id', businessId)
    .select(PRODUCT_SELECT)
    .single()

  if (error) throw error

  if (!product) {
    throw new Error('Product update was not confirmed by Supabase.')
  }

  return withStockStatus(product)
}

/* -------------------------------------------------------
   APPLY STOCK CHANGE

   Database requirements:
   - quantity must always be greater than zero
   - movement_type must be stock_in, stock_out, or adjustment

   The product stock quantity is updated first.
   The movement is then recorded.
   If movement recording fails, stock is reverted.
------------------------------------------------------- */

async function applyStockChange({
  businessId,
  productId,
  delta,
  movementType,
  notes,
  reference = null,
}) {
  assertBusinessId(businessId)

  if (!productId) {
    throw new Error('Product id is required.')
  }

  const parsedDelta = toNumber(delta, 'Quantity')

  if (parsedDelta === 0) {
    throw new Error('Quantity change cannot be zero.')
  }

  const client = requireSupabase()

  const { data: current, error: readError } = await client
    .from(TABLES.products)
    .select(PRODUCT_SELECT)
    .eq('id', productId)
    .eq('business_id', businessId)
    .single()

  if (readError) throw readError

  if (!current) {
    throw new Error('Product was not found for this business.')
  }

  const currentQty = Number(current.stock_quantity) || 0
  const nextQty = currentQty + parsedDelta

  if (nextQty < 0) {
    throw new Error(
      `Insufficient stock. Current available stock is ${currentQty}.`
    )
  }

  /* Update product stock with an optimistic quantity check */

  const { data: updated, error: updateError } = await client
    .from(TABLES.products)
    .update({ stock_quantity: nextQty })
    .eq('id', productId)
    .eq('business_id', businessId)
    .eq('stock_quantity', currentQty)
    .select(PRODUCT_SELECT)
    .maybeSingle()

  if (updateError) throw updateError

  if (!updated) {
    throw new Error(
      'Stock changed while saving. Refresh and try again.'
    )
  }

  /* IMPORTANT:
     The database requires quantity > 0.
     Therefore we record the absolute quantity, never a negative value.
  */

  const movementQuantity = Math.abs(parsedDelta)

  const { data: movement, error: movementError } = await client
    .from(TABLES.inventoryMovements)
    .insert({
      business_id: businessId,
      product_id: productId,
      movement_type: movementType,
      quantity: movementQuantity,
      notes: notes || null,
      reference: reference || null,
    })
    .select(MOVEMENT_SELECT)
    .single()

  /* If movement recording fails, attempt to restore original stock */

  if (movementError) {
    const { data: reverted, error: revertError } = await client
      .from(TABLES.products)
      .update({ stock_quantity: currentQty })
      .eq('id', productId)
      .eq('business_id', businessId)
      .eq('stock_quantity', nextQty)
      .select('id')
      .maybeSingle()

    if (revertError || !reverted) {
      throw new Error(
        `Stock was updated but the movement failed (${movementError.message}). ` +
        'Automatic rollback also failed. Please verify the product stock manually.'
      )
    }

    throw new Error(
      `Inventory movement was not recorded (${movementError.message}). ` +
      'Stock change was reverted.'
    )
  }

  if (!movement) {
    throw new Error('Movement insert did not return a confirmed row.')
  }

  return {
    product: withStockStatus(updated),
    movement,
    atomicityNote:
      'Stock and movement were confirmed in separate requests. A database RPC would provide stronger atomicity.',
  }
}

/* -------------------------------------------------------
   RECEIVE STOCK
------------------------------------------------------- */

export async function receiveStock(
  businessId,
  productId,
  quantity,
  notes
) {
  const qty = validateNonNegative(quantity, 'Received quantity')

  if (qty === 0) {
    throw new Error('Received quantity must be greater than zero.')
  }

  return applyStockChange({
    businessId,
    productId,
    delta: qty,
    movementType: 'stock_in',
    notes: notes?.trim() || 'Stock received',
  })
}

/* -------------------------------------------------------
   ADJUST STOCK

   Normal manual adjustments are recorded as "adjustment".
   Sales are recognized by their sale reference and recorded
   as "stock_out".

   Quantity is always stored as a positive number.
------------------------------------------------------- */

export async function adjustStock(
  businessId,
  productId,
  quantityDelta,
  reason
) {
  const reasonText = String(reason ?? '').trim()

  if (!reasonText) {
    throw new Error('A reason is required for stock adjustments.')
  }

  const delta = toNumber(quantityDelta, 'Adjustment quantity')

  if (delta === 0) {
    throw new Error('Adjustment quantity cannot be zero.')
  }

  const isSale = /^sale\b/i.test(reasonText)

  let movementType = 'adjustment'

  if (isSale) {
    movementType = 'stock_out'
  }

  return applyStockChange({
    businessId,
    productId,
    delta,
    movementType,
    notes: reasonText,
  })
}

/* -------------------------------------------------------
   LIST INVENTORY MOVEMENTS
------------------------------------------------------- */

export async function listMovements(
  businessId,
  { productId, limit = 50 } = {}
) {
  assertBusinessId(businessId)

  const client = requireSupabase()

  let query = client
    .from(TABLES.inventoryMovements)
    .select(`${MOVEMENT_SELECT}, products ( product_name, sku )`)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data, error } = await query

  if (!error) {
    return data ?? []
  }

  /* Fallback query without product relationship embedding */

  let fallback = client
    .from(TABLES.inventoryMovements)
    .select(MOVEMENT_SELECT)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (productId) {
    fallback = fallback.eq('product_id', productId)
  }

  const { data: rows, error: fallbackError } = await fallback

  if (fallbackError) {
    throw fallbackError
  }

  return rows ?? []
}