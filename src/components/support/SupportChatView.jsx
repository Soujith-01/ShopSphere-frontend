import { useCallback, useEffect, useRef, useState } from 'react'
import {
  supportGetTickets, supportGetTicket, supportAssignTicket,
  supportReplyTicket, supportUpdateTicketStatus,
} from '../../api.js'
import { useTicketSocket } from './useTicketSocket.js'
import { useToast } from '../../toast.js'
import {
  formatDateTime,
  TICKET_STATUS_LABELS, ticketStatusFlavor,
  TICKET_PRIORITY_LABELS, ticketPriorityFlavor,
  TICKET_CATEGORY_LABELS,
} from '../../format.js'
import Loading from '../Loading.jsx'

// Live ticket chat for support agents. Left pane: the ticket queue (with live
// filters). Right pane: a real-time chat thread with the customer. New tickets
// and replies are pushed over sockets — no page refresh needed.
export default function SupportChatView({ token, meId, onChange }) {
  const toast = useToast()
  const [tickets, setTickets] = useState(null) // null = loading
  const [queue, setQueue] = useState('all')
  const [activeId, setActiveId] = useState(null)
  const [thread, setThread] = useState(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const listEndRef = useRef(null)

  const loadTickets = useCallback(async () => {
    try {
      const res = await supportGetTickets(token, {
        assignedTo: queue === 'unassigned' ? 'unassigned' : queue === 'mine' ? meId : undefined,
        status: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'].includes(queue) ? queue : undefined,
        limit: 50,
      })
      setTickets(res.data || [])
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }, [token, queue, meId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadTickets() }, [loadTickets])

  const openTicket = useCallback(async (id) => {
    setActiveId(id)
    setThreadLoading(true)
    try {
      const res = await supportGetTicket(token, id)
      setThread(res.data)
      setTickets((prev) => prev?.map((t) => (t._id === id ? { ...t, status: res.data.status, messages: res.data.messages } : t)))
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setThreadLoading(false)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link from a notification: /support/chat?ticket=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tid = params.get('ticket')
    if (tid) {
      window.history.replaceState({}, '', window.location.pathname)
      openTicket(tid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Real-time handlers ────────────────────────────────────────────────
  const handleSocketMessage = useCallback((payload) => {
    // Queue pane: bump message count + sort to top.
    setTickets((prev) => prev && prev.map((t) =>
      t._id === payload.ticketId
        ? { ...t, messages: [...(t.messages || []), payload.message], updatedAt: payload.message.createdAt }
        : t
    ))
    // Thread pane: append if it's the open conversation (deduped).
    setThread((prev) => {
      if (!prev || String(prev._id) !== String(payload.ticketId)) return prev
      const exists = prev.messages.some((m) => String(m._id) === String(payload.message._id))
      return exists ? prev : { ...prev, messages: [...prev.messages, payload.message] }
    })
  }, [])

  const handleTicketUpdated = useCallback((payload) => {
    loadTickets()
    // If it's the open ticket, refresh the thread to pick up status changes.
    setThread((prev) => {
      if (prev && String(prev._id) === String(payload.ticketId)) openTicket(payload.ticketId)
      return prev
    })
  }, [loadTickets, openTicket])

  const handleTicketNew = useCallback((summary) => {
    toast.info(`New ticket ${summary.ticketNumber}: ${summary.subject}`)
    loadTickets()
  }, [loadTickets]) // eslint-disable-line react-hooks/exhaustive-deps

  const { send } = useTicketSocket(meId, {
    onMessage: handleSocketMessage,
    onTicketUpdated: handleTicketUpdated,
    onTicketNew: handleTicketNew,
  })

  const handleSend = async (text) => {
    if (!activeId) return
    setSending(true)
    try {
      // Socket first; REST fallback persists + broadcasts server-side too.
      const sent = await send(activeId, text).catch(async () => {
        const res = await supportReplyTicket(token, activeId, text)
        const t = res.data
        return t.messages[t.messages.length - 1]
      })
      setThread((prev) => {
        if (!prev) return prev
        const exists = prev.messages.some((m) => String(m._id) === String(sent._id))
        return exists ? prev : { ...prev, messages: [...prev.messages, sent] }
      })
      loadTickets()
      onChange?.()
    } catch (err) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const claim = async (t) => {
    try {
      await supportAssignTicket(token, t._id, null)
      toast.success(`Ticket ${t.ticketNumber} assigned to you`)
      loadTickets()
      if (activeId === t._id) openTicket(t._id)
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const changeStatus = async (status) => {
    try {
      const res = await supportUpdateTicketStatus(token, activeId, { status })
      setThread(res.data)
      loadTickets()
      onChange?.()
      toast.success(`Ticket ${TICKET_STATUS_LABELS[status]?.toLowerCase() || status}`)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const QUEUE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'mine', label: 'Mine' },
    { key: 'open', label: 'Open' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'waiting_customer', label: 'Waiting' },
    { key: 'resolved', label: 'Resolved' },
  ]

  if (tickets === null) return <Loading label="Loading ticket queue…" />

  return (
    <div className="messages-layout">
      <aside className="conv-list">
        <div className="conv-list-head">
          <h3>Tickets</h3>
          <span className="muted small">{tickets.length}</span>
        </div>

        <div className="conv-list-filters">
          {QUEUE_FILTERS.map((f) => (
            <button key={f.key} type="button"
              className={`chip-btn ${queue === f.key ? 'active' : ''}`}
              onClick={() => setQueue(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {tickets.length === 0 && (
          <p className="muted small conv-list-empty">No tickets in this view.</p>
        )}

        {tickets.map((t) => {
          const lastMsg = t.messages?.[t.messages.length - 1]
          return (
            <button
              key={t._id}
              type="button"
              className={`conv-item ${activeId === String(t._id) ? 'active' : ''}`}
              onClick={() => openTicket(t._id)}
            >
              <div className="conv-thumb"><span>🎫</span></div>
              <div className="conv-item-body">
                <div className="conv-item-top">
                  <strong>{t.ticketNumber}</strong>
                  <span className={`badge badge-${ticketPriorityFlavor(t.priority)}`} style={{ fontSize: 10 }}>
                    {TICKET_PRIORITY_LABELS[t.priority] || t.priority}
                  </span>
                </div>
                <p className="muted small">{t.customer?.name || 'Customer'} · {t.subject}</p>
                <p className="muted small">
                  {lastMsg ? `${lastMsg.senderRole === 'customer' ? '👤' : '🎧'} ${lastMsg.message?.slice(0, 40) || ''}` : 'No messages'}
                  {` · ${formatDateTime(t.updatedAt || t.createdAt)}`}
                </p>
              </div>
              {!t.assignedTo && (
                <span
                  className="claim-chip"
                  role="button"
                  tabIndex={0
                  }
                  onClick={(e) => { e.stopPropagation(); claim(t) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); claim(t) } }}
                  title="Assign to me"
                >
                  Claim
                </span>
              )}
            </button>
          )
        })}
      </aside>

      <section className="conv-thread">
        {!activeId ? (
          <div className="empty-state">
            <div className="empty-emoji">💬</div>
            <h2>Pick a ticket to start chatting</h2>
            <p>
              Customer messages arrive in real time — claim a ticket and reply
              without leaving this page.
            </p>
          </div>
        ) : threadLoading ? (
          <Loading label="Loading conversation…" />
        ) : (
          <>
            <header className="chat-head">
              <div className="conv-thumb"><span>👤</span></div>
              <div>
                <strong>{thread?.ticketNumber} · {thread?.subject}</strong>
                <p className="muted small">
                  {thread?.customer?.name || 'Customer'} · {thread?.customer?.email || '—'} ·{' '}
                  {TICKET_CATEGORY_LABELS[thread?.category] || thread?.category}
                </p>
              </div>
              <div className="badges" style={{ marginLeft: 'auto' }}>
                <span className={`badge badge-${ticketPriorityFlavor(thread?.priority)}`}>
                  {TICKET_PRIORITY_LABELS[thread?.priority] || thread?.priority}
                </span>
                <span className={`badge badge-${ticketStatusFlavor(thread?.status)}`}>
                  {TICKET_STATUS_LABELS[thread?.status] || thread?.status}
                </span>
              </div>
            </header>

            <div className="chat-toolbar">
              {!thread?.assignedTo ? (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => claim(thread)}>
                  Claim ticket
                </button>
              ) : thread.assignedTo._id !== meId ? (
                <span className="muted small">Assigned to {thread.assignedTo.name}</span>
              ) : (
                <span className="muted small">Assigned to you</span>
              )}
              {['in_progress', 'waiting_customer', 'resolved'].map((s) => (
                thread?.status !== s && !['closed'].includes(thread?.status) && (
                  <button key={s} type="button" className="btn btn-sm btn-secondary" onClick={() => changeStatus(s)}>
                    {s === 'in_progress' ? 'Start working' : s === 'waiting_customer' ? 'Wait on customer' : 'Resolve'}
                  </button>
                )
              ))}
            </div>

            <TicketChatThread
              messages={thread?.messages || []}
              meId={meId}
              onSend={handleSend}
              busy={sending}
              disabled={thread && ['resolved', 'closed'].includes(thread.status)}
              disabledNote={thread && ['resolved', 'closed'].includes(thread.status) ? `This ticket is ${thread.status} — reopen it from the Tickets tab to continue.` : undefined}
            />
          </>
        )}
      </section>
    </div>
  )
}

function TicketChatThread({ messages = [], meId, onSend, busy = false, disabled = false, disabledNote }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const me = String(meId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const submit = async (e) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || busy || disabled) return
    try {
      await onSend(t)
      setText('')
    } catch {
      /* parent surfaces the error toast; keep the text so nothing is lost */
    }
  }

  return (
    <div className="chat-thread">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="muted small chat-empty">No messages yet — say hello 👋</p>
        ) : (
          messages.map((m) => {
            const mine = String(m.sender?._id || m.sender) === me
            return (
              <div key={m._id} className={`chat-bubble ${mine ? 'mine' : 'theirs'}`}>
                {!mine && <p className="chat-sender">{m.sender?.name || m.senderRole || 'Customer'}</p>}
                <p>{m.message ?? m.text}</p>
                <span className="chat-time">
                  {formatDateTime(m.createdAt)}{!mine && m.senderRole ? ` · ${m.senderRole}` : ''}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {disabled ? (
        <p className="muted small chat-empty">{disabledNote}</p>
      ) : (
        <form className="chat-input" onSubmit={submit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply to the customer…"
            maxLength={2000}
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>
            {busy ? '…' : 'Send'}
          </button>
        </form>
      )}
    </div>
  )
}
