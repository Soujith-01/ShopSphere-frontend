import { useCallback, useRef, useState } from 'react'
import {
  customerStartConversation, customerSendMessage, customerGetConversationMessages,
} from '../../api.js'
import { useChatSocket } from './useChatSocket.js'
import ChatThread from './ChatThread.jsx'
import { productImageUrl } from '../../format.js'
import { useToast } from '../../toast.js'

// Ask-a-question modal from the product detail view. The first message creates
// the conversation (REST); follow-ups ride the socket with a REST fallback.
export default function ProductChatModal({ token, user, product, onClose }) {
  const toast = useToast()
  const [conversationId, setConversationId] = useState(null)
  const conversationIdRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)

  const handleSocketNew = useCallback((payload) => {
    const currentId = conversationIdRef.current
    if (currentId && String(payload.conversationId) === String(currentId)) {
      setMessages((prev) =>
        prev.some((m) => String(m._id) === String(payload.message._id))
          ? prev
          : [...prev, payload.message]
      )
    }
  }, [])

  const { send } = useChatSocket(user?._id, { onMessageNew: handleSocketNew })

  const loadMessages = async (id) => {
    try {
      const res = await customerGetConversationMessages(token, id)
      setMessages(res.data?.messages || [])
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleSend = async (text) => {
    setBusy(true)
    try {
      if (!conversationId) {
        // First message creates (or reuses) the conversation for this product.
        const res = await customerStartConversation(token, { productId: product._id, text })
        const id = res.data.conversation._id
        setConversationId(id)
        conversationIdRef.current = id
        await loadMessages(id)
      } else {
        const sent = await send(conversationId, text).catch(async () => {
          const res = await customerSendMessage(token, conversationId, text)
          return res.data
        })
        setMessages((prev) =>
          prev.some((m) => String(m._id) === String(sent._id)) ? prev : [...prev, sent]
        )
      }
    } catch (err) {
      if (err.status !== 401) toast.error(err.message || 'Failed to send message')
    } finally {
      setBusy(false)
    }
  }

  const img = productImageUrl(product)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <header className="chat-head">
          <div className="conv-thumb">{img ? <img src={img} alt="" /> : <span>🛍️</span>}</div>
          <div>
            <h2 style={{ margin: 0 }}>{product.name}</h2>
            <p className="muted small">
              Ask {product.store?.name || 'the seller'} anything about this product — before or after buying.
            </p>
          </div>
        </header>

        <div className="chat-modal-thread">
          <ChatThread
            messages={messages}
            currentUserId={user?._id}
            onSend={handleSend}
            busy={busy}
            placeholder="Ask a question about this product…"
          />
        </div>
      </div>
    </div>
  )
}