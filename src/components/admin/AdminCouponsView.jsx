import { useEffect, useState } from 'react'
import {
  adminGetCoupons, adminCreateCoupon, adminUpdateCoupon, adminToggleCoupon, adminDeleteCoupon,
} from '../../api.js'
import { useToast } from '../../toast.js'
import { formatINR, formatDate } from '../../format.js'
import Loading from '../Loading.jsx'

const ACTIVE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

const SCOPES = ['', 'platform', 'seller', 'category', 'product']
const SCOPE_LABELS = {
  platform: 'Platform-wide',
  seller: 'Specific sellers',
  category: 'Specific categories',
  product: 'Specific products',
}

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const defaultValidFrom = () => {
  const d = new Date()
  return toInputDate(d.toISOString())
}
const defaultValidTo = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return toInputDate(d.toISOString())
}

export default function AdminCouponsView({ token }) {
  const toast = useToast()
  const [coupons, setCoupons] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState(null) // 'new' | coupon object

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminGetCoupons(token, {
      isActive: isActive === '' ? undefined : isActive,
      page,
      limit: 20,
    })
      .then((res) => {
        if (cancelled) return
        setCoupons(res.data || [])
        setPagination(res.pagination || null)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, isActive, page, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (c) => {
    try {
      await adminToggleCoupon(token, c._id)
      toast.success(`${c.code} ${c.isActive ? 'deactivated' : 'activated'}`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const remove = async (c) => {
    if (!confirm(`Delete coupon ${c.code}? Customers will no longer be able to use it.`)) return
    try {
      await adminDeleteCoupon(token, c._id)
      toast.success(`${c.code} deleted`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const discountLabel = (c) =>
    c.discountType === 'percentage' ? `${c.discountValue}% off` : `${formatINR(c.discountValue)} off`

  const expired = (c) => new Date(c.validTo) < new Date()

  return (
    <div>
      <div className="filters">
        <p className="muted small" style={{ margin: 0, flex: 1 }}>
          Coupons apply at checkout. Platform-wide coupons work for every customer and seller.
        </p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          + New coupon
        </button>
      </div>

      <div className="filters-status">
        {ACTIVE_FILTERS.map((f) => (
          <button key={f.value || 'all'} type="button"
            className={`chip-btn ${isActive === f.value ? 'active' : ''}`}
            onClick={() => { setIsActive(f.value); setPage(1) }}>
            {f.label}
          </button>
        ))}
        <span style={{ width: 10 }} />
        {SCOPES.map((s) => (
          <button key={s || 'all-scopes'} type="button"
            className={`chip-btn ${false ? 'active' : ''}`}
            style={{ opacity: s ? 1 : 0.5 }}
            onClick={() => { if (s) toast.info(`Showing ${SCOPE_LABELS[s]?.toLowerCase()} coupons — filter from the API by scope.`) }}>
            {s ? SCOPE_LABELS[s] : 'All scopes'}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading coupons…" />}

      {!loading && error && coupons.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load coupons. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && coupons.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🎟️</div>
          <h2>No coupons {isActive === 'true' ? 'active' : isActive === 'false' ? 'inactive' : 'yet'}</h2>
          <p>Create one — e.g. WELCOME10: 10% off, min order ₹1000, valid for 30 days.</p>
        </div>
      )}

      {!loading && coupons.length > 0 && (
        <>
          <div className="orders-list">
            {coupons.map((c) => (
              <div className="order-card" key={c._id}>
                <div className="order-card-head">
                  <div>
                    <strong style={{ letterSpacing: 1 }}>{c.code}</strong>
                    <p className="muted small">
                      {discountLabel(c)}
                      {c.discountType === 'percentage' && c.maxDiscountAmount ? ` (max ${formatINR(c.maxDiscountAmount)})` : ''}
                      {c.minOrderAmount > 0 ? ` · min order ${formatINR(c.minOrderAmount)}` : ''}
                    </p>
                    {c.description && <p className="muted small">{c.description}</p>}
                  </div>
                  <div className="badges">
                    <span className={`badge ${c.isActive && !expired(c) ? 'badge-success' : 'badge-muted'}`}>
                      {expired(c) ? 'Expired' : c.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="badge badge-status">{SCOPE_LABELS[c.scope] || c.scope}</span>
                  </div>
                </div>
                <div className="order-card-foot">
                  <span className="muted small">
                    {formatDate(c.validFrom)} → {formatDate(c.validTo)} · used {c.usedCount ?? 0}
                    {c.maxUsageTotal ? `/${c.maxUsageTotal}` : ''} times · by {c.createdBy?.name || '—'}
                  </span>
                  <div className="order-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => toggle(c)}>
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(c)}>Edit</button>
                    <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => remove(c)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} coupons</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {editing && (
        <CouponModal
          token={token}
          coupon={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setRefresh((r) => r + 1)}
        />
      )}
    </div>
  )
}

function CouponModal({ token, coupon, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = Boolean(coupon)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discountType: coupon?.discountType || 'percentage',
    discountValue: coupon?.discountValue ?? '',
    maxDiscountAmount: coupon?.maxDiscountAmount ?? '',
    minOrderAmount: coupon?.minOrderAmount ?? 0,
    maxUsageTotal: coupon?.maxUsageTotal ?? '',
    maxUsagePerUser: coupon?.maxUsagePerUser ?? 1,
    validFrom: isEdit ? toInputDate(coupon.validFrom) : defaultValidFrom(),
    validTo: isEdit ? toInputDate(coupon.validTo) : defaultValidTo(),
    scope: coupon?.scope || 'platform',
  }))

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.code.trim() || !form.discountValue || !form.validFrom || !form.validTo) {
      toast.error('Code, discount value, and both dates are required')
      return
    }
    if (new Date(form.validTo) < new Date(form.validFrom)) {
      toast.error('“Valid to” must be after “valid from”')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await adminUpdateCoupon(token, coupon._id, {
          description: form.description.trim(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
          minOrderAmount: Number(form.minOrderAmount) || 0,
          maxUsageTotal: form.maxUsageTotal ? Number(form.maxUsageTotal) : null,
          maxUsagePerUser: Number(form.maxUsagePerUser) || 1,
          validFrom: form.validFrom,
          validTo: form.validTo,
          scope: form.scope,
        })
        toast.success(`${coupon.code} updated ✓`)
      } else {
        await adminCreateCoupon(token, {
          code: form.code.trim().toUpperCase(),
          description: form.description.trim(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
          minOrderAmount: Number(form.minOrderAmount) || 0,
          maxUsageTotal: form.maxUsageTotal ? Number(form.maxUsageTotal) : null,
          maxUsagePerUser: Number(form.maxUsagePerUser) || 1,
          validFrom: form.validFrom,
          validTo: form.validTo,
          scope: form.scope,
        })
        toast.success(`${form.code.toUpperCase()} created ✓`)
      }
      onSaved?.()
      onClose()
    } catch (err) {
      if (err.status !== 401) { setError(err.message); toast.error(err.message) }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>{isEdit ? `Edit ${coupon.code}` : 'New coupon'}</h2>

        <form onSubmit={submit} className="form">
          <label>
            Code *
            <input value={form.code} onChange={set('code')} disabled={isEdit}
              placeholder="WELCOME10" style={{ textTransform: 'uppercase' }} />
            {isEdit && <span className="muted small">Codes can't be changed after creation.</span>}
          </label>

          <label>
            Description
            <input value={form.description} onChange={set('description')}
              placeholder="10% off your first order" />
          </label>

          <div className="address-grid">
            <label>
              Discount type *
              <select className="select" value={form.discountType} onChange={set('discountType')}>
                <option value="percentage">% off</option>
                <option value="flat">Flat ₹ off</option>
              </select>
            </label>
            <label>
              Discount value *
              <input type="number" min="0" step="0.01" value={form.discountValue} onChange={set('discountValue')}
                placeholder={form.discountType === 'percentage' ? '10' : '500'} />
            </label>
          </div>

          <div className="address-grid">
            <label>
              Max discount (₹)
              <input type="number" min="0" value={form.maxDiscountAmount} onChange={set('maxDiscountAmount')}
                placeholder="500 (percentage cap — optional)" disabled={form.discountType !== 'percentage'} />
            </label>
            <label>
              Min order amount (₹)
              <input type="number" min="0" value={form.minOrderAmount} onChange={set('minOrderAmount')} placeholder="1000" />
            </label>
          </div>

          <div className="address-grid">
            <label>
              Total usage limit
              <input type="number" min="0" value={form.maxUsageTotal} onChange={set('maxUsageTotal')}
                placeholder="Unlimited if empty" />
            </label>
            <label>
              Uses per customer
              <input type="number" min="1" value={form.maxUsagePerUser} onChange={set('maxUsagePerUser')} />
            </label>
          </div>

          <div className="address-grid">
            <label>
              Valid from *
              <input type="date" value={form.validFrom} onChange={set('validFrom')} />
            </label>
            <label>
              Valid to *
              <input type="date" value={form.validTo} onChange={set('validTo')} />
            </label>
          </div>

          <label>
            Scope
            <select className="select" value={form.scope} onChange={set('scope')}>
              {SCOPES.slice(1).map((s) => (
                <option key={s} value={s}>{SCOPE_LABELS[s]}</option>
              ))}
            </select>
            {form.scope !== 'platform' && (
              <span className="muted small">Targeted coupons currently apply platform-wide until specific sellers/categories/products are linked.</span>
            )}
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {isEdit ? 'Save changes' : 'Create coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
