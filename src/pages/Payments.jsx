
import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, CreditCard, Banknote, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../services/supabase'
import './Payments.css'

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

function methodLabel(method) {
  const labels = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    card: 'Card',
    other: 'Other',
  }

  return labels[method] || method || 'Unknown'
}

export default function Payments() {
  const { businessId, businessLoading } = useAuth()

  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadPayments(isRefresh = false) {
    if (!businessId) {
      setPayments([])
      setLoading(false)
      return
    }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const client = requireSupabase()

      const { data: paymentData, error: paymentError } = await client
        .from('payments')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (paymentError) throw paymentError

      const rows = paymentData || []
      const orderIds = [...new Set(rows.map((payment) => payment.order_id).filter(Boolean))]

      let orderMap = {}

      if (orderIds.length > 0) {
        const { data: orderData, error: orderError } = await client
          .from('orders')
          .select('id, order_number')
          .in('id', orderIds)

        if (orderError) throw orderError

        orderMap = Object.fromEntries(
          (orderData || []).map((order) => [order.id, order.order_number])
        )
      }

      setPayments(
        rows.map((payment) => ({
          ...payment,
          order_number: orderMap[payment.order_id] || payment.order_id || '—',
        }))
      )
    } catch (err) {
      setError(err.message || 'Unable to load payments.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (businessLoading) return
    loadPayments()
  }, [businessId, businessLoading])

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase()

    return payments.filter((payment) => {
      const matchesSearch =
        !term ||
        String(payment.order_number || '').toLowerCase().includes(term) ||
        String(payment.payment_method || '').toLowerCase().includes(term) ||
        String(payment.status || '').toLowerCase().includes(term)

      const matchesFilter =
        filter === 'all' ||
        String(payment.status || '').toLowerCase() === filter

      return matchesSearch && matchesFilter
    })
  }, [payments, search, filter])

  const totalReceived = payments
    .filter((payment) => String(payment.status || '').toLowerCase() === 'confirmed')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const confirmedCount = payments.filter(
    (payment) => String(payment.status || '').toLowerCase() === 'confirmed'
  ).length

  const pendingCount = payments.filter(
    (payment) => String(payment.status || '').toLowerCase() === 'pending'
  ).length

  const bankTransferTotal = payments
    .filter(
      (payment) =>
        String(payment.status || '').toLowerCase() === 'confirmed' &&
        payment.payment_method === 'bank_transfer'
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  if (businessLoading) {
    return <div className="nf-payments__state">Loading business...</div>
  }

  return (
    <section className="nf-payments">
      <div className="nf-payments__heading">
        <div>
          <span className="nf-payments__eyebrow">PAYMENT MANAGEMENT</span>
          <h1>Payments</h1>
          <p>Track payments recorded against your orders.</p>
        </div>

        <button
          className="nf-payments__refresh"
          type="button"
          onClick={() => loadPayments(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="nf-payments__stats">
        <div className="nf-payments__stat">
          <span>Confirmed received</span>
          <strong>{currency.format(totalReceived)}</strong>
        </div>

        <div className="nf-payments__stat">
          <span>Payment records</span>
          <strong>{payments.length}</strong>
        </div>

        <div className="nf-payments__stat">
          <span>Confirmed</span>
          <strong>{confirmedCount}</strong>
        </div>

        <div className="nf-payments__stat">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>
      </div>

      <div className="nf-payments__method-card">
        <div className="nf-payments__method-icon">
          <Banknote size={20} />
        </div>
        <div>
          <span>Confirmed bank transfers</span>
          <strong>{currency.format(bankTransferTotal)}</strong>
        </div>
      </div>

      {error && (
        <div className="nf-payments__error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="nf-payments__toolbar">
        <div className="nf-payments__search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search order, method or status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="nf-payments__table-card">
        {loading ? (
          <div className="nf-payments__state">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="nf-payments__empty">
            <CreditCard size={34} />
            <h3>No payments found</h3>
            <p>
              {payments.length === 0
                ? 'Payments recorded through Sales will appear here.'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="nf-payments__table-wrap">
            <table className="nf-payments__table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.order_number}</strong>
                    </td>
                    <td>{formatDate(payment.created_at)}</td>
                    <td>{methodLabel(payment.payment_method)}</td>
                    <td className="nf-payments__amount">
                      {currency.format(Number(payment.amount || 0))}
                    </td>
                    <td>
                      <span
                        className={`nf-payments__status nf-payments__status--${statusClass(
                          payment.status
                        )}`}
                      >
                        {payment.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
