import { useCallback, useEffect, useState } from 'react'
import { getCart, logout, clearSession } from '../../api.js'
import { navigate, usePath } from '../../router.js'
import ProductsView from './ProductsView.jsx'
import CartView from './CartView.jsx'
import OrdersView from './OrdersView.jsx'
import WishlistView from './WishlistView.jsx'
import ProfileView from './ProfileView.jsx'
import NotificationsView from './NotificationsView.jsx'
import MessagesView from '../chat/MessagesView.jsx'
import ReturnsView from './ReturnsView.jsx'
import ReviewsView from './ReviewsView.jsx'
import NaturalSearchModal from './NaturalSearchModal.jsx'

// Each tab is its own URL: /customer/explore, /customer/cart, ...
const NAV = [
  { key: 'explore', label: 'Explore', icon: '🛍️' },
  { key: 'cart', label: 'Cart', icon: '🛒' },
  { key: 'messages', label: 'Messages', icon: '💬' },
  { key: 'orders', label: 'Orders', icon: '📦' },
  { key: 'returns', label: 'Returns', icon: '🔄' },
  { key: 'reviews', label: 'Reviews', icon: '⭐' },
  { key: 'wishlist', label: 'Wishlist', icon: '♥' },
  { key: 'profile', label: 'Profile', icon: '👤' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
]

const TAB_KEYS = NAV.map((n) => n.key)

export default function CustomerDashboard({ session, onLogout }) {
  // The active tab is derived straight from the URL, so back/forward buttons,
  // pasted deep links (/customer/orders) and navigate() all just work.
  const path = usePath()
  const urlTab = path.replace('/customer/', '').replace(/\/+$/, '')
  const tab = TAB_KEYS.includes(urlTab) ? urlTab : 'explore'
  const [cartCount, setCartCount] = useState(0)

  const refreshCartCount = useCallback(async (token) => {
    try {
      const res = await getCart(token)
      setCartCount(res.data?.totalItems || 0)
    } catch {
      setCartCount(0)
    }
  }, [])

  useEffect(() => {
    refreshCartCount(session.token)
  }, [session.token, refreshCartCount])

  const handleLogout = async () => {
    try { await logout(session.token) } catch { /* session already gone */ }
    clearSession()
    onLogout()
  }

  const [wishlistIds, setWishlistIds] = useState(new Set())

  const viewProps = {
    token: session.token,
    user: session.user,
    onCartChanged: () => refreshCartCount(session.token),
  }

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
              onClick={() => navigate(`/customer/${item.key}`)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.key === 'cart' && cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{(session.user?.name || 'U').charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <strong>{session.user?.name}</strong>
            <span>{session.user?.role}</span>
          </div>
          <button type="button" className="btn btn-sm btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <h1>{NAV.find((n) => n.key === tab)?.label}</h1>
          <span className="topbar-hint">Signed in as {session.user?.email}</span>
        </header>

        <div className="dashboard-content">
          {tab === 'explore' && <ProductsView {...viewProps} />}
          {tab === 'cart' && <CartView {...viewProps} />}
          {tab === 'messages' && <MessagesView {...viewProps} role="customer" />}
          {tab === 'orders' && <OrdersView {...viewProps} />}
          {tab === 'returns' && <ReturnsView {...viewProps} />}
          {tab === 'reviews' && <ReviewsView {...viewProps} />}
          {tab === 'wishlist' && <WishlistView {...viewProps} />}
          {tab === 'profile' && <ProfileView {...viewProps} />}
          {tab === 'notifications' && <NotificationsView {...viewProps} />}
        </div>

        <NaturalSearchModal
          token={session.token}
          user={session.user}
          onCartChanged={() => refreshCartCount(session.token)}
          wishlistIds={wishlistIds}
        />
      </main>
    </div>
  )
}