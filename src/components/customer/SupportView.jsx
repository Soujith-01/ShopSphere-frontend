import { useCallback, useEffect, useRef, useState } from 'react'
import { createTicket, getMyTickets, getMyTicket, replyToTicket } from '../../api.js'
import { useTicketSocket } from '../support/useTicketSocket.js'
import { useToast } from '../../toast.js'
import { formatDateTime, TICKET_STATUS_LABELS, ticketStatusFlavor, TICKET_CATEGORY_LABELS } from '../../format.js'
import Loading from '../Loading.jsx'
import { useNavRefresh } from '../../router.js'

const CATEGORY_OPTIONS = Object.entries(TICKET_CATEGORY_LABELS)

// Customer support view: raise a ticket, browse "my tickets", and chat with
// the support agent in real time (socket push — no page refresh needed).
export default function SupportView({ token, user }) {
  const toast = useToast()
  const refreshTick = useNavRefresh()
  const [tickets, setTickets] = useState(null) // null = loading
  const [activeId, setActiveId] = useState(null)
  const [thread, setThread] = useState(null) // populated ticket
  const [threadLoading, setThreadLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ subject: '', category: 'order_issue', priority: 'medium', message: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadTickets = useCallback(async () => {
    try {
      const res = await getMyTickets(token, { limit: 50 })
      setTickets(res.data || [])
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadTickets() }, [loadTickets, refreshTick])

  const openTicket = useCallback(async (id) => {
    setActiveId(id)
    setThreadLoading(true)
    try {
      const res = await getMyTicket(token, id)
      setThread(res.data)
      setTickets((prev) => prev?.map((t) => (t._id === id ? { ...t, status: res.data.status } : t)))
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setThreadLoading(false)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time: a new message on ANY of my tickets refreshes the list; if it's
  // the open ticket, append the bubble live (deduped).
  const handleSocketMessage = useCallback((payload) => {
    loadTickets()
    setThread((prev) => {
      if (!prev || String(prev._id) !== String(payload.ticketId)) return prev
      const exists = prev.messages.some((m) => String(m._id) === String(payload.message._id))
      return exists ? prev : { ...prev, messages: [...prev.messages, payload.message] }
    })
  }, [loadTickets])

  const { send } = useTicketSocket(user?._id, { onMessage: handleSocketMessage })

  const handleSend = async (text) => {
    if (!activeId) return
    setSending(true)
    try {
      // Socket first; REST fallback if the socket is down.
      const sent = await send(activeId, text).catch(async () => {
        const res = await replyToTicket(token, activeId, text)
        const t = res.data
        return t.messages[t.messages.length - 1]
      })
      setThread((prev) => {
        if (!prev) return prev
        const exists = prev.messages.some((m) => String(m._id) === String(sent._id))
        return exists ? prev : { ...prev, messages: [...prev.messages, sent] }
      })
      loadTickets()
    } catch (err) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const submitTicket = async (e) => {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Subject and message are required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await createTicket(token, {
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        message: form.message.trim(),
      })
      toast.success(`Ticket ${res.data.ticketNumber} created — we'll get back to you shortly`)
      setShowForm(false)
      setForm({ subject: '', category: 'order_issue', priority: 'medium', message: '' })
      await loadTickets()
      openTicket(res.data._id)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (tickets === null) return <Loading label="Loading your tickets…" />

  return (
    <div className="messages-layout">
      <aside className="conv-list">
        <div className="conv-list-head">
          <h3>My tickets</h3>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New ticket'}
          </button>
        </div>

        {showForm && (
          <form className="ticket-new-form" onSubmit={submitTicket}>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Subject — e.g. Order not received"
              maxLength={120}
              required
            />
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORY_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <textarea
              rows={4}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Describe the issue — include the order number if relevant…"
              maxLength={2000}
              required
            />
            <button type="submit" className="btn btn-primary btn-sm btn-block" disabled={submitting}>
              {submitting ? 'Creating…' : 'Submit ticket'}
            </button>
          </form>
        )}

        {tickets.length === 0 && !showForm && (
          <p className="muted small conv-list-empty">
            No tickets yet. Need help with an order, payment or delivery? Raise a ticket and our support team will respond here.
          </p>
        )}

        {tickets.map((t) => (
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
                <span className={`badge badge-${ticketStatusFlavor(t.status)}`} style={{ fontSize: 10 }}>
                  {TICKET_STATUS_LABELS[t.status] || t.status}
                </span>
              </div>
              <p className="muted small">{t.subject}</p>
              <p className="muted small">
                {t.assignedTo?.name ? `Agent: ${t.assignedTo.name} · ` : ''}Updated {formatDateTime(t.updatedAt || t.createdAt)}
              </p>
            </div>
          </button>
        ))}
      </aside>

      <section className="conv-thread">
        {!activeId ? (
          <div className="empty-state">
            <div className="empty-emoji">🎧</div>
            <h2>How can we help?</h2>
            <p>
              Raise a ticket and chat with our support team — replies arrive here
              instantly and you'll also get a notification for each response.
            </p>
          </div>
        ) : threadLoading ? (
          <Loading label="Loading conversation…" />
        ) : (
          <>
            <header className="chat-head">
              <div className="conv-thumb"><span>🎫</span></div>
              <div>
                <strong>{thread?.ticketNumber} · {thread?.subject}</strong>
                <p className="muted small">
                  {TICKET_CATEGORY_LABELS[thread?.category] || thread?.category}
                  {thread?.assignedTo ? ` · Agent: ${thread.assignedTo.name}` : ' · Waiting for an agent to pick this up'}
                </p>
              </div>
            </header>
            <ChatThread
              messages={thread?.messages || []}
              currentUserId={user?._id}
              onSend={handleSend}
              busy={sending}
              disabled={thread && ['resolved', 'closed'].includes(thread.status)}
              disabledNote={thread && ['resolved', 'closed'].includes(thread.status) ? `This ticket is ${thread.status}. Raise a new ticket if you still need help.` : undefined}
              placeholder="Describe your issue or reply to support…"
            />
          </>
        )}
      </section>
    </div>
  )
}

// Local bubble thread with senderRole labels (customer vs support agent).
function ChatThread({ messages = [], currentUserId, onSend, busy = false, placeholder, disabled = false, disabledNote }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const me = String(currentUserId)

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
          <p className="muted small chat-empty">No messages yet — tell us what happened.</p>
        ) : (
          messages.map((m) => {
            const mine = String(m.sender?._id || m.sender) === me
            return (
              <div key={m._id} className={`chat-bubble ${mine ? 'mine' : 'theirs'}`}>
                {!mine && <p className="chat-sender">{m.sender?.name || 'Support team'}</p>}
                <p>{m.message ?? m.text}</p>
                <span className="chat-time">{formatDateTime(m.createdAt)}</span>
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
            placeholder={placeholder}
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
