import React, { useState } from 'react'
import {
  X,
  Package,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  HelpCircle,
  Mail,
  Phone,
  MessageSquare,
  Gift,
  Tag,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Award,
  Globe,
  ArrowRight,
} from 'lucide-react'
import { navigate } from '../router.js'
import { useLocalization } from '../i18n.jsx'
import { useToast } from '../toast.js'

export function TrackingModal({ isOpen, onClose, session }) {
  const { t, formatPrice } = useLocalization()
  const toast = useToast()
  const [trackCode, setTrackCode] = useState('')
  const [searched, setSearched] = useState(false)
  const [trackingResult, setTrackingResult] = useState(null)

  if (!isOpen) return null

  const handleTrack = (e) => {
    e?.preventDefault?.()
    if (!trackCode.trim()) {
      toast.error('Please enter an Order ID or Tracking Number')
      return
    }
    setSearched(true)
    // Generate realistic dynamic tracking data for any tracking query
    setTrackingResult({
      orderId: trackCode.trim().toUpperCase(),
      courier: 'Eazy Express Courier (Bluedart/FedEx)',
      eta: 'Tomorrow by 4:00 PM',
      currentLocation: 'Regional Sorting Hub — In Transit',
      steps: [
        { label: 'Order Placed & Verified', date: 'Yesterday, 10:24 AM', done: true },
        { label: 'Packed & Quality Inspected', date: 'Yesterday, 4:15 PM', done: true },
        { label: 'Dispatched & In Transit', date: 'Today, 6:30 AM', done: true, current: true },
        { label: 'Out for Delivery', date: 'Expected Tomorrow Morning', done: false },
        { label: 'Delivered to Address', date: 'Expected Tomorrow Afternoon', done: false },
      ],
    })
  }

  return (
    <div className="figma-modal-overlay" onClick={onClose}>
      <div className="figma-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="figma-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="figma-modal-header">
          <div className="figma-modal-icon-badge">
            <Package size={24} />
          </div>
          <h2 className="figma-modal-title">{t('trackOrderTitle')}</h2>
          <p className="figma-modal-desc">{t('trackOrderDesc')}</p>
        </div>

        <form onSubmit={handleTrack} className="figma-track-form">
          <div className="figma-input-with-button">
            <input
              type="text"
              placeholder={t('trackInputPlaceholder')}
              value={trackCode}
              onChange={(e) => setTrackCode(e.target.value)}
              className="figma-text-input"
              autoFocus
            />
            <button type="submit" className="figma-btn-primary-pill">
              {t('trackButton')}
            </button>
          </div>
        </form>

        {searched && trackingResult && (
          <div className="figma-track-result-box">
            <div className="figma-track-status-banner">
              <div>
                <span className="track-sub">Tracking ID: <strong>{trackingResult.orderId}</strong></span>
                <h4>{trackingResult.currentLocation}</h4>
              </div>
              <div className="track-eta">
                <span>Estimated Arrival</span>
                <strong>{trackingResult.eta}</strong>
              </div>
            </div>

            <div className="figma-timeline">
              {trackingResult.steps.map((step, idx) => (
                <div key={idx} className={`figma-timeline-item ${step.done ? 'completed' : ''} ${step.current ? 'active' : ''}`}>
                  <div className="figma-timeline-icon">
                    {step.done ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  </div>
                  <div className="figma-timeline-content">
                    <span className="figma-timeline-title">{step.label}</span>
                    <span className="figma-timeline-date">{step.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="figma-modal-footer">
          {session ? (
            <button
              type="button"
              className="figma-btn-outline-pill w-full"
              onClick={() => {
                onClose()
                navigate('/customer/orders')
              }}
            >
              {t('viewMyOrders')} <ArrowRight size={16} />
            </button>
          ) : (
            <p className="figma-modal-help-text">
              Have an account?{' '}
              <button
                type="button"
                className="figma-link-btn"
                onClick={() => {
                  onClose()
                  navigate('/login')
                }}
              >
                Sign in to view full order history
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function FaqModal({ isOpen, onClose }) {
  const { t } = useLocalization()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [openIndex, setOpenIndex] = useState(0)

  if (!isOpen) return null

  const faqs = [
    {
      category: 'shipping',
      q: 'How long does standard delivery take?',
      a: 'Standard delivery typically takes 2-4 business days. We also offer Same-Day and Express Delivery options at checkout for select zip codes.',
    },
    {
      category: 'shipping',
      q: 'Do you offer international shipping?',
      a: 'Yes! Eazy ships to over 50+ countries worldwide with tracked DHL & FedEx international courier services.',
    },
    {
      category: 'returns',
      q: 'What is your return & refund policy?',
      a: 'We offer a 100% hassle-free 30-day return policy. Simply head to My Orders, select the item, and click "Request Return". Our courier will pick it up from your doorstep for free, and your refund will be processed within 24-48 hours.',
    },
    {
      category: 'returns',
      q: 'How do refunds get credited?',
      a: 'Refunds are automatically issued back to your original payment method (Credit/Debit Card, UPI, Net Banking, or Eazy Store Wallet).',
    },
    {
      category: 'payments',
      q: 'What payment methods are supported?',
      a: 'We accept all major Credit/Debit Cards (Visa, MasterCard, Amex), UPI (Google Pay, PhonePe, Paytm), Net Banking across 50+ banks, Cash on Delivery (COD), and Gift Cards.',
    },
    {
      category: 'payments',
      q: 'Is my payment information secure?',
      a: 'Absolutely. All transactions are encrypted with 256-bit SSL encryption and processed through PCI-DSS Level 1 certified payment gateways.',
    },
    {
      category: 'seller',
      q: 'How can I sell products on Eazy?',
      a: 'You can register as a seller by clicking "Create account" and selecting the Seller role. You will get access to Google Sheets automated catalog sync, analytics, and instant payouts.',
    },
  ]

  const filteredFaqs = faqs.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="figma-modal-overlay" onClick={onClose}>
      <div className="figma-modal-card figma-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="figma-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="figma-modal-header">
          <div className="figma-modal-icon-badge">
            <HelpCircle size={24} />
          </div>
          <h2 className="figma-modal-title">{t('faqTitle')}</h2>
          <p className="figma-modal-desc">Find quick answers about orders, shipping, returns, and payments.</p>
        </div>

        <div className="figma-faq-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder={t('faqSearchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="figma-faq-search-input"
          />
        </div>

        <div className="figma-faq-tabs">
          {[
            { id: 'all', label: 'All Questions' },
            { id: 'shipping', label: 'Shipping & Delivery' },
            { id: 'returns', label: 'Returns & Refunds' },
            { id: 'payments', label: 'Payments & Security' },
            { id: 'seller', label: 'Seller & Marketplace' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`figma-faq-tab-btn ${activeCategory === tab.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="figma-accordion-list">
          {filteredFaqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div key={index} className={`figma-accordion-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="figma-accordion-header"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span>{faq.q}</span>
                  <span className="figma-accordion-arrow">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <div className="figma-accordion-body">{faq.a}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function AboutModal({ isOpen, onClose }) {
  const { t } = useLocalization()
  if (!isOpen) return null

  return (
    <div className="figma-modal-overlay" onClick={onClose}>
      <div className="figma-modal-card figma-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="figma-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="figma-modal-header">
          <div className="figma-modal-icon-badge">
            <Sparkles size={24} />
          </div>
          <h2 className="figma-modal-title">About Eazy</h2>
          <p className="figma-modal-desc">{t('footerAbout')}</p>
        </div>

        <div className="figma-about-features-grid">
          <div className="figma-about-feature-card">
            <div className="figma-about-feature-icon">
              <Award size={22} />
            </div>
            <h4>Curated & Verified Brands</h4>
            <p>Every seller and product goes through strict quality vetting to ensure only premium materials reach your doorstep.</p>
          </div>

          <div className="figma-about-feature-card">
            <div className="figma-about-feature-icon">
              <ShieldCheck size={22} />
            </div>
            <h4>Buyer Protection</h4>
            <p>Safe transactions, encrypted payments, and a guaranteed 30-day money-back policy for total peace of mind.</p>
          </div>

          <div className="figma-about-feature-card">
            <div className="figma-about-feature-icon">
              <Globe size={22} />
            </div>
            <h4>Sustainable & Ethical</h4>
            <p>We partner with conscious fashion artisans and eco-friendly logistics to reduce our carbon footprint.</p>
          </div>

          <div className="figma-about-feature-card">
            <div className="figma-about-feature-icon">
              <Sparkles size={22} />
            </div>
            <h4>AI-Powered Styling</h4>
            <p>Personalized product suggestions powered by Google Gemini AI to find outfits tailored to your unique taste.</p>
          </div>
        </div>

        <div className="figma-modal-footer text-center">
          <button type="button" className="figma-btn-primary-pill" onClick={onClose}>
            Explore Our Collections
          </button>
        </div>
      </div>
    </div>
  )
}

export function ContactModal({ isOpen, onClose }) {
  const { t } = useLocalization()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitted(true)
    toast.success(t('messageSentSuccess'))
  }

  return (
    <div className="figma-modal-overlay" onClick={onClose}>
      <div className="figma-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="figma-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="figma-modal-header">
          <div className="figma-modal-icon-badge">
            <MessageSquare size={24} />
          </div>
          <h2 className="figma-modal-title">{t('contactTitle')}</h2>
          <p className="figma-modal-desc">{t('contactDesc')}</p>
        </div>

        {submitted ? (
          <div className="figma-success-box">
            <CheckCircle2 size={48} color="#16a34a" />
            <h3>Thank you!</h3>
            <p>{t('messageSentSuccess')}</p>
            <button
              type="button"
              className="figma-btn-primary-pill"
              onClick={() => {
                setSubmitted(false)
                setForm({ name: '', email: '', subject: '', message: '' })
                onClose()
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="figma-contact-form">
            <div className="figma-form-row">
              <label>
                {t('fullName')} *
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="figma-text-input"
                />
              </label>
              <label>
                {t('emailAddress')} *
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="figma-text-input"
                />
              </label>
            </div>

            <label>
              {t('subject')}
              <input
                type="text"
                placeholder="Order Inquiry / Feedback"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="figma-text-input"
              />
            </label>

            <label>
              {t('message')} *
              <textarea
                required
                rows={4}
                placeholder="How can our support team assist you today?"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="figma-text-input"
              />
            </label>

            <button type="submit" className="figma-btn-primary-pill w-full">
              {t('sendMessage')}
            </button>
          </form>
        )}

        <div className="figma-contact-info-strip">
          <div className="figma-info-item">
            <Mail size={16} />
            <span>support@eazy.com</span>
          </div>
          <div className="figma-info-item">
            <Phone size={16} />
            <span>+1 (800) 555-0199</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GiftCardModal({ isOpen, onClose }) {
  const { t, formatPrice } = useLocalization()
  const toast = useToast()
  const [amount, setAmount] = useState(500)
  const [recipient, setRecipient] = useState('')
  const [redeemCode, setRedeemCode] = useState('')
  const [activeTab, setActiveTab] = useState('buy')

  if (!isOpen) return null

  const amounts = [250, 500, 1000, 2000, 5000]

  const handleBuy = (e) => {
    e.preventDefault()
    toast.success(`Gift card of ₹${amount} created! Code sent to ${recipient || 'your email'}.`)
    onClose()
  }

  const handleRedeem = (e) => {
    e.preventDefault()
    if (!redeemCode.trim()) {
      toast.error('Please enter a valid gift card code')
      return
    }
    toast.success(`Gift card code ${redeemCode.toUpperCase()} verified! ₹500 added to your wallet balance.`)
    onClose()
  }

  return (
    <div className="figma-modal-overlay" onClick={onClose}>
      <div className="figma-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="figma-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="figma-modal-header">
          <div className="figma-modal-icon-badge">
            <Gift size={24} />
          </div>
          <h2 className="figma-modal-title">{t('giftCardsTitle')}</h2>
          <p className="figma-modal-desc">{t('giftCardsDesc')}</p>
        </div>

        <div className="figma-faq-tabs">
          <button
            type="button"
            className={`figma-faq-tab-btn ${activeTab === 'buy' ? 'active' : ''}`}
            onClick={() => setActiveTab('buy')}
          >
            {t('buyNow')}
          </button>
          <button
            type="button"
            className={`figma-faq-tab-btn ${activeTab === 'redeem' ? 'active' : ''}`}
            onClick={() => setActiveTab('redeem')}
          >
            {t('redeemCard')}
          </button>
        </div>

        {activeTab === 'buy' ? (
          <form onSubmit={handleBuy} className="figma-giftcard-form">
            <label className="figma-label">{t('selectAmount')}</label>
            <div className="figma-amount-chips">
              {amounts.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`figma-amount-chip ${amount === val ? 'active' : ''}`}
                  onClick={() => setAmount(val)}
                >
                  ₹{val}
                </button>
              ))}
            </div>

            <label className="figma-label">
              Recipient Email (Optional)
              <input
                type="email"
                placeholder="friend@example.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="figma-text-input"
              />
            </label>

            <button type="submit" className="figma-btn-primary-pill w-full">
              {t('buyNow')} — ₹{amount}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRedeem} className="figma-giftcard-form">
            <label className="figma-label">
              Enter 16-Digit Gift Card Code
              <input
                type="text"
                placeholder="SPHR-XXXX-YYYY-ZZZZ"
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                className="figma-text-input uppercase"
                required
              />
            </label>

            <button type="submit" className="figma-btn-primary-pill w-full">
              {t('redeemCard')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export function SpecialEventModal({ isOpen, onClose }) {
  const { t } = useLocalization()
  const toast = useToast()
  const [copiedCode, setCopiedCode] = useState('')

  if (!isOpen) return null

  const promos = [
    {
      code: 'SUMMER25',
      title: 'Summer Fashion Splash — 25% OFF',
      desc: 'Valid on all summer apparel, shirts, shorts, and activewear orders above ₹499.',
      expiry: 'Ends in 3 days',
      discount: '25% OFF',
    },
    {
      code: 'FREESHIP',
      title: 'Free Express Priority Delivery',
      desc: 'No minimum order required. Free express delivery straight to your doorstep.',
      expiry: 'Permanent VIP perk',
      discount: 'FREE DELIVERY',
    },
    {
      code: 'WELCOME50',
      title: 'New Customer Welcome Coupon',
      desc: 'Flat ₹100 instant discount on your first purchase of ₹499 or more.',
      expiry: 'Valid for new members',
      discount: '₹100 OFF',
    },
  ]

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    toast.success(`Coupon code "${code}" copied to clipboard!`)
    setTimeout(() => setCopiedCode(''), 3000)
  }

  return (
    <div className="figma-modal-overlay" onClick={onClose}>
      <div className="figma-modal-card figma-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="figma-modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="figma-modal-header">
          <div className="figma-modal-icon-badge">
            <Tag size={24} />
          </div>
          <h2 className="figma-modal-title">{t('specialEventTitle')}</h2>
          <p className="figma-modal-desc">{t('specialEventDesc')}</p>
        </div>

        <div className="figma-promos-list">
          {promos.map((promo) => {
            const isCopied = copiedCode === promo.code
            return (
              <div key={promo.code} className="figma-promo-card">
                <div className="figma-promo-badge">{promo.discount}</div>
                <div className="figma-promo-details">
                  <h4>{promo.title}</h4>
                  <p>{promo.desc}</p>
                  <span className="figma-promo-expiry"><Clock size={13} /> {promo.expiry}</span>
                </div>
                <button
                  type="button"
                  className={`figma-btn-copy-code ${isCopied ? 'copied' : ''}`}
                  onClick={() => handleCopy(promo.code)}
                >
                  {isCopied ? (
                    <>
                      <Check size={16} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} /> {promo.code}
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        <div className="figma-modal-footer text-center">
          <button
            type="button"
            className="figma-btn-primary-pill"
            onClick={() => {
              onClose()
              navigate('/customer/explore')
            }}
          >
            Shop Discounted Items
          </button>
        </div>
      </div>
    </div>
  )
}
