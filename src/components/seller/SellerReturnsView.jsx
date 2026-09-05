import { useEffect, useState } from 'react'
import { sellerGetReturns, sellerApproveReturn, sellerRejectReturn, sellerReceiveReturn } from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatDateTime, RETURN_STATUS_LABELS, returnStatusFlavor, RETURN_REASON_LABELS, productImageUrl,
} from '../../format.js'
import Loading from '../Loading.jsx'

const STATUS_FILTERS = ['', 'pending', 'approved', 'rejected', 'return_shipped', 'return_received', 'refunded']

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
    run(() => sellerApproveReturn(token, r._id, answer.trim()), 'Return approved')
  }

  const reject = (r) => {
    const answer = prompt(`Reject the return request? Please explain why (optional).`, '')
    if (answer === null) return
    run(() => sellerRejectReturn(token, r._id, answer.trim()), 'Return rejected')
  }

  const receive = (r) => {
    if (!confirm('Mark this returned item as received and restock it?')) return
    run(() => sellerReceiveReturn(token, r._id), 'Return item received — stock restored')
  }

  return (
    <div>
      <div className="filters-status">
        {STATUS_FILTERS.map((s) => (
          <button key={s || 'all'} type="button"
            className={`chip-btn ${status === s ? 'active' : ''}`}
            onClick={() => setStatus(s)}>
            {s ? RETURN_STATUS_LABELS[s] : 'All'}
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
          <h2>No return requests {status ? `with status “${RETURN_STATUS_LABELS[status]}”` : 'yet'}</h2>
          <p>Customers who request a return or replacement will show up here.</p>
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
                      {r.order?.orderNumber || '—'} · {r.customer?.name || 'Customer'} · {formatDateTime(r.createdAt)}
                    </p>
                    {r.description && <p className="muted small">{r.description}</p>}
                    {r.sellerNote && <p className="muted small">Your note: {r.sellerNote}</p>}
                  </div>
                </div>
                <div className="badges">
                  <span className="badge badge-muted">{RETURN_REASON_LABELS[r.reason] || r.reason}</span>
                  <span className={`badge badge-${returnStatusFlavor(r.status)}`}>{RETURN_STATUS_LABELS[r.status] || r.status}</span>
                </div>
              </div>

              {(r.items || []).length > 0 && (
                <div className="order-card-items">
                  {r.items.map((item, i) => (
                    <div className="order-thumb" key={i} title={`${item.productName} × ${item.quantity}`}>
                      {item.productImage ? <img src={item.productImage} alt={item.productName} /> : <div className="img-ph">📦</div>}
                    </div>
                  ))}
                </div>
              )}

              <div className="order-card-foot">
                <span className="muted small">{r.items?.length} item(s)</span>
                <div className="order-actions">
                  {r.status === 'pending' && (
                    <>
                      <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => reject(r)}>Reject</button>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => approve(r)}>Approve</button>
                    </>
                  )}
                  {['approved', 'return_shipped'].includes(r.status) && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => receive(r)}>Mark received</button>
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
