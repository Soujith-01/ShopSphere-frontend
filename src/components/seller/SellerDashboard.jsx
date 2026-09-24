import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  Package,
  RotateCcw,
  Wallet,
  MessageSquare,
  Bell,
} from 'lucide-react'
import {
  clearSession, logout,
  sellerGetDashboard, sellerGetRecentOrders, sellerGetRevenueChart, sellerGetStore,
  sellerReshareSheet, sellerSyncFromSheet,
} from '../../api.js'
import { navigate, usePath, useNavRefresh } from '../../router.js'
import { useToast } from '../../toast.js'
import { formatINR, ORDER_STATUS_LABELS, orderStatusFlavor, formatDateTime } from '../../format.js'
import Loading from '../Loading.jsx'
import SellerProductsView from './SellerProductsView.jsx'
import SellerOrdersView from './SellerOrdersView.jsx'
import SellerReturnsView from './SellerReturnsView.jsx'
import SellerStoreView from './SellerStoreView.jsx'
import SellerWalletView from './SellerWalletView.jsx'
import SellerNotificationsView from './SellerNotificationsView.jsx'
import MessagesView from '../chat/MessagesView.jsx'

// Each tab is its own URL: /seller/overview, /seller/products, ...
const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'store', label: 'My Store', icon: Store },
  { key: 'products', label: 'Products', icon: ShoppingBag },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'returns', label: 'Returns', icon: RotateCcw },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

const TAB_KEYS = NAV.map((n) => n.key)

export default function SellerDashboard({ session, onLogout }) {
  // The active tab is derived straight from the URL, so back/forward buttons,
  // pasted deep links (/seller/orders) and navigate() all just work.
  const path = usePath()
  const urlTab = path.replace('/seller/', '').replace(/\/+$/, '')
  const tab = TAB_KEYS.includes(urlTab) ? urlTab : 'overview'
  // Re-clicking the current tab remounts the view below — fresh state/data.
  const refreshTick = useNavRefresh()
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

  const goTo = (key) => navigate(`/seller/${key}`)

  const current = NAV.find((n) => n.key === tab)

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand sidebar-brand">
          <ShoppingBag size={22} strokeWidth={2.2} className="brand-icon" />
          <span>Eazy</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${tab === item.key ? 'active' : ''}`}
                onClick={() => navigate(`/seller/${item.key}`)}
              >
                <span className="nav-icon">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            )
          })}
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
          {/* key={refreshTick}: re-clicking the current tab remounts the view. */}
          <div key={refreshTick}>
          {tab === 'overview' && (
            <OverviewTab
              token={session.token}
              store={store}
              goTo={goTo}
              onStoreSaved={setStore}
            />
          )}

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
          {tab === 'messages' && <MessagesView token={session.token} user={session.user} role="seller" />}
          {tab === 'notifications' && <SellerNotificationsView token={session.token} />}
          </div>
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

function OverviewTab({ token, store, goTo, onStoreSaved }) {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [chart, setChart] = useState([])
  const [error, setError] = useState('')
  const [resharing, setResharing] = useState(false)
  const [syncing, setSyncing] = useState(false)

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

  // Ask the API to share the sheet with the seller's current email (and revoke
  // any old address) — for sellers who changed their account email.
  const handleReshare = async () => {
    setResharing(true)
    try {
      const res = await sellerReshareSheet(token)
      if (res.data) onStoreSaved?.(res.data)
      toast.success(res.message || 'Sheet access restored ✓')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setResharing(false)
    }
  }

  // Pull the seller's Google Sheet back in (new rows + edits to existing ones).
  const handleSyncFromSheet = async () => {
    setSyncing(true)
    try {
      const res = await sellerSyncFromSheet(token)
      const { imported = [], updated = [], errors = [] } = res.data || {}
      const summary = [
        imported.length ? `${imported.length} added` : '',
        updated.length ? `${updated.length} updated` : '',
      ].filter(Boolean).join(' · ')

      if (errors.length) {
        toast.error(`Synced with ${errors.length} problem row${errors.length === 1 ? '' : 's'}: ${errors[0].reason}`)
      } else if (summary) {
        toast.success(`Google Sheet synced — ${summary}`)
      } else {
        toast.success('Already up to date with your Google Sheet')
      }
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setSyncing(false)
    }
  }

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

      {store?.googleSheet?.spreadsheetUrl && (
        <div className="panel" style={{ marginBottom: 22 }}>
          <div className="panel-head" style={{ margin: 0 }}>
            <div>
              <h2 style={{ margin: 0 }}>My Store</h2>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                {store.name} — products you add here sync straight to your Google Sheet.
                {store.googleSheet.sharedWith
                  ? ` Shared with ${store.googleSheet.sharedWith}.`
                  : ' Not shared with your email yet.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSyncFromSheet}
                disabled={syncing}
                title="Import new rows from your sheet and apply your price/stock edits"
              >
                {syncing ? 'Syncing…' : '🔄 Sync Products'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleReshare}
                disabled={resharing}
                title="Changed your account email? Re-share your sheet with your current address."
              >
                {resharing ? 'Re-sharing…' : 'Re-share access'}
              </button>
              <a
                href={store.googleSheet.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                Open Google Sheet ↗
              </a>
            </div>
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
