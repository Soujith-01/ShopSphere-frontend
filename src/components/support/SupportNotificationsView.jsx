import { useEffect, useState } from 'react'
import {
  supportGetNotifications, supportMarkNotificationRead,
  supportMarkAllNotificationsRead, supportDeleteNotification,
} from '../../api.js'
import { useToast } from '../../toast.js'
import { formatDateTime } from '../../format.js'
import Loading from '../Loading.jsx'

export default function SupportNotificationsView({ token, onChange }) {
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    const res = await supportGetNotifications(token, { limit: 50 })
    setNotifications(res.data?.notifications || [])
    setUnreadCount(res.data?.unreadCount || 0)
  }

  useEffect(() => {
    load().catch((err) => { if (err.status !== 401) setError(err.message) })
      .finally(() => setLoading(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  const handleMarkAll = async () => {
    try {
      await supportMarkAllNotificationsRead(token)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      onChange?.()
      toast.success('All notifications marked as read')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleMark = async (n) => {
    if (n.isRead) return
    try {
      await supportMarkNotificationRead(token, n._id)
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
      onChange?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleDelete = async (n) => {
    try {
      await supportDeleteNotification(token, n._id)
      setNotifications((prev) => {
        const next = prev.filter((x) => x._id !== n._id)
        if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1))
        return next
      })
      onChange?.()
      toast.success('Notification deleted')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  if (loading) return <Loading label="Loading notifications…" />

  if (error && notifications.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load notifications</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">🔔</div>
        <h2>No notifications yet</h2>
        <p>Ticket assignments and customer replies will appear here.</p>
      </div>
    )
  }

  return (
    <div className="notifications">
      <div className="notifications-head">
        <span className="muted">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</span>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={handleMarkAll}>Mark all read</button>
        )}
      </div>

      <div className="notification-list">
        {notifications.map((n) => (
          <div
            key={n._id}
            className={`notification ${n.isRead ? '' : 'unread'}`}
            onClick={() => handleMark(n)}
          >
            <div className="notification-body">
              <p className="notification-title">
                {n.title}
                {!n.isRead && <span className="dot" />}
              </p>
              <p className="muted small">{n.message}</p>
              <p className="muted tiny">{formatDateTime(n.createdAt)}</p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-danger-ghost"
              onClick={(e) => { e.stopPropagation(); handleDelete(n) }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
