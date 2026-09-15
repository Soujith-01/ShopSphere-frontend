import { useEffect, useState } from 'react'
import {
  getProductBySlug, addToCart, getProductReviews, createReview, getOrders,
  getMyReview, updateReview, getProductQA,
} from '../../api.js'
import { formatINR, productImageUrl, formatDate, getDiscountLabel } from '../../format.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'
import ProductChatModal from '../chat/ProductChatModal.jsx'

// Full-product modal: fetches detail + variants via GET /customer/products/:slug
export default function ProductModal({ product, token, user, onClose, onCartChanged }) {
  const toast = useToast()
  const [detail, setDetail] = useState(null)
  const [variantId, setVariantId] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [reviews, setReviews] = useState(null) // null = loading
  const [reviewsReload, setReviewsReload] = useState(0)
  const [detailReload, setDetailReload] = useState(0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  // Public Q&A — every customer can see questions + seller answers
  const [qa, setQa] = useState(null) // null = loading
  const [qaReload, setQaReload] = useState(0)

  // Quick tap-to-rate state
  const [myReview, setMyReview] = useState(null)
  const [deliveredOrderId, setDeliveredOrderId] = useState(null)
  const [rateCheck, setRateCheck] = useState('loading') // loading | ready | blocked
  const [ratingBusy, setRatingBusy] = useState(false)

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
  }, [product.slug, token, detailReload]) // eslint-disable-line react-hooks/exhaustive-deps

  const productId = detail?._id

  // Load the product's approved reviews once the detail arrives (and again
  // after a new review is submitted).
  useEffect(() => {
    if (!productId) return
    let cancelled = false
    setReviews(null)
    getProductReviews(token, productId, { limit: 50 })
      .then((res) => { if (!cancelled) setReviews(res.data || []) })
      .catch((err) => { if (!cancelled && err.status !== 401) setReviews([]) })
    return () => { cancelled = true }
  }, [productId, token, reviewsReload])

  // Load the public Q&A thread for this product (and refresh after the user
  // asks a question).
  useEffect(() => {
    if (!productId) return
    let cancelled = false
    setQa(null)
    getProductQA(product.slug)
      .then((res) => { if (!cancelled) setQa(res.data || []) })
      .catch(() => { if (!cancelled) setQa([]) })
    return () => { cancelled = true }
  }, [product.slug, productId, qaReload])

  // Quick-rate eligibility: the user's existing review (if any) + a delivered
  // order for this product (needed to create a new review).
  useEffect(() => {
    if (!productId) return
    let cancelled = false
    setRateCheck('loading')
    Promise.all([
      getMyReview(token, productId).then((r) => r.data).catch(() => null),
      getOrders(token, { limit: 50 }).then((r) => r.data || []).catch(() => []),
    ]).then(([my, orders]) => {
      if (cancelled) return
      const delivered = orders.find(
        (o) => o.status === 'delivered' &&
          (o.items || []).some((it) => (it.product?._id || it.product) === productId)
      )
      setMyReview(my)
      setDeliveredOrderId(delivered?._id || null)
      setRateCheck(delivered || my ? 'ready' : 'blocked')
    })
    return () => { cancelled = true }
  }, [productId, token, reviewsReload])

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
  const discountLabel = getDiscountLabel(detail.discount || product?.discount)
  const variants = detail.variants || []
  const selectedVariant = variants.find((v) => v._id === variantId)
  const unitPrice = selectedVariant?.price ?? detail.price
  const availableStock = selectedVariant ? (selectedVariant.availableStock ?? selectedVariant.stock ?? 0) : (detail.stock ?? 0)
  const isOutOfStock = detail.hasVariants
    ? Boolean(variants.length && variants.every((v) => (v.stock ?? 0) <= 0))
    : (detail.stock ?? 0) <= 0
  const canAdd = !isOutOfStock && availableStock > 0 && (!detail.hasVariants || variantId)

  const handleAdd = async () => {
    if (!canAdd) return
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

  // Quick tap-to-rate: creates a rating-only review, or updates an existing one.
  const handleRate = async (n) => {
    if (rateCheck !== 'ready' || ratingBusy || myReview?.rating === n) return
    setRatingBusy(true)
    try {
      if (myReview) {
        await updateReview(token, myReview._id, { rating: n })
        toast.success('Rating updated ✓')
      } else {
        await createReview(token, {
          productId: detail._id,
          orderId: deliveredOrderId,
          rating: n,
          title: '',
          comment: '',
        })
        toast.success('Thanks for rating! ✓')
      }
      setReviewsReload((r) => r + 1)
      setDetailReload((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setRatingBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-grid">
          <div className="modal-media">
            {discountLabel && (
              <span className="product-discount-badge modal-discount-badge" aria-label={`Discount: ${discountLabel}`}>
                {discountLabel}
              </span>
            )}
            {isOutOfStock && (
              <div className="product-out-of-stock-overlay modal-out-of-stock-overlay" aria-label="Out of stock">
                <span className="out-of-stock-badge">OUT OF STOCK</span>
              </div>
            )}
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

            <div className="stock-status-row">
              {isOutOfStock ? (
                <span className="stock-status-pill out-of-stock">⛔ Out of Stock</span>
              ) : availableStock <= 5 ? (
                <span className="stock-status-pill low-stock">⚠️ Only {availableStock} left in stock - order soon</span>
              ) : (
                <span className="stock-status-pill in-stock">✓ In Stock ({availableStock} available)</span>
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
                      {v.availableStock <= 0 && <span className="variant-sold-out">Sold out</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isOutOfStock && (
              <div className="qty-row">
                <span>Quantity</span>
                <div className="qty-stepper">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>−</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))} disabled={quantity >= availableStock}>+</button>
                </div>
              </div>
            )}

            <button
              type="button"
              className={`btn btn-block ${isOutOfStock ? 'btn-disabled' : 'btn-primary'}`}
              disabled={busy || !canAdd}
              onClick={handleAdd}
            >
              {busy ? <><Spinner small /> Adding…</> : isOutOfStock ? 'Out of Stock' : detail.hasVariants && !variantId ? 'Select a variant' : 'Add to cart'}
            </button>

            <button type="button" className="btn btn-secondary btn-block" onClick={() => setChatOpen(true)}>
              💬 Ask a question
            </button>

            {detail.description && <p className="product-desc">{detail.description}</p>}
            {detail.aiSellingPoints?.length > 0 && (
              <ul className="selling-points">
                {detail.aiSellingPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </div>
        </div>

        <div className="product-reviews">
          <div className="reviews-head">
            <h3>Reviews ({detail.reviewSummary?.totalReviews ?? reviews?.length ?? 0})</h3>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setReviewOpen(true)}>
              {myReview ? 'Update review' : 'Write a review'}
            </button>
          </div>

          <div className="quick-rate">
            <span className="muted small">Rate this product</span>
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`star ${(myReview?.rating ?? 0) >= n ? 'on' : ''}`}
                  disabled={ratingBusy || rateCheck !== 'ready'}
                  onClick={() => handleRate(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >★</button>
              ))}
            </div>
            {rateCheck === 'blocked' && (
              <span className="muted small">You can rate after your order is delivered.</span>
            )}
          </div>

          {reviews === null ? (
            <p className="muted small">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="muted">No reviews yet — be the first to review this product.</p>
          ) : (
            <div className="reviews-list">
              {reviews.map((r) => (
                <div className="review-card" key={r._id}>
                  <div className="review-card-head">
                    <strong>{r.user?.name || 'Customer'}</strong>
                    <span className="review-stars" aria-label={`${r.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= r.rating ? 'on' : ''}>★</span>)}
                    </span>
                    {r.isVerifiedPurchase && <span className="badge badge-status">Verified purchase</span>}
                    <span className="muted small">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.title && <p className="review-title">{r.title}</p>}
                  {r.comment && <p className="review-comment">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="product-qa">
            <h3>Questions &amp; Answers ({qa?.length ?? 0})</h3>
            {qa === null ? (
              <p className="muted small">Loading questions…</p>
            ) : qa.length === 0 ? (
              <p className="muted">No questions yet — ask the seller something about this product.</p>
            ) : (
              <div className="qa-list">
                {qa.map((thread) => (
                  <div className="qa-thread" key={thread._id}>
                    {thread.messages.map((m, i) => (
                      <div key={i} className={`qa-bubble ${m.senderRole}`}>
                        <p className="qa-author">
                          {m.senderRole === 'seller' ? (detail.store?.name || 'Seller') : thread.customerName}
                        </p>
                        <p className="qa-text">{m.text}</p>
                        <span className="muted tiny">{formatDate(m.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {reviewOpen && (
        <ProductReviewModal
          token={token}
          productId={productId}
          productName={detail.name}
          myReview={myReview}
          deliveredOrderId={deliveredOrderId}
          onClose={() => setReviewOpen(false)}
          onSubmitted={() => setReviewsReload((n) => n + 1)}
        />
      )}

      {chatOpen && (
        <ProductChatModal
          token={token}
          user={user}
          product={detail}
          onClose={() => { setChatOpen(false); setQaReload((n) => n + 1) }}
        />
      )}
    </div>
  )
}

// Write / update a review. Reviews are verified-purchase only, so the form is
// gated on a delivered order for this product (or an existing review to edit).
function ProductReviewModal({ token, productId, productName, myReview, deliveredOrderId, onClose, onSubmitted }) {
  const toast = useToast()
  const editing = Boolean(myReview)
  const [rating, setRating] = useState(myReview?.rating || 5)
  const [title, setTitle] = useState(myReview?.title || '')
  const [comment, setComment] = useState(myReview?.comment || '')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editing && !deliveredOrderId) return
    setBusy(true)
    try {
      if (editing) {
        await updateReview(token, myReview._id, { rating, title: title.trim(), comment: comment.trim() })
        toast.success('Review updated ✓')
      } else {
        await createReview(token, {
          productId, orderId: deliveredOrderId, rating, title: title.trim(), comment: comment.trim(),
        })
        toast.success('Review submitted ✓')
      }
      setTimeout(() => { onSubmitted(); onClose() }, 900)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>{editing ? 'Update your review' : 'Write a review'}</h2>
        <p className="muted small">{productName}</p>

        {!editing && !deliveredOrderId ? (
          <>
            <p className="muted">
              You can only review products from <strong>delivered</strong> orders. Once your
              order for this product is delivered, you'll be able to write a review here
              (or from the Orders tab).
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <label>
              Rating
              <div className="star-picker">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" className={`star ${n <= rating ? 'on' : ''}`} onClick={() => setRating(n)}>★</button>
                ))}
              </div>
            </label>

            <label>
              Title
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Great product!" />
            </label>

            <label>
              Comment
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4}
                placeholder="Share your experience with this product…" />
            </label>

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? <><Spinner small /> Submitting…</> : editing ? 'Update review' : 'Submit review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}