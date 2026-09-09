import { useEffect, useState } from 'react'
import {
  clearSession, logout, getMe,
  deliveryGetStats, deliveryGetActive, deliveryGetAvailable,
  deliveryUpdateProfile,
} from '../../api.js'
import { navigate, usePath } from '../../router.js'
import { useToast } from '../../toast.js'
import { formatDateTime, ORDER_STATUS_LABELS } from '../../format.js'
import Loading from '../Loading.jsx'
import DeliveryShipmentsView from './DeliveryShipmentsView.jsx'
import DeliveryProfileView from './DeliveryProfileView.jsx'

// Each tab is its own URL: /delivery/overview, /delivery/available, ...
const NAV = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'available', label: 'Available', icon: '🚚' },
  { key: 'active', label: 'My deliveries', icon: '📦' },
  { key: 'history', label: 'History', icon: '🕘' },
  { key: 'profile', label: 'Profile', icon: '👤' },
]

const TAB_KEYS = NAV.map((n) => n.key)

export default function DeliveryDashboard({ session, onLogout }) {
  // The active tab is derived straight from the URL, so back/forward buttons,
  // pasted deep links (/delivery/active) and navigate() all just work.
  const path = usePath()
  const urlTab = path.replace('/delivery/', '').replace(/\/+$/, '')
  const tab = TAB_KEYS.includes(urlTab) ? urlTab : 'overview'
  const toast = useToast()

  // Fresh copy of the partner's profile (availability toggle, vehicle) — the
  // login snapshot can be stale after the partner goes on/off duty.
  const [partner, setPartner] = useState(null)
  const [availableCount, setAvailableCount] = useState(null)
  // Bumped whenever a shipment changes so nav badges stay truthful.
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    getMe(session.token)
      .then((res) => { if (!cancelled) setPartner(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) toast.error(err.message) })
    return () => { cancelled = true }
  }, [session.token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Count of shipments waiting to be accepted → sidebar badge.
  useEffect(() => {
    let cancelled = false
    deliveryGetAvailable(session.token, { page: 1, limit: 1 })
      .then((res) => { if (!cancelled) setAvailableCount(res.pagination?.total ?? 0) })
      .catch(() => { /* badge is best-effort */ })
    return () => { cancelled = true }
  }, [session.token, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    try { await logout(session.token) } catch { /* session already gone */ }
    clearSession()
    onLogout()
  }

  // Shared by the overview + profile tab: flip isAvailable / vehicle and keep
  // the profile snapshot in sync.
  const savePartner = async (body) => {
    const res = await deliveryUpdateProfile(session.token, body)
    setPartner(res.data)
    return res.data
  }

  const current = NAV.find((n) => n.key === tab)
  const isAvailable = partner?.deliveryPartner?.isAvailable ?? false

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand sidebar-brand">🛍️ ShopSphere</div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${tab === item.key ? 'active' : ''}`}
              onClick={() => navigate(`/delivery/${item.key}`)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.key === 'available' && availableCount > 0 && (
                <span className="nav-badge">{availableCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{(session.user?.name || 'D').charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <strong>{session.user?.name}</strong>
            <span className={isAvailable ? 'presence presence-on' : 'presence'}>
              <span className="presence-dot" /> {isAvailable ? 'on duty' : 'off duty'}
            </span>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <h1>{current?.label || 'Delivery dashboard'}</h1>
          <span className="topbar-hint">Signed in as {session.user?.email}</span>
        </header>

        <div className="dashboard-content">
          {tab === 'overview' && (
            partner === null ? <Loading label="Loading your dashboard…" />
              : <OverviewTab token={session.token} partner={partner} onSavePartner={savePartner} />
          )}

          {['available', 'active', 'history'].includes(tab) && (
            <DeliveryShipmentsView
              key={tab}
              mode={tab}
              token={session.token}
              partner={partner}
              onChange={() => setRefreshTick((t) => t + 1)}
            />
          )}

          {tab === 'profile' && (
            partner === null ? <Loading label="Loading your profile…" />
              : <DeliveryProfileView partner={partner} onSave={savePartner} />
          )}
        </div>
      </main>
    </div>
  )
}

function OverviewTab({ token, partner, onSavePartner }) {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [active, setActive] = useState([])
  const [availableTotal, setAvailableTotal] = useState(0)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      deliveryGetStats(token),
      deliveryGetActive(token),
      deliveryGetAvailable(token, { page: 1, limit: 4 }),
    ])
      .then(([s, a, av]) => {
        if (cancelled) return
        setStats(s.data)
        setActive(a.data || [])
        setAvailableTotal(av.pagination?.total ?? (av.data || []).length)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
    return () => { cancelled = true }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  const toggleAvailability = async () => {
    setToggling(true)
    try {
      await onSavePartner({ isAvailable: !(partner?.deliveryPartner?.isAvailable ?? false) })
      toast.success((partner?.deliveryPartner?.isAvailable ?? false) ? 'You went offline' : 'You’re online — new shipments will show up 🚚')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setToggling(false)
    }
  }

  if (error && !stats) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load your dashboard</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }
  if (!stats) return <Loading label="Loading your dashboard…" />

  const isAvailable = partner?.deliveryPartner?.isAvailable ?? false
  const openCount = availableTotal
  const needsAttention = stats.activeDeliveries ?? 0

  return (
    <div>
      {openCount > 0 && (
        <div className="panel" style={{ marginBottom: 22, background: isAvailable ? 'var(--success-bg)' : 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div className="panel-head" style={{ margin: 0 }}>
            <div>
              <h2 style={{ margin: 0 }}>
                {openCount} shipment{openCount === 1 ? '' : 's'} waiting to be picked up 🚚
              </h2>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                {isAvailable
                  ? 'Shipped orders are ready for a delivery partner — claim one to start.'
                  : 'You’re off duty. Go online to start accepting shipments.'}
              </p>
            </div>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate('/delivery/available')}>
              View available
            </button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total deliveries</span>
          <span className="stat-num">{stats.totalDeliveries ?? 0}</span>
          <span className="stat-sub">Lifetime deliveries</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active now</span>
          <span className="stat-num">{stats.activeDeliveries ?? 0}</span>
          <span className="stat-sub">{needsAttention > 0 ? 'On the road — keep going!' : 'No shipments in hand'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Delivered today</span>
          <span className="stat-num">{stats.todayDeliveries ?? 0}</span>
          <span className="stat-sub">Since midnight</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">This month</span>
          <span className="stat-num">{stats.completedThisMonth ?? 0}</span>
          <span className="stat-sub">Completed in {new Date().toLocaleDateString('en-IN', { month: 'long' })}</span>
        </div>
      </div>

      <div className="overview-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Availability</h3>
            <span className={`badge ${isAvailable ? 'badge-success' : 'badge-muted'}`}>
              {isAvailable ? 'On duty' : 'Off duty'}
            </span>
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            {isAvailable
              ? 'You can see and accept available shipments. Flip the switch when you finish your shift.'
              : 'Go online when you’re ready to work — available shipments will be waiting.'}
          </p>
          <button
            type="button"
            className={`btn ${isAvailable ? 'btn-secondary' : 'btn-primary'}`}
            disabled={toggling}
            onClick={toggleAvailability}
          >
            {toggling ? 'Updating…' : isAvailable ? 'Go offline' : 'Go online'}
          </button>
          {partner?.deliveryPartner?.vehicleType && (
            <p className="muted small" style={{ marginTop: 14 }}>
              Vehicle: <strong>{partner.deliveryPartner.vehicleType}</strong>
            </p>
          )}
        </div>

        <div className="panel">
          <h3>Current deliveries</h3>
          {active.length === 0 ? (
            <p className="muted small">No active deliveries — check the available list and accept one.</p>
          ) : (
            active.slice(0, 4).map((o) => (
              <div className="recent-row" key={o._id}>
                <div className="recent-row-info">
                  <p><strong>{o.orderNumber}</strong> · {o.shippingAddress?.fullName || o.customer?.name || 'Customer'}</p>
                  <p className="muted small">{formatDateTime(o.deliveredAt || o.createdAt)}</p>
                </div>
                <span className="badge badge-status">{ORDER_STATUS_LABELS[o.status] || o.status}</span>
              </div>
            ))
          )}
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/delivery/active')}>
              Open my deliveries
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
