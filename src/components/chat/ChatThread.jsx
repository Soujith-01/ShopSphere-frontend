import { useEffect, useRef, useState } from 'react'
import { formatDateTime } from '../../format.js'
import Spinner from '../Spinner.jsx'

// Presentational chat thread: message bubbles + a send input. No socket or API
// logic — the parent owns messaging and passes onSend(text) → Promise.
export default function ChatThread({ messages = [], currentUserId, onSend, busy = false, placeholder = 'Type a message…' }) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)
  const me = String(currentUserId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const submit = async (e) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || busy) return
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
          messages.map((m) => (
            <div key={m._id} className={`chat-bubble ${String(m.sender) === me ? 'mine' : 'theirs'}`}>
              <p>{m.text}</p>
              <span className="chat-time">{formatDateTime(m.createdAt)}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={2000}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>
          {busy ? <Spinner small /> : 'Send'}
        </button>
      </form>
    </div>
  )
}