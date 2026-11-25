
import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, AlertTriangle, BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../services/supabase'
import './Reports.css'

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

const shortCurrency = (value) => {
  const number = Number(value || 0)

  if (number >= 1000000) return `₦${(number / 1000000).toFixed(1)}m`
  if (number >= 1000) return `₦${(number / 1000).toFixed(1)}k`
  return `₦${number.toFixed(0)}`
}

function dateKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getPaymentAmount(payment) {
  return Number(
    payment.amount ??
    payment.payment_amount ??
    payment.paid_amount ??
    payment.total_amount ??
    0
  )
}

function getPaymentMethod(payment) {
  return payment.payment_method || payment.method || 'Other'
}

function getPaymentStatus(payment) {
  return String(payment.status || '').toLowerCase()
}

export default function Reports() {
  const { businessId, businessLoading } = useAuth()

  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [products, setProducts] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadReports(isRefresh = false) {
    if (!businessId) {
      setLoading(false)
      return
    }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const client = requireSupabase()

      const [ordersResult, paymentsResult, productsResult, itemsResult] =
        await Promise.all([
          client
            .from('orders')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false }),

          client
            .from('payments')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false }),

          client
            .from('products')
            .select('*')
            .eq('business_id', businessId),

          client
            .from('order_items')
            .select('*')
            .eq('business_id', businessId),
        ])

      if (ordersResult.error) throw ordersResult.error
      if (paymentsResult.error) throw paymentsResult.error
      if (productsResult.error) throw productsResult.error
      if (itemsResult.error) throw itemsResult.error

      setOrders(ordersResult.data || [])
      setPayments(paymentsResult.data || [])
      setProducts(productsResult.data || [])
      setOrderItems(itemsResult.data || [])
    } catch (err) {
      setError(err.message || 'Unable to load reports.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (businessLoading) return
    loadReports()
  }, [businessId, businessLoading])

  const confirmedOrders = orders.filter((order =>
    ['confirmed', 'completed', 'delivered'].includes(
      String(order.status || '').toLowerCase()
    )
  ))

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  )

  const confirmedSales = confirmedOrders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  )

  const averageOrderValue = orders.length ? totalSales / orders.length : 0

  const confirmedPayments = payments.filter((payment) =>
    ['confirmed', 'completed', 'paid', 'successful'].includes(
      getPaymentStatus(payment)
    )
  )

  const paymentsReceived = confirmedPayments.reduce(
    (sum, payment) => sum + getPaymentAmount(payment),
    0
  )

  const lastSevenDays = useMemo(() => {
    const days = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)

      days.push({
        key: dateKey(date),
        label: date.toLocaleDateString('en-NG', { weekday: 'short' }),
        dateLabel: date.toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
        }),
        sales: 0,
        count: 0,
      })
    }

    const byDate = new Map(days.map((day) => [day.key, day]))

    orders.forEach((order) => {
      if (!order.created_at) return

      const day = byDate.get(dateKey(order.created_at))
      if (!day) return

      day.sales += Number(order.total_amount || 0)
      day.count += 1
    })

    return days
  }, [orders])

  const maxDailySales = Math.max(
    ...lastSevenDays.map((day) => day.sales),
    1
  )

  const topProducts = useMemo(() => {
    const productMap = new Map(
      products.map((product) => [product.id, product])
    )

    const performance = new Map()

    orderItems.forEach((item) => {
      const productId = item.product_id
      if (!productId) return

      const product = productMap.get(productId)
      const quantity = Number(item.quantity || 0)
      const unitPrice = Number(item.unit_price || 0)

      if (!performance.has(productId)) {
        performance.set(productId, {
          id: productId,
          name: product?.product_name || 'Unknown product',
          sku: product?.sku || '',
          quantitySold: 0,
          revenue: 0,
        })
      }

      const entry = performance.get(productId)
      entry.quantitySold += quantity
      entry.revenue += quantity * unitPrice
    })

    return Array.from(performance.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5)
  }, [products, orderItems])

  const maxProductQuantity = Math.max(
    ...topProducts.map((product) => product.quantitySold),
    1
  )

  const paymentBreakdown = useMemo(() => {
    const methods = new Map()

    confirmedPayments.forEach((payment) => {
      const method = getPaymentMethod(payment)
      methods.set(
        method,
        (methods.get(method) || 0) + getPaymentAmount(payment)
      )
    })

    return Array.from(methods.entries())
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [payments])

  const lowStockProducts = products.filter((product) => {
    const stock = Number(product.stock_quantity || 0)
    const reorder = Number(product.reorder_level || 0)
    return stock <= reorder
  })

  if (businessLoading) {
    return <div className="nf-reports__state">Loading business...</div>
  }

  return (
    <section className="nf-reports">
      <div className="nf-reports__heading">
        <div>
          <span className="nf-reports__eyebrow">BUSINESS ANALYTICS</span>
          <h1>Reports</h1>
          <p>Track sales, payment performance and inventory activity.</p>
        </div>

        <button
          className="nf-reports__refresh"
          type="button"
          onClick={() => loadReports(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="nf-reports__error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="nf-reports__stats">
        <div className="nf-reports__stat">
          <span>Total order value</span>
          <strong>{currency.format(totalSales)}</strong>
          <small>{orders.length} recorded orders</small>
        </div>

        <div className="nf-reports__stat">
          <span>Confirmed sales</span>
          <strong>{currency.format(confirmedSales)}</strong>
          <small>{confirmedOrders.length} confirmed/completed orders</small>
        </div>

        <div className="nf-reports__stat">
          <span>Average order value</span>
          <strong>{currency.format(averageOrderValue)}</strong>
          <small>Across recorded orders</small>
        </div>

        <div className="nf-reports__stat">
          <span>Payments received</span>
          <strong>{currency.format(paymentsReceived)}</strong>
          <small>{confirmedPayments.length} confirmed payments</small>
        </div>
      </div>

      <div className="nf-reports__grid">
        <div className="nf-reports__card nf-reports__trend">
          <div className="nf-reports__card-heading">
            <div>
              <h2>Sales trend</h2>
              <p>Order value over the last 7 days</p>
            </div>
            <BarChart3 size={20} />
          </div>

          {loading ? (
            <div className="nf-reports__state">Loading sales trend...</div>
          ) : (
            <div className="nf-reports__chart">
              {lastSevenDays.map((day) => (
                <div className="nf-reports__chart-column" key={day.key}>
                  <div className="nf-reports__bar-area">
                    <div
                      className="nf-reports__bar"
                      style={{
                        height: `${day.sales ? Math.max((day.sales / maxDailySales) * 100, 4) : 0}%`,
                      }}
                      title={`${day.dateLabel}: ${currency.format(day.sales)}`}
                    />
                  </div>
                  <span className="nf-reports__chart-label">{day.label}</span>
                  <small>{shortCurrency(day.sales)}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="nf-reports__card nf-reports__payments">
          <div className="nf-reports__card-heading">
            <div>
              <h2>Payment breakdown</h2>
              <p>Confirmed payments by method</p>
            </div>
          </div>

          {paymentBreakdown.length === 0 ? (
            <div className="nf-reports__empty">No confirmed payments recorded.</div>
          ) : (
            <div className="nf-reports__breakdown">
              {paymentBreakdown.map((entry) => {
                const percentage = paymentsReceived
                  ? (entry.amount / paymentsReceived) * 100
                  : 0

                return (
                  <div className="nf-reports__method" key={entry.method}>
                    <div className="nf-reports__method-top">
                      <strong>{entry.method}</strong>
                      <span>{currency.format(entry.amount)}</span>
                    </div>
                    <div className="nf-reports__progress">
                      <div style={{ width: `${percentage}%` }} />
                    </div>
                    <small>{percentage.toFixed(1)}%</small>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="nf-reports__card nf-reports__products">
          <div className="nf-reports__card-heading">
            <div>
              <h2>Top-selling products</h2>
              <p>Ranked by recorded units sold</p>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <div className="nf-reports__empty">No product sales data yet.</div>
          ) : (
            <div className="nf-reports__product-list">
              {topProducts.map((product, index) => (
                <div className="nf-reports__product" key={product.id}>
                  <div className="nf-reports__product-title">
                    <span className="nf-reports__rank">{index + 1}</span>
                    <div>
                      <strong>{product.name}</strong>
                      {product.sku && <small>{product.sku}</small>}
                    </div>
                    <span className="nf-reports__product-qty">
                      {product.quantitySold} sold
                    </span>
                  </div>

                  <div className="nf-reports__progress">
                    <div
                      style={{
                        width: `${(product.quantitySold / maxProductQuantity) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="nf-reports__product-revenue">
                    {currency.format(product.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="nf-reports__card nf-reports__stock">
          <div className="nf-reports__card-heading">
            <div>
              <h2>Inventory alerts</h2>
              <p>Products at or below reorder level</p>
            </div>
            <span className="nf-reports__alert-count">{lowStockProducts.length}</span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="nf-reports__empty">No products currently require restocking.</div>
          ) : (
            <div className="nf-reports__stock-list">
              {lowStockProducts.map((product) => (
                <div className="nf-reports__stock-item" key={product.id}>
                  <div>
                    <strong>{product.product_name}</strong>
                    <small>{product.sku || 'No SKU'}</small>
                  </div>
                  <div className="nf-reports__stock-number">
                    <strong>{product.stock_quantity}</strong>
                    <small>Reorder at {product.reorder_level}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="nf-reports__loading">
          Loading your business reports...
        </div>
      )}
    </section>
  )
}
