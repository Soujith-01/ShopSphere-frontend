import { useEffect, useState } from 'react'
import {
  supportGetTickets, supportGetTicket, supportAssignTicket,
  supportReplyTicket, supportUpdateTicketStatus, supportUpdateTicketPriority,
} from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatDateTime,
  TICKET_STATUS_LABELS, ticketStatusFlavor,
  TICKET_PRIORITY_LABELS, ticketPriorityFlavor,
  TICKET_CATEGORY_LABELS,
} from '../../format.js'
import Loading from '../Loading.jsx'

// Filter chips, left to right: everything, the shared queue, my tickets, then statuses.
const QUEUE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'mine', label: 'My tickets' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'waiting_customer', label: 'Waiting on customer' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
]

// statuses → what the button does (only the transitions agents actually use).
const STATUS_ACTIONS = {
  open: [
    { status: 'in_progress', label: 'Start working' },
    { status: 'resolved', label: 'Resolve' },
  ],
  in_progress: [
    { status: 'waiting_customer', label: 'Wait on customer' },
    { status: 'resolved', label: 'Resolve' },
  ],
  waiting_customer: [
    { status: 'in_progress', label: 'Resume' },
    { status: 'resolved', label: 'Resolve' },
  ],
  resolved: [
    { status: 'in_progress', label: 'Reopen' },
    { status: 'closed', label: 'Close' },
  ],
  closed: [
    { status: 'in_progress', label: 'Reopen' },
  ],
}

export default function SupportTicketsView({ token, meId, onChange }) {
  const toast = useToast()
  const [tickets, setTickets] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [queue, setQueue] = useState('all')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    supportGetTickets(token, {
      assignedTo: queue === 'unassigned' ? 'unassigned' : queue === 'mine' ? meId : undefined,
      status: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].includes(queue) ? queue : undefined,
      priority: priority || undefined,
      category: category || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (cancelled) return
        setTickets(res.data || [])
        setPagination(res.pagination || null)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, queue, priority, category, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  const claim = async (t) => {
    try {
      await supportAssignTicket(token, t._id, null) // null → assign to self
      toast.success(`Ticket ${t.ticketNumber} assigned to you`)
      setPage(1)
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="filters">
        <div className="filters-status" style={{ marginBottom: 10 }}>
          {QUEUE_FILTERS.map((f) => (
            <button key={f.key} type="button"
              className={`chip-btn ${queue === f.key ? 'active' : ''}`}
              onClick={() => { setQueue(f.key); setPage(1) }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="filters-status" style={{ marginBottom: 0 }}>
          <select className="chip-btn" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }} aria-label="Filter by priority">
            <option value="">Any priority</option>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="chip-btn" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} aria-label="Filter by category">
            <option value="">Any category</option>
            {Object.entries(TICKET_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {loading && <Loading label="Loading tickets…" />}

      {!loading && tickets.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🎫</div>
          <h2>No tickets here</h2>
          <p>{queue === 'unassigned' ? 'The shared queue is empty — nice.' : queue === 'mine' ? "You haven't claimed any tickets yet. Grab one from the shared queue." : 'Tickets will appear as customers raise issues.'}</p>
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <>
          <div className="orders-list">
            {tickets.map((t) => {
              const mine = t.assignedTo?._id === meId
              return (
                <div className="order-card" key={t._id}>
                  <div className="order-card-head">
                    <div>
                      <strong>{t.ticketNumber}</strong> · <span>{t.subject}</span>
                      <p className="muted small">
                        {t.customer?.name || 'Customer'} · {TICKET_CATEGORY_LABELS[t.category] || t.category} · {formatDateTime(t.createdAt)}
                      </p>
                      {t.assignedTo && <p className="muted small">Agent: {mine ? 'You' : t.assignedTo.name}</p>}
                    </div>
                    <div className="badges">
                      <span className={`badge badge-${ticketPriorityFlavor(t.priority)}`}>
                        {TICKET_PRIORITY_LABELS[t.priority] || t.priority}
                      </span>
                      <span className={`badge badge-${ticketStatusFlavor(t.status)}`}>
                        {TICKET_STATUS_LABELS[t.status] || t.status}
                      </span>
                    </div>
                  </div>
                  <div className="order-card-foot">
                    <span className="muted small">{t.messages?.length ?? 0} message{(t.messages?.length ?? 0) === 1 ? '' : 's'}</span>
                    <div className="order-actions">
                      {!t.assignedTo && (
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => claim(t)}>
                          Claim
                        </button>
                      )}
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setDetailId(t._id)}>
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} tickets</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {detailId && (
        <TicketDetailModal
          token={token}
          meId={meId}
          ticketId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => { setPage(1); onChange?.() }}
        />
      )}
    </div>
  )
}

function TicketDetailModal({ token, meId, ticketId, onClose, onChanged }) {
  const toast = useToast()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  const [resolution, setResolution] = useState('')

  const load = () => {
    let cancelled = false
    supportGetTicket(token, ticketId)
      .then((res) => { if (!cancelled) setTicket(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) { setError(err.message); toast.error(err.message) } })
    return () => { cancelled = true }
  }

  useEffect(load, [token, ticketId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendReply = async (e) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    try {
      const res = await supportReplyTicket(token, ticketId, reply.trim())
      setTicket(res.data)
      setReply('')
      onChanged?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const changeStatus = async (status, note = '', res = '') => {
    setBusy(true)
    try {
      const out = await supportUpdateTicketStatus(token, ticketId, { status, note, resolution: res })
      setTicket(out.data)
      setShowResolve(false)
      setResolution('')
      toast.success(`Ticket ${TICKET_STATUS_LABELS[status]?.toLowerCase() || status}`)
      onChanged?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const changePriority = async (p) => {
    setBusy(true)
    try {
      const out = await supportUpdateTicketPriority(token, ticketId, p)
      setTicket(out.data)
      toast.success(`Priority set to ${TICKET_PRIORITY_LABELS[p]}`)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const assignToMe = async () => {
    setBusy(true)
    try {
      const out = await supportAssignTicket(token, ticketId, null)
      setTicket(out.data)
      toast.success('Assigned to you')
      onChanged?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const isMine = ticket?.assignedTo?._id === meId
  const locked = ['resolved', 'closed'].includes(ticket?.status)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {!ticket && !error && <Loading label="Loading ticket…" />}
        {error && !ticket && <p className="muted small">Couldn't load this ticket — close and try again.</p>}

        {ticket && (
          <>
            <h2>{ticket.ticketNumber} · {ticket.subject}</h2>
            <p className="muted small" style={{ margin: '4px 0 10px' }}>
              {ticket.customer?.name || 'Customer'} · {ticket.customer?.email || '—'}
              {ticket.customer?.phone ? ` · ${ticket.customer.phone}` : ''} · Raised {formatDateTime(ticket.createdAt)}
            </p>

            <div className="badges">
              <span className={`badge badge-${ticketPriorityFlavor(ticket.priority)}`}>
                {TICKET_PRIORITY_LABELS[ticket.priority] || ticket.priority}
              </span>
              <span className={`badge badge-${ticketStatusFlavor(ticket.status)}`}>
                {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
              </span>
              <span className="badge badge-muted">{TICKET_CATEGORY_LABELS[ticket.category] || ticket.category}</span>
              {ticket.assignedTo && <span className="badge badge-muted">Agent: {isMine ? 'You' : ticket.assignedTo.name}</span>}
            </div>

            {(ticket.order || ticket.product) && (
              <p className="muted small" style={{ margin: '10px 0 0' }}>
                {ticket.order && <>Related order: <strong>{ticket.order.orderNumber}</strong> ({ticket.order.status}) </>}
                {ticket.product && <>· Related product: <strong>{ticket.product.name}</strong></>}
              </p>
            )}

            <h3 className="section-title">Actions</h3>
            <div className="order-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
              {!ticket.assignedTo && (
                <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={assignToMe}>
                  Claim ticket
                </button>
              )}
              {(STATUS_ACTIONS[ticket.status] || []).map((a) => (
                a.status === 'resolved' ? (
                  <button key={a.status} type="button" className="btn btn-sm btn-primary"
                    disabled={busy} onClick={() => setShowResolve(true)}>
                    {a.label}
                  </button>
                ) : (
                  <button key={a.status} type="button" className="btn btn-sm btn-secondary"
                    disabled={busy} onClick={() => changeStatus(a.status)}>
                    {a.label}
                  </button>
                )
              ))}
              {!locked && Object.entries(TICKET_PRIORITY_LABELS).map(([k, v]) => (
                ticket.priority !== k && (
                  <button key={k} type="button" className="btn btn-sm btn-danger-ghost"
                    disabled={busy} onClick={() => changePriority(k)}>
                    {v}
                  </button>
                )
              ))}
            </div>

            {showResolve && (
              <div className="fieldset" style={{ marginTop: 12 }}>
                <p className="fieldset-title">Resolution note (shared with the customer)</p>
                <textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)}
                  placeholder="What was done to fix this…" />
                <div className="order-actions">
                  <button type="button" className="btn btn-sm btn-primary" disabled={busy}
                    onClick={() => changeStatus('resolved', 'Resolved', resolution.trim())}>
                    Confirm resolve
                  </button>
                  <button type="button" className="btn btn-sm btn-secondary" disabled={busy}
                    onClick={() => setShowResolve(false)}>Cancel</button>
                </div>
              </div>
            )}

            {ticket.resolution && (
              <p className="muted small" style={{ margin: '10px 0 0' }}>
                <strong>Resolution:</strong> {ticket.resolution}
              </p>
            )}

            <h3 className="section-title">Conversation</h3>
            <div className="ticket-thread">
              {ticket.messages.map((m) => (
                <div key={m._id} className={`ticket-msg ticket-msg-${m.senderRole} ${m.sender?._id === meId ? 'mine' : ''}`}>
                  <div className="ticket-msg-head">
                    <strong>{m.sender?.name || m.senderRole}</strong>
                    <span className="muted tiny">{m.senderRole} · {formatDateTime(m.createdAt)}</span>
                  </div>
                  <p style={{ margin: '4px 0 0' }}>{m.message}</p>
                </div>
              ))}
            </div>

            {!locked && (
              <form onSubmit={sendReply} className="coupon-form" style={{ marginTop: 14 }}>
                <input value={reply} onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply to the customer…" />
                <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !reply.trim()}>
                  {sending ? 'Sending…' : 'Send reply'}
                </button>
              </form>
            )}
            {locked && (
              <p className="muted small" style={{ marginTop: 10 }}>
                This ticket is {ticket.status} — reopen it to continue the conversation.
              </p>
            )}

            <h3 className="section-title">Status history</h3>
            <ol className="timeline">
              {(ticket.statusHistory || []).map((h, i) => (
                <li key={i}>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{TICKET_STATUS_LABELS[h.status] || h.status}</strong>
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
