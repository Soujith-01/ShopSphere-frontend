import { useEffect, useState } from 'react'
import {
  getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification,
} from '../../api.js'
import { formatDateTime } from '../../format.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'

export default function NotificationsView({ token }) {
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Surface load failures as a toast; the content area shows a fallback state.
  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  const load = async () => {
    const res = await getNotifications(token, { limit: 50 })
    setNotifications(res.data?.notifications || [])
    setUnreadCount(res.data?.unreadCount || 0)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead(token)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleMark = async (n) => {
    if (n.isRead) return
    try {
      await markNotificationRead(token, n._id)
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleDelete = async (n) => {
    try {
      await deleteNotification(token, n._id)
      setNotifications((prev) => {
        const next = prev.filter((x) => x._id !== n._id)
        if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1))
        return next
      })
      toast.success('Notification deleted')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  if (loading) return <Loading label="Loading notifications…" />

  if (error) {
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
        <h2>No notifications</h2>
        <p>Order updates, product approvals, and account alerts will appear here.</p>
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