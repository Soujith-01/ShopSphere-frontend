import { useEffect, useState } from 'react'
import {
  sellerGetOrders, sellerGetOrder, sellerUpdateOrderStatus, sellerCancelOrder,
} from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatINR, formatDateTime,
  ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, orderStatusFlavor, payStatusFlavor, payStatusLabel,
} from '../../format.js'
import Loading from '../Loading.jsx'

const STATUS_FILTERS = ['', 'placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

export default function SellerOrdersView({ token }) {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState(null)
  const [refresh, setRefresh] = useState(0)

  const load = () => {
    setLoading(true)
    setError('')
    sellerGetOrders(token, { status: status || undefined, page, limit: 20 })
      .then((res) => setOrders(res.data || []))
      .catch((err) => { if (err.status !== 401) setError(err.message) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [token, status, page, refresh]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  const advance = async (order) => {
    // The next step depends on the current state machine.
    // Seller only handles up to 'shipped'. After that, a delivery partner
    // picks up the order (out_for_delivery) and marks it delivered.
    const map = {
      placed: 'confirmed', confirmed: 'packed', packed: 'shipped',
    }
    const next = map[order.status]
    if (!next) return
    const label = ORDER_STATUS_LABELS[next]
    const answer = prompt(`Move ${order.orderNumber} to “${label}”? Leave a note for the customer (optional).`, '')
    if (answer === null) return
    const note = answer.trim()
    const body = { status: next, note: note || undefined }
    if (next === 'shipped') {
      const trackingRaw = prompt('Add a tracking number (optional).', '')
      if (trackingRaw === null) return
      const tracking = trackingRaw.trim()
      if (tracking) body.trackingNumber = tracking
    }
    try {
      await sellerUpdateOrderStatus(token, order._id, body)
      toast.success(`${order.orderNumber} → ${label}`)
      setRefresh((r) => r + 1)
      if (detailId === order._id) setDetailId(null)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const cancel = async (order) => {
    const answer = prompt(`Cancel ${order.orderNumber}? Reason (optional).`, '')
    if (answer === null) return
    const reason = answer.trim()
    try {
      await sellerCancelOrder(token, order._id, reason)
      toast.success('Order cancelled')
      setRefresh((r) => r + 1)
      if (detailId === order._id) setDetailId(null)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="filters-status">
        {STATUS_FILTERS.map((s) => (
          <button key={s || 'all'} type="button"
            className={`chip-btn ${status === s ? 'active' : ''}`}
            onClick={() => { setStatus(s); setPage(1) }}>
            {s ? ORDER_STATUS_LABELS[s] : 'All'}
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
          <p>When a customer checks out, their order is split per store and shows up here.</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="orders-list">
          {orders.map((o) => (
            <div className="order-card" key={o._id}>
              <div className="order-card-head">
                <div>
                  <strong>{o.orderNumber}</strong>
                  <p className="muted small">
                    {o.customer?.name || 'Customer'} · {o.customer?.phone || '—'} · {formatDateTime(o.createdAt)}
                  </p>
                  {['out_for_delivery', 'delivered'].includes(o.status) && o.deliveryPartner && (
                    <p className="muted small">🚚 Delivery: {o.deliveryPartner.name} · {o.deliveryPartner.phone}{o.deliveryPartner.deliveryPartner?.vehicleType ? ` · ${o.deliveryPartner.deliveryPartner.vehicleType}` : ''}</p>
                  )}
                </div>
                <div className="badges">
                  <span className={`badge badge-${orderStatusFlavor(o.status)}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                  <span className={`badge badge-${payStatusFlavor(o.payment?.status)}`}>
                    {PAYMENT_METHOD_LABELS[o.payment?.method] || o.payment?.method}: {payStatusLabel(o.payment?.status)}
                  </span>
                </div>
              </div>

              <div className="order-card-items">
                {(o.items || []).slice(0, 4).map((item) => (
                  <div className="order-thumb" key={item._id || item.product}>
                    {item.productImage
                      ? <img src={item.productImage} alt={item.productName} />
                      : <div className="img-ph">📦</div>}
                  </div>
                ))}
                {(o.items || []).length > 4 && <span className="order-thumb more">+{o.items.length - 4}</span>}
              </div>

              <div className="order-card-foot">
                <span className="order-total">{formatINR(o.total)}</span>
                <div className="order-actions">
                  {['placed', 'confirmed'].includes(o.status) && (
                    <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => cancel(o)}>Cancel</button>
                  )}
                  {advanceLabel(o.status) && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => advance(o)}>
                      {advanceLabel(o.status)}
                    </button>
                  )}
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetailId(o._id)}>View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailId && (
        <OrderDetailModal
          token={token}
          orderId={detailId}
          onClose={() => setDetailId(null)}
          onAdvance={advance}
          onCancel={cancel}
        />
      )}
    </div>
  )
}

const advanceLabel = (status) => {
  const map = {
    placed: 'Confirm', confirmed: 'Mark packed', packed: 'Mark shipped',
  }
  return map[status] || ''
}

function OrderDetailModal({ token, orderId, onClose, onAdvance, onCancel }) {
  const toast = useToast()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    sellerGetOrder(token, orderId)
      .then((res) => { if (!cancelled) setOrder(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [token, orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {busy && !order && <Loading label="Loading order…" />}
        {!busy && error && !order && <p className="muted small">Couldn't load this order — close and try again.</p>}

        {order && (
          <>
            <h2>{order.orderNumber}</h2>
            <p className="muted">Placed {formatDateTime(order.createdAt)} · {order.customer?.name} · {order.customer?.phone}</p>
            <div className="badges">
              <span className={`badge badge-${orderStatusFlavor(order.status)}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
              <span className={`badge badge-${payStatusFlavor(order.payment?.status)}`}>
                {PAYMENT_METHOD_LABELS[order.payment?.method] || order.payment?.method}: {payStatusLabel(order.payment?.status)}
              </span>
              {order.trackingNumber && <span className="badge badge-muted">Tracking: {order.trackingNumber}</span>}
            </div>

            {order.customerNote && (
              <p className="muted small" style={{ marginTop: 10 }}>Customer note: “{order.customerNote}”</p>
            )}

            <h3 className="section-title">Items</h3>
            <div className="order-detail-items">
              {order.items.map((item) => (
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

            {['out_for_delivery', 'delivered'].includes(order.status) && order.deliveryPartner && (
              <>
                <h3 className="section-title">Delivery agent</h3>
                <p className="muted small">
                  🚚 {order.deliveryPartner.name} · {order.deliveryPartner.phone}
                  {order.deliveryPartner.email && <> · {order.deliveryPartner.email}</>}
                  {order.deliveryPartner.deliveryPartner?.vehicleType && <> · {order.deliveryPartner.deliveryPartner.vehicleType}</>}
                </p>
              </>
            )}

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
              {['placed', 'confirmed'].includes(order.status) && (
                <button type="button" className="btn btn-danger-ghost" onClick={() => onCancel(order)}>Cancel order</button>
              )}
              {advanceLabel(order.status) && (
                <button type="button" className="btn btn-primary" onClick={() => onAdvance(order)}>
                  {advanceLabel(order.status)}
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
