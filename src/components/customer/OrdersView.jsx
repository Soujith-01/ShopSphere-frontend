import { useEffect, useState } from 'react'
import { getOrders, getOrder, cancelOrder, createReview } from '../../api.js'
import {
  formatINR, formatDate, formatDateTime,
  ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS,
  payStatusLabel, orderStatusFlavor, payStatusFlavor,
} from '../../format.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'

export default function OrdersView({ token }) {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [reviewOrder, setReviewOrder] = useState(null)
  const [refresh, setRefresh] = useState(0)

  // Surface load failures as a toast; the content area shows a fallback state.
  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getOrders(token, { limit: 50 })
      .then((res) => { if (!cancelled) setOrders(res.data || []) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, refresh])

  const handleCancel = async (order) => {
    const reason = prompt('Reason for cancelling?', '')
    if (reason === null) return
    try {
      await cancelOrder(token, order._id, reason)
      toast.success('Order cancelled')
      setRefresh((r) => r + 1)
      if (detailId === order._id) setDetailId(null)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  if (loading) return <Loading label="Loading your orders…" />

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load your orders</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">📦</div>
        <h2>No orders yet</h2>
        <p>When you place an order it will show up here with live tracking.</p>
      </div>
    )
  }

  return (
    <div className="orders-list">
      {orders.map((order) => (
        <div className="order-card" key={order._id}>
          <div className="order-card-head">
            <div>
              <strong>{order.orderNumber}</strong>
              <p className="muted small">{formatDate(order.createdAt)} · {order.storeName || order.store?.name || order.seller?.businessName || 'ShopSphere seller'}</p>
            </div>
            <div className="badges">
              <span className={`badge badge-${orderStatusFlavor(order.status)}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
              <span className={`badge badge-${payStatusFlavor(order.payment?.status)}`}>
                {PAYMENT_METHOD_LABELS[order.payment?.method] || order.payment?.method}: {payStatusLabel(order.payment?.status)}
              </span>
            </div>
          </div>

          <div className="order-card-items">
            {(order.items || []).slice(0, 3).map((item) => (
              <div className="order-thumb" key={item._id} title={item.productName}>
                {item.productImage
                  ? <img src={item.productImage} alt={item.productName} />
                  : <div className="img-ph">📦</div>}
              </div>
            ))}
            {(order.items || []).length > 3 && <span className="order-thumb more">+{order.items.length - 3}</span>}
          </div>

          <div className="order-card-foot">
            <span className="order-total">{formatINR(order.total)}</span>
            <div className="order-actions">
              {['placed', 'confirmed'].includes(order.status) && (
                <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => handleCancel(order)}>Cancel</button>
              )}
              {order.status === 'delivered' && (
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setReviewOrder(order)}>Review</button>
              )}
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setDetailId(order._id)}>View</button>
            </div>
          </div>
        </div>
      ))}

      {detailId && (
        <OrderDetail
          token={token}
          orderId={detailId}
          openReview={(order) => { setDetailId(null); setReviewOrder(order) }}
          onCancel={(order) => handleCancel(order)}
          onClose={() => setDetailId(null)}
        />
      )}

      {reviewOrder && (
        <ReviewModal token={token} order={reviewOrder} onClose={() => setReviewOrder(null)} onSubmitted={() => setRefresh((r) => r + 1)} />
      )}
    </div>
  )
}

function OrderDetail({ token, orderId, onClose, onCancel, openReview }) {
  const toast = useToast()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  useEffect(() => {
    let cancelled = false
    getOrder(token, orderId)
      .then((res) => { if (!cancelled) setOrder(res.data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [token, orderId])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {!order && !error && <Loading label="Loading order…" />}
        {!order && error && <p className="muted small">Couldn't load this order — close and try again.</p>}

        {order && (
          <>
            <h2>{order.orderNumber}</h2>
            <p className="muted">
              Placed {formatDateTime(order.createdAt)} · {order.storeName || order.store?.name || order.seller?.businessName}
            </p>
            <div className="badges">
              <span className={`badge badge-${orderStatusFlavor(order.status)}`}>{ORDER_STATUS_LABELS[order.status] || order.status}</span>
              <span className={`badge badge-${payStatusFlavor(order.payment?.status)}`}>
                {PAYMENT_METHOD_LABELS[order.payment?.method] || order.payment?.method}: {payStatusLabel(order.payment?.status)}
              </span>
            </div>

            <h3 className="section-title">Items</h3>
            <div className="order-detail-items">
              {order.items.map((item) => {
                const img = item.productImage || item.product?.images?.[0]?.url
                return (
                  <div className="order-detail-item" key={item._id}>
                    <div className="cart-item-media">
                      {img ? <img src={img} alt={item.productName} /> : <div className="img-ph">📦</div>}
                    </div>
                    <div>
                      <p><strong>{item.productName}</strong></p>
                      {item.variantLabel && <p className="muted small">Variant: {item.variantLabel}</p>}
                      <p className="muted small">{item.quantity} × {formatINR(item.price)}</p>
                    </div>
                    <span className="cart-item-total">{formatINR(item.total)}</span>
                  </div>
                )
              })}
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
              {['placed', 'confirmed'].includes(order.status) && (
                <button type="button" className="btn btn-danger-ghost" onClick={() => onCancel(order)}>Cancel order</button>
              )}
              {order.status === 'delivered' && (
                <button type="button" className="btn btn-primary" onClick={() => openReview(order)}>Write a review</button>
              )}
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ReviewModal({ token, order, onClose, onSubmitted }) {
  const toast = useToast()
  const [productId, setProductId] = useState(order.items?.[0]?.product?._id || order.items?.[0]?.product || '')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  // product may be populated (detail) or a plain id (list). Resolve id either way.
  const productIdOf = (item) => item.product?._id || item.product
  const productNameOf = (item) => item.product?.name || item.productName

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!productId) return
    setBusy(true)
    try {
      await createReview(token, {
        productId, orderId: order._id, rating, title: title.trim(), comment: comment.trim(),
      })
      toast.success('Review submitted ✓')
      setTimeout(() => { onSubmitted(); onClose() }, 900)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>Write a review</h2>
        <p className="muted">Only products from delivered orders can be reviewed.</p>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Product
            <select className="select" value={productId} onChange={(e) => setProductId(e.target.value)}>
              {(order.items || []).map((item) => (
                <option key={item._id} value={productIdOf(item)}>{productNameOf(item)}</option>
              ))}
            </select>
          </label>

          <label>
            Rating
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={`star ${n <= rating ? 'on' : ''}`} onClick={() => setRating(n)}>★</button>
              ))}
            </div>
          </label>

          <label>
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Great product!" />
          </label>

          <label>
            Comment
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
              placeholder="Share your experience with this product…" />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !productId}>
            {busy ? <><Spinner small /> Submitting…</> : 'Submit review'}
          </button>
        </form>
      </div>
    </div>
  )
}