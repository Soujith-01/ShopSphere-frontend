import { useState, useRef, useEffect } from 'react'
import { naturalSearch } from '../../api.js'
import { formatINR } from '../../format.js'
import { useToast } from '../../toast.js'
import Spinner from '../Spinner.jsx'
import ProductCard from './ProductCard.jsx'

/**
 * AskShopSphereAI — A floating button + modal that lets customers type
 * natural language queries like "headphones for gaming under 3000 with
 * good microphone". Gemini parses the query into filters, then the
 * backend searches the actual product database. No invented products.
 */
export default function NaturalSearchModal({ token, user, onOpenProduct, onCartChanged, onToggleWishlist, wishlistIds }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [parsedInfo, setParsedInfo] = useState(null)
  const [history, setHistory] = useState([])
  const inputRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [history, results])

  const handleSearch = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q || loading) return

    setLoading(true)
    setQuery('')

    // Add user message to chat history
    setHistory((prev) => [...prev, { role: 'user', text: q }])

    try {
      const res = await naturalSearch(token, { query: q, limit: 12 })
      const products = res.data || []
      const parsed = res.parsedQuery || {}

      setResults(products)
      setParsedInfo(parsed)

      // Build a friendly response message
      const filterParts = []
      if (parsed.category) filterParts.push(`Category: ${parsed.category}`)
      if (parsed.brand) filterParts.push(`Brand: ${parsed.brand}`)
      if (parsed.maxPrice) filterParts.push(`Under ₹${parsed.maxPrice.toLocaleString('en-IN')}`)
      if (parsed.minPrice) filterParts.push(`Above ₹${parsed.minPrice.toLocaleString('en-IN')}`)
      if (parsed.features?.length) filterParts.push(`Features: ${parsed.features.join(', ')}`)
      if (parsed.purpose) filterParts.push(`Purpose: ${parsed.purpose}`)

      const filterText = filterParts.length > 0
        ? `I searched for "${parsed.keywords || q}" with filters: ${filterParts.join(' · ')}`
        : `I searched for "${q}"`

      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `${filterText}\n\nFound ${products.length} product${products.length !== 1 ? 's' : ''} in the catalog.`,
        },
      ])
    } catch (err) {
      if (err.status !== 401) {
        setHistory((prev) => [
          ...prev,
          { role: 'assistant', text: `Sorry, I couldn't process that search. ${err.message}` },
        ])
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const quickSearch = (q) => {
    setQuery(q)
    // Auto-submit
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} }
      setQuery(q)
      // We'll trigger via the input change
    }, 50)
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        className="ai-fab"
        onClick={() => setOpen(true)}
        title="Ask ShopSphere AI"
      >
        🤖
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="ai-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-chat-header">
              <div className="ai-chat-header-info">
                <span className="ai-chat-icon">🤖</span>
                <div>
                  <h3>ShopSphere AI</h3>
                  <p className="muted tiny">Tell me what you're looking for</p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            <div className="ai-chat-messages">
              {history.length === 0 && (
                <div className="ai-chat-welcome">
                  <div className="ai-chat-welcome-icon">🤖</div>
                  <h3>What are you looking for?</h3>
                  <p className="muted">I'll search our catalog for you. Try something like:</p>
                  <div className="ai-quick-suggestions">
                    <button type="button" className="ai-suggestion-chip" onClick={() => { setQuery('wireless headphones for gaming under 3000') }}>
                      🎧 Wireless headphones for gaming under ₹3000
                    </button>
                    <button type="button" className="ai-suggestion-chip" onClick={() => { setQuery('running shoes with good grip') }}>
                      👟 Running shoes with good grip
                    </button>
                    <button type="button" className="ai-suggestion-chip" onClick={() => { setQuery('phone case for iPhone with good protection') }}>
                      📱 Phone case for iPhone with protection
                    </button>
                    <button type="button" className="ai-suggestion-chip" onClick={() => { setQuery('kitchen items under 500') }}>
                      🍳 Kitchen items under ₹500
                    </button>
                  </div>
                </div>
              )}

              {history.map((msg, i) => (
                <div key={i} className={`ai-chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  {msg.role === 'ai' && <span className="ai-chat-bubble-icon">🤖</span>}
                  <p>{msg.text}</p>
                </div>
              ))}

              {loading && (
                <div className="ai-chat-bubble ai">
                  <span className="ai-chat-bubble-icon">🤖</span>
                  <p><Spinner small /> Searching the catalog…</p>
                </div>
              )}

              {results && results.length > 0 && (
                <div className="ai-chat-products">
                  {results.map((p) => (
                    <div
                      key={p._id}
                      className="ai-product-mini"
                      onClick={() => { onOpenProduct(p); setOpen(false) }}
                    >
                      <div className="ai-product-mini-img">
                        {p.images?.[0]?.url
                          ? <img src={p.images[0].url} alt={p.name} />
                          : <div className="img-ph" style={{ fontSize: 20 }}>📦</div>
                        }
                      </div>
                      <div className="ai-product-mini-info">
                        <strong>{p.name}</strong>
                        <span className="product-price">{formatINR(p.price)}</span>
                        {p.reviewSummary?.totalReviews > 0 && (
                          <span className="product-rating" style={{ fontSize: 11 }}>★ {p.reviewSummary.avgRating}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results && results.length === 0 && !loading && (
                <div className="ai-chat-bubble ai">
                  <span className="ai-chat-bubble-icon">🤖</span>
                  <p>I couldn't find any products matching your search. Try different keywords or broader terms.</p>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <form className="ai-chat-input" onSubmit={handleSearch}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. headphones for gaming under 3000…"
                disabled={loading}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !query.trim()}>
                Search
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
