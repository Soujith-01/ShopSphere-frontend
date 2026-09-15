import { useEffect, useState } from 'react'
import { sellerGetReturns, sellerApproveReturn, sellerRejectReturn, sellerReceiveReturn } from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatINR, formatDateTime, RETURN_STATUS_LABELS, returnStatusFlavor, RETURN_REASON_LABELS, productImageUrl,
} from '../../format.js'
import Loading from '../Loading.jsx'

const STATUS_FILTERS = ['', 'pending', 'approved', 'picked_up', 'returned_to_store', 'received', 'rejected']

export default function SellerReturnsView({ token }) {
  const toast = useToast()
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    sellerGetReturns(token, { status: status || undefined, limit: 50 })
      .then((res) => { if (!cancelled) setReturns(res.data || []) })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, status, refresh])

  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  const run = async (fn, successMsg) => {
    try {
      await fn()
      toast.success(successMsg)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const approve = (r) => {
    const answer = prompt(`Approve return request from ${r.customer?.name || 'customer'}? Note (optional).`, '')
    if (answer === null) return
    run(() => sellerApproveReturn(token, r._id, answer.trim()), 'Return approved and delivery partner notified for pickup')
  }

  const reject = (r) => {
    const answer = prompt(`Reject the return request? Please explain why (optional).`, '')
    if (answer === null) return
    run(() => sellerRejectReturn(token, r._id, answer.trim()), 'Return request rejected')
  }

  const receive = (r) => {
    if (!confirm('Confirm you have received the returned product at your store? This will complete the return and refund the customer.')) return
    run(() => sellerReceiveReturn(token, r._id), 'Return item confirmed received — refund processed and stock updated')
  }

  return (
    <div>
      <div className="filters-status">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            className={`chip-btn ${status === s ? 'active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s ? (RETURN_STATUS_LABELS[s] || s) : 'All'}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading return requests…" />}

      {!loading && error && returns.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load return requests. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && returns.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">↩️</div>
          <h2>No return requests {status ? `with status “${RETURN_STATUS_LABELS[status] || status}”` : 'yet'}</h2>
          <p>Customer return requests and their pickup status will appear here.</p>
        </div>
      )}

      {!loading && returns.length > 0 && (
        <div className="orders-list">
          {returns.map((r) => (
            <div className="order-card" key={r._id}>
              <div className="order-card-head">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="cart-item-media">
                    {productImageUrl(r.product)
                      ? <img src={productImageUrl(r.product)} alt={r.product?.name || ''} />
                      : <div className="img-ph">📦</div>}
                  </div>
                  <div>
                    <strong>{r.product?.name || (r.items?.[0]?.productName || 'Product')}</strong>
                    <p className="muted small">
                      Return #{r._id.slice(-6)} · Order {r.order?.orderNumber || '—'} · {r.customer?.name || 'Customer'} · {formatDateTime(r.createdAt)}
                    </p>
                    {r.comments && <p className="muted small">Customer note: &ldquo;{r.comments}&rdquo;</p>}
                    {r.sellerNote && <p className="muted small">Your note: {r.sellerNote}</p>}
                  </div>
                </div>
                <div className="badges">
                  <span className="badge badge-muted">{RETURN_REASON_LABELS[r.reason] || r.reason}</span>
                  <span className={`badge badge-${returnStatusFlavor(r.status)}`}>{RETURN_STATUS_LABELS[r.status] || r.status}</span>
                </div>
              </div>

              {/* Delivery Agent & Logistics Tracking */}
              <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div className="small">
                    <strong>Pickup Partner: </strong>
                    {r.deliveryPartner ? (
                      <span>🛵 {r.deliveryPartner.name} {r.deliveryPartner.phone ? `(${r.deliveryPartner.phone})` : ''}</span>
                    ) : (
                      <span className="muted">{r.status === 'pending' ? 'Pending approval' : 'Assigning delivery partner…'}</span>
                    )}
                  </div>
                  {r.refund?.amount && (
                    <div className="small">
                      <strong>Refund Amount: </strong>
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>{formatINR(r.refund.amount)}</span>
                    </div>
                  )}
                </div>

                {/* Status Notice Banners */}
                {r.status === 'picked_up' && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.85rem' }}>
                    📦 <strong>Product picked up from customer:</strong> The delivery partner picked up the package at {formatDateTime(r.pickedUpAt)} and is currently returning it to your store.
                  </div>
                )}

                {r.status === 'returned_to_store' && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.85rem' }}>
                    🏪 <strong>Product returned to your store:</strong> The delivery partner delivered the item to your store at {formatDateTime(r.returnedToStoreAt)}. Please inspect the item and click &ldquo;Confirm Received & Refund&rdquo;.
                  </div>
                )}
              </div>

              <div className="order-card-foot">
                <span className="muted small">
                  {r.status === 'returned_to_store'
                    ? 'Returned to store — action required'
                    : r.status === 'picked_up'
                      ? 'Package in transit to store'
                      : r.status === 'approved'
                        ? 'Pickup in progress'
                        : r.status === 'received'
                          ? 'Completed & refunded'
                          : 'Pending review'}
                </span>
                <div className="order-actions">
                  {r.status === 'pending' && (
                    <>
                      <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => reject(r)}>Reject</button>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => approve(r)}>Approve Return</button>
                    </>
                  )}
                  {r.status === 'returned_to_store' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 600 }}
                      onClick={() => receive(r)}
                    >
                      Confirm Received & Refund
                    </button>
                  )}
                  {['approved', 'picked_up'].includes(r.status) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      title="Direct confirmation if already received at store"
                      onClick={() => receive(r)}
                    >
                      Mark Received
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
