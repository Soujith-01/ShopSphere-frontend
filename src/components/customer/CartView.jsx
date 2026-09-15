import { useEffect, useState } from 'react'
import {
  getCart, updateCartItem, removeCartItem, clearCart,
  applyCoupon, removeCoupon, getCustomerMe, checkout,
} from '../../api.js'
import { formatINR, PAYMENT_METHOD_LABELS, productImageUrl } from '../../format.js'
import { navigate } from '../../router.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'

const ONLINE_METHODS = ['upi', 'card', 'net_banking']

export default function CartView({ token, onCartChanged }) {
  const toast = useToast()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Surface load failures as a toast; the content area shows a fallback state.
  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  const loadCart = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getCart(token)
      setCart(res.data)
      onCartChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCart() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleQty = async (item, nextQty) => {
    const availableStock = item.variant
      ? (item.variant.availableStock ?? item.variant.stock ?? Infinity)
      : (item.product?.stock ?? Infinity)

    if (nextQty > item.quantity && nextQty > availableStock) {
      toast.error(availableStock > 0 ? `Only ${availableStock} item${availableStock === 1 ? '' : 's'} currently available.` : 'This product is out of stock.')
      return
    }

    try {
      if (nextQty <= 0) {
        await removeCartItem(token, item._id)
      } else {
        await updateCartItem(token, item._id, nextQty)
      }
      await loadCart()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleRemove = async (itemId) => {
    try {
      await removeCartItem(token, itemId)
      await loadCart()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleClear = async () => {
    if (!confirm('Clear your entire cart?')) return
    try {
      await clearCart(token)
      await loadCart()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleApplyCoupon = async (e) => {
    e.preventDefault()
    try {
      await applyCoupon(token, couponInput)
      toast.success(`Coupon ${couponInput.trim().toUpperCase()} applied`)
      setCouponInput('')
      await loadCart()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon(token)
      toast.success('Coupon removed')
      await loadCart()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const total = (cart?.subtotal || 0) - (cart?.discountAmount || 0)

  if (loading) return <Loading label="Loading your cart…" />

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load your cart</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Browse the Explore tab and add some products to get started.</p>
      </div>
    )
  }

  const hasStockIssue = cart.items.some((item) => {
    const stock = item.variant
      ? (item.variant.availableStock ?? item.variant.stock ?? 0)
      : (item.product?.stock ?? 0)
    return stock <= 0 || item.quantity > stock
  })

  return (
    <div className="cart-layout">
      <div className="cart-items">
        {cart.items.map((item) => {
          const img = item.productImage || productImageUrl(item.product) || productImageUrl(item.variant)
          const availableStock = item.variant
            ? (item.variant.availableStock ?? item.variant.stock ?? Infinity)
            : (item.product?.stock ?? Infinity)
          const isOOS = availableStock <= 0
          const exceeds = item.quantity > availableStock

          return (
            <div className={`cart-item ${isOOS || exceeds ? 'cart-item-warning' : ''}`} key={item._id}>
              <div className="cart-item-media">
                {img ? <img src={img} alt={item.productName} /> : <div className="img-ph">📦</div>}
              </div>
              <div className="cart-item-info">
                <h3>{item.productName}</h3>
                {item.variant?.label && <p className="muted">Variant: {item.variant.label}</p>}
                <p className="cart-item-price">{formatINR(item.priceAtAdd)} each</p>
                {isOOS && <span className="cart-stock-alert danger">⚠️ Currently out of stock — please remove to proceed</span>}
                {!isOOS && exceeds && (
                  <span className="cart-stock-alert warning">⚠️ Only {availableStock} available — please reduce quantity</span>
                )}
              </div>
              <div className="qty-stepper">
                <button type="button" onClick={() => handleQty(item, item.quantity - 1)}>−</button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => handleQty(item, item.quantity + 1)}
                  disabled={item.quantity >= availableStock}
                >
                  +
                </button>
              </div>
              <div className="cart-item-total">{formatINR(item.priceAtAdd * item.quantity)}</div>
              <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => handleRemove(item._id)}>
                Remove
              </button>
            </div>
          )
        })}

        <div className="cart-actions">
          <button type="button" className="btn btn-sm btn-secondary" onClick={handleClear}>Clear cart</button>
        </div>
      </div>

      <aside className="cart-summary">
        <h3>Order summary</h3>

        <form className="coupon-form" onSubmit={handleApplyCoupon}>
          <input
            type="text"
            placeholder="Coupon code"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            disabled={!!cart.couponCode}
          />
          <button type="submit" className="btn btn-sm btn-secondary" disabled={!!cart.couponCode || !couponInput}>
            Apply
          </button>
        </form>
        <div className="summary-rows">
          <div><span>Items</span><span>{cart.totalItems}</span></div>
          {cart.couponCode && (
            <div className="summary-discount">
              <span>Coupon ({cart.couponCode}) <button type="button" className="link" onClick={handleRemoveCoupon}>remove</button></span>
              <span>−{formatINR(cart.discountAmount)}</span>
            </div>
          )}
          <div className="summary-total"><span>Total</span><span>{formatINR(total)}</span></div>
        </div>

        {hasStockIssue && (
          <p className="cart-stock-summary-warning">
            ⚠️ Please adjust or remove out-of-stock items before checkout.
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={hasStockIssue}
          onClick={() => setCheckoutOpen(true)}
        >
          Proceed to checkout
        </button>
        <p className="muted small">Checkout places your order with the seller. No payment gateway is connected yet.</p>
      </aside>

      {checkoutOpen && (
        <CheckoutModal
          token={token}
          total={total}
          onClose={() => setCheckoutOpen(false)}
          onPlaced={() => { setCheckoutOpen(false); loadCart() }}
        />
      )}
    </div>
  )
}

function CheckoutModal({ token, total, onClose, onPlaced }) {
  const toast = useToast()
  const [me, setMe] = useState(null)
  const [addressId, setAddressId] = useState('')
  const [newAddress, setNewAddress] = useState({ fullName: '', phone: '', street: '', pincode: '' })
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [customerNote, setCustomerNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    getCustomerMe(token).then((res) => {
      setMe(res.data)
      const def = res.data.addresses?.find((a) => a.isDefault) || res.data.addresses?.[0]
      if (def) setAddressId(def._id)
      if (!res.data.addresses?.length) setUseNewAddress(true)
    }).catch(() => {})
  }, [token])

  const canSubmit = useNewAddress
    ? newAddress.fullName && newAddress.phone && newAddress.street && newAddress.pincode
    : Boolean(addressId)

  const handlePlace = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    try {
      const body = {
        paymentMethod,
        customerNote: customerNote.trim() || undefined,
        ...(useNewAddress ? { address: newAddress } : { shippingAddressId: addressId }),
      }
      const res = await checkout(token, body)
      setDone(res.data)
      // Don't close the modal here — the success screen (green tick + track
      // button) must stay visible until the user acts on it. onPlaced() is
      // invoked from the buttons/backdrop below.
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleClose = () => {
    onPlaced() // close modal + refresh cart count
  }

  const handleTrackOrder = () => {
    onPlaced()
    navigate('/customer/orders')
  }

  if (done) {
    return (
      <div className="modal-backdrop" onClick={handleClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-tick" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" fill="none" />
              <path fill="none" d="M14 27l8 8 16-16" />
            </svg>
          </div>
          <h2>Order placed!</h2>
          <p>
            Your order was split into <strong>{done.subOrders.length}</strong> seller
            {done.subOrders.length > 1 ? 's' : ''} for fulfilment.
          </p>
          {paymentMethod === 'cod' ? (
            <p className="muted">You'll pay cash on delivery.</p>
          ) : (
            <p className="muted">
              Your {PAYMENT_METHOD_LABELS[paymentMethod]} payment is <strong>pending</strong> —
              the online payment gateway is not connected yet, so no money has been charged.
            </p>
          )}
          <div className="modal-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={handleTrackOrder}>
              Track order
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>Checkout</h2>
        <p className="muted">Total due: <strong>{formatINR(total)}</strong></p>

        <form onSubmit={handlePlace} className="form">
          <div className="fieldset">
            <p className="fieldset-title">Shipping address</p>
            {me?.addresses?.length > 0 && (
              <>
                <div className="address-list">
                  {me.addresses.map((a) => (
                    <label key={a._id} className={`address-option ${!useNewAddress && addressId === a._id ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="address"
                        checked={!useNewAddress && addressId === a._id}
                        onChange={() => { setAddressId(a._id); setUseNewAddress(false) }}
                      />
                      <div>
                        <strong>{a.fullName}</strong> · {a.phone}
                        <p className="muted small">{a.street}, {a.pincode}</p>
                        {a.isDefault && <span className="badge badge-status">Default</span>}
                      </div>
                    </label>
                  ))}
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={useNewAddress} onChange={(e) => setUseNewAddress(e.target.checked)} />
                  Add a new address
                </label>
              </>
            )}

            {useNewAddress && (
              <div className="address-grid">
                <input placeholder="Full name" value={newAddress.fullName} required
                  onChange={(e) => setNewAddress((a) => ({ ...a, fullName: e.target.value }))} />
                <input placeholder="Phone" value={newAddress.phone} required
                  onChange={(e) => setNewAddress((a) => ({ ...a, phone: e.target.value }))} />
                <input placeholder="Street / area / city" value={newAddress.street} required
                  onChange={(e) => setNewAddress((a) => ({ ...a, street: e.target.value }))} />
                <input placeholder="Pincode" value={newAddress.pincode} required
                  onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value }))} />
              </div>
            )}
          </div>

          <div className="fieldset">
            <p className="fieldset-title">Payment method</p>
            <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cod">Cash on Delivery</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="net_banking">Net Banking</option>
            </select>
            {ONLINE_METHODS.includes(paymentMethod) && (
              <p className="muted small">
                Online payment isn't wired to a gateway yet — your order will be placed as <strong>pending payment</strong>.
              </p>
            )}
          </div>

          <label>
            Order note (optional)
            <input type="text" placeholder="Leave a note for the seller" value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)} />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !canSubmit}>
            {busy ? <><Spinner small /> Placing order…</> : `Place order · ${formatINR(total)}`}
          </button>
        </form>
      </div>
    </div>
  )
}