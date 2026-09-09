import { useEffect, useRef } from 'react'
import { connectChatSocket } from '../../socket.js'

// Connects a socket for the given user and wires real-time handlers.
// Returns { send } — send() emits message:send and resolves with the
// server-saved message (or rejects, so callers can fall back to REST).
export function useChatSocket(userId, { onMessageNew } = {}) {
  const socketRef = useRef(null)
  const onMessageNewRef = useRef(onMessageNew)
  onMessageNewRef.current = onMessageNew

  useEffect(() => {
    if (!userId) return
    const socket = connectChatSocket(userId)
    socketRef.current = socket
    const handleNew = (payload) => onMessageNewRef.current?.(payload)
    socket.on('message:new', handleNew)
    return () => {
      socket.off('message:new', handleNew)
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId])

  const send = (conversationId, text) =>
    new Promise((resolve, reject) => {
      const socket = socketRef.current
      if (!socket || !socket.connected) {
        reject(new Error('Not connected'))
        return
      }
      socket.emit('message:send', { conversationId, text }, (res) => {
        if (res?.success) resolve(res.data.message)
        else reject(new Error(res?.message || 'Failed to send message'))
      })
    })

  return { send }
}