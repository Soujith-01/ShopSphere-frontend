import { useEffect, useState } from 'react'
import {
  clearSession, logout,
  sellerGetDashboard, sellerGetRecentOrders, sellerGetRevenueChart, sellerGetStore,
} from '../../api.js'
import { navigate, usePath } from '../../router.js'
import { useToast } from '../../toast.js'
import { formatINR, ORDER_STATUS_LABELS, orderStatusFlavor, formatDateTime } from '../../format.js'
import Loading from '../Loading.jsx'
import SellerProductsView from './SellerProductsView.jsx'
import SellerOrdersView from './SellerOrdersView.jsx'
import SellerReturnsView from './SellerReturnsView.jsx'
import SellerStoreView from './SellerStoreView.jsx'
import SellerWalletView from './SellerWalletView.jsx'
import SellerNotificationsView from './SellerNotificationsView.jsx'

// Each tab is its own URL: /seller/overview, /seller/products, ...
const NAV = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'store', label: 'My Store', icon: '🏪' },
  { key: 'products', label: 'Products', icon: '🛍️' },
  { key: 'orders', label: 'Orders', icon: '📦' },
  { key: 'returns', label: 'Returns', icon: '↩️' },
  { key: 'wallet', label: 'Wallet', icon: '💰' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
]

const TAB_KEYS = NAV.map((n) => n.key)

export default function SellerDashboard({ session, onLogout }) {
  // The active tab is derived straight from the URL, so back/forward buttons,
  // pasted deep links (/seller/orders) and navigate() all just work.
  const path = usePath()
  const urlTab = path.replace('/seller/', '').replace(/\/+$/, '')
  const tab = TAB_KEYS.includes(urlTab) ? urlTab : 'overview'
  const [store, setStore] = useState(undefined) // undefined = loading, null = no store yet
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    sellerGetStore(session.token)
      .then((res) => { if (!cancelled) setStore(res.data) })
      .catch((err) => {
        if (cancelled || err.status === 401) return
        if (err.status === 404) setStore(null)
        else toast.error(err.message)
      })
    return () => { cancelled = true }
  }, [session.token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    try { await logout(session.token) } catch { /* session already gone */ }
    clearSession()
    onLogout()
  }

  const goTo = (key) => setTab(key)

  const current = NAV.find((n) => n.key === tab)

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
              onClick={() => navigate(`/seller/${item.key}`)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{(session.user?.name || 'S').charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <strong>{session.user?.name}</strong>
            <span>seller</span>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <h1>{current?.label || 'Seller dashboard'}</h1>
          <span className="topbar-hint">Signed in as {session.user?.email}</span>
        </header>

        <div className="dashboard-content">
          {tab === 'overview' && <OverviewTab token={session.token} store={store} goTo={goTo} />}

          {tab === 'store' && (
            <SellerStoreView
              token={session.token}
              store={store}
              onStoreSaved={setStore}
            />
          )}

          {tab === 'products' && (
            store === undefined ? <Loading label="Loading store…" />
              : store === null ? <NoStore goTo={goTo} />
                : <SellerProductsView token={session.token} store={store} />
          )}

          {tab === 'orders' && <SellerOrdersView token={session.token} />}
          {tab === 'returns' && <SellerReturnsView token={session.token} />}
          {tab === 'wallet' && <SellerWalletView token={session.token} />}
          {tab === 'notifications' && <SellerNotificationsView token={session.token} />}
        </div>
      </main>
    </div>
  )
}

function NoStore({ goTo }) {
  return (
    <div className="empty-state">
      <div className="empty-emoji">🏪</div>
      <h2>Create your store first</h2>
      <p>Products, orders, and payouts live under your store. Set it up in a minute.</p>
      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={() => goTo('store')}>
          Create my store
        </button>
      </div>
    </div>
  )
}

function OverviewTab({ token, store, goTo }) {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [chart, setChart] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      sellerGetDashboard(token),
      sellerGetRecentOrders(token),
      sellerGetRevenueChart(token, 14),
    ])
      .then(([s, r, c]) => {
        if (cancelled) return
        setStats(s.data)
        setRecent(r.data || [])
        setChart(c.data || [])
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
    return () => { cancelled = true }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

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

  const maxRevenue = Math.max(1, ...chart.map((d) => d.revenue || 0))
  const dayLabel = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      {store === null && (
        <div className="panel" style={{ marginBottom: 22, background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div className="panel-head" style={{ margin: 0 }}>
            <div>
              <h2 style={{ margin: 0 }}>Welcome to your seller dashboard 🎉</h2>
              <p className="muted small" style={{ margin: '4px 0 0' }}>Create your store to start listing products and receiving orders.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => goTo('store')}>Create my store</button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Revenue this month</span>
          <span className="stat-num">{formatINR(stats.revenue?.thisMonth)}</span>
          <span className="stat-sub">All time {formatINR(stats.revenue?.allTime)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Orders</span>
          <span className="stat-num">{stats.orders?.total ?? 0}</span>
          <span className="stat-sub">{stats.orders?.today ?? 0} today · {stats.orders?.pending ?? 0} pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Products</span>
          <span className="stat-num">{stats.products?.total ?? 0}</span>
          <span className="stat-sub">{stats.products?.active ?? 0} live · {stats.products?.lowStock ?? 0} low stock</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ratings</span>
          <span className="stat-num">★ {stats.reviews?.avgRating ?? 0}</span>
          <span className="stat-sub">{stats.reviews?.total ?? 0} reviews</span>
        </div>
      </div>

      <div className="overview-grid">
        <div className="panel">
          <h3>Revenue — last 14 days</h3>
          {chart.length === 0 ? (
            <p className="muted small">No sales yet. Orders that aren't cancelled will show up here.</p>
          ) : (
            <div className="chart-wrap">
              {chart.map((d) => (
                <div className="chart-day" key={d._id} title={`${dayLabel(d._id)} · ${formatINR(d.revenue)}`}>
                  <div className="chart-bar" style={{ height: `${Math.max(3, Math.round((d.revenue / maxRevenue) * 130))}px` }} />
                  <span className="chart-col-label">{dayLabel(d._id)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="stat-sub" style={{ marginTop: 10 }}>Daily total for non-cancelled orders (₹).</div>
        </div>

        <div className="panel">
          <h3>Recent orders</h3>
          {recent.length === 0 ? (
            <p className="muted small">No orders yet — they'll appear here as customers buy.</p>
          ) : (
            recent.map((o) => (
              <div className="recent-row" key={o._id}>
                <div className="recent-row-info">
                  <p><strong>{o.orderNumber}</strong> · {o.customer?.name || 'Customer'}</p>
                  <p className="muted small">{formatDateTime(o.createdAt)}</p>
                </div>
                <span className={`badge badge-${orderStatusFlavor(o.status)}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
                <strong>{formatINR(o.total)}</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
