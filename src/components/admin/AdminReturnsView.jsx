import { useEffect, useState } from 'react'
import { adminGetReturnStats, adminGetReturns, adminGetReturn } from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatINR, formatDateTime,
  RETURN_STATUS_LABELS, RETURN_REASON_LABELS, returnStatusFlavor, productImageUrl,
} from '../../format.js'
import Loading from '../Loading.jsx'

const STATUS_FILTERS = ['', 'pending', 'approved', 'picked_up', 'returned_to_store', 'received', 'rejected']

export default function AdminReturnsView({ token }) {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [returns, setReturns] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    adminGetReturnStats(token)
      .then((res) => setStats(res.data))
      .catch((err) => { if (err.status !== 401) toast.error(err.message) })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminGetReturns(token, {
      status: status || undefined,
      search: appliedSearch || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (cancelled) return
        setReturns(res.data || [])
        setPagination(res.pagination || null)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, status, appliedSearch, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(search.trim())
  }

  const getCountForFilter = (s) => {
    if (!stats) return '—'
    if (!s) return stats.totalReturns ?? '—'
    if (s === 'pending') return stats.pending ?? 0
    if (s === 'approved') return stats.approved ?? 0
    if (s === 'picked_up') return stats.pickedUp ?? 0
    if (s === 'returned_to_store') return stats.returnedToStore ?? 0
    if (s === 'received') return stats.received ?? 0
    if (s === 'rejected') return stats.rejected ?? 0
    return 0
  }

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total returns</span>
          <span className="stat-num">{stats?.totalReturns ?? '—'}</span>
          <span className="stat-sub">{stats?.pending ?? 0} awaiting seller review</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">In transit / Pickup</span>
          <span className="stat-num">{(stats?.approved ?? 0) + (stats?.pickedUp ?? 0)}</span>
          <span className="stat-sub">{stats?.pickedUp ?? 0} picked up from customer</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Returned to store</span>
          <span className="stat-num">{stats?.returnedToStore ?? 0}</span>
          <span className="stat-sub">Awaiting seller inspection</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Refunded (all time)</span>
          <span className="stat-num">{stats ? formatINR(stats.totalRefundAmount) : '—'}</span>
          <span className="stat-sub">{stats?.received ?? 0} returns completed</span>
        </div>
      </div>

      <div className="filters">
        <form className="search-form" onSubmit={submitSearch}>
          <input
            type="search"
            placeholder="Search by order number or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>

      <div className="filters-status">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={`chip-btn ${status === s ? 'active' : ''}`}
            onClick={() => { setStatus(s); setPage(1) }}
          >
            {s ? `${RETURN_STATUS_LABELS[s] || s} (${getCountForFilter(s)})` : `All (${getCountForFilter('')})`}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading returns…" />}

      {!loading && error && returns.length === 0 && (
        <div className="empty-state">
          <p className="danger-text">{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage(page)}>Retry</button>
        </div>
      )}

      {!loading && !error && returns.length === 0 && (
        <div className="empty-state">
          <p>No return requests found.</p>
        </div>
      )}

      {!loading && returns.length > 0 && (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Return / Order</th>
                <th>Product</th>
                <th>Customer</th>
                <th>Seller</th>
                <th>Delivery Partner</th>
                <th>Status</th>
                <th>Refund</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {returns.map((ret) => (
                <tr key={ret._id}>
                  <td>
                    <strong>#{ret._id.slice(-6)}</strong>
                    <div className="muted small">Order: {ret.order?.orderNumber || '—'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {productImageUrl(ret.product) ? (
                        <img
                          src={productImageUrl(ret.product)}
                          alt={ret.product?.name || ret.product?.title || ''}
                          style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div className="img-ph" style={{ width: '36px', height: '36px' }}>📦</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ret.product?.name || ret.product?.title || 'Product'}
                        </div>
                        <div className="muted small">Reason: {RETURN_REASON_LABELS[ret.reason] || ret.reason}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{ret.customer?.name || '—'}</div>
                    <div className="muted small">{ret.customer?.phone || ret.customer?.email || '—'}</div>
                  </td>
                  <td>
                    <div>{ret.seller?.storeName || ret.seller?.businessName || '—'}</div>
                    <div className="muted small">{ret.seller?.phone || ''}</div>
                  </td>
                  <td>
                    {ret.deliveryPartner ? (
                      <div>
                        <div>🛵 {ret.deliveryPartner.name}</div>
                        <div className="muted small">{ret.deliveryPartner.phone || '—'}</div>
                      </div>
                    ) : (
                      <span className="muted small">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${returnStatusFlavor(ret.status)}`}>
                      {RETURN_STATUS_LABELS[ret.status] || ret.status}
                    </span>
                  </td>
                  <td>
                    <strong>{formatINR(ret.refund?.amount)}</strong>
                    <div className="muted small">{ret.refund?.method || 'original'}</div>
                  </td>
                  <td>
                    <span className="muted small">{formatDateTime(ret.createdAt)}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setDetailId(ret._id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="muted small">Page {page} of {pagination.pages}</span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {detailId && (
        <ReturnDetailModal
          token={token}
          returnId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}

function ReturnDetailModal({ token, returnId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminGetReturn(token, returnId)
      .then((res) => { if (!cancelled) setDetail(res.data) })
      .catch((e) => { if (!cancelled) setErr(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, returnId])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        {loading && <Loading label="Loading return request details…" />}
        {err && <p className="danger-text">{err}</p>}

        {detail && (
          <>
            <h2>Return Request #{detail._id.slice(-6)}</h2>
            <p className="muted">Requested {formatDateTime(detail.createdAt)}</p>

            <div className="badges" style={{ marginBottom: '1rem' }}>
              <span className={`badge badge-${returnStatusFlavor(detail.status)}`}>
                {RETURN_STATUS_LABELS[detail.status] || detail.status}
              </span>
              <span className="badge badge-muted">
                Reason: {RETURN_REASON_LABELS[detail.reason] || detail.reason}
              </span>
              <span className="badge badge-status">
                Refund: {formatINR(detail.refund?.amount)} ({detail.refund?.status || 'pending'})
              </span>
            </div>

            {detail.comments && (
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '0.85rem' }}>Customer Comments:</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{detail.comments}</p>
              </div>
            )}

            <h3 className="section-title">Product details</h3>
            <div className="order-detail-items" style={{ marginBottom: '1rem' }}>
              <div className="order-detail-item">
                <div className="cart-item-media">
                  {productImageUrl(detail.product) ? (
                    <img src={productImageUrl(detail.product)} alt={detail.product?.name || ''} />
                  ) : (
                    <div className="img-ph">📦</div>
                  )}
                </div>
                <div>
                  <p><strong>{detail.product?.name || detail.product?.title}</strong></p>
                  <p className="muted small">Price: {formatINR(detail.product?.price)} · Order #{detail.order?.orderNumber}</p>
                </div>
              </div>
            </div>

            <h3 className="section-title">Parties involved</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <strong>Customer</strong>
                <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
                  {detail.customer?.name || '—'}<br />
                  {detail.customer?.phone || '—'}<br />
                  {detail.customer?.email || '—'}
                </p>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <strong>Seller</strong>
                <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
                  {detail.seller?.storeName || detail.seller?.businessName || '—'}<br />
                  {detail.seller?.phone || '—'}<br />
                  {detail.seller?.email || '—'}
                </p>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <strong>Delivery Agent</strong>
                <p className="muted small" style={{ margin: '0.25rem 0 0' }}>
                  {detail.deliveryPartner ? (
                    <>
                      🛵 {detail.deliveryPartner.name}<br />
                      {detail.deliveryPartner.phone || '—'}<br />
                      Vehicle: {detail.deliveryPartner.deliveryPartner?.vehicleType || 'standard'}
                    </>
                  ) : (
                    'Not assigned yet'
                  )}
                </p>
              </div>
            </div>

            <h3 className="section-title">Pickup & Store return timestamps</h3>
            <p className="muted small" style={{ marginBottom: '1rem' }}>
              Pickup address: {detail.order?.shippingAddress?.street}, {detail.order?.shippingAddress?.city}, {detail.order?.shippingAddress?.pincode}<br />
              Picked up at: {detail.pickedUpAt ? formatDateTime(detail.pickedUpAt) : 'Pending pickup'}<br />
              Returned to store at: {detail.returnedToStoreAt ? formatDateTime(detail.returnedToStoreAt) : 'Pending arrival at store'}
            </p>

            <h3 className="section-title">Status history</h3>
            <ol className="timeline">
              {(detail.statusHistory || []).map((h, i) => (
                <li key={i}>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{RETURN_STATUS_LABELS[h.status] || h.status}</strong>
                    <p className="muted small">
                      {formatDateTime(h.timestamp || h.createdAt)}
                      {h.note ? ` — ${h.note}` : ''}
                      {h.changedBy?.name ? ` (by ${h.changedBy.name})` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
