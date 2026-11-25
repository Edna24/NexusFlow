
import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Eye, X, Package, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../services/supabase'
import './Orders.css'

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

function formatDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function statusClass(status) {
  return String(status || 'unknown').toLowerCase().replace(/\s+/g, '-')
}

export default function Orders() {
  const { businessId, businessLoading } = useAuth()

  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  async function loadOrders(isRefresh = false) {
    if (!businessId) {
      setOrders([])
      setLoading(false)
      return
    }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const client = requireSupabase()

      const { data, error: queryError } = await client
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (queryError) throw queryError

      setOrders(data || [])
    } catch (err) {
      setError(err.message || 'Unable to load orders.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (businessLoading) return
    loadOrders()
  }, [businessId, businessLoading])

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        String(order.order_number || '').toLowerCase().includes(term) ||
        String(order.status || '').toLowerCase().includes(term)

      const matchesFilter =
        filter === 'all' ||
        String(order.status || '').toLowerCase() === filter

      return matchesSearch && matchesFilter
    })
  }, [orders, search, filter])

  const totalValue = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  )

  async function viewOrder(order) {
    setSelectedOrder(order)
    setOrderItems([])
    setDetailLoading(true)

    try {
      const client = requireSupabase()

      const { data, error: itemError } = await client
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (itemError) throw itemError

      const items = data || []

      const productIds = [...new Set(items.map((item) => item.product_id))]

      let products = []

      if (productIds.length > 0) {
        const { data: productData, error: productError } = await client
          .from('products')
          .select('id, product_name, sku')
          .in('id', productIds)

        if (!productError) products = productData || []
      }

      const enrichedItems = items.map((item) => {
        const product = products.find((p) => p.id === item.product_id)

        return {
          ...item,
          product_name: product?.product_name || 'Product',
          sku: product?.sku || '',
        }
      })

      setOrderItems(enrichedItems)
    } catch (err) {
      setError(err.message || 'Unable to load order details.')
    } finally {
      setDetailLoading(false)
    }
  }

  const confirmedCount = orders.filter(
    (order) => String(order.status).toLowerCase() === 'confirmed'
  ).length

  const pendingCount = orders.filter(
    (order) => String(order.status).toLowerCase() === 'pending'
  ).length

  if (businessLoading) {
    return <div className="nf-orders__state">Loading business...</div>
  }

  return (
    <section className="nf-orders">
      <div className="nf-orders__heading">
        <div>
          <span className="nf-orders__eyebrow">ORDER MANAGEMENT</span>
          <h1>Orders</h1>
          <p>Track and manage orders recorded through NexusFlow.</p>
        </div>

        <button
          className="nf-orders__refresh"
          type="button"
          onClick={() => loadOrders(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="nf-orders__stats">
        <div className="nf-orders__stat">
          <span>Total orders</span>
          <strong>{orders.length}</strong>
        </div>

        <div className="nf-orders__stat">
          <span>Confirmed</span>
          <strong>{confirmedCount}</strong>
        </div>

        <div className="nf-orders__stat">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="nf-orders__stat">
          <span>Total order value</span>
          <strong>{currency.format(totalValue)}</strong>
        </div>
      </div>

      {error && (
        <div className="nf-orders__error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="nf-orders__toolbar">
        <div className="nf-orders__search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search order number or status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="nf-orders__table-card">
        {loading ? (
          <div className="nf-orders__state">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="nf-orders__empty">
            <Package size={34} />
            <h3>No orders found</h3>
            <p>
              {orders.length === 0
                ? 'Orders recorded through Sales will appear here.'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="nf-orders__table-wrap">
            <table className="nf-orders__table">
              <thead>
                <tr>
                  <th>Order number</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.order_number || order.id}</strong>
                    </td>

                    <td>{formatDate(order.created_at)}</td>

                    <td className="nf-orders__amount">
                      {currency.format(Number(order.total_amount || 0))}
                    </td>

                    <td>
                      <span
                        className={`nf-orders__status nf-orders__status--${statusClass(
                          order.status
                        )}`}
                      >
                        {order.status || 'Unknown'}
                      </span>
                    </td>

                    <td>
                      <button
                        className="nf-orders__view"
                        type="button"
                        onClick={() => viewOrder(order)}
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div
          className="nf-orders__modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="nf-orders__modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="nf-orders__modal-header">
              <div>
                <span className="nf-orders__eyebrow">ORDER DETAILS</span>
                <h2>{selectedOrder.order_number}</h2>
              </div>

              <button
                className="nf-orders__close"
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="nf-orders__detail-summary">
              <div>
                <span>Status</span>
                <strong>{selectedOrder.status || 'Unknown'}</strong>
              </div>

              <div>
                <span>Order date</span>
                <strong>{formatDate(selectedOrder.created_at)}</strong>
              </div>

              <div>
                <span>Total</span>
                <strong>
                  {currency.format(Number(selectedOrder.total_amount || 0))}
                </strong>
              </div>
            </div>

            <h3>Items</h3>

            {detailLoading ? (
              <div className="nf-orders__state">Loading order items...</div>
            ) : orderItems.length === 0 ? (
              <div className="nf-orders__empty-small">
                No order items were found.
              </div>
            ) : (
              <div className="nf-orders__items">
                {orderItems.map((item) => (
                  <div className="nf-orders__item" key={item.id}>
                    <div>
                      <strong>{item.product_name}</strong>
                      {item.sku && <small>{item.sku}</small>}
                      <small>
                        {item.quantity} ×{' '}
                        {currency.format(Number(item.unit_price || 0))}
                      </small>
                    </div>

                    <strong>
                      {currency.format(
                        Number(item.quantity || 0) *
                          Number(item.unit_price || 0)
                      )}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            {selectedOrder.notes && (
              <div className="nf-orders__notes">
                <span>Notes</span>
                <p>{selectedOrder.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
