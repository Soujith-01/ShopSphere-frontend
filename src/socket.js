import { io } from 'socket.io-client'
import { API_BASE_URL } from './api.js'

// The socket connects to the backend origin (API_BASE_URL minus the /api suffix).
const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '')

// Open a socket connection and register the logged-in user so the backend can
// route real-time events (message:new) to this browser tab.
export function connectChatSocket(userId) {
  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
  })
  socket.on('connect', () => {
    if (userId) socket.emit('register', String(userId))
  })
  return socket
}