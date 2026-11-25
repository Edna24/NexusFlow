/**
 * Verified Supabase column map for NexusFlow inventory.
 *
 * Columns confirmed via PostgREST probes against the live project
 * (401 = column exists / RLS requires auth; 400 = column missing).
 *
 * Do not invent additional columns. Do not alter the remote schema.
 */

export const TABLES = {
  businesses: 'businesses',
  products: 'products',
  inventoryMovements: 'inventory_movements',
}

export const BUSINESS_COLUMNS = [
  'id',
  'owner_id',
  'business_name',
  'email',
  'phone',
  'created_at',
]

export const PRODUCT_COLUMNS = [
  'id',
  'business_id',
  'product_name',
  'sku',
  'description',
  'selling_price',
  'stock_quantity',
  'reorder_level',
  'created_at',
  'updated_at',
]

export const PRODUCT_SELECT = PRODUCT_COLUMNS.join(', ')

export const MOVEMENT_COLUMNS = [
  'id',
  'business_id',
  'product_id',
  'movement_type',
  'quantity',
  'notes',
  'reference',
  'created_at',
]

export const MOVEMENT_SELECT = MOVEMENT_COLUMNS.join(', ')

/**
 * movement_type values used by the app.
 * If the database check constraint rejects these, Supabase will return an error
 * and the UI must surface it — do not invent alternate columns.
 */
export const MOVEMENT_TYPES = {
  OPENING: 'opening',
  RECEIVE: 'receive',
  ADJUSTMENT: 'adjustment',
}
