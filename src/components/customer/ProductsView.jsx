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

  // Gemini-backed search autocomplete
  const [suggestions, setSuggestions] = useState([])
  const [suggestOpen, setSuggestOpen] = useState(false)
  const suggestTimer = useRef(null)
  const suggestSeq = useRef(0)

  useEffect(() => () => clearTimeout(suggestTimer.current), [])

  const handleSearchChange = (value) => {
    setSearch(value)
    const q = value.trim()
    clearTimeout(suggestTimer.current)
    if (q.length < 2) {
      setSuggestions([])
      setSuggestOpen(false)
      return
    }
    suggestTimer.current = setTimeout(async () => {
      const seq = ++suggestSeq.current
      try {
        const res = await getSearchSuggestions(q, 6)
        if (seq === suggestSeq.current) {
          setSuggestions(res.data || [])
          setSuggestOpen(true)
        }
      } catch {
        if (seq === suggestSeq.current) {
          setSuggestions([])
          setSuggestOpen(false)
        }
      }
    }, 300)
  }

  const applySuggestion = (s) => {
    setSearch(s)
    setSuggestions([])
    setSuggestOpen(false)
    setPage(1)
    setAppliedSearch(s)
  }

  const submitSearch = (e) => {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(search.trim())
    setSuggestions([])
    setSuggestOpen(false)
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

  return (
    <div className="products-view">
      <div className="filters">
        <form className="search-form" onSubmit={submitSearch}>
          <input
            type="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setSuggestOpen(true) }}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
          {suggestOpen && suggestions.length > 0 && (
            <div className="suggest-drop">
              {suggestions.map((s, i) => (
                <button
                  key={`${s}-${i}`}
                  type="button"
                  className="suggest-item"
                  onMouseDown={(e) => { e.preventDefault(); applySuggestion(s) }}
                >
                  🔎 {s}
                </button>
              ))}
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