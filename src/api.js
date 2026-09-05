// API client for the ShopSphere Express backend.
//
// Point VITE_API_BASE_URL at the server if it isn't on the default
// (e.g. in Frontend/.env:  VITE_API_BASE_URL=http://localhost:3000/api).
// CORS on the backend already allows http://localhost:5173.

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
).replace(/\/+$/, '')

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, value)
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data

    // A 401 on an authenticated request means the token is invalid or expired.
    // Notify the app so it can clear the session and ask the user to log in
    // again. (Login/register failures never reach this branch — they send no
    // token, and logout clears the session on purpose.)
    if (res.status === 401 && token && !path.startsWith('/auth/logout')) {
      window.dispatchEvent(new CustomEvent('shopsphere:session-expired'))
    }

    throw err
  }
  return data
}

// ─── Auth ───────────────────────────────────────────────────────────────────
// Field names MUST match Backend/APIS/auth/auth.js exactly:
//   register → { name, email, password, role, businessName?, businessType? }
//   login    → { email, password }
export const register = (payload) => request('/auth/register', { method: 'POST', body: payload })
export const login = (payload) => request('/auth/login', { method: 'POST', body: payload })
export const logout = (token) => request('/auth/logout', { method: 'POST', token })
export const getMe = (token) => request('/auth/me', { token })

// ─── Auth session helpers ───────────────────────────────────────────────────
export const saveSession = (user, accessToken) => {
  localStorage.setItem('shopsphere_token', accessToken)
  localStorage.setItem('shopsphere_user', JSON.stringify(user))
}

export const clearSession = () => {
  localStorage.removeItem('shopsphere_token')
  localStorage.removeItem('shopsphere_user')
}

export const getSession = () => {
  const token = localStorage.getItem('shopsphere_token')
  if (!token) return null
  try {
    return { token, user: JSON.parse(localStorage.getItem('shopsphere_user') || 'null') }
  } catch {
    return { token, user: null }
  }
}

// ─── Products & categories (public) ─────────────────────────────────────────
export const getProducts = (token, params = {}) =>
  request(`/customer/products${buildQuery(params)}`, { token })
export const getFeaturedProducts = (token, limit = 12) =>
  request(`/customer/products/featured${buildQuery({ limit })}`, { token })
export const getProductBySlug = (token, slug) =>
  request(`/customer/products/${slug}`, { token })
export const getCategories = () => request('/customer/categories')

// ─── Cart (protected) ───────────────────────────────────────────────────────
export const getCart = (token) => request('/customer/cart', { token })
export const addToCart = (token, body) =>
  request('/customer/cart', { method: 'POST', body, token })
export const updateCartItem = (token, itemId, quantity) =>
  request(`/customer/cart/${itemId}`, { method: 'PUT', body: { quantity }, token })
export const removeCartItem = (token, itemId) =>
  request(`/customer/cart/${itemId}`, { method: 'DELETE', token })
export const clearCart = (token) =>
  request('/customer/cart', { method: 'DELETE', token })

// ─── Wishlist (protected) ───────────────────────────────────────────────────
export const getWishlist = (token) => request('/customer/wishlist', { token })
export const toggleWishlist = (token, productId) =>
  request('/customer/wishlist/toggle', { method: 'POST', body: { productId }, token })

// ─── Coupons (protected) ────────────────────────────────────────────────────
export const applyCoupon = (token, code) =>
  request('/customer/coupons/apply', { method: 'POST', body: { code }, token })
export const removeCoupon = (token) =>
  request('/customer/coupons/remove', { method: 'DELETE', token })

// ─── Orders (protected) ─────────────────────────────────────────────────────
export const getOrders = (token, params = {}) =>
  request(`/customer/orders${buildQuery(params)}`, { token })
export const getOrder = (token, orderId) => request(`/customer/orders/${orderId}`, { token })
export const getParentOrders = (token, params = {}) =>
  request(`/customer/orders/parents${buildQuery(params)}`, { token })
export const cancelOrder = (token, orderId, reason = '') =>
  request(`/customer/orders/${orderId}/cancel`, { method: 'PUT', body: { reason }, token })
export const checkout = (token, body) =>
  request('/customer/orders/checkout', { method: 'POST', body, token })

// ─── Users / profile / addresses (protected) ────────────────────────────────
export const getCustomerMe = (token) => request('/customer/users/me', { token })
export const updateCustomerMe = (token, body) =>
  request('/customer/users/me', { method: 'PUT', body, token })
export const addAddress = (token, body) =>
  request('/customer/users/me/addresses', { method: 'POST', body, token })
export const updateAddress = (token, addressId, body) =>
  request(`/customer/users/me/addresses/${addressId}`, { method: 'PUT', body, token })
export const deleteAddress = (token, addressId) =>
  request(`/customer/users/me/addresses/${addressId}`, { method: 'DELETE', token })
export const setDefaultAddress = (token, addressId) =>
  request(`/customer/users/me/addresses/${addressId}/default`, { method: 'PUT', token })

// ─── Reviews (protected) ────────────────────────────────────────────────────
export const createReview = (token, body) =>
  request('/customer/reviews', { method: 'POST', body, token })
export const getProductReviews = (token, productId, params = {}) =>
  request(`/customer/reviews/product/${productId}${buildQuery(params)}`, { token })

// ─── Notifications (protected) ──────────────────────────────────────────────
export const getNotifications = (token, params = {}) =>
  request(`/customer/notifications${buildQuery(params)}`, { token })
export const markNotificationRead = (token, notificationId) =>
  request(`/customer/notifications/${notificationId}/read`, { method: 'PUT', token })
export const markAllNotificationsRead = (token) =>
  request('/customer/notifications/read-all', { method: 'PUT', token })
export const deleteNotification = (token, notificationId) =>
  request(`/customer/notifications/${notificationId}`, { method: 'DELETE', token })

// ─── Seller: store (protected) ──────────────────────────────────────
export const sellerGetStore = (token) => request('/seller/store', { token })
export const sellerCreateStore = (token, body) =>
  request('/seller/store', { method: 'POST', body, token })
export const sellerUpdateStore = (token, body) =>
  request('/seller/store', { method: 'PUT', body, token })

// ─── Seller: products & variants (protected) ────────────────────────
export const sellerGetProducts = (token, params = {}) =>
  request(`/seller/products${buildQuery(params)}`, { token })
export const sellerGetProduct = (token, id) =>
  request(`/seller/products/${id}`, { token })
export const sellerCreateProduct = (token, body) =>
  request('/seller/products', { method: 'POST', body, token })
export const sellerUpdateProduct = (token, id, body) =>
  request(`/seller/products/${id}`, { method: 'PUT', body, token })
export const sellerDeleteProduct = (token, id) =>
  request(`/seller/products/${id}`, { method: 'DELETE', token })
export const sellerSubmitProduct = (token, id) =>
  request(`/seller/products/${id}/submit`, { method: 'POST', token })
export const sellerCreateVariant = (token, productId, body) =>
  request(`/seller/products/${productId}/variants`, { method: 'POST', body, token })
export const sellerUpdateVariant = (token, productId, variantId, body) =>
  request(`/seller/products/${productId}/variants/${variantId}`, { method: 'PUT', body, token })
export const sellerDeleteVariant = (token, productId, variantId) =>
  request(`/seller/products/${productId}/variants/${variantId}`, { method: 'DELETE', token })
export const sellerUpdateVariantStock = (token, productId, variantId, body) =>
  request(`/seller/products/${productId}/variants/${variantId}/stock`, { method: 'PUT', body, token })

// ─── Seller: orders (protected) ─────────────────────────────────────
export const sellerGetOrders = (token, params = {}) =>
  request(`/seller/orders${buildQuery(params)}`, { token })
export const sellerGetOrder = (token, orderId) =>
  request(`/seller/orders/${orderId}`, { token })
export const sellerUpdateOrderStatus = (token, orderId, body) =>
  request(`/seller/orders/${orderId}/status`, { method: 'PUT', body, token })
export const sellerCancelOrder = (token, orderId, reason = '') =>
  request(`/seller/orders/${orderId}/cancel`, { method: 'PUT', body: { reason }, token })

// ─── Seller: returns (protected) ────────────────────────────────────
export const sellerGetReturns = (token, params = {}) =>
  request(`/seller/returns${buildQuery(params)}`, { token })
export const sellerApproveReturn = (token, returnId, note = '') =>
  request(`/seller/returns/${returnId}/approve`, { method: 'PUT', body: { note }, token })
export const sellerRejectReturn = (token, returnId, note = '') =>
  request(`/seller/returns/${returnId}/reject`, { method: 'PUT', body: { note }, token })
export const sellerReceiveReturn = (token, returnId) =>
  request(`/seller/returns/${returnId}/receive`, { method: 'PUT', token })

// ─── Seller: dashboard & wallet (protected) ─────────────────────────
export const sellerGetDashboard = (token) => request('/seller/dashboard', { token })
export const sellerGetRecentOrders = (token) =>
  request('/seller/dashboard/recent-orders', { token })
export const sellerGetRevenueChart = (token, days = 14) =>
  request(`/seller/dashboard/revenue-chart${buildQuery({ days })}`, { token })
export const sellerGetWallet = (token) => request('/seller/wallet', { token })
export const sellerGetWalletTransactions = (token, params = {}) =>
  request(`/seller/wallet/transactions${buildQuery(params)}`, { token })
export const sellerGetWithdrawals = (token, params = {}) =>
  request(`/seller/wallet/withdrawals${buildQuery(params)}`, { token })
export const sellerWithdraw = (token, body) =>
  request('/seller/wallet/withdraw', { method: 'POST', body, token })

// ─── Seller: image upload (multipart → Cloudinary) ───────────────────
export const sellerUploadImage = async (token, file) => {
  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch(`${API_BASE_URL}/seller/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const err = new Error(data?.message || `Upload failed (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

// ─── Seller: notifications (protected) ───────────────────────────────
export const sellerGetNotifications = (token, params = {}) =>
  request(`/seller/notifications${buildQuery(params)}`, { token })
export const sellerMarkNotificationRead = (token, notificationId) =>
  request(`/seller/notifications/${notificationId}/read`, { method: 'PUT', token })
export const sellerMarkAllNotificationsRead = (token) =>
  request('/seller/notifications/read-all', { method: 'PUT', token })
export const sellerDeleteNotification = (token, notificationId) =>
  request(`/seller/notifications/${notificationId}`, { method: 'DELETE', token })
