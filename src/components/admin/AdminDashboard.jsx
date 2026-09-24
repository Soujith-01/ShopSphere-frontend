import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Store,
  Truck,
  ShoppingBag,
  Layers,
  Package,
  RotateCcw,
  Ticket,
  Bell,
  ShieldCheck,
} from 'lucide-react'
import {
  clearSession, logout,
  adminGetOverview, adminGetRevenueChart, adminGetTopSellers, adminGetTopProducts,
  adminGetNotifications,
} from '../../api.js'
import { navigate, usePath, useNavRefresh } from '../../router.js'
import { useToast } from '../../toast.js'
import { formatINR, formatDate, formatDateTime, productImageUrl } from '../../format.js'
import Loading from '../Loading.jsx'
import AdminUsersView from './AdminUsersView.jsx'
import AdminSellersView from './AdminSellersView.jsx'
import AdminDeliveryView from './AdminDeliveryView.jsx'
import AdminProductsView from './AdminProductsView.jsx'
import AdminCategoriesView from './AdminCategoriesView.jsx'
import AdminOrdersView from './AdminOrdersView.jsx'
import AdminReturnsView from './AdminReturnsView.jsx'
import AdminCouponsView from './AdminCouponsView.jsx'
import AdminNotificationsView from './AdminNotificationsView.jsx'

// Each tab is its own URL: /admin/overview, /admin/users, ...
const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'sellers', label: 'Sellers', icon: Store },
  { key: 'delivery', label: 'Delivery agents', icon: Truck },
  { key: 'products', label: 'Products', icon: ShoppingBag },
  { key: 'categories', label: 'Categories', icon: Layers },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'returns', label: 'Returns', icon: RotateCcw },
  { key: 'coupons', label: 'Coupons', icon: Ticket },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

const TAB_KEYS = NAV.map((n) => n.key)

const CHART_RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
]

export default function AdminDashboard({ session, onLogout }) {
  // The active tab is derived straight from the URL, so back/forward buttons,
  // pasted deep links (/admin/users) and navigate() all just work.
  const path = usePath()
  const urlTab = path.replace('/admin/', '').replace(/\/+$/, '')
  const tab = TAB_KEYS.includes(urlTab) ? urlTab : 'overview'
  // Re-clicking the current tab remounts the view below — fresh state/data.
  const refreshTick = useNavRefresh()
  const toast = useToast()

  // Overview is fetched in the shell so the sidebar can badge the moderation
  // queue, and the overview tab gets its headline stats for free. Views that
  // change those numbers (approve/reject, verify sellers) call onChange().
  const [overview, setOverview] = useState(null)
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    let cancelled = false
    adminGetOverview(session.token)
      .then((res) => { if (!cancelled) setOverview(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) toast.error(err.message) })
    return () => { cancelled = true }
  }, [session.token, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Unread admin notifications (seller approval requests) → sidebar badge.
  useEffect(() => {
    let cancelled = false
    adminGetNotifications(session.token, { limit: 1 })
      .then((res) => { if (!cancelled) setUnreadNotifs(res.data?.unreadCount || 0) })
      .catch(() => { /* badge is best-effort */ })
    return () => { cancelled = true }
  }, [session.token, refreshTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const refreshOverview = () => {
    adminGetOverview(session.token)
      .then((res) => setOverview(res.data))
      .catch(() => {})
  }

  const refreshNotifs = () => {
    adminGetNotifications(session.token, { limit: 1 })
      .then((res) => setUnreadNotifs(res.data?.unreadCount || 0))
      .catch(() => {})
  }

  const handleLogout = async () => {
    try { await logout(session.token) } catch { /* session already gone */ }
    clearSession()
    onLogout()
  }

  const current = NAV.find((n) => n.key === tab)
  const pendingCount = overview?.products?.pending ?? 0
  const pendingDeliveryAgents = overview?.deliveryAgents?.pending ?? 0

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand sidebar-brand">
          <ShoppingBag size={22} strokeWidth={2.2} className="brand-icon" />
          <span>ShopSphere</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${tab === item.key ? 'active' : ''}`}
                onClick={() => navigate(`/admin/${item.key}`)}
              >
                <span className="nav-icon">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.key === 'products' && pendingCount > 0 && (
                  <span className="nav-badge">{pendingCount}</span>
                )}
                {item.key === 'delivery' && pendingDeliveryAgents > 0 && (
                  <span className="nav-badge">{pendingDeliveryAgents}</span>
                )}
                {item.key === 'notifications' && unreadNotifs > 0 && (
                  <span className="nav-badge">{unreadNotifs}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <div className="sidebar-user-info">
            <strong>{session.user?.name}</strong>
            <span>admin</span>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <h1>{current?.label || 'Admin dashboard'}</h1>
          <span className="topbar-hint">Signed in as {session.user?.email}</span>
        </header>

        <div className="dashboard-content">
          {/* key={refreshTick}: re-clicking the current tab remounts the view. */}
          <div key={refreshTick}>
          {tab === 'overview' && (
            overview === null
              ? <Loading label="Loading platform overview…" />
              : <OverviewTab token={session.token} overview={overview} goTo={(key) => navigate(`/admin/${key}`)} />
          )}

          {tab === 'users' && <AdminUsersView token={session.token} />}
          {tab === 'sellers' && <AdminSellersView token={session.token} onChange={refreshOverview} />}
          {tab === 'delivery' && <AdminDeliveryView token={session.token} />}
          {tab === 'products' && <AdminProductsView token={session.token} onChange={refreshOverview} />}
          {tab === 'categories' && <AdminCategoriesView token={session.token} />}
          {tab === 'orders' && <AdminOrdersView token={session.token} />}
          {tab === 'returns' && <AdminReturnsView token={session.token} />}
          {tab === 'coupons' && <AdminCouponsView token={session.token} />}
          {tab === 'notifications' && <AdminNotificationsView token={session.token} onChange={refreshNotifs} />}
          </div>
        </div>
      </main>
    </div>
  )
}

function OverviewTab({ token, overview, goTo }) {
  const toast = useToast()
  const [days, setDays] = useState(30)
  const [chart, setChart] = useState([])
  const [topSellers, setTopSellers] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      adminGetRevenueChart(token, days),
      adminGetTopSellers(token, 5),
      adminGetTopProducts(token, 5),
    ])
      .then(([c, s, p]) => {
        if (cancelled) return
        setChart(c.data || [])
        setTopSellers(s.data || [])
        setTopProducts(p.data || [])
        setLoaded(true)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) toast.error(err.message) })
    return () => { cancelled = true }
  }, [token, days]) // eslint-disable-line react-hooks/exhaustive-deps

  const maxRevenue = Math.max(1, ...chart.map((d) => d.revenue || 0))
  const dayLabel = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  }

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total revenue</span>
          <span className="stat-num">{formatINR(overview.revenue?.allTime)}</span>
          <span className="stat-sub">{formatINR(overview.revenue?.thisMonth)} this month</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Orders</span>
          <span className="stat-num">{overview.orders?.total ?? 0}</span>
          <span className="stat-sub">Across all sellers</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Users</span>
          <span className="stat-num">{overview.users?.total ?? 0}</span>
          <span className="stat-sub">+{overview.users?.newThisMonth ?? 0} this month</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sellers</span>
          <span className="stat-num">{overview.sellers?.total ?? 0}</span>
          <span className="stat-sub">{overview.sellers?.verified ?? 0} verified</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Products</span>
          <span className="stat-num">{overview.products?.total ?? 0}</span>
          <span className="stat-sub">{overview.products?.active ?? 0} live · {overview.products?.pending ?? 0} pending review</span>
        </div>
      </div>

      {(overview.products?.pending > 0 || overview.sellers?.total > (overview.sellers?.verified ?? 0)) && (
        <div className="panel" style={{ marginBottom: 22, background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div className="panel-head" style={{ margin: 0 }}>
            <div>
              <h2 style={{ margin: 0 }}>Needs your attention 👀</h2>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                {overview.products?.pending > 0 && <>{overview.products.pending} product{overview.products.pending === 1 ? '' : 's'} waiting for approval. </>}
                {overview.sellers?.total > (overview.sellers?.verified ?? 0) && <>{overview.sellers.total - (overview.sellers.verified ?? 0)} seller application{overview.sellers.total - (overview.sellers.verified ?? 0) === 1 ? '' : 's'} to review.</>}
              </p>
            </div>
            <div className="order-actions">
              {overview.products?.pending > 0 && (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => goTo('products')}>
                  Review products
                </button>
              )}
              {overview.sellers?.total > (overview.sellers?.verified ?? 0) && (
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => goTo('sellers')}>
                  Review sellers
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="overview-grid">
        <div className="panel">
          <div className="panel-head">
            <h3 style={{ margin: 0 }}>Revenue</h3>
            <div className="filters-status" style={{ margin: 0 }}>
              {CHART_RANGES.map((r) => (
                <button key={r.days} type="button"
                  className={`chip-btn ${days === r.days ? 'active' : ''}`}
                  onClick={() => setDays(r.days)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {!loaded ? <Loading label="Loading chart…" /> : chart.length === 0 ? (
            <p className="muted small">No sales in this period yet.</p>
          ) : (
            <div className="chart-wrap">
              {chart.map((d) => (
                <div className="chart-day" key={d._id} title={`${dayLabel(d._id)} · ${formatINR(d.revenue)} · ${d.orders} order${d.orders === 1 ? '' : 's'}`}>
                  <div className="chart-bar" style={{ height: `${Math.max(3, Math.round((d.revenue / maxRevenue) * 130))}px` }} />
                  <span className="chart-col-label">{dayLabel(d._id)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="stat-sub" style={{ marginTop: 10 }}>Daily total for non-cancelled orders (₹).</div>
        </div>

        <div className="panel">
          <h3>Top sellers by revenue</h3>
          {topSellers.length === 0 ? (
            <p className="muted small">No active sellers yet.</p>
          ) : (
            topSellers.map((s, i) => (
              <div className="recent-row" key={s._id}>
                <div className="recent-row-info">
                  <p><strong>{i + 1}. {s.businessName}</strong></p>
                  <p className="muted small">{s.user?.name || '—'} · {s.stats?.totalOrders ?? 0} orders</p>
                </div>
                <strong>{formatINR(s.stats?.totalRevenue)}</strong>
              </div>
            ))
          )}

          <h3 style={{ marginTop: 22 }}>Top products by units sold</h3>
          {topProducts.length === 0 ? (
            <p className="muted small">No products sold yet.</p>
          ) : (
            topProducts.map((p, i) => (
              <div className="recent-row" key={p._id}>
                <div className="cart-item-media">
                  {productImageUrl(p)
                    ? <img src={productImageUrl(p)} alt={p.name} />
                    : <div className="img-ph">📦</div>}
                </div>
                <div className="recent-row-info">
                  <p><strong>{i + 1}. {p.name}</strong></p>
                  <p className="muted small">{p.seller?.businessName || '—'} · {formatDate(p.createdAt)}</p>
                </div>
                <strong>{p.stats?.totalSold ?? 0} sold</strong>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="muted small" style={{ marginTop: 20 }}>
        Overview refreshed {formatDateTime(new Date().toISOString())}. Approving products or verifying sellers updates these numbers automatically.
      </p>
    </div>
  )
}
