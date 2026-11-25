
import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Users, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../services/supabase'
import './Customers.css'

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

function formatDate(value) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('en-NG', {
    dateStyle: 'medium',
  })
}

export default function Customers() {
  const { businessId, businessLoading } = useAuth()

  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadCustomers(isRefresh = false) {
    if (!businessId) {
      setCustomers([])
      setLoading(false)
      return
    }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const client = requireSupabase()

      const { data: customerData, error: customerError } = await client
        .from('customers')
        .select('id, business_id, name, phone, email, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (customerError) throw customerError

      const customerRows = customerData || []
      const customerIds = customerRows.map((customer) => customer.id)

      let orderRows = []

      if (customerIds.length > 0) {
        const { data, error: orderError } = await client
          .from('orders')
          .select('id, customer_id, total_amount, created_at, status')
          .eq('business_id', businessId)
          .in('customer_id', customerIds)
          .order('created_at', { ascending: false })

        if (orderError) throw orderError

        orderRows = data || []
      }

      const ordersByCustomer = new Map()

      for (const order of orderRows) {
        if (!order.customer_id) continue

        if (!ordersByCustomer.has(order.customer_id)) {
          ordersByCustomer.set(order.customer_id, [])
        }

        ordersByCustomer.get(order.customer_id).push(order)
      }

      const enrichedCustomers = customerRows.map((customer) => {
        const customerOrders = ordersByCustomer.get(customer.id) || []

        const totalSpent = customerOrders.reduce(
          (sum, order) => sum + Number(order.total_amount || 0),
          0
        )

        const latestOrder = customerOrders[0] || null

        return {
          ...customer,
          orderCount: customerOrders.length,
          totalSpent,
          lastOrderDate: latestOrder?.created_at || null,
          orders: customerOrders,
        }
      })

      setCustomers(enrichedCustomers)
    } catch (err) {
      setError(err.message || 'Unable to load customers.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (businessLoading) return
    loadCustomers()
  }, [businessId, businessLoading])

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return customers

    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [customers, search])

  const totalOrders = customers.reduce(
    (sum, customer) => sum + customer.orderCount,
    0
  )

  const totalSpent = customers.reduce(
    (sum, customer) => sum + customer.totalSpent,
    0
  )

  const repeatCustomers = customers.filter(
    (customer) => customer.orderCount > 1
  ).length

  if (businessLoading) {
    return <div className="nf-customers__state">Loading business...</div>
  }

  return (
    <section className="nf-customers">
      <div className="nf-customers__heading">
        <div>
          <span className="nf-customers__eyebrow">CUSTOMER MANAGEMENT</span>
          <h1>Customers</h1>
          <p>Understand customer relationships and purchase activity.</p>
        </div>

        <button
          className="nf-customers__refresh"
          type="button"
          onClick={() => loadCustomers(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="nf-customers__stats">
        <div className="nf-customers__stat">
          <span>Total customers</span>
          <strong>{customers.length}</strong>
        </div>

        <div className="nf-customers__stat">
          <span>Customer orders</span>
          <strong>{totalOrders}</strong>
        </div>

        <div className="nf-customers__stat">
          <span>Repeat customers</span>
          <strong>{repeatCustomers}</strong>
        </div>

        <div className="nf-customers__stat">
          <span>Total purchase value</span>
          <strong>{currency.format(totalSpent)}</strong>
        </div>
      </div>

      {error && (
        <div className="nf-customers__error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="nf-customers__toolbar">
        <div className="nf-customers__search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search name, phone or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="nf-customers__table-card">
        {loading ? (
          <div className="nf-customers__state">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="nf-customers__empty">
            <Users size={34} />
            <h3>No customers found</h3>
            <p>
              {customers.length === 0
                ? 'Customers added to NexusFlow will appear here.'
                : 'Try a different search.'}
            </p>
          </div>
        ) : (
          <div className="nf-customers__table-wrap">
            <table className="nf-customers__table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Orders</th>
                  <th>Total spent</th>
                  <th>Last order</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name || 'Unnamed customer'}</strong>
                    </td>

                    <td>
                      <div className="nf-customers__contact">
                        {customer.phone && <span>{customer.phone}</span>}
                        {customer.email && <span>{customer.email}</span>}
                        {!customer.phone && !customer.email && <span>—</span>}
                      </div>
                    </td>

                    <td>{customer.orderCount}</td>

                    <td className="nf-customers__amount">
                      {currency.format(customer.totalSpent)}
                    </td>

                    <td>{formatDate(customer.lastOrderDate)}</td>
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
