export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
}

export function getStockStatus(stockQuantity, reorderLevel) {
  const qty = Number(stockQuantity) || 0
  const reorder = Number(reorderLevel) || 0

  if (qty <= 0) return STOCK_STATUS.OUT_OF_STOCK
  if (qty <= reorder) return STOCK_STATUS.LOW_STOCK
  return STOCK_STATUS.IN_STOCK
}

export function stockStatusLabel(status) {
  if (status === STOCK_STATUS.OUT_OF_STOCK) return 'Out of Stock'
  if (status === STOCK_STATUS.LOW_STOCK) return 'Low Stock'
  return 'In Stock'
}

export function stockStatusTone(status) {
  if (status === STOCK_STATUS.OUT_OF_STOCK) return 'danger'
  if (status === STOCK_STATUS.LOW_STOCK) return 'warning'
  return 'success'
}

export function withStockStatus(product) {
  return {
    ...product,
    stock_status: getStockStatus(product.stock_quantity, product.reorder_level),
  }
}

export function computeSummary(products) {
  const list = products ?? []
  return {
    totalProducts: list.length,
    totalStockUnits: list.reduce(
      (sum, product) => sum + (Number(product.stock_quantity) || 0),
      0,
    ),
    lowStockProducts: list.filter(
      (product) =>
        getStockStatus(product.stock_quantity, product.reorder_level) ===
        STOCK_STATUS.LOW_STOCK,
    ).length,
    outOfStockProducts: list.filter(
      (product) =>
        getStockStatus(product.stock_quantity, product.reorder_level) ===
        STOCK_STATUS.OUT_OF_STOCK,
    ).length,
  }
}
