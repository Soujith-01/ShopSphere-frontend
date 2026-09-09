import { useEffect, useState } from 'react'
import { getMyReviews, updateReview, deleteReview } from '../../api.js'
import { formatDate } from '../../format.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'

export default function ReviewsView({ token }) {
  const toast = useToast()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editReview, setEditReview] = useState(null)

  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMyReviews(token, { limit: 50 })
      .then((res) => { if (!cancelled) setReviews(res.data || []) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, refresh])

  const handleDelete = async (review) => {
    if (!confirm(`Delete your review for "${review.product?.name || 'this product'}"?`)) return
    try {
      await deleteReview(token, review._id)
      toast.success('Review deleted')
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  if (loading) return <Loading label="Loading your reviews…" />

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load reviews</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  return (
    <div className="reviews-view">
      <div className="reviews-view-head">
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-h)' }}>My Reviews</h2>
      </div>

      {reviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-emoji">⭐</div>
          <h2>No reviews yet</h2>
          <p>When you review a delivered product, it will show up here.</p>
        </div>
      ) : (
        <div className="reviews-view-list">
          {reviews.map((review) => (
            <div className="review-view-card" key={review._id}>
              <div className="review-view-head">
                <div className="review-view-product">
                  <strong>{review.product?.name || 'Product'}</strong>
                  <p className="muted small">
                    Order #{review.order?.orderNumber || '—'} · {formatDate(review.createdAt)}
                  </p>
                </div>
                <div className="review-view-rating">
                  <span className="review-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={n <= review.rating ? 'on' : ''}>★</span>
                    ))}
                  </span>
                </div>
              </div>

              {review.title && <p className="review-view-title">{review.title}</p>}
              {review.comment && <p className="review-view-comment">{review.comment}</p>}

              {review.sellerResponse?.text && (
                <div className="review-view-reply">
                  <p className="muted small"><strong>Seller reply:</strong></p>
                  <p className="muted small" style={{ fontStyle: 'italic' }}>{review.sellerResponse.text}</p>
                </div>
              )}

              <div className="review-view-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setEditReview(review)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger-ghost"
                  onClick={() => handleDelete(review)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editReview && (
        <EditReviewModal
          token={token}
          review={editReview}
          onClose={() => setEditReview(null)}
          onSubmitted={() => { setEditReview(null); setRefresh((r) => r + 1) }}
        />
      )}
    </div>
  )
}

function EditReviewModal({ token, review, onClose, onSubmitted }) {
  const toast = useToast()
  const [rating, setRating] = useState(review.rating)
  const [title, setTitle] = useState(review.title || '')
  const [comment, setComment] = useState(review.comment || '')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await updateReview(token, review._id, {
        rating,
        title: title.trim(),
        comment: comment.trim(),
      })
      toast.success('Review updated ✓')
      setTimeout(onSubmitted, 700)
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
        <h2>Edit Review</h2>
        <p className="muted small">{review.product?.name || 'Product'}</p>

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
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Share your experience with this product…"
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <><Spinner small /> Updating…</> : 'Update Review'}
          </button>
        </form>
      </div>
    </div>
  )
}
