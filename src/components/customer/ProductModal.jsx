import { useEffect, useState } from 'react'
import { getProductBySlug, addToCart } from '../../api.js'
import { formatINR, productImageUrl } from '../../format.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'

// Full-product modal: fetches detail + variants via GET /customer/products/:slug
export default function ProductModal({ product, token, onClose, onCartChanged }) {
  const toast = useToast()
  const [detail, setDetail] = useState(null)
  const [variantId, setVariantId] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProductBySlug(token, product.slug)
      .then((res) => {
        if (!cancelled) setDetail(res.data)
      })
      .catch((err) => {
        if (cancelled) return
        if (err.status !== 401) toast.error(err.message)
        onClose()
      })
    return () => { cancelled = true }
  }, [product.slug, token]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!detail) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading"><Loading label="Loading product…" /></div>
        </div>
      </div>
    )
  }

  const image = productImageUrl(detail)
  const variants = detail.variants || []
  const selectedVariant = variants.find((v) => v._id === variantId)
  const unitPrice = selectedVariant?.price ?? detail.price
  const available = selectedVariant ? selectedVariant.availableStock : (variantId === null && !detail.hasVariants)

  const handleAdd = async () => {
    if (!available || (detail.hasVariants && !variantId)) return
    setBusy(true)
    try {
      await addToCart(token, {
        productId: detail._id,
        ...(variantId ? { variantId } : {}),
        quantity,
      })
      toast.success('Added to cart ✓')
      onCartChanged?.()
      setTimeout(onClose, 700)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-grid">
          <div className="modal-media">
            {image ? <img src={image} alt={detail.name} /> : <div className="img-ph img-ph-lg">📦</div>}
          </div>

          <div className="modal-info">
            <h2>{detail.name}</h2>
            {detail.store?.name && <p className="product-store">{detail.store.name}</p>}

            <div className="product-meta">
              <span className="product-price-lg">{formatINR(unitPrice)}</span>
              {detail.reviewSummary?.totalReviews > 0 && (
                <span className="product-rating">
                  ★ {detail.reviewSummary.avgRating} ({detail.reviewSummary.totalReviews} reviews)
                </span>
              )}
            </div>

            {detail.hasVariants && (
              <div className="variant-group">
                <p className="variant-label">Select variant</p>
                <div className="variant-options">
                  {variants.map((v) => (
                    <button
                      key={v._id}
                      type="button"
                      className={`variant-chip ${variantId === v._id ? 'active' : ''}`}
                      disabled={v.availableStock <= 0}
                      onClick={() => setVariantId(v._id)}
                    >
                      {v.label}
                      <span className="variant-price">{formatINR(v.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="qty-row">
              <span>Quantity</span>
              <div className="qty-stepper">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)}>+</button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy || !available || (detail.hasVariants && !variantId)}
              onClick={handleAdd}
            >
              {busy ? <><Spinner small /> Adding…</> : detail.hasVariants && !variantId ? 'Select a variant' : 'Add to cart'}
            </button>

            {detail.description && <p className="product-desc">{detail.description}</p>}
            {detail.aiSellingPoints?.length > 0 && (
              <ul className="selling-points">
                {detail.aiSellingPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}