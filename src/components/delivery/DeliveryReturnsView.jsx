import { useEffect, useState } from 'react'
import {
  deliveryGetActiveReturns,
  deliveryGetAvailableReturns,
  deliveryAcceptReturn,
  deliveryPickupReturn,
  deliveryReturnToStore,
} from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatINR, formatDateTime,
  RETURN_STATUS_LABELS, RETURN_REASON_LABELS, returnStatusFlavor, productImageUrl,
} from '../../format.js'
import Loading from '../Loading.jsx'

export default function DeliveryReturnsView({ token, onChange }) {
  const toast = useToast()
  const [subTab, setSubTab] = useState('active') // 'active' | 'available'
  const [activeReturns, setActiveReturns] = useState([])
  const [availableReturns, setAvailableReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [noteModal, setNoteModal] = useState(null) // { action: 'pickup' | 'return_to_store', item: returnObj }
  const [noteText, setNoteText] = useState('')

  const loadData = () => {
    setLoading(true)
    setError('')
    Promise.all([
      deliveryGetActiveReturns(token),
      deliveryGetAvailableReturns(token, { limit: 20 }),
    ])
      .then(([activeRes, availRes]) => {
        setActiveReturns(activeRes.data || [])
        setAvailableReturns(availRes.data || [])
      })
      .catch((err) => {
        if (err.status !== 401) setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async (ret) => {
    if (busyId) return
    setBusyId(ret._id)
    try {
      await deliveryAcceptReturn(token, ret._id)
      toast.success(`Return pickup accepted for Return #${ret._id.slice(-6)} 🛵`)
      loadData()
      if (onChange) onChange()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const openActionModal = (action, ret) => {
    setNoteModal({ action, item: ret })
    setNoteText('')
  }

  const handleConfirmAction = async () => {
    if (!noteModal || busyId) return
    const { action, item } = noteModal
    setBusyId(item._id)

    try {
      if (action === 'pickup') {
        await deliveryPickupReturn(token, item._id, { note: noteText.trim() || undefined })
        toast.success(`Marked as picked up from customer! Seller has been notified. 📦`)
      } else if (action === 'return_to_store') {
        await deliveryReturnToStore(token, item._id, { note: noteText.trim() || undefined })
        toast.success(`Product marked as returned to store! Seller has been notified. 🏪`)
      }
      setNoteModal(null)
      loadData()
      if (onChange) onChange()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const currentList = subTab === 'active' ? activeReturns : availableReturns

  return (
    <div>
      <div className="filters-status" style={{ marginBottom: '1.25rem' }}>
        <button
          type="button"
          className={`chip-btn ${subTab === 'active' ? 'active' : ''}`}
          onClick={() => setSubTab('active')}
        >
          My Return Pickups ({activeReturns.length})
        </button>
        <button
          type="button"
          className={`chip-btn ${subTab === 'available' ? 'active' : ''}`}
          onClick={() => setSubTab('available')}
        >
          Available Pickups ({availableReturns.length})
        </button>
      </div>

      {loading && <Loading label="Loading return pickups…" />}

      {!loading && error && (
        <div className="empty-state">
          <p className="danger-text">{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadData}>Retry</button>
        </div>
      )}

      {!loading && !error && currentList.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">{subTab === 'active' ? '📦' : '🚚'}</div>
          <h3>{subTab === 'active' ? 'No active return pickups' : 'No available return pickups'}</h3>
          <p className="muted">
            {subTab === 'active'
              ? 'When a seller accepts a return, assigned pickups will appear here for you to collect from customer and return to store.'
              : 'Return pickups awaiting a delivery partner will appear here.'}
          </p>
        </div>
      )}

      {!loading && !error && currentList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentList.map((ret) => {
            const isAssignedToMe = subTab === 'active'
            const isPickedUp = ret.status === 'picked_up'
            const isApproved = ret.status === 'approved'

            return (
              <div
                key={ret._id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Return #{ret._id.slice(-6)}</span>
                      <span className={`badge badge-${returnStatusFlavor(ret.status)}`}>
                        {RETURN_STATUS_LABELS[ret.status] || ret.status}
                      </span>
                    </div>
                    <div className="muted small" style={{ marginTop: '0.25rem' }}>
                      Order: {ret.order?.orderNumber || '—'} · Requested: {formatDateTime(ret.createdAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {subTab === 'available' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={busyId === ret._id}
                        onClick={() => handleAccept(ret)}
                      >
                        {busyId === ret._id ? 'Accepting…' : 'Accept pickup'}
                      </button>
                    )}

                    {isAssignedToMe && isApproved && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={busyId === ret._id}
                        onClick={() => openActionModal('pickup', ret)}
                      >
                        Pick up from customer
                      </button>
                    )}

                    {isAssignedToMe && isPickedUp && (
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 600 }}
                        disabled={busyId === ret._id}
                        onClick={() => openActionModal('return_to_store', ret)}
                      >
                        Returned to store
                      </button>
                    )}
                  </div>
                </div>

                {/* Item Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1rem' }}>
                  {productImageUrl(ret.product) ? (
                    <img
                      src={productImageUrl(ret.product)}
                      alt={ret.product?.name || ''}
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  ) : (
                    <div className="img-ph" style={{ width: '48px', height: '48px' }}>📦</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{ret.product?.name || ret.product?.title || 'Product'}</div>
                    <div className="muted small">
                      Reason: {RETURN_REASON_LABELS[ret.reason] || ret.reason} · Refund: {formatINR(ret.refund?.amount)}
                    </div>
                    {ret.comments && (
                      <div className="small" style={{ color: '#475569', marginTop: '0.2rem' }}>
                        Customer note: &ldquo;{ret.comments}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Logistics route: Customer Pickup Address -> Seller Store Address */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {/* Step 1: Customer Pickup */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: isPickedUp ? '#f1f5f9' : '#f0fdf4',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <strong style={{ color: isPickedUp ? '#64748b' : '#166534', fontSize: '0.85rem' }}>
                        {isPickedUp ? '✓ 1. Picked up from customer' : '📍 1. Pick up from customer'}
                      </strong>
                      {ret.pickedUpAt && (
                        <span className="muted small">{formatDateTime(ret.pickedUpAt)}</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600 }}>{ret.customer?.name || 'Customer'}</div>
                    {ret.customer?.phone && (
                      <div className="small" style={{ marginTop: '0.2rem' }}>
                        📞 <a href={`tel:${ret.customer.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>{ret.customer.phone}</a>
                      </div>
                    )}
                    <div className="muted small" style={{ marginTop: '0.3rem' }}>
                      {ret.order?.shippingAddress?.fullName ? `${ret.order.shippingAddress.fullName}, ` : ''}
                      {ret.order?.shippingAddress?.street}, {ret.order?.shippingAddress?.city} {ret.order?.shippingAddress?.pincode}
                    </div>
                  </div>

                  {/* Step 2: Store / Seller Destination */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: isPickedUp ? '#eff6ff' : '#f8fafc',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <strong style={{ color: isPickedUp ? '#1d4ed8' : '#64748b', fontSize: '0.85rem' }}>
                        {ret.returnedToStoreAt ? '✓ 2. Returned to store' : '🏪 2. Return to store / seller'}
                      </strong>
                      {ret.returnedToStoreAt && (
                        <span className="muted small">{formatDateTime(ret.returnedToStoreAt)}</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 600 }}>{ret.seller?.storeName || ret.seller?.businessName || 'Seller Store'}</div>
                    {ret.seller?.phone && (
                      <div className="small" style={{ marginTop: '0.2rem' }}>
                        📞 <a href={`tel:${ret.seller.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>{ret.seller.phone}</a>
                      </div>
                    )}
                    <div className="muted small" style={{ marginTop: '0.3rem' }}>
                      {ret.seller?.address?.street ? `${ret.seller.address.street}, ` : ''}
                      {ret.seller?.address?.city || ''} {ret.seller?.address?.pincode || ''}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {noteModal && (
        <div className="modal-backdrop" onClick={() => setNoteModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>
              {noteModal.action === 'pickup'
                ? 'Pick up package from customer'
                : 'Confirm package returned to store'}
            </h2>
            <p className="muted">
              {noteModal.action === 'pickup'
                ? 'Confirming this will mark the item as picked up from the customer. The seller will receive a notification that the package is in transit.'
                : 'Confirming this will mark the item as safely delivered back to the store. The seller will receive an immediate notification to inspect and refund.'}
            </p>

            <div style={{ marginTop: '1rem' }}>
              <label htmlFor="action-note" className="muted small" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Optional note:
              </label>
              <textarea
                id="action-note"
                rows={3}
                placeholder={noteModal.action === 'pickup' ? 'e.g. Package inspected and collected from customer' : 'e.g. Handed package to store warehouse staff'}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busyId !== null}
                onClick={() => setNoteModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={noteModal.action === 'return_to_store' ? 'btn btn-success' : 'btn btn-primary'}
                style={noteModal.action === 'return_to_store' ? { background: '#10b981', borderColor: '#10b981' } : {}}
                disabled={busyId !== null}
                onClick={handleConfirmAction}
              >
                {busyId !== null ? 'Updating…' : (noteModal.action === 'pickup' ? 'Confirm Pickup' : 'Confirm Returned to Store')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
