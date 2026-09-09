import { useCallback, useEffect, useState } from 'react'
import {
  customerGetConversations, customerGetConversationMessages, customerSendMessage,
  sellerGetConversations, sellerGetConversationMessages, sellerSendMessage,
} from '../../api.js'
import { useChatSocket } from './useChatSocket.js'
import ChatThread from './ChatThread.jsx'
import { formatDateTime, productImageUrl } from '../../format.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'

// Shared customer + seller messaging view. `role` picks the right API and
// labels; real-time delivery rides on sockets (with a REST fallback).
export default function MessagesView({ token, user, role = 'customer' }) {
  const toast = useToast()
  const isCustomer = role === 'customer'
  const api = isCustomer
    ? { list: customerGetConversations, get: customerGetConversationMessages, send: customerSendMessage }
    : { list: sellerGetConversations, get: sellerGetConversationMessages, send: sellerSendMessage }

  const [conversations, setConversations] = useState(null) // null = loading
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState(null)
  const [thread, setThread] = useState(null) // { conversation, messages }
  const [threadLoading, setThreadLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.list(token)
      setConversations(res.data || [])
      setError('')
    } catch (err) {
      if (err.status !== 401) setError(err.message)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadConversations() }, [loadConversations])

  // Support deep links like /seller/messages?conversation=<id> (used when a
  // notification is clicked) — open that conversation on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cid = params.get('conversation')
    if (cid) {
      window.history.replaceState({}, '', window.location.pathname)
      openConversation(cid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openConversation = async (id) => {
    setActiveId(id)
    setThreadLoading(true)
    try {
      const res = await api.get(token, id)
      setThread(res.data)
      loadConversations() // refresh unread badges after marking read
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setThreadLoading(false)
    }
  }

  // Real-time: a new message arrives via socket. Append it to the open thread
  // (deduped) and refresh the list so last-message + unread stay current.
  const handleSocketNew = useCallback((payload) => {
    setThread((prev) => {
      if (!prev || String(prev.conversation._id) !== String(payload.conversationId)) return prev
      const exists = prev.messages.some((m) => String(m._id) === String(payload.message._id))
      return exists ? prev : { ...prev, messages: [...prev.messages, payload.message] }
    })
    loadConversations()
  }, [loadConversations])

  const { send } = useChatSocket(user?._id, { onMessageNew: handleSocketNew })

  const handleSend = async (text) => {
    if (!activeId) return
    setSending(true)
    try {
      // Socket first (persists server-side); REST fallback when disconnected.
      const sent = await send(activeId, text).catch(async () => {
        const res = await api.send(token, activeId, text)
        return res.data
      })
      setThread((prev) => {
        if (!prev) return prev
        const exists = prev.messages.some((m) => String(m._id) === String(sent._id))
        return exists ? prev : { ...prev, messages: [...prev.messages, sent] }
      })
      loadConversations()
    } catch (err) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (error && !conversations) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load your messages</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  if (!conversations) return <Loading label="Loading conversations…" />

  return (
    <div className="messages-layout">
      <aside className="conv-list">
        <div className="conv-list-head"><h3>Conversations</h3></div>
        {conversations.length === 0 ? (
          <p className="muted small conv-list-empty">
            {isCustomer
              ? 'No conversations yet. Ask a seller a question from any product page.'
              : 'No conversations yet. Customer questions about your products will appear here.'}
          </p>
        ) : (
          conversations.map((c) => {
            const other = isCustomer ? c.seller : c.customer
            const unread = isCustomer ? c.unreadCustomer : c.unreadSeller
            const img = productImageUrl(c.product)
            return (
              <button
                key={c._id}
                type="button"
                className={`conv-item ${activeId === String(c._id) ? 'active' : ''}`}
                onClick={() => openConversation(c._id)}
              >
                <div className="conv-thumb">{img ? <img src={img} alt="" /> : <span>🛍️</span>}</div>
                <div className="conv-item-body">
                  <div className="conv-item-top">
                    <strong>{c.product?.name || 'Product'}</strong>
                    {unread > 0 && <span className="nav-badge">{unread}</span>}
                  </div>
                  <p className="muted small">{other?.name || '—'} · {c.lastMessage?.text || 'No messages yet'}</p>
                  <p className="muted small">{formatDateTime(c.lastMessageAt)}</p>
                </div>
              </button>
            )
          })
        )}
      </aside>

      <section className="conv-thread">
        {!activeId ? (
          <div className="empty-state">
            <div className="empty-emoji">💬</div>
            <p>Select a conversation to start chatting.</p>
          </div>
        ) : threadLoading ? (
          <Loading label="Loading conversation…" />
        ) : (
          <>
            <header className="chat-head">
              <div className="conv-thumb">
                {productImageUrl(thread?.conversation?.product)
                  ? <img src={productImageUrl(thread?.conversation?.product)} alt="" />
                  : <span>🛍️</span>}
              </div>
              <div>
                <strong>{thread?.conversation?.product?.name || 'Product'}</strong>
                <p className="muted small">
                  {isCustomer ? thread?.conversation?.seller?.name : thread?.conversation?.customer?.name}
                </p>
              </div>
            </header>
            <ChatThread
              messages={thread?.messages || []}
              currentUserId={user?._id}
              onSend={handleSend}
              busy={sending}
              placeholder={isCustomer ? 'Ask the seller a question…' : 'Reply to the customer…'}
            />
          </>
        )}
      </section>
    </div>
  )
}