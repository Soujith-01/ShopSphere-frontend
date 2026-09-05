import { useEffect, useState } from 'react'
import { getWishlist, toggleWishlist } from '../../api.js'
import ProductCard from './ProductCard.jsx'
import ProductModal from './ProductModal.jsx'
import Loading from '../Loading.jsx'
import { useToast } from '../../toast.js'

export default function WishlistView({ token, onCartChanged }) {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalProduct, setModalProduct] = useState(null)

  // Surface load failures as a toast; the content area shows a fallback state.
  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  useEffect(() => {
    let cancelled = false
    getWishlist(token)
      .then((res) => { if (!cancelled) setItems(res.data || []) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  const handleToggle = async (productId) => {
    await toggleWishlist(token, productId)
    setItems((prev) => prev.filter((p) => p._id !== productId))
  }

  if (loading) return <Loading label="Loading your wishlist…" />

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load your wishlist</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">♥</div>
        <h2>Your wishlist is empty</h2>
        <p>Tap the ♡ on any product to save it here for later.</p>
      </div>
    )
  }

  return (
    <div className="product-grid">
      {items.map((p) => (
        <ProductCard
          key={p._id}
          product={p}
          token={token}
          isWishlisted
          onToggleWishlist={handleToggle}
          onOpen={setModalProduct}
          onCartChanged={onCartChanged}
        />
      ))}

      {modalProduct && (
        <ProductModal
          product={modalProduct}
          token={token}
          onClose={() => setModalProduct(null)}
          onCartChanged={onCartChanged}
        />
      )}
    </div>
  )
}