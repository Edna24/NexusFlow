
import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  RefreshCw,
  Package,
  AlertTriangle,
  Boxes,
  Plus,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  listProducts,
  createProduct,
} from '../services/inventory/inventoryService'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import './Inventory.css'

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

const emptyForm = {
  product_name: '',
  sku: '',
  description: '',
  selling_price: '',
  opening_stock: '',
  reorder_level: '',
}

export default function Inventory() {
  const { businessId, businessLoading } = useAuth()

  const [products, setProducts] = useState([])
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalStockUnits: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(emptyForm)

  async function loadInventory() {
    if (!businessId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await listProducts(businessId)
      setProducts(result.products)
      setSummary(result.summary)
    } catch (err) {
      setError(err.message || 'Unable to load inventory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (businessLoading) return

    if (!businessId) {
      setProducts([])
      setLoading(false)
      return
    }

    loadInventory()
  }, [businessId, businessLoading])

  async function handleAddProduct(event) {
    event.preventDefault()
    setFormError('')

    if (!form.product_name.trim() || !form.sku.trim()) {
      setFormError('Product name and SKU are required.')
      return
    }

    if (
      form.selling_price === '' ||
      form.opening_stock === '' ||
      form.reorder_level === ''
    ) {
      setFormError('Please complete all required fields.')
      return
    }

    if (
      Number(form.selling_price) < 0 ||
      Number(form.opening_stock) < 0 ||
      Number(form.reorder_level) < 0
    ) {
      setFormError('Values cannot be negative.')
      return
    }

    setSaving(true)

    try {
      await createProduct(businessId, {
        product_name: form.product_name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim(),
        selling_price: Number(form.selling_price),
        opening_stock: Number(form.opening_stock),
        reorder_level: Number(form.reorder_level),
      })

      setForm(emptyForm)
      setFormError('')
      setAddModalOpen(false)
      await loadInventory()
    } catch (err) {
      setFormError(err.message || 'Failed to create product.')
    } finally {
      setSaving(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.product_name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === 'all' ||
        product.stock_status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [products, search, statusFilter])

  function getBadgeTone(status) {
    if (status === 'out_of_stock') return 'danger'
    if (status === 'low_stock') return 'warning'
    return 'success'
  }

  function getStatusLabel(status) {
    if (status === 'out_of_stock') return 'Out of Stock'
    if (status === 'low_stock') return 'Low Stock'
    return 'In Stock'
  }

  if (businessLoading) {
    return (
      <div className="nf-inventory__state">
        Loading business...
      </div>
    )
  }

  return (
    <section className="nf-inventory">
      <div className="nf-inventory__heading">
        <div>
          <span className="nf-inventory__eyebrow">
            PRODUCT MANAGEMENT
          </span>
          <h1>Inventory</h1>
          <p>
            Monitor products, stock levels and restocking needs.
          </p>
        </div>

        <div className="nf-inventory__actions">
          <button
            className="nf-inventory__add"
            type="button"
            onClick={() => {
              setForm(emptyForm)
              setFormError('')
              setAddModalOpen(true)
            }}
            disabled={!businessId}
          >
            <Plus size={16} />
            Add Product
          </button>

          <button
            className="nf-inventory__refresh"
            type="button"
            onClick={loadInventory}
            disabled={loading || !businessId}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="nf-inventory__error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" onClick={loadInventory}>
            Retry
          </button>
        </div>
      )}

      <div className="nf-inventory__stats">
        <div className="nf-inventory__stat">
          <div className="nf-inventory__stat-icon">
            <Package size={20} />
          </div>
          <div>
            <span>Total products</span>
            <strong>{summary.totalProducts}</strong>
          </div>
        </div>

        <div className="nf-inventory__stat">
          <div className="nf-inventory__stat-icon">
            <Boxes size={20} />
          </div>
          <div>
            <span>Total stock units</span>
            <strong>
              {summary.totalStockUnits.toLocaleString('en-NG')}
            </strong>
          </div>
        </div>

        <div className="nf-inventory__stat">
          <div className="nf-inventory__stat-icon nf-inventory__stat-icon--warning">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span>Low stock</span>
            <strong>{summary.lowStockProducts}</strong>
          </div>
        </div>

        <div className="nf-inventory__stat">
          <div className="nf-inventory__stat-icon nf-inventory__stat-icon--danger">
            <Package size={20} />
          </div>
          <div>
            <span>Out of stock</span>
            <strong>{summary.outOfStockProducts}</strong>
          </div>
        </div>
      </div>

      <div className="nf-inventory__catalogue">
        <div className="nf-inventory__catalogue-header">
          <div>
            <h2>Product catalogue</h2>
            <p>{products.length} products registered</p>
          </div>
        </div>

        <div className="nf-inventory__toolbar">
          <div className="nf-inventory__search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter products by stock status"
          >
            <option value="all">All stock statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        {loading ? (
          <div className="nf-inventory__state">
            Loading products...
          </div>
        ) : !error && filteredProducts.length === 0 ? (
          <div className="nf-inventory__state">
            <Package size={32} />
            <strong>
              {products.length === 0
                ? 'No products yet'
                : 'No matching products'}
            </strong>
            <p>
              {products.length === 0
                ? 'Products added to your business will appear here.'
                : 'Try changing your search or stock filter.'}
            </p>
          </div>
        ) : (
          <div className="nf-inventory__table-wrap">
            <table className="nf-inventory__table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Selling price</th>
                  <th>Quantity</th>
                  <th>Reorder level</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.product_name}</strong>
                      {product.description && (
                        <small>{product.description}</small>
                      )}
                    </td>

                    <td>{product.sku || '—'}</td>

                    <td>
                      {currency.format(
                        Number(product.selling_price)
                      )}
                    </td>

                    <td>{product.stock_quantity}</td>

                    <td>{product.reorder_level}</td>

                    <td>
                      <Badge tone={getBadgeTone(product.stock_status)}>
                        {getStatusLabel(product.stock_status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={addModalOpen}
        title="Add new product"
        onClose={() => {
          if (!saving) {
            setAddModalOpen(false)
            setFormError('')
          }
        }}
      >
        <form
          id="add-product-form"
          onSubmit={handleAddProduct}
          className="nf-inventory__form"
        >
          <label>
            Product name *
            <input
              value={form.product_name}
              onChange={(event) =>
                setForm({
                  ...form,
                  product_name: event.target.value,
                })
              }
              placeholder="e.g. Indomie Chicken Noodles"
              required
            />
          </label>

          <label>
            SKU *
            <input
              value={form.sku}
              onChange={(event) =>
                setForm({
                  ...form,
                  sku: event.target.value,
                })
              }
              placeholder="e.g. FOOD-001"
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
              }
              placeholder="Optional product description"
              rows={2}
            />
          </label>

          <label>
            Selling price (₦) *
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.selling_price}
              onChange={(event) =>
                setForm({
                  ...form,
                  selling_price: event.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Opening stock *
            <input
              type="number"
              min="0"
              step="1"
              value={form.opening_stock}
              onChange={(event) =>
                setForm({
                  ...form,
                  opening_stock: event.target.value,
                })
              }
              required
            />
          </label>

          <label>
            Reorder level *
            <input
              type="number"
              min="0"
              step="1"
              value={form.reorder_level}
              onChange={(event) =>
                setForm({
                  ...form,
                  reorder_level: event.target.value,
                })
              }
              required
            />
          </label>

          {formError && (
            <div className="nf-inventory__error" role="alert">
              <AlertTriangle size={16} />
              {formError}
            </div>
          )}
        </form>

        <div className="nf-inventory__modal-actions">
          <button
            type="button"
            onClick={() => setAddModalOpen(false)}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            form="add-product-form"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </Modal>
    </section>
  )
}
