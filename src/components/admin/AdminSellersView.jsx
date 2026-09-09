import { useEffect, useState } from 'react'
import { adminGetSellers, adminGetSeller, adminVerifySeller, adminRejectSeller, adminDeactivateSeller, adminActivateSeller } from '../../api.js'
import { useToast } from '../../toast.js'
import { formatINR, formatDate } from '../../format.js'
import Loading from '../Loading.jsx'

const BUSINESS_TYPES = {
  individual: 'Individual',
  partnership: 'Partnership',
  private_ltd: 'Private Ltd',
  llp: 'LLP',
}

const STATUS_FILTERS = [
  { value: '', label: 'All sellers' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_BADGES = {
  pending: { label: 'Pending approval', cls: 'badge-status' },
  approved: { label: 'Approved', cls: 'badge-success' },
  rejected: { label: 'Rejected', cls: 'badge-danger' },
}

const statusBadge = (s) => STATUS_BADGES[s.status] || (s.isVerified ? STATUS_BADGES.approved : STATUS_BADGES.pending)

export default function AdminSellersView({ token, onChange }) {
  const toast = useToast()
  const [sellers, setSellers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminGetSellers(token, {
      status: status || undefined,
      search: appliedSearch || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (cancelled) return
        setSellers(res.data || [])
        setPagination(res.pagination || null)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, status, appliedSearch, page, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()) }

  const verify = async (s) => {
    if (!confirm(`Approve "${s.businessName}"? They will be able to log in and list products.`)) return
    try {
      await adminVerifySeller(token, s._id)
      toast.success(`${s.businessName} approved ✓`)
      setRefresh((r) => r + 1)
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const reject = async (s) => {
    const reason = prompt(`Reason for rejecting "${s.businessName}" (sent to the seller):`)
    if (reason === null) return
    if (!reason.trim()) {
      toast.error('A rejection reason is required.')
      return
    }
    try {
      await adminRejectSeller(token, s._id, reason.trim())
      toast.success(`${s.businessName} rejected`)
      setRefresh((r) => r + 1)
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const deactivate = async (s) => {
    if (!confirm(`Deactivate "${s.businessName}"? Their products will no longer be operable from their account.`)) return
    try {
      await adminDeactivateSeller(token, s._id)
      setSellers((prev) => prev.map((x) => (x._id === s._id ? { ...x, isActive: false } : x)))
      toast.success(`${s.businessName} deactivated`)
      setRefresh((r) => r + 1)
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const activate = async (s) => {
    if (!confirm(`Reactivate "${s.businessName}"? They will be able to log in again.`)) return
    try {
      await adminActivateSeller(token, s._id)
      setSellers((prev) => prev.map((x) => (x._id === s._id ? { ...x, isActive: true } : x)))
      toast.success(`${s.businessName} reactivated ✓`)
      setRefresh((r) => r + 1)
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="filters">
        <form className="search-form" onSubmit={submitSearch}>
          <input type="search" placeholder="Search by business name…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>

      <div className="filters-status">
        {STATUS_FILTERS.map((f) => (
          <button key={f.value || 'all'} type="button"
            className={`chip-btn ${status === f.value ? 'active' : ''}`}
            onClick={() => { setStatus(f.value); setPage(1) }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading sellers…" />}

      {!loading && error && sellers.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load sellers. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && sellers.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🏪</div>
          <h2>No sellers {status === 'pending' ? 'awaiting approval' : status === 'rejected' ? 'rejected' : 'found'}</h2>
          <p>When someone registers as a seller, their application appears here.</p>
        </div>
      )}

      {!loading && sellers.length > 0 && (
        <>
          <div className="orders-list">
            {sellers.map((s) => (
              <div className="order-card" key={s._id}>
                <div className="order-card-head">
                  <div>
                    <strong>{s.businessName}</strong>
                    <p className="muted small">
                      {s.user?.name || '—'} · {s.user?.email || '—'}{s.user?.phone ? ` · ${s.user.phone}` : ''}
                    </p>
                    <p className="muted small">Applied {formatDate(s.createdAt)} · {BUSINESS_TYPES[s.businessType] || s.businessType}</p>
                  </div>
                  <div className="badges">
                    <span className={`badge ${statusBadge(s).cls}`}>
                      {statusBadge(s).label}
                    </span>
                    <span className={`badge ${s.isActive ? 'badge-muted' : 'badge-danger'}`}>
                      {s.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </div>
                </div>
                <div className="order-card-foot">
                  <span className="muted small">
                    {s.stats?.totalProducts ?? 0} products · {s.stats?.totalOrders ?? 0} orders · {formatINR(s.stats?.totalRevenue)} revenue · ★ {s.stats?.avgRating ?? 0} · {s.commissionRate ?? 10}% commission
                  </span>
                  <div className="order-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetailId(s._id)}>View</button>
                    {!s.isVerified && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => verify(s)}>Approve</button>
                    )}
                    {s.status !== 'rejected' && !s.isVerified && (
                      <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => reject(s)}>Reject</button>
                    )}
                    {s.isActive && s.isVerified && (
                      <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => deactivate(s)}>Deactivate</button>
                    )}
                    {!s.isActive && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => activate(s)}>Activate</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} sellers</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {detailId && (
        <SellerDetailModal
          token={token}
          sellerId={detailId}
          onClose={() => setDetailId(null)}
          onVerify={verify}
          onReject={reject}
          onDeactivate={deactivate}
          onActivate={activate}
        />
      )}
    </div>
  )
}

function SellerDetailModal({ token, sellerId, onClose, onVerify, onReject, onDeactivate, onActivate }) {
  const toast = useToast()
  const [seller, setSeller] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    adminGetSeller(token, sellerId)
      .then((res) => { if (!cancelled) setSeller(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) { setError(err.message); toast.error(err.message) } })
    return () => { cancelled = true }
  }, [token, sellerId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {!seller && !error && <Loading label="Loading seller…" />}
        {error && !seller && <p className="muted small">Couldn't load this seller — close and try again.</p>}

        {seller && (
          <>
            <h2>{seller.businessName}</h2>
            <p className="muted small">{BUSINESS_TYPES[seller.businessType] || seller.businessType} · Applied {formatDate(seller.createdAt)}</p>
            <div className="badges" style={{ margin: '10px 0' }}>
              <span className={`badge ${statusBadge(seller).cls}`}>
                {statusBadge(seller).label}
              </span>
              <span className={`badge ${seller.isActive ? 'badge-muted' : 'badge-danger'}`}>
                {seller.isActive ? 'Active' : 'Deactivated'}
              </span>
              <span className="badge badge-muted">{seller.commissionRate ?? 10}% commission</span>
            </div>

            {seller.status === 'rejected' && seller.rejectionReason && (
              <p className="muted small" style={{ marginTop: 8 }}>
                <strong>Rejection reason:</strong> {seller.rejectionReason}
              </p>
            )}

            <h3 className="section-title">Owner</h3>
            <p className="muted small">
              {seller.user?.name} · {seller.user?.email}{seller.user?.phone ? ` · ${seller.user.phone}` : ''}
            </p>

            <h3 className="section-title">Performance</h3>
            <div className="stat-grid" style={{ marginBottom: 0 }}>
              <div className="stat-card">
                <span className="stat-label">Products</span>
                <span className="stat-num">{seller.stats?.totalProducts ?? 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Orders</span>
                <span className="stat-num">{seller.stats?.totalOrders ?? 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Revenue</span>
                <span className="stat-num">{formatINR(seller.stats?.totalRevenue)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Rating</span>
                <span className="stat-num">★ {seller.stats?.avgRating ?? 0}</span>
              </div>
            </div>

            {seller.store ? (
              <>
                <h3 className="section-title">Store</h3>
                <p>
                  <strong>{seller.store.name}</strong>
                  {seller.store.tagline && <span className="muted small"> — {seller.store.tagline}</span>}
                </p>
                {seller.store.address && (
                  <p className="muted small">
                    {[seller.store.address.street, seller.store.address.city, seller.store.address.state, seller.store.address.pincode]
                      .filter(Boolean).join(', ') || 'No address set'}
                  </p>
                )}
                <p className="muted small">
                  ★ {seller.store.ratings?.average ?? 0} store rating · {seller.store.ratings?.count ?? 0} ratings · {seller.store.isActive ? 'Store active' : 'Store inactive'}
                </p>
              </>
            ) : (
              <p className="muted small" style={{ marginTop: 12 }}>No store created yet — the seller hasn't set one up.</p>
            )}

            <div className="modal-actions">
              {!seller.isVerified && (
                <button type="button" className="btn btn-primary" onClick={() => { onVerify(seller); onClose() }}>
                  Approve seller
                </button>
              )}
              {seller.status !== 'rejected' && !seller.isVerified && (
                <button type="button" className="btn btn-danger-ghost" onClick={() => { onReject(seller); onClose() }}>
                  Reject…
                </button>
              )}
              {seller.isActive && seller.isVerified && (
                <button type="button" className="btn btn-danger-ghost" onClick={() => { onDeactivate(seller); onClose() }}>
                  Deactivate
                </button>
              )}
              {!seller.isActive && (
                <button type="button" className="btn btn-primary" onClick={() => { onActivate(seller); onClose() }}>
                  Reactivate
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
