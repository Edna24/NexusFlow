/**
 * UNVERIFIED schema contract for NexusFlow inventory tables.
 *
 * Inspection findings:
 * - No SQL migrations, types, or OpenAPI dump exist in this repository.
 * - Frontend credentials use VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY.
 * - Authenticated business context is not yet implemented in the app.
 *
 * These column names follow the product brief (products + inventory_movements)
 * and are used only by the live Supabase adapter. They must be confirmed against
 * the real database before treating live mode as production-ready.
 *
 * Do not modify the remote database to match this file — update this contract
 * (and the adapter) to match the existing schema instead.
 */

export const PRODUCTS_TABLE = 'products'
export const MOVEMENTS_TABLE = 'inventory_movements'

/** Provisional products columns — confirm before go-live. */
export const PRODUCT_COLUMNS = {
  id: 'id',
  businessId: 'business_id',
  name: 'name',
  sku: 'sku',
  sellingPrice: 'selling_price',
  quantity: 'quantity',
  reorderLevel: 'reorder_level',
  description: 'description',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

/** Provisional inventory_movements columns — confirm before go-live. */
export const MOVEMENT_COLUMNS = {
  id: 'id',
  businessId: 'business_id',
  productId: 'product_id',
  type: 'movement_type',
  quantity: 'quantity',
  reason: 'reason',
  balanceAfter: 'balance_after',
  createdAt: 'created_at',
  createdBy: 'created_by',
}

export const MOVEMENT_TYPES = {
  OPENING: 'opening',
  RECEIVE: 'receive',
  ADJUSTMENT: 'adjustment',
}
