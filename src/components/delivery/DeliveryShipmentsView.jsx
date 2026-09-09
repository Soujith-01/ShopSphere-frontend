import { useEffect, useState } from 'react'
import {
  deliveryGetAvailable, deliveryGetActive, deliveryGetHistory,
  deliveryAcceptOrder, deliveryDeliverOrder,
} from '../../api.js'
import { useToast } from '../../toast.js'
import { navigate } from '../../router.js'
import {
  formatINR, formatDateTime,
  ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, orderStatusFlavor, payStatusFlavor, payStatusLabel,
} from '../../format.js'
import Loading from '../Loading.jsx'

// One component powers the three shipment tabs. Each mode maps to a backend
// list endpoint and its own action set:
//   available → shipped orders without a partner (Accept)
//   active    → my out-for-delivery orders (Mark delivered)
//   history   → my delivered + cancelled orders (view only)
const META = {
  available: {
    title: 'Available shipments',
    emptyEmoji: '🚚',
    emptyTitle: 'No shipments waiting',
    emptyText: 'When a seller marks an order shipped, it appears here for a delivery partner to accept.',
    emptyCta: null,
  },
  active: {
    title: 'My deliveries',
    emptyEmoji: '📦',
    emptyTitle: 'No active deliveries',
    emptyText: 'Accept a shipment from the Available tab and it will show up here to deliver.',
    emptyCta: { label: 'Browse available', to: '/delivery/available' },
  },
  history: {
    title: 'Delivery history',
    emptyEmoji: '🕘',
    emptyTitle: 'No deliveries yet',
    emptyText: 'Orders you deliver or that get cancelled will appear in your history.',
    emptyCta: null,
  },
}

export default function DeliveryShipmentsView({ mode, token, partner, onChange }) {
  const meta = META[mode]
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [historyFilter, setHistoryFilter] = useState('') // '' | delivered | cancelled
  const [detailId, setDetailId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const toast = useToast()

  const load = () => {
    setLoading(true)
    setError('')
    const request =
      mode === 'available' ? deliveryGetAvailable(token, { page, limit: 20 })
        : mode === 'active' ? deliveryGetActive(token)
          : deliveryGetHistory(token, { page, limit: 20 })

    request
      .then((res) => {
        setOrders(res.data || [])
        setTotal(res.pagination?.total ?? (res.data || []).length)
        setPages(res.pagination?.pages ?? 1)
      })
      .catch((err) => { if (err.status !== 401) setError(err.message) })
      .finally(() => setLoading(false))
  }

  // The dashboard mounts this view with key={tab}, so `page` always starts at
  // 1 here — no need to reset it when `mode` changes.
  useEffect(() => { load() }, [mode, token, page, refresh]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  // History mixes delivered + cancelled; filter client-side for readability.
  const visible = mode === 'history' && historyFilter
    ? orders.filter((o) => o.status === historyFilter)
    : orders

  const accept = async (order) => {
    if (busyId) return
    setBusyId(order._id)
    try {
      await deliveryAcceptOrder(token, order._id)
      toast.success(`${order.orderNumber} accepted — head out and deliver it 🛵`)
      setRefresh((r) => r + 1)
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const deliver = async (order) => {
    const answer = prompt(`Mark ${order.orderNumber} as delivered? Leave a note for the customer (optional).`, '')
    if (answer === null) return
    const note = answer.trim()
    setBusyId(order._id)
    try {
      await deliveryDeliverOrder(token, order._id, note)
      toast.success(`${order.orderNumber} delivered ✅`)
      setRefresh((r) => r + 1)
      onChange?.()
      if (detailId === order._id) setDetailId(null)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {mode === 'available' && partner && !(partner.deliveryPartner?.isAvailable) && (
        <div className="panel" style={{ marginBottom: 22, background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div className="panel-head" style={{ margin: 0 }}>
            <div>
              <h2 style={{ margin: 0 }}>You're off duty ⏸️</h2>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                Go online from the Overview or Profile tab to signal that you're accepting shipments.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head" style={{ margin: 0 }}>
          <div>
            <h2 style={{ margin: 0 }}>{meta.title}</h2>
            <p className="muted small" style={{ margin: '4px 0 0' }}>
              {total} shipment{total === 1 ? '' : 's'}
              {mode === 'history' ? ' · delivered and cancelled orders' : mode === 'available' ? ' · shipped and unassigned' : ''}
            </p>
          </div>
          {mode === 'history' && (
            <div className="filters-status">
              {['', 'delivered', 'cancelled'].map((s) => (
                <button
                  key={s || 'all'}
                  type="button"
                  className={`chip-btn ${historyFilter === s ? 'active' : ''}`}
                  onClick={() => setHistoryFilter(s)}
                >
                  {s ? ORDER_STATUS_LABELS[s] : 'All'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <Loading label="Loading shipments…" />}

      {!loading && error && visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load shipments. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">{meta.emptyEmoji}</div>
          <h2>
            {mode === 'history' && historyFilter
              ? `No ${ORDER_STATUS_LABELS[historyFilter].toLowerCase()} orders here`
              : meta.emptyTitle}
          </h2>
          <p>{meta.emptyText}</p>
          {meta.emptyCta && (
            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={() => navigate(meta.emptyCta.to)}>
                {meta.emptyCta.label}
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="orders-list">
          {visible.map((o) => (
            <ShipmentCard
              key={o._id}
              order={o}
              mode={mode}
              busy={busyId === o._id}
              onAccept={() => accept(o)}
              onDeliver={() => deliver(o)}
              onView={() => setDetailId(o._id)}
            />
          ))}
        </div>
      )}

      {pages > 1 && !loading && (
        <Pager page={page} pages={pages} onGo={(p) => setPage(p)} />
      )}

      {detailId && (
        <ShipmentModal
          order={visible.find((o) => o._id === detailId)}
          busy={busyId === detailId}
          onClose={() => setDetailId(null)}
          onAccept={accept}
          onDeliver={deliver}
        />
      )}
    </div>
  )
}

function ShipmentCard({ order: o, mode, busy, onAccept, onDeliver, onView }) {
  const items = o.items || []
  return (
    <div className="order-card">
      <div className="order-card-head">
        <div>
          <strong>{o.orderNumber}</strong>
          <p className="muted small">
            {o.shippingAddress?.fullName || o.customer?.name || 'Customer'} · {formatDateTime(o.deliveredAt || o.createdAt)}
          </p>
        </div>
        <div className="badges">
          <span className={`badge badge-${orderStatusFlavor(o.status)}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
          <span className={`badge badge-${payStatusFlavor(o.payment?.status)}`}>
            {PAYMENT_METHOD_LABELS[o.payment?.method] || o.payment?.method}: {payStatusLabel(o.payment?.status)}
          </span>
        </div>
      </div>

      <div className="order-card-items">
        {items.slice(0, 4).map((item) => (
          <div className="order-thumb" key={item._id || item.product}>
            {item.productImage
              ? <img src={item.productImage} alt={item.productName} />
              : <div className="img-ph">📦</div>}
          </div>
        ))}
        {items.length > 4 && <span className="order-thumb more">+{items.length - 4}</span>}
      </div>

      <div className="delivery-route">
        <div className="delivery-point">
          <span className="delivery-point-label">Pick up from</span>
          <span className="delivery-point-value">{o.store?.name || o.storeName || 'Seller store'}</span>
        </div>
        <div className="delivery-route-arrow">→</div>
        <div className="delivery-point">
          <span className="delivery-point-label">Deliver to</span>
          <span className="delivery-point-value">
            {o.shippingAddress?.street}, {o.shippingAddress?.pincode}
          </span>
        </div>
      </div>

      <div className="order-card-foot">
        <span className="order-total">{formatINR(o.total)}</span>
        <div className="order-actions">
          {mode === 'available' && (
            <button type="button" className="btn btn-sm btn-primary" onClick={onAccept} disabled={busy}>
              {busy ? 'Accepting…' : 'Accept shipment'}
            </button>
          )}
          {mode === 'active' && (
            <button type="button" className="btn btn-sm btn-primary" onClick={onDeliver} disabled={busy}>
              {busy ? 'Marking…' : 'Mark delivered'}
            </button>
          )}
          <button type="button" className="btn btn-sm btn-secondary" onClick={onView}>View</button>
        </div>
      </div>
    </div>
  )
}

function Pager({ page, pages, onGo }) {
  return (
    <div className="pagination">
      <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => onGo(page - 1)}>
        ← Prev
      </button>
      <span className="page-info">Page {page} of {pages}</span>
      <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => onGo(page + 1)}>
        Next →
      </button>
    </div>
  )
}

function ShipmentModal({ order: o, busy, onClose, onAccept, onDeliver }) {
  const toast = useToast()
  useEffect(() => { if (!o) toast.error('This shipment is no longer available — it may have been accepted by another partner.') }, [o]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!o) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <h2>{o.orderNumber}</h2>
        <p className="muted">Placed {formatDateTime(o.createdAt)}</p>
        <div className="badges">
          <span className={`badge badge-${orderStatusFlavor(o.status)}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
          <span className={`badge badge-${payStatusFlavor(o.payment?.status)}`}>
            {PAYMENT_METHOD_LABELS[o.payment?.method] || o.payment?.method}: {payStatusLabel(o.payment?.status)}
          </span>
          {o.trackingNumber && <span className="badge badge-muted">Tracking: {o.trackingNumber}</span>}
        </div>

        {o.customerNote && (
          <p className="muted small" style={{ marginTop: 10 }}>Customer note: “{o.customerNote}”</p>
        )}

        <h3 className="section-title">Items</h3>
        <div className="order-detail-items">
          {(o.items || []).map((item) => (
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
          <div><span>Subtotal</span><span>{formatINR(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="summary-discount"><span>Discount</span><span>−{formatINR(o.discount)}</span></div>}
          <div><span>Shipping</span><span>{o.shippingCost > 0 ? formatINR(o.shippingCost) : 'Free'}</span></div>
          <div className="summary-total"><span>Total</span><span>{formatINR(o.total)}</span></div>
          {o.payment?.method === 'cod' && o.payment?.status !== 'completed' && (
            <div className="summary-discount"><span>Collect on delivery</span><span>{formatINR(o.total)}</span></div>
          )}
        </div>

        <div className="delivery-route" style={{ marginTop: 14 }}>
          <div className="delivery-point">
            <span className="delivery-point-label">Pick up from</span>
            <span className="delivery-point-value">{o.store?.name || o.storeName || 'Seller store'}</span>
          </div>
          <div className="delivery-route-arrow">→</div>
          <div className="delivery-point">
            <span className="delivery-point-label">Deliver to</span>
            <span className="delivery-point-value">
              {o.shippingAddress?.fullName} · {o.shippingAddress?.phone}<br />
              {o.shippingAddress?.street}, {o.shippingAddress?.pincode}
            </span>
          </div>
        </div>

        <h3 className="section-title">Status history</h3>
        <ol className="timeline">
          {(o.statusHistory || []).map((h, i) => (
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
          {o.status === 'shipped' && !o.deliveryPartner && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onAccept(o)}>
              {busy ? 'Accepting…' : 'Accept shipment'}
            </button>
          )}
          {o.status === 'out_for_delivery' && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onDeliver(o)}>
              {busy ? 'Marking…' : 'Mark delivered'}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
