import { useEffect, useRef } from 'react'
import { connectChatSocket } from '../../socket.js'

// Socket hook for support-ticket chat. Wires the real-time handlers and
// returns { send } — send() emits ticket:send and resolves with the
// server-saved message (or rejects, so callers can fall back to REST).
//
//   onMessage        ({ ticketId, message }) — a new chat message
//   onTicketUpdated  ({ ticketId, ticketNumber }) — list-level change (reply,
//                    status) so lists can refresh without a page reload
//   onTicketNew      (summary) — a customer raised a new ticket (agents only)
export function useTicketSocket(userId, { onMessage, onTicketUpdated, onTicketNew } = {}) {
  const socketRef = useRef(null)
  const handlers = useRef({ onMessage, onTicketUpdated, onTicketNew })
  handlers.current = { onMessage, onTicketUpdated, onTicketNew }

  useEffect(() => {
    if (!userId) return
    const socket = connectChatSocket(userId)
    socketRef.current = socket
    socket.on('ticket:message', (p) => handlers.current.onMessage?.(p))
    socket.on('ticket:updated', (p) => handlers.current.onTicketUpdated?.(p))
    socket.on('ticket:new', (p) => handlers.current.onTicketNew?.(p))
    return () => {
      socket.off('ticket:message')
      socket.off('ticket:updated')
      socket.off('ticket:new')
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId])

  const send = (ticketId, text) =>
    new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket || !socket.connected) {
        reject(new Error('Not connected'))
        return
      }
      socket.emit('ticket:send', { ticketId, text }, (res) => {
        if (res?.success) resolve(res.data.message)
        else reject(new Error(res?.message || 'Failed to send message'))
      })
    })

  return { send, socket: socketRef }
}
