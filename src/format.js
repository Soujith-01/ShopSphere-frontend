// Shared formatting helpers used across the customer dashboard

export const formatINR = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '—'

export const ORDER_STATUS_LABELS = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_requested: 'Return requested',
  return_approved: 'Return approved',
  return_shipped: 'Return shipped',
  return_received: 'Return received',
  refunded: 'Refunded',
}

export const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on Delivery',
  upi: 'UPI',
  card: 'Card',
  net_banking: 'Net Banking',
  wallet: 'Wallet',
  mock: 'Mock',
}

export const payStatusLabel = (status) =>
  status === 'completed' ? 'Paid' : status === 'pending' ? 'Pending' : status === 'refunded' ? 'Refunded' : 'Failed'

// CSS flavour class for badges: status | success | danger | muted
export const orderStatusFlavor = (status) => {
  if (status === 'delivered' || status === 'refunded') return 'success'
  if (status === 'cancelled') return 'danger'
  if (['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery',
    'return_requested', 'return_approved', 'return_shipped', 'return_received'].includes(status)) return 'status'
  return 'muted'
}

export const payStatusFlavor = (status) => {
  if (status === 'completed') return 'success'
  if (status === 'refunded') return 'status'
  if (status === 'failed') return 'danger'
  return 'muted'
}

export const productImageUrl = (product) => {
  const img = product?.images?.find?.((i) => i?.url) || product?.images?.[0]
  return img?.url || ''
}

// Formats product discount (percentage or flat off) for badges on product images
export const getDiscountLabel = (discount) => {
  if (!discount || !discount.value || Number(discount.value) <= 0) return null
  if (discount.validTo && new Date(discount.validTo) < new Date()) return null
  const type = String(discount.type || '').toLowerCase().trim()
  if (type === 'percentage') {
    return `${discount.value}% OFF`
  }
  if (type === 'flat') {
    return `Flat ₹${Number(discount.value).toLocaleString('en-IN')} OFF`
  }
  return null
}

// ─── Seller-side labels ─────────────────────────────────────────────
export const PRODUCT_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending review',
  active: 'Active',
  inactive: 'Inactive',
  rejected: 'Rejected',
}

export const productStatusFlavor = (status) => {
  if (status === 'active') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending') return 'status'
  return 'muted'
}

export const RETURN_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  picked_up: 'Picked up from customer',
  returned_to_store: 'Returned to store',
  received: 'Received',
  rejected: 'Rejected',
  return_shipped: 'Shipped back',
  return_received: 'Received',
  refunded: 'Refunded',
}

export const returnStatusFlavor = (status) => {
  if (status === 'approved' || status === 'received' || status === 'return_received' || status === 'refunded') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending' || status === 'picked_up' || status === 'returned_to_store' || status === 'return_shipped') return 'status'
  return 'muted'
}

export const RETURN_REASON_LABELS = {
  defective: 'Defective',
  wrong_item: 'Wrong item',
  not_as_described: 'Not as described',
  damaged: 'Damaged',
  size_issue: 'Size issue',
  changed_mind: 'Changed mind',
  other: 'Other',
}

export const WITHDRAWAL_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
}

export const withdrawalStatusFlavor = (status) => {
  if (status === 'approved' || status === 'paid') return 'success'
  if (status === 'rejected') return 'danger'
  return 'status'
}

export const WALLET_TYPE_LABELS = {
  credit: 'Sale',
  debit: 'Debit',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
}

export const walletTypeFlavor = (type) =>
  type === 'credit' || type === 'refund' ? 'success' : 'danger'

// Next manual action a seller can take for a given order status.
export const NEXT_ORDER_ACTIONS = {
  placed: { status: 'confirmed', label: 'Confirm order' },
  confirmed: { status: 'packed', label: 'Mark packed' },
  packed: { status: 'shipped', label: 'Mark shipped' },
  shipped: { status: 'out_for_delivery', label: 'Start delivery' },
  out_for_delivery: { status: 'delivered', label: 'Mark delivered' },
}

// ─── Support-side labels ────────────────────────────────────────────
export const TICKET_STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_customer: 'Waiting on customer',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const ticketStatusFlavor = (status) => {
  if (status === 'resolved') return 'success'
  if (status === 'closed') return 'muted'
  if (status === 'open') return 'danger'
  return 'status' // in_progress, waiting_customer
}

export const TICKET_PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const ticketPriorityFlavor = (priority) => {
  if (priority === 'urgent') return 'danger'
  if (priority === 'high') return 'status'
  if (priority === 'medium') return 'muted'
  return 'muted'
}

export const TICKET_CATEGORY_LABELS = {
  order_issue: 'Order issue',
  payment: 'Payment',
  return: 'Return',
  refund: 'Refund',
  product_query: 'Product query',
  delivery: 'Delivery',
  account: 'Account',
  other: 'Other',
}