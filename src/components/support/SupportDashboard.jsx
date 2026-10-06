import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  MessageSquare,
  LifeBuoy,
  Bell,
  ShoppingBag,
  Headphones,
} from 'lucide-react'
import {
  clearSession, logout,
  supportGetStats, supportGetNotifications,
} from '../../api.js'
import { navigate, usePath } from '../../router.js'
import { useToast } from '../../toast.js'
import { TICKET_PRIORITY_LABELS } from '../../format.js'
import Loading from '../Loading.jsx'
import SupportTicketsView from './SupportTicketsView.jsx'
import SupportChatView from './SupportChatView.jsx'
import SupportNotificationsView from './SupportNotificationsView.jsx'

// Each tab is its own URL: /support/overview, /support/chat, ...
const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'chat', label: 'Live chat', icon: MessageSquare },
  { key: 'tickets', label: 'Tickets', icon: LifeBuoy },
  { key: 'notifications', label: 'Notifications', icon: Bell },
]

const TAB_KEYS = NAV.map((n) => n.key)

export default function SupportDashboard({ session, onLogout }) {
  // The active tab is derived straight from the URL, so back/forward buttons,
  // pasted deep links (/support/tickets) and navigate() all just work.
  const path = usePath()
  const urlTab = path.replace('/support/', '').replace(/\/+$/, '')
  const tab = TAB_KEYS.includes(urlTab) ? urlTab : 'overview'
  const toast = useToast()

  // Stats live in the shell so the sidebar can badge the open-queue count.
  const [stats, setStats] = useState(null)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  // Bumped by the tickets view whenever a ticket changes, so the sidebar
  // badge (and overview numbers) stay truthful while agents work.
  const [ticketsTick, setTicketsTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    supportGetStats(session.token)
      .then((res) => { if (!cancelled) setStats(res.data) })
      .catch((err) => { if (!cancelled && err.status !== 401) toast.error(err.message) })
    return () => { cancelled = true }
  }, [session.token, refreshTick, ticketsTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Unread support notifications (ticket assignments, customer replies) → badge.
  useEffect(() => {
    let cancelled = false
    supportGetNotifications(session.token, { limit: 1 })
      .then((res) => { if (!cancelled) setUnreadNotifs(res.data?.unreadCount || 0) })
      .catch(() => { /* badge is best-effort */ })
    return () => { cancelled = true }
  }, [session.token, refreshTick, ticketsTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    try { await logout(session.token) } catch { /* session already gone */ }
    clearSession()
    onLogout()
  }

  const current = NAV.find((n) => n.key === tab)
  const openCount = stats?.queue?.open ?? 0

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand sidebar-brand" onClick={() => navigate('/')} role="button" tabIndex={0} title="Back to Store">
          <img src="/eazy-logo.png" alt="Eazy Logo" className="brand-logo-img sidebar-logo-img" />
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
                onClick={() => navigate(`/support/${item.key}`)}
              >
                <span className="nav-icon">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span className="nav-label">{item.label}</span>
                {item.key === 'tickets' && openCount > 0 && (
                  <span className="nav-badge">{openCount}</span>
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
            <Headphones size={18} strokeWidth={2.2} />
          </div>
          <div className="sidebar-user-info">
            <strong>{session.user?.name}</strong>
            <span>support agent</span>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <h1>{current?.label || 'Support dashboard'}</h1>
          <span className="topbar-hint">Signed in as {session.user?.email}</span>
        </header>

        <div className="dashboard-content">
          {tab === 'overview' && (
            stats === null
              ? <Loading label="Loading your queue…" />
              : <OverviewTab stats={stats} goTo={(key) => navigate(`/support/${key}`)} />
          )}

          {tab === 'chat' && (
            <SupportChatView
              token={session.token}
              meId={session.user?._id}
              onChange={() => setTicketsTick((t) => t + 1)}
            />
          )}

          {tab === 'tickets' && (
            <SupportTicketsView
              token={session.token}
              meId={session.user?._id}
              onChange={() => setTicketsTick((t) => t + 1)}
            />
          )}

          {tab === 'notifications' && (
            <SupportNotificationsView
              token={session.token}
              onChange={() => setRefreshTick((t) => t + 1)}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function OverviewTab({ stats, goTo }) {
  const urgentCount = stats.priorityBreakdown?.find((p) => p._id === 'urgent')?.count ?? 0
  const highCount = stats.priorityBreakdown?.find((p) => p._id === 'high')?.count ?? 0
  const maxPriority = Math.max(1, ...(stats.priorityBreakdown || []).map((p) => p.count || 0))

  return (
    <div>
      {urgentCount > 0 && (
        <div className="panel" style={{ marginBottom: 22, background: 'var(--danger-bg)', borderColor: 'transparent' }}>
          <div className="panel-head" style={{ margin: 0 }}>
            <div>
              <h2 style={{ margin: 0 }}>{urgentCount} urgent ticket{urgentCount === 1 ? '' : 's'} waiting 🔥</h2>
              <p className="muted small" style={{ margin: '4px 0 0' }}>Urgent tickets should be picked up first.</p>
            </div>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => goTo('tickets')}>
              Open queue
            </button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Open queue</span>
          <span className="stat-num">{stats.queue?.open ?? 0}</span>
          <span className="stat-sub">{stats.queue?.inProgress ?? 0} in progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">My tickets</span>
          <span className="stat-num">{stats.myTickets?.assigned ?? 0}</span>
          <span className="stat-sub">{stats.myTickets?.open ?? 0} still open</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Resolved today</span>
          <span className="stat-num">{stats.myTickets?.resolvedToday ?? 0}</span>
          <span className="stat-sub">Great work — keep going 🎉</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">All tickets</span>
          <span className="stat-num">{stats.totalTickets ?? 0}</span>
          <span className="stat-sub">Lifetime on the platform</span>
        </div>
      </div>

      <div className="overview-grid">
        <div className="panel">
          <h3>Priority mix — open & in-progress tickets</h3>
          {(stats.priorityBreakdown || []).length === 0 ? (
            <p className="muted small">Nothing in the queue. Enjoy the quiet ☕</p>
          ) : (
            <div className="chart-wrap">
              {stats.priorityBreakdown.map((p) => (
                <div className="chart-day" key={p._id} title={`${TICKET_PRIORITY_LABELS[p._id] || p._id}: ${p.count}`}>
                  <div className="chart-bar" style={{ height: `${Math.max(3, Math.round((p.count / maxPriority) * 130))}px` }} />
                  <span className="chart-col-label">{PRIORITY_SHORT[p._id] || p._id}</span>
                </div>
              ))}
            </div>
          )}
          <div className="stat-sub" style={{ marginTop: 10 }}>
            {highCount} high-priority ticket{highCount === 1 ? '' : 's'} in the active queue.
          </div>
        </div>

        <div className="panel">
          <h3>How the queue works</h3>
          <p className="muted small" style={{ marginTop: 0 }}>
            Unassigned tickets sit in the shared queue — claim one with <strong>Claim</strong>,
            or jump straight into a conversation and reply to the customer.
          </p>
          <div className="recent-row">
            <div className="recent-row-info">
              <p><strong>1. Claim or open</strong></p>
              <p className="muted small">Assign a ticket to yourself to start working it.</p>
            </div>
          </div>
          <div className="recent-row">
            <div className="recent-row-info">
              <p><strong>2. Investigate & reply</strong></p>
              <p className="muted small">Check the related order/product, then message the customer.</p>
            </div>
          </div>
          <div className="recent-row">
            <div className="recent-row-info">
              <p><strong>3. Resolve</strong></p>
              <p className="muted small">Mark it resolved (or wait on the customer) so the queue stays clean.</p>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-primary" onClick={() => goTo('tickets')}>
              Go to tickets
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PRIORITY_SHORT = { low: 'Low', medium: 'Med', high: 'High', urgent: 'Urgent' }
