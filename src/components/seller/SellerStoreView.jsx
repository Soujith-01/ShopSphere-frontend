import { useEffect, useState } from 'react'
import { sellerCreateStore, sellerUpdateStore } from '../../api.js'
import { useToast } from '../../toast.js'
import { formatDateTime } from '../../format.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'
import ImageEditorPicker from './ImageEditorPicker.jsx'

const EMPTY = {
  name: '', tagline: '', description: '',
  logoUrl: '', logoPublicId: '', bannerUrl: '', bannerPublicId: '',
  street: '', city: '', state: '', pincode: '',
  shippingPolicy: '', returnPolicy: '',
  website: '', instagram: '', facebook: '', twitter: '',
}

export default function SellerStoreView({ token, store, onStoreSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  // Hydrate the form whenever the store prop resolves/changes.
  useEffect(() => {
    if (store === undefined) return
    setForm(store ? fromStore(store) : { ...EMPTY })
  }, [store])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
  }
  const setAddress = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setFieldErrors({ name: 'Store name is required.' })
      return
    }
    setSaving(true)
    const body = toPayload(form)
    try {
      const res = store
        ? await sellerUpdateStore(token, body)
        : await sellerCreateStore(token, body)
      toast.success(store ? 'Store updated ✓' : 'Store created ✓')
      setEditing(false) // back to the summary view
      onStoreSaved?.(res.data)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (store === undefined || !form) return <Loading label="Loading your store…" />

  // Fresh store → show the creation form. Existing store → summary by default,
  // with the edit form behind the "Edit store" button.
  const showForm = !store || editing

  if (!showForm) return <StoreSummary store={store} onEdit={() => setEditing(true)} />

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{store ? 'Edit your store' : 'Create your store'}</h2>
        {store && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="form">
        <div className="fieldset">
          <p className="fieldset-title">Identity</p>
          <label>
            Store name *
            <input value={form.name} onChange={set('name')} placeholder="My Store Co." />
          </label>
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          <label>
            Tagline
            <input value={form.tagline} onChange={set('tagline')} placeholder="Short punchy line about your store" />
          </label>
          <label>
            Description
            <textarea value={form.description} onChange={set('description')} rows={3}
              placeholder="What do you sell, what makes your store special…" />
          </label>
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Media</p>
          <MediaRow
            label="Logo"
            token={token}
            url={form.logoUrl}
            onPick={(item) => setForm((f) => ({ ...f, logoUrl: item.url, logoPublicId: item.publicId || '' }))}
            onRemove={() => setForm((f) => ({ ...f, logoUrl: '', logoPublicId: '' }))}
          />
          <MediaRow
            label="Banner"
            token={token}
            url={form.bannerUrl}
            onPick={(item) => setForm((f) => ({ ...f, bannerUrl: item.url, bannerPublicId: item.publicId || '' }))}
            onRemove={() => setForm((f) => ({ ...f, bannerUrl: '', bannerPublicId: '' }))}
          />
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Address</p>
          <div className="address-grid">
            <input placeholder="Street / area" value={form.street} onChange={setAddress('street')} />
            <input placeholder="City" value={form.city} onChange={setAddress('city')} />
            <input placeholder="State" value={form.state} onChange={setAddress('state')} />
            <input placeholder="Pincode" value={form.pincode} onChange={setAddress('pincode')} />
          </div>
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Policies</p>
          <label>
            Shipping policy
            <textarea value={form.shippingPolicy} onChange={set('shippingPolicy')} rows={2} placeholder="Dispatch time, courier, charges…" />
          </label>
          <label>
            Return policy
            <textarea value={form.returnPolicy} onChange={set('returnPolicy')} rows={2} placeholder="Return window and conditions…" />
          </label>
        </div>

        <div className="fieldset">
          <p className="fieldset-title">Social links</p>
          <div className="address-grid">
            <input placeholder="Website" value={form.website} onChange={set('website')} />
            <input placeholder="Instagram" value={form.instagram} onChange={set('instagram')} />
            <input placeholder="Facebook" value={form.facebook} onChange={set('facebook')} />
            <input placeholder="Twitter / X" value={form.twitter} onChange={set('twitter')} />
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? <><Spinner small /> Saving…</> : (store ? 'Save changes' : 'Create store')}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Read-only store summary ────────────────────────────────────────────────

function StoreSummary({ store, onEdit }) {
  const address = [store.address?.street, store.address?.city, store.address?.state, store.address?.pincode]
    .filter(Boolean).join(', ')
  const socials = [
    { key: 'Website', url: store.socialLinks?.website },
    { key: 'Instagram', url: store.socialLinks?.instagram },
    { key: 'Facebook', url: store.socialLinks?.facebook },
    { key: 'Twitter / X', url: store.socialLinks?.twitter },
  ].filter((s) => s.url)

  return (
    <div className="panel store-summary">
      <div className="store-hero">
        {store.banner?.url
          ? <img className="store-banner" src={store.banner.url} alt={`${store.name} banner`} />
          : <div className="store-banner store-banner-empty">🏪</div>}

        <div className="store-hero-bar">
          <div className="store-id">
            <div className="store-logo">{store.logo?.url ? <img src={store.logo.url} alt={`${store.name} logo`} /> : '🏪'}</div>
            <div>
              <h2 className="store-name">{store.name}</h2>
              {store.tagline && <p className="muted small" style={{ margin: 0 }}>{store.tagline}</p>}
              <p className="muted small" style={{ margin: '2px 0 0' }}>shopsphere/store/{store.slug}</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={onEdit}>Edit store</button>
        </div>
      </div>

      <div className="store-badges badges">
        <span className={`badge ${store.isActive ? 'badge-success' : 'badge-muted'}`}>
          {store.isActive ? 'Active' : 'Inactive'}
        </span>
        {store.isFeatured && <span className="badge badge-status">⭐ Featured</span>}
        <span className="badge badge-muted">
          ★ {Number(store.ratings?.average || 0).toFixed(1)} · {store.ratings?.count ?? 0} reviews
        </span>
      </div>

      {store.description && (
        <div className="store-fact">
          <span className="muted small">Description</span>
          <p style={{ margin: 0 }}>{store.description}</p>
        </div>
      )}

      <div className="store-facts">
        <div className="store-fact">
          <span className="muted small">Address</span>
          <p style={{ margin: 0 }}>{address || 'Not set yet'}</p>
        </div>
        <div className="store-fact">
          <span className="muted small">Shipping policy</span>
          <p style={{ margin: 0 }}>{store.policies?.shippingPolicy || 'Not set yet'}</p>
        </div>
        <div className="store-fact">
          <span className="muted small">Return policy</span>
          <p style={{ margin: 0 }}>{store.policies?.returnPolicy || 'Not set yet'}</p>
        </div>
        <div className="store-fact">
          <span className="muted small">Links</span>
          {socials.length === 0
            ? <p style={{ margin: 0 }}>Not set yet</p>
            : (
              <p style={{ margin: 0 }}>
                {socials.map((s, i) => (
                  <span key={s.key}>
                    {i > 0 && ' · '}
                    <a href={s.url} target="_blank" rel="noreferrer">{s.key}</a>
                  </span>
                ))}
              </p>
            )}
        </div>
      </div>

      <p className="muted small" style={{ margin: 0 }}>
        Created {formatDateTime(store.createdAt)} · Last updated {formatDateTime(store.updatedAt)}
      </p>
    </div>
  )
}

function MediaRow({ label, token, url, onPick, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span className="muted small" style={{ minWidth: 56, fontWeight: 600 }}>{label}</span>
      <div className="img-chip">{url ? <img src={url} alt={label} /> : <span>🖼️</span>}</div>
      <ImageEditorPicker
        token={token}
        label={`Upload ${label.toLowerCase()}`}
        hint="Crop & resize before upload"
        onDone={(added) => { if (added[0]) onPick(added[0]) }}
      />
      {url && (
        <button type="button" className="btn btn-sm btn-danger-ghost" onClick={onRemove}>Remove</button>
      )}
    </div>
  )
}

// Convert model → form state and back. Nested fields are flattened for the form.
const fromStore = (s) => ({
  name: s.name || '', tagline: s.tagline || '', description: s.description || '',
  logoUrl: s.logo?.url || '', logoPublicId: s.logo?.publicId || '',
  bannerUrl: s.banner?.url || '', bannerPublicId: s.banner?.publicId || '',
  street: s.address?.street || '', city: s.address?.city || '',
  state: s.address?.state || '', pincode: s.address?.pincode || '',
  shippingPolicy: s.policies?.shippingPolicy || '', returnPolicy: s.policies?.returnPolicy || '',
  website: s.socialLinks?.website || '', instagram: s.socialLinks?.instagram || '',
  facebook: s.socialLinks?.facebook || '', twitter: s.socialLinks?.twitter || '',
})

const toPayload = (f) => ({
  name: f.name.trim(), tagline: f.tagline.trim(), description: f.description.trim(),
  logo: { url: f.logoUrl.trim(), publicId: f.logoPublicId || (f.logoUrl.trim() ? 'manual' : '') },
  banner: { url: f.bannerUrl.trim(), publicId: f.bannerPublicId || (f.bannerUrl.trim() ? 'manual' : '') },
  address: {
    street: f.street.trim(), city: f.city.trim(), state: f.state.trim(), pincode: f.pincode.trim(),
  },
  policies: { shippingPolicy: f.shippingPolicy.trim(), returnPolicy: f.returnPolicy.trim() },
  socialLinks: {
    website: f.website.trim(), instagram: f.instagram.trim(),
    facebook: f.facebook.trim(), twitter: f.twitter.trim(),
  },
})
