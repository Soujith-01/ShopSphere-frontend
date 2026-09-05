import { useState } from 'react'
import { addToCart } from '../../api.js'
import { formatINR, productImageUrl } from '../../format.js'
import { useToast } from '../../toast.js'
import Spinner from '../Spinner.jsx'

export default function ProductCard({ product, token, isWishlisted, onToggleWishlist, onOpen, onCartChanged }) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)

  const image = productImageUrl(product)
  const outOfStock = false // stock check happens on the server; client just surfaces errors

  const handleQuickAdd = async (e) => {
    e.stopPropagation()
    setAdding(true)
    try {
      await addToCart(token, { productId: product._id, quantity: 1 })
      toast.success('Added to cart ✓')
      onCartChanged?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleWishlist = async (e) => {
    e.stopPropagation()
    try {
      await onToggleWishlist(product._id)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  return (
    <div className="product-card" onClick={() => onOpen(product)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(product) } }}>
      <div className="product-media">
        {image ? <img src={image} alt={product.name} loading="lazy" /> : <div className="img-ph">📦</div>}
        <button
          type="button"
          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isWishlisted ? '♥' : '♡'}
        </button>
      </div>

      <div className="product-body">
        <h3>{product.name}</h3>
        {product.store?.name && <p className="product-store">{product.store.name}</p>}

        <div className="product-meta">
          <span className="product-price">{formatINR(product.price)}</span>
          {product.stats?.avgRating > 0 && (
            <span className="product-rating">★ {product.stats.avgRating.toFixed(1)}</span>
          )}
        </div>

        <div className="product-actions">
          {product.hasVariants ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); onOpen(product) }}>
              View options
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-primary" disabled={adding || outOfStock} onClick={handleQuickAdd}>
              {adding ? <><Spinner small /> Adding…</> : 'Add to cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}