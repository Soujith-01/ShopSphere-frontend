import { useEffect, useState } from 'react'
import {
  adminGetDeliveryAgents, adminGetDeliveryAgent, adminVerifyDeliveryAgent, adminRejectDeliveryAgent,
  adminDeactivateDeliveryAgent, adminActivateDeliveryAgent, adminDeleteDeliveryAgent,
} from '../../api.js'
import { useToast } from '../../toast.js'
import { formatDate, formatDateTime } from '../../format.js'
import Loading from '../Loading.jsx'

const STATUS_FILTERS = [
  { value: 'pending', label: 'Pending verification' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All agents' },
]

const STATUS_BADGES = {
  pending: { label: 'Pending verification', cls: 'badge-status' },
  approved: { label: 'Approved', cls: 'badge-success' },
  rejected: { label: 'Rejected', cls: 'badge-danger' },
}

const statusBadge = (agent) =>
  STATUS_BADGES[agent.deliveryPartner?.verificationStatus] || STATUS_BADGES.pending

export default function AdminDeliveryView({ token }) {
  const toast = useToast()
  const [agents, setAgents] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminGetDeliveryAgents(token, {
      status: status || undefined,
      search: appliedSearch || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (cancelled) return
        setAgents(res.data || [])
        setPagination(res.pagination || null)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, status, appliedSearch, page, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()) }

  const verify = async (agent) => {
    if (!confirm(`Approve "${agent.name}" as a delivery agent? They will be able to log in and receive orders.`)) return
    try {
      await adminVerifyDeliveryAgent(token, agent._id)
      toast.success(`${agent.name} approved ✓`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const reject = async (agent) => {
    const reason = prompt(`Reason for rejecting "${agent.name}" (sent to the agent):`)
    if (reason === null) return
    if (!reason.trim()) {
      toast.error('A rejection reason is required.')
      return
    }
    try {
      await adminRejectDeliveryAgent(token, agent._id, reason.trim())
      toast.success(`${agent.name} rejected`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const deactivate = async (agent) => {
    if (!confirm(`Suspend "${agent.name}"? They will be logged out and unable to log back in.`)) return
    try {
      await adminDeactivateDeliveryAgent(token, agent._id)
      toast.success(`${agent.name} suspended`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const activate = async (agent) => {
    if (!confirm(`Reinstate "${agent.name}"? They will be able to log in again.`)) return
    try {
      await adminActivateDeliveryAgent(token, agent._id)
      toast.success(`${agent.name} reinstated ✓`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const remove = async (agent) => {
    if (!confirm(`Permanently delete the rejected application of "${agent.name}"? This cannot be undone.`)) return
    try {
      await adminDeleteDeliveryAgent(token, agent._id)
      toast.success(`${agent.name}'s application deleted`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="filters">
        <form className="search-form" onSubmit={submitSearch}>
          <input type="search" placeholder="Search by name, email, phone or vehicle no…" value={search}
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

      {loading && <Loading label="Loading delivery agents…" />}

      {!loading && error && agents.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load delivery agents. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🛵</div>
          <h2>No delivery agents {status === 'pending' ? 'awaiting verification' : status === 'rejected' ? 'rejected' : 'found'}</h2>
          <p>When someone registers as a delivery agent, their vehicle details and driving license appear here for review.</p>
        </div>
      )}

      {!loading && agents.length > 0 && (
        <>
          <div className="orders-list">
            {agents.map((a) => (
              <div className="order-card" key={a._id}>
                <div className="order-card-head">
                  <div>
                    <strong>{a.name}</strong>
                    <p className="muted small">{a.email}{a.phone ? ` · ${a.phone}` : ''}</p>
                    <p className="muted small">
                      Applied {formatDate(a.createdAt)} · {a.deliveryPartner?.vehicleType || '—'}
                      {a.deliveryPartner?.vehicleNumber ? ` · ${a.deliveryPartner.vehicleNumber}` : ''}
                    </p>
                  </div>
                  <div className="badges">
                    <span className={`badge ${statusBadge(a).cls}`}>{statusBadge(a).label}</span>
                    <span className={`badge ${a.isActive ? 'badge-muted' : 'badge-danger'}`}>
                      {a.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>
                <div className="order-card-foot">
                  <span className="muted small">
                    {a.deliveryPartner?.isAvailable ? '🟢 On duty' : '⚪ Off duty'}
                    {a.deliveryPartner?.verifiedAt ? ` · Verified ${formatDateTime(a.deliveryPartner.verifiedAt)}` : ''}
                  </span>
                  <div className="order-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetailId(a._id)}>Review</button>
                    {a.deliveryPartner?.verificationStatus === 'pending' && (
                      <>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => verify(a)}>Approve</button>
                        <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => reject(a)}>Reject</button>
                      </>
                    )}
                    {a.deliveryPartner?.verificationStatus === 'rejected' && (
                      <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => remove(a)}>Delete</button>
                    )}
                    {a.isActive && a.deliveryPartner?.verificationStatus === 'approved' && (
                      <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => deactivate(a)}>Suspend</button>
                    )}
                    {!a.isActive && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => activate(a)}>Reinstate</button>
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
              <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} agents</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {detailId && (
        <AgentDetailModal
          token={token}
          agentId={detailId}
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

function AgentDetailModal({ token, agentId, onClose, onVerify, onReject, onDeactivate, onActivate }) {
  const toast = useToast()
  const [agent, setAgent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    adminGetDeliveryAgent(token, agentId)
      .then((res) => { if (!cancelled) setAgent(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) { setError(err.message); toast.error(err.message) } })
    return () => { cancelled = true }
  }, [token, agentId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {!agent && !error && <Loading label="Loading delivery agent…" />}
        {error && !agent && <p className="muted small">Couldn't load this agent — close and try again.</p>}

        {agent && (
          <>
            <h2>{agent.name}</h2>
            <p className="muted small">{agent.email}{agent.phone ? ` · ${agent.phone}` : ''} · Applied {formatDate(agent.createdAt)}</p>
            <div className="badges" style={{ margin: '10px 0' }}>
              <span className={`badge ${statusBadge(agent).cls}`}>{statusBadge(agent).label}</span>
              <span className={`badge ${agent.isActive ? 'badge-muted' : 'badge-danger'}`}>
                {agent.isActive ? 'Active' : 'Suspended'}
              </span>
              <span className={`badge ${agent.deliveryPartner?.isAvailable ? 'badge-success' : 'badge-muted'}`}>
                {agent.deliveryPartner?.isAvailable ? 'On duty' : 'Off duty'}
              </span>
            </div>

            {agent.deliveryPartner?.verificationStatus === 'rejected' && agent.deliveryPartner?.rejectionReason && (
              <p className="muted small" style={{ marginTop: 8 }}>
                <strong>Rejection reason:</strong> {agent.deliveryPartner.rejectionReason}
              </p>
            )}

            <h3 className="section-title">Vehicle details</h3>
            <div className="summary-rows">
              <div><span>Vehicle type</span><span>{agent.deliveryPartner?.vehicleType || '—'}</span></div>
              <div><span>Vehicle number</span><span>{agent.deliveryPartner?.vehicleNumber || '—'}</span></div>
            </div>

            <h3 className="section-title">Driving license</h3>
            <div className="summary-rows">
              <div><span>License number</span><span>{agent.deliveryPartner?.licenseNumber || '—'}</span></div>
            </div>
            {agent.deliveryPartner?.licensePhoto?.url ? (
              <a href={agent.deliveryPartner.licensePhoto.url} target="_blank" rel="noreferrer">
                <img
                  src={agent.deliveryPartner.licensePhoto.url}
                  alt={`Driving license of ${agent.name}`}
                  style={{
                    marginTop: 10, maxWidth: '100%', maxHeight: 320, borderRadius: 10,
                    border: '1px solid var(--border, #ddd)', objectFit: 'contain', display: 'block',
                  }}
                />
              </a>
            ) : (
              <p className="muted small" style={{ marginTop: 8 }}>No license photo uploaded.</p>
            )}

            <div className="modal-actions">
              {agent.deliveryPartner?.verificationStatus === 'pending' && (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => { onVerify(agent); onClose() }}>
                    Approve agent
                  </button>
                  <button type="button" className="btn btn-danger-ghost" onClick={() => { onReject(agent); onClose() }}>
                    Reject…
                  </button>
                </>
              )}
              {agent.isActive && agent.deliveryPartner?.verificationStatus === 'approved' && (
                <button type="button" className="btn btn-danger-ghost" onClick={() => { onDeactivate(agent); onClose() }}>
                  Suspend
                </button>
              )}
              {!agent.isActive && (
                <button type="button" className="btn btn-primary" onClick={() => { onActivate(agent); onClose() }}>
                  Reinstate
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
