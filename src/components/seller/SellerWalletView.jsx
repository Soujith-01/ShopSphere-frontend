import { useEffect, useState } from 'react'
import {
  sellerGetWallet, sellerGetWalletTransactions, sellerGetWithdrawals, sellerWithdraw,
} from '../../api.js'
import { useToast } from '../../toast.js'
import {
  formatINR, formatDateTime,
  WALLET_TYPE_LABELS, walletTypeFlavor, WITHDRAWAL_STATUS_LABELS, withdrawalStatusFlavor,
} from '../../format.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'

export default function SellerWalletView({ token }) {
  const toast = useToast()
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState({ accountHolder: '', accountNumber: '', ifscCode: '', bankName: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const loadAll = async () => {
    const [w, t, wh] = await Promise.all([
      sellerGetWallet(token),
      sellerGetWalletTransactions(token, { limit: 20 }),
      sellerGetWithdrawals(token, { limit: 20 }),
    ])
    setWallet(w.data)
    setTransactions(t.data || [])
    setWithdrawals(wh.data || [])
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    loadAll()
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  const setBankField = (key) => (e) => {
    setBank((b) => ({ ...b, [key]: e.target.value }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next })
  }

  const handleWithdraw = async (e) => {
    e.preventDefault()
    const errors = {}
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) errors.amount = 'Enter a valid amount.'
    else if (wallet?.minimumWithdrawal && amt < wallet.minimumWithdrawal) {
      errors.amount = `Minimum withdrawal is ${formatINR(wallet.minimumWithdrawal)}.`
    }
    if (!bank.accountHolder.trim()) errors.accountHolder = 'Account holder name is required.'
    if (!/^\d{9,18}$/.test(bank.accountNumber.replace(/\s/g, ''))) {
      errors.accountNumber = 'Account number must be 9–18 digits.'
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifscCode.toUpperCase())) {
      errors.ifscCode = 'Enter a valid IFSC code (e.g. HDFC0001234).'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setSubmitting(true)
    try {
      await sellerWithdraw(token, {
        amount: amt,
        bankDetails: {
          accountHolder: bank.accountHolder.trim(),
          accountNumber: bank.accountNumber.replace(/\s/g, ''),
          ifscCode: bank.ifscCode.toUpperCase(),
          bankName: bank.bankName.trim(),
        },
      })
      toast.success('Withdrawal request submitted — awaiting admin approval')
      setAmount('')
      setBank({ accountHolder: '', accountNumber: '', ifscCode: '', bankName: '' })
      loadAll().catch((err) => { if (err.status !== 401) toast.error(err.message) })
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading label="Loading your wallet…" />

  if (error && !wallet) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load your wallet</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Available balance</span>
          <span className="stat-num">{formatINR(wallet?.availableForWithdrawal)}</span>
          <span className="stat-sub">Min. withdrawal {formatINR(wallet?.minimumWithdrawal)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Wallet balance</span>
          <span className="stat-num">{formatINR(wallet?.balance)}</span>
          <span className="stat-sub">{formatINR(wallet?.pendingWithdrawals)} pending payouts</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total earned</span>
          <span className="stat-num">{formatINR(wallet?.totalEarned)}</span>
          <span className="stat-sub">Before platform fees</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total withdrawn</span>
          <span className="stat-num">{formatINR(wallet?.totalWithdrawn)}</span>
          <span className="stat-sub">Paid to your bank</span>
        </div>
      </div>

      <div className="overview-grid" style={{ marginBottom: 22 }}>
        <div className="panel">
          <h3>Withdraw funds</h3>
          <form className="form" onSubmit={handleWithdraw}>
            <label>
              Amount (₹)
              <input type="number" min="0" step="0.01" value={amount}
                onChange={(e) => { setAmount(e.target.value); setFieldErrors((f) => { const n = { ...f }; delete n.amount; return n }) }}
                placeholder="1000" />
            </label>
            {fieldErrors.amount && <span className="field-error">{fieldErrors.amount}</span>}

            <p className="fieldset-title" style={{ margin: '6px 0 0' }}>Bank details</p>
            <label>
              Account holder name
              <input value={bank.accountHolder} onChange={setBankField('accountHolder')} placeholder="Jane Doe" />
            </label>
            {fieldErrors.accountHolder && <span className="field-error">{fieldErrors.accountHolder}</span>}
            <div className="address-grid">
              <label>
                Account number
                <input value={bank.accountNumber} onChange={setBankField('accountNumber')} placeholder="9–18 digits" />
              </label>
              <label>
                IFSC code
                <input value={bank.ifscCode} onChange={setBankField('ifscCode')} placeholder="HDFC0001234"
                  style={{ textTransform: 'uppercase' }} />
              </label>
            </div>
            {fieldErrors.accountNumber && <span className="field-error">{fieldErrors.accountNumber}</span>}
            {fieldErrors.ifscCode && <span className="field-error">{fieldErrors.ifscCode}</span>}
            <label>
              Bank name
              <input value={bank.bankName} onChange={setBankField('bankName')} placeholder="HDFC Bank" />
            </label>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><Spinner small /> Submitting…</> : 'Request withdrawal'}
            </button>
          </form>
        </div>

        <div className="panel">
          <h3>Recent withdrawals</h3>
          {withdrawals.length === 0 ? (
            <p className="muted small">No withdrawals yet.</p>
          ) : withdrawals.map((w) => (
            <div className="recent-row" key={w._id}>
              <div className="recent-row-info">
                <p><strong>{formatINR(w.amount)}</strong></p>
                <p className="muted small">
                  {formatDateTime(w.createdAt)}
                  {w.bankDetails?.accountNumber ? ` · ${w.bankDetails.accountNumber}` : ''}
                </p>
              </div>
              <span className={`badge badge-${withdrawalStatusFlavor(w.status)}`}>{WITHDRAWAL_STATUS_LABELS[w.status] || w.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Transaction history</h3>
        {transactions.length === 0 ? (
          <p className="muted small">Completed, non-cancelled orders will add sales here.</p>
        ) : (
          transactions.map((t) => {
            const inflow = t.transactionType === 'credit' || t.transactionType === 'refund'
            return (
              <div className="recent-row" key={t._id}>
                <div className="recent-row-info">
                  <p>
                    <span className={`badge badge-${walletTypeFlavor(t.transactionType)}`}>
                      {WALLET_TYPE_LABELS[t.transactionType] || t.transactionType}
                    </span>
                    {' '}<strong>{t.description || (t.order?.orderNumber ? `Order ${t.order.orderNumber}` : 'Wallet entry')}</strong>
                  </p>
                  <p className="muted small">{formatDateTime(t.createdAt)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ color: inflow ? '#1a7f46' : 'var(--danger)' }}>
                    {inflow ? '+' : '−'}{formatINR(t.sellerAmount)}
                  </strong>
                  <p className="muted small">Balance {formatINR(t.balanceAfter)}</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
