import { useEffect, useState } from 'react'
import { getMyReturns, createReturn, getOrders, getReturn } from '../../api.js'
import { formatINR, formatDate, RETURN_STATUS_LABELS, RETURN_REASON_LABELS, returnStatusFlavor } from '../../format.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'

export default function ReturnsView({ token }) {
  const toast = useToast()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [detailId, setDetailId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMyReturns(token, { limit: 50 })
      .then((res) => { if (!cancelled) setReturns(res.data || []) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, refresh])

  if (loading) return <Loading label="Loading your returns…" />

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load returns</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  return (
    <div className="returns-view">
      <div className="returns-head">
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-h)' }}>My Returns</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          + Request Return
        </button>
      </div>

      {returns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">📦</div>
          <h2>No return requests</h2>
          <p>When you request a return for a delivered order, it will show up here.</p>
        </div>
      ) : (
        <div className="returns-list">
          {returns.map((ret) => (
            <div className="return-card" key={ret._id}>
              <div className="return-card-head">
                <div>
                  <strong>{ret.product?.name || 'Product'}</strong>
                  <p className="muted small">
                    Order #{ret.order?.orderNumber || '—'} · {formatDate(ret.createdAt)}
                  </p>
                  <p className="muted small">
                    Seller: {ret.seller?.businessName || '—'}
                  </p>
                </div>
                <span className={`badge badge-${returnStatusFlavor(ret.status)}`}>
                  {RETURN_STATUS_LABELS[ret.status] || ret.status}
                </span>
              </div>

              <div className="return-card-body">
                <p className="muted small">
                  Reason: {RETURN_REASON_LABELS[ret.reason] || ret.reason}
                  {ret.items?.[0]?.quantity ? ` · Qty: ${ret.items[0].quantity}` : ''}
                </p>
                {ret.description && <p className="muted small">{ret.description}</p>}
                {ret.sellerNote && (
                  <p className="muted small" style={{ fontStyle: 'italic' }}>
                    Seller: {ret.sellerNote}
                  </p>
                )}
              </div>

              <div className="return-card-foot">
                <span className="muted small">
                  {ret.statusHistory?.length ? `Updated ${formatDate(ret.statusHistory[ret.statusHistory.length - 1].timestamp)}` : ''}
                </span>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetailId(ret._id)}>
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateReturnModal
          token={token}
          onClose={() => setShowCreate(false)}
          onSubmitted={() => { setShowCreate(false); setRefresh((r) => r + 1) }}
        />
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

function CreateReturnModal({ token, onClose, onSubmitted }) {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [reason, setReason] = useState('defective')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getOrders(token, { limit: 50 })
      .then((res) => {
        const delivered = (res.data || []).filter((o) => o.status === 'delivered')
        setOrders(delivered)
        setLoading(false)
      })
      .catch(() => {
        setOrders([])
        setLoading(false)
      })
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedOrder || !selectedProduct) return
    setBusy(true)
    try {
      await createReturn(token, {
        orderId: selectedOrder._id,
        productId: selectedProduct,
        reason,
        description: description.trim(),
      })
      toast.success('Return request submitted ✓')
      setTimeout(onSubmitted, 700)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const selectedItem = selectedOrder?.items?.find(
    (it) => (it.product?._id || it.product) === selectedProduct
  )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>Request a Return</h2>
        <p className="muted small">Select a delivered order and the product you want to return.</p>

        {loading ? (
          <Loading label="Loading orders…" />
        ) : orders.length === 0 ? (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>No delivered orders found. You can only return products from delivered orders.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <label>
              Order
              <select
                className="select"
                value={selectedOrder?._id || ''}
                onChange={(e) => {
                  const order = orders.find((o) => o._id === e.target.value)
                  setSelectedOrder(order)
                  setSelectedProduct('')
                }}
              >
                <option value="">Select an order…</option>
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    #{o.orderNumber} — {formatDate(o.createdAt)} ({o.items?.length} item{o.items?.length > 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </label>

            {selectedOrder && (
              <label>
                Product
                <select
                  className="select"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">Select a product…</option>
                  {selectedOrder.items?.map((item) => {
                    const pid = item.product?._id || item.product
                    return (
                      <option key={item._id} value={pid}>
                        {item.product?.name || item.productName} — {formatINR(item.total)}
                      </option>
                    )
                  })}
                </select>
              </label>
            )}

            <label>
              Reason
              <select className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
                {Object.entries(RETURN_REASON_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              Description (optional)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the issue…"
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={busy || !selectedOrder || !selectedProduct}
            >
              {busy ? <><Spinner small /> Submitting…</> : 'Submit Return Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ReturnDetailModal({ token, returnId, onClose }) {
  const toast = useToast()
  const [ret, setRet] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  useEffect(() => {
    let cancelled = false
    getReturn(token, returnId)
      .then((res) => { if (!cancelled) setRet(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
    return () => { cancelled = true }
  }, [token, returnId])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {!ret && !error && <Loading label="Loading return details…" />}
        {!ret && error && <p className="muted small">Couldn't load return details.</p>}
        {ret && (
          <>
            <h2>Return Request</h2>
            <div className="badges" style={{ marginBottom: 14 }}>
              <span className={`badge badge-${returnStatusFlavor(ret.status)}`}>
                {RETURN_STATUS_LABELS[ret.status] || ret.status}
              </span>
            </div>

            <div className="return-detail-grid">
              <div>
                <p className="section-title">Product</p>
                <p><strong>{ret.product?.name || 'Product'}</strong></p>
                <p className="muted small">Order #{ret.order?.orderNumber || '—'}</p>
                {ret.items?.[0]?.quantity && (
                  <p className="muted small">Quantity: {ret.items[0].quantity}</p>
                )}
              </div>
              <div>
                <p className="section-title">Reason</p>
                <p>{RETURN_REASON_LABELS[ret.reason] || ret.reason}</p>
                {ret.description && <p className="muted small">{ret.description}</p>}
              </div>
              {ret.sellerNote && (
                <div>
                  <p className="section-title">Seller Response</p>
                  <p className="muted small" style={{ fontStyle: 'italic' }}>{ret.sellerNote}</p>
                </div>
              )}
              {ret.refund?.amount > 0 && (
                <div>
                  <p className="section-title">Refund</p>
                  <p>{formatINR(ret.refund.amount)} via {ret.refund.method || 'original'}</p>
                </div>
              )}
            </div>

            <p className="section-title">Status History</p>
            <ol className="timeline">
              {(ret.statusHistory || []).map((h, i) => (
                <li key={i}>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{RETURN_STATUS_LABELS[h.status] || h.status}</strong>
                    <p className="muted small">
                      {formatDate(h.timestamp)}{h.note ? ` — ${h.note}` : ''}
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


