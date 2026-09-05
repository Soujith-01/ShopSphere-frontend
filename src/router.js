import { useEffect, useState } from 'react'

/**
 * Minimal client-side router built on the History API — every page gets its
 * own URL (e.g. /login, /customer/cart, /seller/products) with no extra
 * dependency. Vite's dev server falls back to index.html for unknown paths,
 * so deep links like localhost:5173/seller/products work out of the box.
 */

// Push a new URL onto the history stack and re-render listeners.
export function navigate(path) {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  // pushState does not fire popstate, so notify listeners manually.
  window.dispatchEvent(new PopStateEvent('popstate'))
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
