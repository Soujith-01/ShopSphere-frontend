import { useEffect, useState } from 'react'
import {
  adminGetProducts, adminGetModerationQueue,
  adminApproveProduct, adminRejectProduct, adminToggleFeaturedProduct,
} from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatINR, formatDateTime, productImageUrl, getDiscountLabel,
  PRODUCT_STATUS_LABELS, productStatusFlavor,
} from '../../format.js'
import Loading from '../Loading.jsx'

const STATUS_FILTERS = ['pending', 'rejected', 'active', 'inactive', 'draft', '']

export default function AdminProductsView({ token, onChange }) {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [detail, setDetail] = useState(null)
  const [rejecting, setRejecting] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    // The default pending queue uses the moderation endpoint (oldest first so
    // the longest-waiting submissions come up top); everything else uses the
    // general admin product list.
    const fetcher = status === 'pending' && !appliedSearch
      ? adminGetModerationQueue(token, { page, limit: 20 })
      : adminGetProducts(token, {
          status: status || undefined,
          search: appliedSearch || undefined,
          page,
          limit: 20,
        })
    fetcher
      .then((res) => {
        if (cancelled) return
        setProducts(res.data || [])
        setPagination(res.pagination || null)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, status, appliedSearch, page, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()) }

  const approve = async (p) => {
    if (!confirm(`Approve "${p.name}"? It becomes live in the marketplace immediately.`)) return
    try {
      await adminApproveProduct(token, p._id)
      toast.success(`"${p.name}" approved and live ✓`)
      setRefresh((r) => r + 1)
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const approveFromModal = async (p) => {
    try {
      await adminApproveProduct(token, p._id)
      toast.success(`"${p.name}" approved and live ✓`)
      setRefresh((r) => r + 1)
      onChange?.()
      return true
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
      return false
    }
  }

  const toggleFeatured = async (p) => {
    try {
      const res = await adminToggleFeaturedProduct(token, p._id)
      toast.success(res.message || 'Updated')
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="filters">
        <form className="search-form" onSubmit={submitSearch}>
          <input type="search" placeholder="Search all products…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>

      <div className="filters-status">
        {STATUS_FILTERS.map((s) => (
          <button key={s || 'all'} type="button"
            className={`chip-btn ${status === s ? 'active' : ''}`}
            onClick={() => { setStatus(s); setPage(1) }}>
            {s ? PRODUCT_STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      {loading && <Loading label={status === 'pending' ? 'Loading moderation queue…' : 'Loading products…'} />}

      {!loading && error && products.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load products. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🛍️</div>
          <h2>{status === 'pending' ? 'Nothing waiting for review' : `No ${PRODUCT_STATUS_LABELS[status]?.toLowerCase() || ''} products`}</h2>
          <p>{status === 'pending' ? 'The moderation queue is clear. 🎉' : 'Try a different filter or search term.'}</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className="orders-list">
            {products.map((p) => (
              <div className="order-card" key={p._id}>
                <div className="order-card-head">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="cart-item-media">
                      {productImageUrl(p)
                        ? <img src={productImageUrl(p)} alt={p.name} />
                        : <div className="img-ph">📦</div>}
                    </div>
                    <div>
                      <strong>{p.name}</strong>
                      <p className="muted small">
                        {p.seller?.businessName || '—'} · {p.category?.name || 'Uncategorised'} · {formatINR(p.price)}
                      </p>
                      <p className="muted small">Submitted {formatDateTime(p.createdAt)}</p>
                      {p.rejectionReason && (
                        <p className="muted small" style={{ color: 'var(--danger)' }}>Rejected: {p.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="badges">
                    <span className={`badge badge-${productStatusFlavor(p.status)}`}>
                      {PRODUCT_STATUS_LABELS[p.status] || p.status}
                    </span>
                    {p.isFeatured && <span className="badge badge-status">⭐ Featured</span>}
                    {p.stats?.totalSold > 0 && <span className="badge badge-muted">{p.stats.totalSold} sold</span>}
                  </div>
                </div>
                <div className="order-card-foot">
                  <span className="muted small">
                    {p.description ? p.description.slice(0, 90) + (p.description.length > 90 ? '…' : '') : 'No description'}
                  </span>
                  <div className="order-actions">
                    {p.status === 'pending' && (
                      <>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => approve(p)}>Approve</button>
                        <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setRejecting(p)}>Reject</button>
                      </>
                    )}
                    {p.status === 'active' && (
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => toggleFeatured(p)}>
                        {p.isFeatured ? 'Unfeature' : '⭐ Feature'}
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetail(p)}>Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} products</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {detail && (
        <ProductDetailModal
          product={detail}
          onClose={() => setDetail(null)}
          onApprove={approveFromModal}
          onReject={() => { setDetail(null); setRejecting(detail) }}
        />
      )}

      {rejecting && (
        <RejectModal
          token={token}
          product={rejecting}
          onClose={() => setRejecting(null)}
          onRejected={() => { setRefresh((r) => r + 1); onChange?.() }}
        />
      )}
    </div>
  )
}

function ProductDetailModal({ product, onClose, onApprove, onReject }) {
  const discountLabel = getDiscountLabel(product?.discount)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-grid">
          <div className="modal-media">
            {discountLabel && (
              <span className="product-discount-badge modal-discount-badge" aria-label={`Discount: ${discountLabel}`}>
                {discountLabel}
              </span>
            )}
            {productImageUrl(product)
              ? <img src={productImageUrl(product)} alt={product.name} />
              : <div className="img-ph img-ph-lg">📦</div>}
          </div>
          <div className="modal-info">
            <h2>{product.name}</h2>
            <div className="badges">
              <span className={`badge badge-${productStatusFlavor(product.status)}`}>
                {PRODUCT_STATUS_LABELS[product.status] || product.status}
              </span>
              {product.isFeatured && <span className="badge badge-status">⭐ Featured</span>}
            </div>
            <p className="muted small">
              {product.seller?.businessName || '—'} · {product.category?.name || 'Uncategorised'} · {formatINR(product.price)}
            </p>
            <p className="product-desc">{product.description || 'No description provided.'}</p>
            <p className="muted small">Submitted {formatDateTime(product.createdAt)}</p>
            {product.rejectionReason && (
              <p className="muted small" style={{ color: 'var(--danger)' }}>Previously rejected: {product.rejectionReason}</p>
            )}

            <div className="modal-actions">
              {product.status === 'pending' && (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => onApprove(product).then((ok) => ok && onClose())}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-danger-ghost" onClick={onReject}>Reject</button>
                </>
              )}
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RejectModal({ token, product, onClose, onRejected }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) { toast.error('Please tell the seller why this product is rejected'); return }
    setSaving(true)
    setError('')
    try {
      await adminRejectProduct(token, product._id, reason.trim())
      toast.success(`"${product.name}" rejected`)
      onRejected?.()
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
        <h2>Reject “{product.name}”</h2>
        <p className="muted small">The seller is notified with your reason and can fix and resubmit the product.</p>

        <form onSubmit={submit} className="form">
          <label>
            Rejection reason *
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
              placeholder="e.g. Product images are stock photos — please upload real photos of the item." />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger-ghost" disabled={saving}>Reject product</button>
          </div>
        </form>
      </div>
    </div>
  )
}
