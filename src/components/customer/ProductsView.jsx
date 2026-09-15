import { useCallback, useEffect, useRef, useState } from 'react'
import { getProducts, getCategories, getWishlist, toggleWishlist, getSearchSuggestions } from '../../api.js'
import ProductCard from './ProductCard.jsx'
import ProductModal from './ProductModal.jsx'
import Loading from '../Loading.jsx'
import { useToast } from '../../toast.js'

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
]

function flattenCategories(categories, depth = 0) {
  const out = []
  for (const c of categories) {
    out.push({ ...c, depth })
    if (c.children?.length) out.push(...flattenCategories(c.children, depth + 1))
  }
  return out
}

export default function ProductsView({ token, user, onCartChanged }) {
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wishlistIds, setWishlistIds] = useState(new Set())

  // Surface load failures as a toast; the grid shows a fallback state.
  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)

  const [modalProduct, setModalProduct] = useState(null)

  // Search autocomplete — updates on every keystroke. Suggestions come from
  // the catalog (instant DB prefix match, enriched with fast AI phrases),
  // debounced 150ms so we don't fire per character, with a stale-guard keyed
  // on the query text so slow responses for old input never overwrite newer
  // suggestions.
  // Search autocomplete & recent searches
  const [suggestions, setSuggestions] = useState([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const suggestTimer = useRef(null)
  const latestQuery = useRef('')
  const searchContainerRef = useRef(null)

  const storageKey = `shopsphere_recent_searches_${user?._id || user?.id || 'guest'}`

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  // Synchronize recent searches if user changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      setRecentSearches(raw ? JSON.parse(raw) : [])
    } catch {
      setRecentSearches([])
    }
  }, [storageKey])

  useEffect(() => () => clearTimeout(suggestTimer.current), [])

  // Close suggestions when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSuggestOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSuggestOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const addRecentSearch = (term) => {
    const q = (term || '').trim()
    if (!q) return
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 8)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const removeRecentSearch = (e, termToRemove) => {
    e.stopPropagation()
    e.preventDefault()
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== termToRemove)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }

  const clearAllRecentSearches = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setRecentSearches([])
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignore storage errors
    }
  }

  const applySearchQuery = (q) => {
    const trimmed = (q || '').trim()
    setSearch(trimmed)
    setSuggestions([])
    setSuggestOpen(false)
    setPage(1)
    setAppliedSearch(trimmed)
    if (trimmed) {
      addRecentSearch(trimmed)
    }
  }

  const handleSearchChange = (value) => {
    setSearch(value)
    const q = value.trim()
    latestQuery.current = q
    clearTimeout(suggestTimer.current)
    if (q.length < 1) {
      setSuggestions([])
      setSuggestOpen(true)
      return
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await getSearchSuggestions(q, 6)
        // Only apply if the user hasn't typed something newer in the meantime.
        if (latestQuery.current === q) {
          setSuggestions(res.data || [])
          setSuggestOpen(true)
        }
      } catch {
        if (latestQuery.current === q) {
          setSuggestions([])
        }
      }
    }, 150)
  }

  const submitSearch = (e) => {
    e.preventDefault()
    applySearchQuery(search)
  }

  // Category tree
  useEffect(() => {
    getCategories().then((res) => setCategories(res.data)).catch(() => setCategories([]))
  }, [])

  // Wishlist ids for heart states
  useEffect(() => {
    getWishlist(token)
      .then((res) => setWishlistIds(new Set((res.data || []).map((p) => p._id))))
      .catch(() => {})
  }, [token])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getProducts(token, {
        search: appliedSearch,
        category: category || undefined,
        sort,
        page,
        limit: 12,
      })
      setProducts(res.data || [])
      setPagination(res.pagination || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, appliedSearch, category, sort, page])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleToggleWishlist = async (productId) => {
    const res = await toggleWishlist(token, productId)
    setWishlistIds((prev) => {
      const next = new Set(prev)
      if (res.data?.action === 'added') next.add(productId)
      else next.delete(productId)
      return next
    })
  }

  const categoryOptions = flattenCategories(categories)

  const queryTrimmed = search.trim().toLowerCase()
  const matchingRecent = queryTrimmed
    ? recentSearches.filter((s) => s.toLowerCase().includes(queryTrimmed))
    : recentSearches
  const filteredSuggestions = suggestions.filter(
    (s) => !matchingRecent.some((r) => r.toLowerCase() === s.toLowerCase())
  )
  const showRecentOnly = !queryTrimmed && recentSearches.length > 0
  const hasDropdownContent =
    showRecentOnly || matchingRecent.length > 0 || filteredSuggestions.length > 0

  return (
    <div className="products-view">
      <div className="filters">
        <form
          ref={searchContainerRef}
          className="search-form"
          onSubmit={submitSearch}
        >
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setSuggestOpen(true)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>

          {suggestOpen && hasDropdownContent && (
            <div className="suggest-drop" role="listbox">
              {showRecentOnly ? (
                <>
                  <div className="suggest-header">
                    <span className="suggest-header-title">Recent searches</span>
                    <button
                      type="button"
                      className="suggest-clear-btn"
                      onMouseDown={clearAllRecentSearches}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="suggest-list">
                    {recentSearches.map((s) => (
                      <div
                        key={s}
                        className="suggest-item suggest-recent-item"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          applySearchQuery(s)
                        }}
                      >
                        <span className="suggest-icon" aria-hidden="true">🕒</span>
                        <span className="suggest-text">{s}</span>
                        <button
                          type="button"
                          className="suggest-delete-btn"
                          title="Remove from history"
                          aria-label={`Remove ${s} from recent searches`}
                          onMouseDown={(e) => removeRecentSearch(e, s)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {matchingRecent.length > 0 && (
                    <div className="suggest-group">
                      <div className="suggest-section-label">Recent searches</div>
                      {matchingRecent.map((s) => (
                        <div
                          key={s}
                          className="suggest-item suggest-recent-item"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            applySearchQuery(s)
                          }}
                        >
                          <span className="suggest-icon" aria-hidden="true">🕒</span>
                          <span className="suggest-text">{s}</span>
                          <button
                            type="button"
                            className="suggest-delete-btn"
                            title="Remove from history"
                            aria-label={`Remove ${s} from recent searches`}
                            onMouseDown={(e) => removeRecentSearch(e, s)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {filteredSuggestions.length > 0 && (
                    <div className="suggest-group">
                      {matchingRecent.length > 0 && (
                        <div className="suggest-section-label">Suggestions</div>
                      )}
                      {filteredSuggestions.map((s, i) => (
                        <div
                          key={`${s}-${i}`}
                          className="suggest-item"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            applySearchQuery(s)
                          }}
                        >
                          <span className="suggest-icon" aria-hidden="true">🔎</span>
                          <span className="suggest-text">{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </form>

        <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
          <option value="">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c._id} value={c._id}>
              {'— '.repeat(c.depth)}{c.name}
            </option>
          ))}
        </select>

        <select className="select" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading && <Loading label="Loading products…" />}

      {!loading && error && products.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load products. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🔎</div>
          <p>No products found{appliedSearch ? ` for “${appliedSearch}”` : ''}. Try a different search or category.</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
                token={token}
                isWishlisted={wishlistIds.has(p._id)}
                onToggleWishlist={handleToggleWishlist}
                onOpen={setModalProduct}
                onCartChanged={onCartChanged}
              />
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span className="page-info">Page {pagination.page} of {pagination.pages}</span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {modalProduct && (
        <ProductModal
          product={modalProduct}
          token={token}
          user={user}
          onClose={() => setModalProduct(null)}
          onCartChanged={onCartChanged}
        />
      )}
    </div>
  )
}