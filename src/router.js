import { useEffect, useState } from 'react'

/**
 * Minimal client-side router built on the History API — every page gets its
 * own URL (e.g. /login, /customer/cart, /seller/products) with no extra
 * dependency. Vite's dev server falls back to index.html for unknown paths,
 * so deep links like localhost:5173/seller/products work out of the box.
 */

// Event fired when the user navigates to the page they're ALREADY on
// (e.g. clicking "Explore" while on /customer/explore). Dashboards listen
// for it to remount the current view — fresh data and state, like a reload.
export const NAV_REFRESH_EVENT = 'shopsphere:nav-refresh'

// Push a new URL onto the history stack and re-render listeners.
// Navigating to the CURRENT path doesn't change the route; instead it fires
// NAV_REFRESH_EVENT and scrolls to the top, so the page reloads from scratch.
export function navigate(path) {
  if (window.location.pathname === path) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.dispatchEvent(new Event(NAV_REFRESH_EVENT))
    return
  }
  window.history.pushState({}, '', path)
  // pushState does not fire popstate, so notify listeners manually.
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// React hook: returns a counter that increments every time the user re-clicks
// the current page. Use it as a React key on the rendered view so the whole
// subtree remounts (fresh state, fresh data fetches, scroll starts at top).
export function useNavRefresh() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    window.addEventListener(NAV_REFRESH_EVENT, bump)
    return () => window.removeEventListener(NAV_REFRESH_EVENT, bump)
  }, [])
  return tick
}

// Subscribe to path changes (back/forward buttons + navigate() calls).
export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return path
}
