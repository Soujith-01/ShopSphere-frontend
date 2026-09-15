import { useState } from 'react'
import { addToCart } from '../../api.js'
import { formatINR, productImageUrl, getDiscountLabel } from '../../format.js'
import { useToast } from '../../toast.js'
import Spinner from '../Spinner.jsx'

export default function ProductCard({ product, token, isWishlisted, onToggleWishlist, onOpen, onCartChanged }) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [mouseStart, setMouseStart] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const fallbackImage = productImageUrl(product)
  const rawImages = (product?.images || [])
    .map((img) => (typeof img === 'string' ? img : img?.url))
    .filter(Boolean)
  const images = rawImages.length > 0 ? rawImages : (fallbackImage ? [fallbackImage] : [])
  const hasMultiple = images.length > 1
  const discountLabel = getDiscountLabel(product?.discount)
  const isOutOfStock = product?.hasVariants
    ? Boolean(product.variants?.length && product.variants.every((v) => (v.stock ?? 0) <= 0))
    : (product?.stock ?? 0) <= 0

  const goToNext = (e) => {
    e?.stopPropagation?.()
    setActiveIdx((prev) => (prev + 1) % images.length)
  }

  const goToPrev = (e) => {
    e?.stopPropagation?.()
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToIndex = (idx, e) => {
    e?.stopPropagation?.()
    setActiveIdx(idx)
  }

  const minSwipeDistance = 35

  const onTouchStartHandler = (e) => {
    if (!hasMultiple) return
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMoveHandler = (e) => {
    if (!hasMultiple) return
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEndHandler = (e) => {
    if (!hasMultiple || !touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    if (distance > minSwipeDistance) {
      e.stopPropagation()
      goToNext(e)
    } else if (distance < -minSwipeDistance) {
      e.stopPropagation()
      goToPrev(e)
    }
  }

  const onMouseDownHandler = (e) => {
    if (!hasMultiple) return
    setMouseStart(e.clientX)
    setIsDragging(false)
  }

  const onMouseMoveHandler = (e) => {
    if (!hasMultiple || mouseStart === null) return
    if (Math.abs(e.clientX - mouseStart) > 10) {
      setIsDragging(true)
    }
  }

  const onMouseUpHandler = (e) => {
    if (!hasMultiple || mouseStart === null) return
    const diff = mouseStart - e.clientX
    if (diff > minSwipeDistance) {
      e.stopPropagation()
      goToNext(e)
    } else if (diff < -minSwipeDistance) {
      e.stopPropagation()
      goToPrev(e)
    }
    setMouseStart(null)
    setTimeout(() => setIsDragging(false), 50)
  }

  const onWheelHandler = (e) => {
    if (!hasMultiple) return
    if (Math.abs(e.deltaX) > 20) {
      e.preventDefault()
      e.stopPropagation()
      if (e.deltaX > 0) goToNext(e)
      else goToPrev(e)
    }
  }

  const handleQuickAdd = async (e) => {
    e.stopPropagation()
    if (isOutOfStock) return
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

  const handleCardClick = () => {
    if (isDragging) return
    onOpen(product)
  }

  return (
    <div
      className="product-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(product)
        }
      }}
    >
      <div
        className={`product-media ${hasMultiple ? 'has-slider' : ''}`}
        onTouchStart={onTouchStartHandler}
        onTouchMove={onTouchMoveHandler}
        onTouchEnd={onTouchEndHandler}
        onMouseDown={onMouseDownHandler}
        onMouseMove={onMouseMoveHandler}
        onMouseUp={onMouseUpHandler}
        onWheel={onWheelHandler}
      >
        {discountLabel && (
          <span className="product-discount-badge" aria-label={`Discount: ${discountLabel}`}>
            {discountLabel}
          </span>
        )}

        {isOutOfStock && (
          <div className="product-out-of-stock-overlay" aria-label="Out of stock">
            <span className="out-of-stock-badge">OUT OF STOCK</span>
          </div>
        )}

        {images.length > 0 ? (
          <div className="product-slider-viewport">
            <div
              className="product-slider-track"
              style={{
                transform: `translateX(-${activeIdx * 100}%)`,
              }}
            >
              {images.map((src, i) => (
                <div className="product-slide-item" key={i}>
                  <img src={src} alt={`${product.name} ${i + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="img-ph">📦</div>
        )}

        <button
          type="button"
          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isWishlisted ? '♥' : '♡'}
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              className="product-slider-arrow prev"
              onClick={goToPrev}
              aria-label="Previous photo"
              title="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              className="product-slider-arrow next"
              onClick={goToNext}
              aria-label="Next photo"
              title="Next photo"
            >
              ›
            </button>

            <span className="product-slider-badge">
              {activeIdx + 1}/{images.length}
            </span>

            <div className="product-slider-dots" onClick={(e) => e.stopPropagation()}>
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`slider-dot ${i === activeIdx ? 'active' : ''}`}
                  onClick={(e) => goToIndex(i, e)}
                  aria-label={`Go to photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
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
          {isOutOfStock ? (
            <span className="out-of-stock-pill">Out of Stock</span>
          ) : product.hasVariants ? (
            <button type="button" className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); onOpen(product) }}>
              View options
            </button>
          ) : (
            <button type="button" className="btn btn-sm btn-primary" disabled={adding} onClick={handleQuickAdd}>
              {adding ? <><Spinner small /> Adding…</> : 'Add to cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}