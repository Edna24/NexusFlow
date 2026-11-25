import {
  AlertTriangle,
  Banknote,
  Package,
  Receipt,
  ShoppingBag,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Badge from '../components/ui/Badge'
import Card from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import {
  demoStats,
  lowStockProducts,
  recentTransactions,
  salesTrend,
} from '../data/demoDashboard'
import { formatNaira, formatNumber } from '../lib/format'
import './Dashboard.css'

function statusTone(status) {
  if (status === 'Paid') return 'success'
  if (status === 'Partial') return 'warning'
  if (status === 'Pending') return 'danger'
  return 'neutral'
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="nf-chart-tooltip">
      <p className="nf-chart-tooltip__label">{label}</p>
      <p className="nf-chart-tooltip__value">{formatNaira(payload[0].value)}</p>
    </div>
  )
}

export default function Dashboard() {
  return (
    <div className="nf-dashboard">
      <div className="nf-dashboard__intro">
        <div>
          <p className="nf-dashboard__eyebrow">Overview</p>
          <h2 className="nf-dashboard__heading">Today at a glance</h2>
        </div>
        <p className="nf-dashboard__demo-note" role="note">
          Figures below are illustrative demo data — not live backend values.
        </p>
      </div>

      <section className="nf-dashboard__stats" aria-label="Key metrics">
        <StatCard
          label="Today's sales"
          value={formatNaira(demoStats.todaysSales)}
          icon={Banknote}
          tone="primary"
          hint="Demo total for today"
        />
        <StatCard
          label="Transactions"
          value={formatNumber(demoStats.transactions)}
          icon={Receipt}
          tone="navy"
          hint="In-store + WhatsApp"
        />
        <StatCard
          label="Total products"
          value={formatNumber(demoStats.totalProducts)}
          icon={Package}
          tone="success"
          hint="Active catalogue items"
        />
        <StatCard
          label="Low-stock items"
          value={formatNumber(demoStats.lowStockItems)}
          icon={AlertTriangle}
          tone="warning"
          hint="Below reorder level"
        />
        <StatCard
          label="Outstanding payments"
          value={formatNaira(demoStats.outstandingPayments)}
          icon={ShoppingBag}
          tone="danger"
          hint="Awaiting collection"
        />
      </section>

      <section className="nf-dashboard__grid">
        <Card
          className="nf-dashboard__chart-card"
          title="Sales trend (7 days)"
          action={<span className="nf-dashboard__card-meta">Demo series</span>}
        >
          <div className="nf-dashboard__chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={salesTrend}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2457C5" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#2457C5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${Math.round(value / 1000)}k` : value
                  }
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#2457C5"
                  strokeWidth={2.5}
                  fill="url(#salesFill)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          className="nf-dashboard__stock-card nf-card--flush"
          title="Low-stock products"
          action={<span className="nf-dashboard__card-meta">Demo list</span>}
        >
          <ul className="nf-stock-list">
            {lowStockProducts.map((product) => (
              <li key={product.id} className="nf-stock-list__item">
                <div className="nf-stock-list__info">
                  <p className="nf-stock-list__name">{product.name}</p>
                  <p className="nf-stock-list__sku">{product.sku}</p>
                </div>
                <div className="nf-stock-list__meta">
                  <Badge tone={product.stock <= 2 ? 'danger' : 'warning'}>
                    {product.stock} left
                  </Badge>
                  <span className="nf-stock-list__reorder">
                    Reorder at {product.reorderAt}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Card
        className="nf-dashboard__table-card nf-card--flush"
        title="Recent transactions"
        action={<span className="nf-dashboard__card-meta">Demo records</span>}
      >
        <div className="nf-table-wrap">
          <table className="nf-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Customer</th>
                <th>Channel</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td data-label="Ref" className="nf-table__ref">
                    {tx.id}
                  </td>
                  <td data-label="Customer">{tx.customer}</td>
                  <td data-label="Channel">
                    <Badge tone="neutral">{tx.channel}</Badge>
                  </td>
                  <td data-label="Amount" className="nf-table__amount">
                    {formatNaira(tx.amount)}
                  </td>
                  <td data-label="Status">
                    <Badge tone={statusTone(tx.status)}>{tx.status}</Badge>
                  </td>
                  <td data-label="Time" className="nf-table__muted">
                    {tx.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
