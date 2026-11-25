const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('en-NG')

export function formatNaira(amount) {
  return nairaFormatter.format(amount ?? 0)
}

export function formatNumber(value) {
  return numberFormatter.format(value ?? 0)
}
