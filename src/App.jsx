import { useEffect, useState } from 'react'
import { getSession, clearSession } from './api.js'
import { navigate, usePath } from './router.js'
import Register from './components/Register.jsx'
import Login from './components/Login.jsx'
import CustomerDashboard from './components/customer/CustomerDashboard.jsx'
import SellerDashboard from './components/seller/SellerDashboard.jsx'
import AdminDashboard from './components/admin/AdminDashboard.jsx'
import SupportDashboard from './components/support/SupportDashboard.jsx'
import DeliveryDashboard from './components/delivery/DeliveryDashboard.jsx'
import Landing from './components/Landing.jsx'
import './App.css'
import './landing.css'

// Seconds the session-expired screen waits before auto-redirecting to login.
const REDIRECT_SECONDS = 10

const ROLE_TITLES = {
  seller: 'Seller dashboard',
  admin: 'Admin dashboard',
  support: 'Support dashboard',
  delivery: 'Delivery dashboard',
}

// Where each role lands after login/register.
const ROLE_HOME = {
  customer: '/customer/explore',
  seller: '/seller/overview',
  admin: '/admin/overview',
  support: '/support/overview',
  delivery: '/delivery/overview',
}

const homeFor = (session) => {
  const role = session?.user?.role || 'customer'
  return ROLE_HOME[role] || '/customer/explore'
}

export default function App() {
  const path = usePath()
  const [session, setSession] = useState(() => getSession())
  const [expired, setExpired] = useState(false)
  const [redirectIn, setRedirectIn] = useState(REDIRECT_SECONDS)

  // API calls whose token comes back 401 (expired/invalid session) fire this
  // event. Swap the dashboard for a friendly "log in again" screen instead of
  // leaving raw "Token invalid or expired" errors on the page.
  useEffect(() => {
    const onSessionExpired = () => {
      clearSession()
      setSession(null)
      setRedirectIn(REDIRECT_SECONDS)
      setExpired(true)
    }
    window.addEventListener('shopsphere:session-expired', onSessionExpired)
    return () => window.removeEventListener('shopsphere:session-expired', onSessionExpired)
  }, [])

  // Count down on the expired screen, then send the user to the login page.
  useEffect(() => {
    if (!expired) return
    if (redirectIn <= 0) {
      setExpired(false)
      navigate('/login')
      return
    }
    const timer = setTimeout(() => setRedirectIn((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [expired, redirectIn])

  const handleLogout = () => {
    clearSession()
    setSession(null)
    navigate('/')
  }

  // After login/register succeed, land the user on their role's dashboard.
  const handleAuth = () => {
    const s = getSession()
    if (s) setSession(s)
    navigate(homeFor(s))
  }

  const root = path.replace(/\/+$/, '') || '/'

  if (expired) {
    return (
      <div className="app">
        <main className="auth-shell">
          <div className="card">
            <div className="card-emoji">⏰</div>
            <h2>Session expired</h2>
            <p className="card-sub">
              Your session has expired. Please log in again to continue shopping.
            </p>
            {redirectIn > 0 && (
              <p className="muted small">
                Redirecting to the login page in {redirectIn}s…
              </p>
            )}
            <div className="actions-stack">
              <button
                className="btn btn-primary btn-block"
                onClick={() => { setExpired(false); navigate('/login') }}
              >
                Log in
              </button>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => { setExpired(false); navigate('/') }}
              >
                Back to home
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Public Storefront Home ───────────────────────────
  if (root === '/') {
    return (
      <div className="app">
        <Landing />
      </div>
    )
  }

  // ── Authenticated User Routes ─────────────────────────
  if (session) {
    const role = session.user?.role || 'customer'

    if (root.startsWith('/customer')) {
      return (
        <CustomerDashboard session={session} onLogout={handleLogout} />
      )
    }
    if (root.startsWith('/seller')) {
      return (
        <SellerDashboard session={session} onLogout={handleLogout} />
      )
    }
    if (root.startsWith('/admin')) {
      return (
        <AdminDashboard session={session} onLogout={handleLogout} />
      )
    }
    if (root.startsWith('/support')) {
      return (
        <SupportDashboard session={session} onLogout={handleLogout} />
      )
    }
    if (root.startsWith('/delivery')) {
      return (
        <DeliveryDashboard session={session} onLogout={handleLogout} />
      )
    }
    if (root === '/login' || root === '/register') {
      // Already signed in — redirect to dashboard without creating a back-button loop.
      navigate(homeFor(session), { replace: true })
      return null
    }

    // Other roles exist in the backend but their dashboards aren't built yet.
    return (
      <div className="app">
        <main className="role-gate">
          <div className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <img src="/eazy-logo.png" alt="Eazy Logo" className="brand-logo-img" />
            <span>Eazy</span>
          </div>
          <div className="card">
            <div className="card-emoji">🔐</div>
            <h2>You're signed in as {role}</h2>
            <p>
              <strong>{ROLE_TITLES[role] || `${role} dashboard`}</strong> is coming soon.
              We're still building this one — check back shortly.
            </p>
            <p className="muted small">Signed in as {session.user?.email}</p>
            <div className="card-actions">
              <button className="btn btn-secondary" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── Unauthenticated / Guest Routes ────────────────────
  if (root === '/login') {
    return (
      <div className="app">
        <main className="auth-shell">
          <Login
            onBack={() => navigate('/')}
            onSwitchToRegister={() => navigate('/register')}
            onAuthed={handleAuth}
          />
        </main>
      </div>
    )
  }

  if (root === '/register') {
    return (
      <div className="app">
        <main className="auth-shell">
          <Register
            onBack={() => navigate('/')}
            onSwitchToLogin={() => navigate('/login')}
            onAuthed={handleAuth}
          />
        </main>
      </div>
    )
  }

  // Signed-out user hit a dashboard URL (e.g. /customer/cart) → redirect to login without polluting history
  navigate('/login', { replace: true })
  return null
}
