
import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../services/supabase'
import { listProducts, adjustStock } from '../services/inventory/inventoryService'
import './Sales.css'

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
]

export default function Sales() {
  const { businessId, businessLoading } = useAuth()

  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadProducts() {
    if (!businessId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await listProducts(businessId)
      setProducts(result.products)
    } catch (err) {
      setError(err.message || 'Unable to load products.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (businessLoading) return
    loadProducts()
  }, [businessId, businessLoading])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      const matches =
        !term ||
        product.product_name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term)

      return matches && Number(product.stock_quantity) > 0
    })
  }, [products, search])

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.selling_price, 0),
    [cart]
  )

  const paid = Number(amountPaid || 0)
  const balance = Math.max(total - paid, 0)

  function addToCart(product) {
    setError('')
    setSuccess('')

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)

      if (existing) {
        if (existing.quantity >= Number(product.stock_quantity)) {
          setError(`Only ${product.stock_quantity} units of ${product.product_name} are available.`)
          return current
        }

        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [
        ...current,
        {
          id: product.id,
          product_name: product.product_name,
          sku: product.sku,
          selling_price: Number(product.selling_price),
          stock_quantity: Number(product.stock_quantity),
          quantity: 1,
        },
      ]
    })
  }

  function changeQuantity(productId, delta) {
    setError('')

    setCart((current) =>
      current.map((item) => {
        if (item.id !== productId) return item

        const nextQuantity = item.quantity + delta

        if (nextQuantity < 1) return item

        if (nextQuantity > item.stock_quantity) {
          setError(`Only ${item.stock_quantity} units available for ${item.product_name}.`)
          return item
        }

        return { ...item, quantity: nextQuantity }
      })
    )
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
  }

  async function completeSale() {
    setError('')
    setSuccess('')

    if (!businessId) {
      setError('No business is linked to this account.')
      return
    }

    if (cart.length === 0) {
      setError('Add at least one product to the sale.')
      return
    }

    if (!Number.isFinite(paid) || paid < 0 || paid > total) {
      setError('Amount paid must be between zero and the sale total.')
      return
    }

    setSaving(true)

    try {
      const client = requireSupabase()

      const orderNumber = `NF-${Date.now()}`

      // Create order record
      const { data: order, error: orderError } = await client
        .from('orders')
        .insert({
          business_id: businessId,
          order_number: orderNumber,
          status: 'confirmed',
          total_amount: total,
          notes: 'Sale recorded through NexusFlow Sales.',
        })
        .select()
        .single()

      if (orderError) throw orderError
      if (!order) throw new Error('Order creation was not confirmed.')

      // Create order items
      const orderItems = cart.map((item) => ({
        business_id: businessId,
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.selling_price,
      }))
      const { error: itemsError } = await client
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        throw new Error(
          `Order was created, but order items could not be saved: ${itemsError.message}`
        )
      }

      // Deduct sold quantities from stock and create movement records
      for (const item of cart) {
        await adjustStock(
          businessId,
          item.id,
          -item.quantity,
          `Sale ${orderNumber}`
        )
      }

      // Record payment received, if any
      if (paid > 0) {
        const { error: paymentError } = await client
          .from('payments')
          .insert({
            business_id: businessId,
            order_id: order.id,
            amount: paid,
            payment_method: paymentMethod,
            status: 'confirmed',
          })

        if (paymentError) {
          throw new Error(
            `Sale and stock were recorded, but payment recording failed: ${paymentError.message}`
          )
        }
      }

      setSuccess(
        `Sale ${orderNumber} recorded successfully. ${
          balance > 0
            ? `Outstanding balance: ${currency.format(balance)}`
            : 'Payment complete.'
        }`
      )

      setCart([])
      setAmountPaid('')
      setPaymentMethod('cash')

      await loadProducts()
    } catch (err) {
      setError(err.message || 'Unable to complete sale.')
    } finally {
      setSaving(false)
    }
  }

  if (businessLoading) {
    return <div className="nf-sales__state">Loading business...</div>
  }

  return (
    <section className="nf-sales">
      <div className="nf-sales__heading">
        <div>
          <span className="nf-sales__eyebrow">POINT OF SALE</span>
          <h1>Sales</h1>
          <p>Record sales and track payments received.</p>
        </div>

        <button
          type="button"
          className="nf-sales__refresh"
          onClick={loadProducts}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh products
        </button>
      </div>

      {error && (
        <div className="nf-sales__message nf-sales__message--error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="nf-sales__message nf-sales__message--success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="nf-sales__layout">
        <div className="nf-sales__products">
          <div className="nf-sales__section-heading">
            <h2>Select products</h2>
            <span>{products.length} products</span>
          </div>

          <div className="nf-sales__search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? (
            <div className="nf-sales__state">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="nf-sales__state">
              <ShoppingCart size={30} />
              <p>No available products found.</p>
            </div>
          ) : (
            <div className="nf-sales__product-grid">
              {filteredProducts.map((product) => (
                <button
                  type="button"
                  className="nf-sales__product-card"
                  key={product.id}
                  onClick={() => addToCart(product)}
                >
                  <div className="nf-sales__product-icon">
                    <ShoppingCart size={19} />
                  </div>

                  <strong>{product.product_name}</strong>
                  <span className="nf-sales__sku">{product.sku}</span>
                  <span className="nf-sales__price">
                    {currency.format(Number(product.selling_price))}
                  </span>
                  <span className="nf-sales__stock">
                    {product.stock_quantity} available
                  </span>
                  <span className="nf-sales__add-label">
                    <Plus size={14} /> Add to sale
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="nf-sales__checkout">
          <div className="nf-sales__checkout-heading">
            <ShoppingCart size={20} />
            <h2>Current sale</h2>
            <span>{cart.length} items</span>
          </div>

          {cart.length === 0 ? (
            <div className="nf-sales__empty-cart">
              <ShoppingCart size={34} />
              <p>Your cart is empty</p>
              <small>Select products to start a sale.</small>
            </div>
          ) : (
            <div className="nf-sales__cart-items">
              {cart.map((item) => (
                <div className="nf-sales__cart-item" key={item.id}>
                  <div className="nf-sales__cart-info">
                    <strong>{item.product_name}</strong>
                    <small>
                      {currency.format(item.selling_price)} each
                    </small>
                  </div>

                  <div className="nf-sales__quantity">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, -1)}
                      aria-label={`Decrease ${item.product_name} quantity`}
                    >
                      <Minus size={14} />
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, 1)}
                      aria-label={`Increase ${item.product_name} quantity`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <strong className="nf-sales__line-total">
                    {currency.format(item.quantity * item.selling_price)}
                  </strong>

                  <button
                    type="button"
                    className="nf-sales__remove"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.product_name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="nf-sales__totals">
            <div>
              <span>Total</span>
              <strong>{currency.format(total)}</strong>
            </div>

            <label>
              Payment method
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Amount paid (₦)
              <input
                type="number"
                min="0"
                max={total}
                step="0.01"
                value={amountPaid}
                onChange={(event) => setAmountPaid(event.target.value)}
                placeholder={total ? String(total) : '0'}
              />
            </label>

            <div className="nf-sales__balance">
              <span>Balance due</span>
              <strong>{currency.format(balance)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="nf-sales__complete"
            onClick={completeSale}
            disabled={saving || cart.length === 0 || loading}
          >
            {saving ? 'Recording sale...' : 'Complete Sale'}
          </button>

          <button
            type="button"
            className="nf-sales__clear"
            onClick={() => {
              setCart([])
              setAmountPaid('')
              setError('')
            }}
            disabled={saving || cart.length === 0}
          >
            Clear sale
          </button>
        </aside>
      </div>
    </section>
  )
}
