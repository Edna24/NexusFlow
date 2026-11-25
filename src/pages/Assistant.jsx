import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../services/supabase'
import {
  Bot,
  Send,
  Sparkles,
  Package,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  Lightbulb,
} from 'lucide-react'
import './Assistant.css'

const QUICK_PROMPTS = [
  'What products should I restock urgently?',
  'How are my sales doing?',
  'Which products are selling best?',
  'What should I prioritize today?',
  'What is my inventory worth?',
]

const money = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const number = (value) => Number(value) || 0

function getStockStatus(product) {
  const stock = number(product.stock_quantity)
  const reorder = number(product.reorder_level)

  if (stock <= 0) return 'out'
  if (stock <= reorder) return 'low'
  return 'healthy'
}

function buildBusinessContext(products, orders, orderItems) {
  const lowStock = products.filter((p) => getStockStatus(p) !== 'healthy')
  const outOfStock = products.filter((p) => getStockStatus(p) === 'out')

  const inventoryValue = products.reduce(
    (total, product) =>
      total + number(product.stock_quantity) * number(product.selling_price),
    0,
  )

  const orderRevenue = orders.reduce(
    (total, order) => total + number(order.total_amount),
    0,
  )

  const confirmedOrders = orders.filter((order) =>
    ['confirmed', 'completed', 'paid', 'delivered'].includes(
      String(order.status || '').toLowerCase(),
    ),
  )

  const confirmedRevenue = confirmedOrders.reduce(
    (total, order) => total + number(order.total_amount),
    0,
  )

  const productSales = {}

  orderItems.forEach((item) => {
    const productId = item.product_id
    productSales[productId] =
      (productSales[productId] || 0) + number(item.quantity)
  })

  const bestSellers = products
    .map((product) => ({
      ...product,
      unitsSold: productSales[product.id] || 0,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold)

  return {
    lowStock,
    outOfStock,
    inventoryValue,
    orderRevenue,
    confirmedRevenue,
    confirmedOrders,
    productSales,
    bestSellers,
  }
}

function answerQuestion(question, products, orders, orderItems) {
  const q = question.toLowerCase().trim()
  const context = buildBusinessContext(products, orders, orderItems)

  if (
    q.includes('restock') ||
    q.includes('low stock') ||
    q.includes('running low') ||
    q.includes('urgent')
  ) {
    if (!context.lowStock.length) {
      return `Good news! Based on your current inventory data, none of your ${products.length} products are at or below their reorder levels.\n\nContinue monitoring stock levels and review your inventory regularly.`
    }

    const urgent = context.lowStock
      .sort((a, b) => number(a.stock_quantity) - number(b.stock_quantity))
      .map((p) => {
        const status = getStockStatus(p)
        const suggested = Math.max(
          number(p.reorder_level) * 2 - number(p.stock_quantity),
          number(p.reorder_level),
          1,
        )

        return `• **${p.product_name}** — ${p.stock_quantity} units remaining (reorder level: ${p.reorder_level}). ${
          status === 'out'
            ? 'OUT OF STOCK — replenish immediately.'
            : `Suggested replenishment: approximately ${suggested} units.`
        }`
      })

    return `## Restock priority\n\n${urgent.join('\n\n')}\n\n**${context.outOfStock.length} product(s) are completely out of stock, and ${context.lowStock.length} product(s) are at or below their reorder level.**\n\nPrioritize the out-of-stock items first, then products with the smallest remaining quantities. These replenishment quantities are suggestions based on your configured reorder levels—not supplier demand forecasts.`
  }

  if (
    q.includes('sales') ||
    q.includes('revenue') ||
    q.includes('doing') ||
    q.includes('performance')
  ) {
    const totalOrders = orders.length
    const completedCount = context.confirmedOrders.length

    return `## Sales overview\n\n• **Total orders recorded:** ${totalOrders}\n• **Confirmed/completed orders:** ${completedCount}\n• **Total order value:** ${money(context.orderRevenue)}\n• **Confirmed/completed order value:** ${money(context.confirmedRevenue)}\n\n${
      totalOrders === 0
        ? 'No orders have been recorded yet. Create your first sale to begin tracking performance.'
        : 'Your figures are based on orders currently available in your business records. The total order value includes all recorded orders; the confirmed figure includes orders with confirmed, completed, paid, or delivered status.'
    }`
  }

  if (
    q.includes('selling') ||
    q.includes('best') ||
    q.includes('popular') ||
    q.includes('product performance')
  ) {
    const leaders = context.bestSellers.filter((p) => p.unitsSold > 0).slice(0, 5)

    if (!leaders.length) {
      return `I don't have enough recorded order-item data to identify best-selling products yet.\n\nOnce your sales are recorded with their items, I can rank products by units sold.`
    }

    return `## Best-selling products\n\n${leaders
      .map(
        (p, index) =>
          `${index + 1}. **${p.product_name}** — ${p.unitsSold} unit(s) sold`,
      )
      .join('\n\n')}\n\nThis ranking is calculated from recorded order items. It reflects quantities recorded in your system, not external market demand.`
  }

  if (
    q.includes('inventory value') ||
    q.includes('worth') ||
    q.includes('value of my stock')
  ) {
    return `## Inventory valuation\n\n**Estimated retail value of current stock: ${money(context.inventoryValue)}**\n\nThis estimate is calculated by multiplying each product's current stock quantity by its selling price and summing the results across ${products.length} products.\n\nThis is retail value—not the cost you paid suppliers or your estimated profit.`
  }

  if (
    q.includes('prioritize') ||
    q.includes('priority') ||
    q.includes('today') ||
    q.includes('what should i do')
  ) {
    const priorities = []

    if (context.outOfStock.length) {
      priorities.push(
        `**1. Address stockouts:** ${context.outOfStock.map((p) => p.product_name).join(', ')} ${context.outOfStock.length === 1 ? 'is' : 'are'} currently out of stock.`,
      )
    }

    if (context.lowStock.length > context.outOfStock.length) {
      priorities.push(
        `**${priorities.length + 1}. Replenish low-stock products:** Review ${context.lowStock.filter((p) => getStockStatus(p) === 'low').map((p) => p.product_name).join(', ')}.`,
      )
    }

    priorities.push(
      `**${priorities.length + 1}. Review order records:** ${orders.length} order(s) currently exist in your system.`,
    )

    priorities.push(
      `**${priorities.length + 1}. Keep inventory records accurate:** Confirm that stock changes and sales are recorded promptly.`,
    )

    return `## Today's suggested priorities\n\n${priorities.join('\n\n')}\n\nThese priorities are generated from the current inventory and order records available to NexusFlow.`
  }

  return `I can help you analyze your business data. Try asking me:\n\n${QUICK_PROMPTS.map((p) => `• ${p}`).join('\n')}\n\nI currently analyze your products, stock levels, orders, and recorded order items.`
}

export default function Assistant() {
  const { businessId, business } = useAuth()

  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hello! I'm NexusFlow Assistant. I can help you understand your business data, identify stock issues, review sales, and decide what to prioritize.\n\nAsk me a question or choose one of the suggestions below.",
    },
  ])
  const [sending, setSending] = useState(false)

  const loadData = useCallback(async () => {
    if (!businessId) {
      setDataError('Your business information is not available yet.')
      setLoadingData(false)
      return
    }

    setLoadingData(true)
    setDataError('')

    try {
      const client = requireSupabase()

      const [productsResult, ordersResult, itemsResult] = await Promise.all([
        client
          .from('products')
          .select('id, product_name, sku, selling_price, stock_quantity, reorder_level')
          .eq('business_id', businessId),

        client
          .from('orders')
          .select('id, order_number, status, total_amount, created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),

        client
          .from('order_items')
          .select('id, order_id, product_id, quantity, unit_price, line_total')
          .eq('business_id', businessId),
      ])

      if (productsResult.error) throw productsResult.error
      if (ordersResult.error) throw ordersResult.error
      if (itemsResult.error) throw itemsResult.error

      setProducts(productsResult.data || [])
      setOrders(ordersResult.data || [])
      setOrderItems(itemsResult.data || [])
    } catch (error) {
      setDataError(error?.message || 'Unable to load business data.')
    } finally {
      setLoadingData(false)
    }
  }, [businessId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const stockAlerts = useMemo(
    () => products.filter((product) => getStockStatus(product) !== 'healthy'),
    [products],
  )

  const handleSend = (text = input) => {
    const question = String(text || '').trim()
    if (!question || sending || loadingData) return

    setMessages((current) => [...current, { role: 'user', content: question }])
    setInput('')
    setSending(true)

    setTimeout(() => {
      const answer = dataError
        ? `I couldn't access your business data just now.\n\n${dataError}\n\nPlease refresh the data and try again.`
        : answerQuestion(question, products, orders, orderItems)

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: answer },
      ])
      setSending(false)
    }, 350)
  }

  return (
    <div className="nf-assistant">
      <div className="nf-assistant__hero">
        <div className="nf-assistant__hero-icon">
          <Sparkles size={23} />
        </div>
        <div>
          <h1>NexusFlow Assistant</h1>
          <p>Your business data, translated into actionable insights.</p>
        </div>
        <button
          type="button"
          className="nf-assistant__refresh"
          onClick={loadData}
          disabled={loadingData}
          title="Refresh business data"
        >
          <RefreshCw size={17} className={loadingData ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="nf-assistant__status">
        <span className="nf-assistant__status-dot" />
        <span>
          {loadingData
            ? 'Loading live business data...'
            : dataError
              ? 'Data connection needs attention'
              : `Connected to ${business?.business_name || 'your business'} data`}
        </span>
        {!loadingData && !dataError && (
          <span className="nf-assistant__status-count">
            {products.length} products · {orders.length} orders
          </span>
        )}
      </div>

      {dataError && (
        <div className="nf-assistant__error">
          <AlertTriangle size={17} />
          <span>{dataError}</span>
        </div>
      )}

      {!loadingData && !dataError && (
        <div className="nf-assistant__stats">
          <div className="nf-assistant__stat">
            <Package size={18} />
            <div>
              <span>Products</span>
              <strong>{products.length}</strong>
            </div>
          </div>
          <div className="nf-assistant__stat nf-assistant__stat--warning">
            <AlertTriangle size={18} />
            <div>
              <span>Stock alerts</span>
              <strong>{stockAlerts.length}</strong>
            </div>
          </div>
          <div className="nf-assistant__stat">
            <ShoppingBag size={18} />
            <div>
              <span>Orders</span>
              <strong>{orders.length}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="nf-assistant__chat">
        <div className="nf-assistant__chat-header">
          <div className="nf-assistant__avatar">
            <Bot size={19} />
          </div>
          <div>
            <strong>Business Assistant</strong>
            <span>Data-powered insights</span>
          </div>
          <span className="nf-assistant__badge">BETA</span>
        </div>

        <div className="nf-assistant__messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`nf-assistant__message nf-assistant__message--${message.role}`}
            >
              {message.role === 'assistant' && (
                <div className="nf-assistant__message-avatar">
                  <Bot size={16} />
                </div>
              )}
              <div className="nf-assistant__bubble">
                {message.content.split('\n').map((line, lineIndex) => {
                  const bolded = line.replace(/\*\*(.*?)\*\*/g, '$1')
                  return (
                    <p key={lineIndex} className={line.startsWith('## ') ? 'nf-assistant__heading' : ''}>
                      {line.startsWith('## ')
                        ? bolded.replace(/^## /, '')
                        : line.startsWith('• ')
                          ? bolded
                          : bolded || '\u00A0'}
                    </p>
                  )
                })}
              </div>
            </div>
          ))}

          {sending && (
            <div className="nf-assistant__message nf-assistant__message--assistant">
              <div className="nf-assistant__message-avatar">
                <Bot size={16} />
              </div>
              <div className="nf-assistant__bubble nf-assistant__typing">
                Analyzing your business data...
              </div>
            </div>
          )}
        </div>

        <div className="nf-assistant__quick">
          <div className="nf-assistant__quick-title">
            <Lightbulb size={15} />
            <span>Suggested questions</span>
          </div>
          <div className="nf-assistant__quick-list">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loadingData || sending}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <form
          className="nf-assistant__input"
          onSubmit={(event) => {
            event.preventDefault()
            handleSend()
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your business..."
            disabled={loadingData || sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || loadingData || sending}
            aria-label="Send message"
          >
            <Send size={17} />
          </button>
        </form>
      </div>

      <p className="nf-assistant__disclaimer">
        NexusFlow Assistant Beta analyzes live business records using data-based
        insights. It is not an external generative AI model yet.
      </p>
    </div>
  )
}