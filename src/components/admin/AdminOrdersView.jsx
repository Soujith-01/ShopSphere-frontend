import { useEffect, useState } from 'react'
import { adminGetOrderStats, adminGetOrders, adminGetOrder } from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatINR, formatDateTime,
  ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, orderStatusFlavor, payStatusFlavor, payStatusLabel,
} from '../../format.js'
import Loading from '../Loading.jsx'

const STATUS_FILTERS = ['', 'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

export default function AdminOrdersView({ token }) {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    adminGetOrderStats(token)
      .then((res) => setStats(res.data))
      .catch((err) => { if (err.status !== 401) toast.error(err.message) })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminGetOrders(token, {
      status: status || undefined,
      search: appliedSearch || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (cancelled) return
        setOrders(res.data || [])
        setPagination(res.pagination || null)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, status, appliedSearch, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()) }

  const statusCount = (s) => stats?.statusBreakdown?.find((x) => x._id === s)?.count ?? 0

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total orders</span>
          <span className="stat-num">{stats?.totalOrders ?? '—'}</span>
          <span className="stat-sub">{statusCount('cancelled')} cancelled all time</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Today</span>
          <span className="stat-num">{stats?.ordersToday ?? '—'}</span>
          <span className="stat-sub">{stats?.ordersThisMonth ?? '—'} this month</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Revenue (all time)</span>
          <span className="stat-num">{stats ? formatINR(stats.totalRevenue) : '—'}</span>
          <span className="stat-sub">Non-cancelled orders</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Revenue (this month)</span>
          <span className="stat-num">{stats ? formatINR(stats.revenueThisMonth) : '—'}</span>
          <span className="stat-sub">Since the 1st</span>
        </div>
      </div>

      <div className="filters">
        <form className="search-form" onSubmit={submitSearch}>
          <input type="search" placeholder="Search by order number…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>

      <div className="filters-status">
        {STATUS_FILTERS.map((s) => (
          <button key={s || 'all'} type="button"
            className={`chip-btn ${status === s ? 'active' : ''}`}
            onClick={() => { setStatus(s); setPage(1) }}>
            {s ? `${ORDER_STATUS_LABELS[s]} (${statusCount(s)})` : `All (${stats?.totalOrders ?? '—'})`}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading orders…" />}

      {!loading && error && orders.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load orders. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">📦</div>
          <h2>No orders {status ? `with status “${ORDER_STATUS_LABELS[status]}”` : 'yet'}</h2>
          <p>{appliedSearch ? 'Try a different order number.' : 'Marketplace orders appear here as customers check out.'}</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <>
          <div className="orders-list">
            {orders.map((o) => (
              <div className="order-card" key={o._id}>
                <div className="order-card-head">
                  <div>
                    <strong>{o.orderNumber}</strong>
                    <p className="muted small">
                      {o.customer?.name || 'Customer'} ({o.customer?.email || '—'}) → {o.seller?.businessName || '—'} · {o.store?.name || '—'}
                    </p>
                    <p className="muted small">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <div className="badges">
                    <span className={`badge badge-${orderStatusFlavor(o.status)}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                    <span className={`badge badge-${payStatusFlavor(o.payment?.status)}`}>
                      {PAYMENT_METHOD_LABELS[o.payment?.method] || o.payment?.method}: {payStatusLabel(o.payment?.status)}
                    </span>
                  </div>
                </div>
                <div className="order-card-foot">
                  <span className="muted small">{o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? '' : 's'}</span>
                  <div className="order-actions">
                    <strong className="order-total">{formatINR(o.total)}</strong>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetailId(o._id)}>View</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} orders</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {detailId && (
        <OrderDetailModal
          token={token}
          orderId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  )
}

function OrderDetailModal({ token, orderId, onClose }) {
  const toast = useToast()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    adminGetOrder(token, orderId)
      .then((res) => { if (!cancelled) setOrder(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) { setError(err.message); toast.error(err.message) } })
    return () => { cancelled = true }
  }, [token, orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {!order && !error && <Loading label="Loading order…" />}
        {error && !order && <p className="muted small">Couldn't load this order — close and try again.</p>}

        {order && (
          <>
            <h2>{order.orderNumber}</h2>
            <p className="muted">Placed {formatDateTime(order.createdAt)}</p>
            <div className="badges">
              <span className={`badge badge-${orderStatusFlavor(order.status)}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
              <span className={`badge badge-${payStatusFlavor(order.payment?.status)}`}>
                {PAYMENT_METHOD_LABELS[order.payment?.method] || order.payment?.method}: {payStatusLabel(order.payment?.status)}
              </span>
              {order.trackingNumber && <span className="badge badge-muted">Tracking: {order.trackingNumber}</span>}
            </div>

            <h3 className="section-title">Parties</h3>
            <p className="muted small">
              Customer: {order.customer?.name || '—'} · {order.customer?.email || '—'} · {order.customer?.phone || '—'}<br />
              Seller: {order.seller?.businessName || '—'} · Store: {order.store?.name || '—'}<br />
              Delivery partner: {order.deliveryPartner?.name || 'Unassigned'}
            </p>

            <h3 className="section-title">Items</h3>
            <div className="order-detail-items">
              {(order.items || []).map((item) => (
                <div className="order-detail-item" key={item._id}>
                  <div className="cart-item-media">
                    {item.productImage
                      ? <img src={item.productImage} alt={item.productName} />
                      : <div className="img-ph">📦</div>}
                  </div>
                  <div>
                    <p><strong>{item.productName}</strong></p>
                    {item.variantLabel && <p className="muted small">Variant: {item.variantLabel} · SKU: {item.sku || '—'}</p>}
                    <p className="muted small">{item.quantity} × {formatINR(item.price)}</p>
                  </div>
                  <span className="cart-item-total">{formatINR(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="summary-rows detail-summary">
              <div><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
              {order.discount > 0 && <div className="summary-discount"><span>Discount</span><span>−{formatINR(order.discount)}</span></div>}
              <div><span>Shipping</span><span>{order.shippingCost > 0 ? formatINR(order.shippingCost) : 'Free'}</span></div>
              <div className="summary-total"><span>Total</span><span>{formatINR(order.total)}</span></div>
            </div>

            <h3 className="section-title">Ship to</h3>
            <p className="muted small">
              {order.shippingAddress?.fullName} · {order.shippingAddress?.phone}<br />
              {order.shippingAddress?.street}, {order.shippingAddress?.pincode}
            </p>

            <h3 className="section-title">Status history</h3>
            <ol className="timeline">
              {(order.statusHistory || []).map((h, i) => (
                <li key={i}>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{ORDER_STATUS_LABELS[h.status] || h.status}</strong>
                    <p className="muted small">{formatDateTime(h.timestamp)}{h.note ? ` — ${h.note}` : ''}</p>
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
