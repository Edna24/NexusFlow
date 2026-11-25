
import { useEffect, useState } from 'react'
import { RefreshCw, Save, Store, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../services/supabase'
import './Settings.css'

export default function Settings() {
  const { businessId, businessLoading } = useAuth()

  const [form, setForm] = useState({
    business_name: '',
    email: '',
    phone: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadBusiness(isRefresh = false) {
    if (!businessId) {
      setLoading(false)
      return
    }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    setError('')
    setSuccess('')

    try {
      const client = requireSupabase()

      const { data, error: queryError } = await client
        .from('businesses')
        .select('id, business_name, email, phone')
        .eq('id', businessId)
        .single()

      if (queryError) throw queryError

      setForm({
        business_name: data.business_name || '',
        email: data.email || '',
        phone: data.phone || '',
      })
    } catch (err) {
      setError(err.message || 'Unable to load business settings.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (businessLoading) return
    loadBusiness()
  }, [businessId, businessLoading])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setError('')
    setSuccess('')
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!businessId) {
      setError('No business is currently connected.')
      return
    }

    if (!form.business_name.trim()) {
      setError('Business name is required.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const client = requireSupabase()

      const { error: updateError } = await client
        .from('businesses')
        .update({
          business_name: form.business_name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        })
        .eq('id', businessId)

      if (updateError) throw updateError

      setSuccess('Business profile updated successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save business settings.')
    } finally {
      setSaving(false)
    }
  }

  if (businessLoading) {
    return <div className="nf-settings__state">Loading business...</div>
  }

  return (
    <section className="nf-settings">
      <div className="nf-settings__heading">
        <div>
          <span className="nf-settings__eyebrow">BUSINESS CONFIGURATION</span>
          <h1>Settings</h1>
          <p>Manage your business profile and basic preferences.</p>
        </div>

        <button
          className="nf-settings__refresh"
          type="button"
          onClick={() => loadBusiness(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="nf-settings__alert nf-settings__alert--error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="nf-settings__alert nf-settings__alert--success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      <div className="nf-settings__card">
        <div className="nf-settings__card-heading">
          <div className="nf-settings__icon">
            <Store size={20} />
          </div>

          <div>
            <h2>Business profile</h2>
            <p>Update the contact information associated with your business.</p>
          </div>
        </div>

        {loading ? (
          <div className="nf-settings__state">Loading profile...</div>
        ) : (
          <form className="nf-settings__form" onSubmit={handleSave}>
            <div className="nf-settings__field">
              <label htmlFor="business_name">Business name</label>
              <input
                id="business_name"
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
                placeholder="Enter business name"
                required
              />
            </div>

            <div className="nf-settings__field">
              <label htmlFor="email">Business email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="business@example.com"
              />
            </div>

            <div className="nf-settings__field">
              <label htmlFor="phone">Business phone</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter business phone number"
              />
            </div>

            <div className="nf-settings__form-footer">
              <button
                className="nf-settings__save"
                type="submit"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="nf-settings__card nf-settings__info-card">
        <h2>Regional preferences</h2>

        <div className="nf-settings__preference">
          <div>
            <strong>Currency</strong>
            <p>Default currency used throughout NexusFlow.</p>
          </div>
          <span className="nf-settings__preference-value">NGN — Nigerian Naira</span>
        </div>

        <div className="nf-settings__preference">
          <div>
            <strong>Business region</strong>
            <p>Regional formatting for business transactions.</p>
          </div>
          <span className="nf-settings__preference-value">Nigeria</span>
        </div>
      </div>

      <div className="nf-settings__note">
        <strong>More settings coming later</strong>
        <p>
          Team access, notification controls, integrations and advanced
          preferences will be added as NexusFlow expands.
        </p>
      </div>
    </section>
  )
}
