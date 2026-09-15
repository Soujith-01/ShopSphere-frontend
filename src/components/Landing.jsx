import { useEffect, useState } from 'react'
import { navigate } from '../router.js'

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-powered discovery',
    desc: 'Semantic search understands what you mean, not just what you type. Smart recommendations and AI-written product descriptions surface the right item faster.',
  },
  {
    icon: '🏪',
    title: 'Multi-vendor marketplace',
    desc: 'One cart, many stores. Orders are split per seller automatically, each shop manages its own catalog, variants and stock in a dedicated dashboard.',
  },
  {
    icon: '💬',
    title: 'Real-time chat & Q&A',
    desc: 'Message sellers over Socket.io the moment you have a question, and ask public product Q&A that helps every future shopper.',
  },
  {
    icon: '🔒',
    title: 'Secure payments & wallet',
    desc: 'UPI, card and net-banking with server-side amount verification, plus a seller wallet ledger that tracks every credit, debit and withdrawal.',
  },
  {
    icon: '🔄',
    title: 'Returns & refunds done right',
    desc: 'Request a return on delivered orders, seller approves, customer ships, refund flows straight through the wallet — every step tracked and notified.',
  },
  {
    icon: '🚚',
    title: 'Live delivery tracking',
    desc: 'Delivery partners accept nearby orders, update status in real time, and customers watch their package move from packed to out for delivery.',
  },
]

const ROLES = [
  {
    icon: '🛍️',
    title: 'For shoppers',
    points: ['AI semantic search', 'Wishlist & reviews', 'Coupons & order tracking', 'Easy returns'],
    accent: '#6c3ef2',
  },
  {
    icon: '🏬',
    title: 'For sellers',
    points: ['Store & catalog tools', 'Order state machine', 'Earnings wallet', 'Sales analytics'],
    accent: '#0ea5e9',
  },
  {
    icon: '🚀',
    title: 'For delivery partners',
    points: ['Nearby order feed', 'One-tap accept', 'Delivery history', 'Availability toggle'],
    accent: '#16a34a',
  },
]

const STEPS = [
  { n: '1', title: 'Create your account', desc: 'One signup — pick your role: shop as a customer or onboard your store as a seller.' },
  { n: '2', title: 'Discover products', desc: 'Search semantically or browse by category. Ask sellers questions, read real reviews.' },
  { n: '3', title: 'Checkout securely', desc: 'Apply coupons, pay via UPI/card/net-banking or COD, and get instant order confirmation.' },
  { n: '4', title: 'Track & return easily', desc: 'Follow your order to your doorstep — and if it isn\'t right, returns are a few clicks.' },
]

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)

  // Elevate the navbar once the page scrolls for a glassy sticky header.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (path) => {
    navigate(path)
    window.scrollTo(0, 0)
  }

  const scrollToSection = (e, id) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `#${id}`)
    }
  }

  return (
    <div className="landing-page">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className={`lpg-nav ${scrolled ? 'lpg-nav-scrolled' : ''}`}>
        <button className="lpg-logo" onClick={() => go('/')}>
          <span className="lpg-logo-mark">🛍️</span> ShopSphere
        </button>
        <nav className="lpg-nav-links">
          <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Features</a>
          <a href="#roles" onClick={(e) => scrollToSection(e, 'roles')}>Who it's for</a>
          <a href="#how" onClick={(e) => scrollToSection(e, 'how')}>How it works</a>
        </nav>
        <div className="lpg-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => go('/login')}>
            Log in
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => go('/register')}>
            Get started
          </button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="lpg-hero">
        <div className="lpg-hero-glow" aria-hidden="true" />
        <span className="lpg-eyebrow">✨ The multi-vendor marketplace, reimagined</span>
        <h1>
          Shop everything.
          <br />
          <span className="lpg-gradient-text">From every seller.</span>
        </h1>
        <p className="lpg-hero-sub">
          ShopSphere brings customers, sellers and delivery partners onto one platform — with
          AI-powered search, secure payments, real-time chat and a returns flow that
          actually works.
        </p>
        <div className="lpg-hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => go('/register')}>
            Start shopping free
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => go('/register')}>
            Become a seller →
          </button>
        </div>
        <p className="lpg-hero-note">No credit card needed · Free to join · Cancel anytime</p>

        {/* Mock browser card */}
        <div className="lpg-hero-mock" aria-hidden="true">
          <div className="lpg-mock-bar">
            <span /><span /><span />
            <em>shopsphere.app/explore</em>
          </div>
          <div className="lpg-mock-body">
            <div className="lpg-mock-search">🔍 semantic search: &ldquo;waterproof laptop bag&rdquo;</div>
            <div className="lpg-mock-grid">
              {['🎒', '🧥', '⌚', '👟', '🎧', '📱'].map((e, i) => (
                <div className="lpg-mock-card" key={i}>
                  <div className="lpg-mock-thumb">{e}</div>
                  <div className="lpg-mock-line" style={{ width: `${82 - i * 6}%` }} />
                  <div className="lpg-mock-line short" />
                  <div className="lpg-mock-price" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section className="lpg-section" id="features">
        <span className="lpg-eyebrow lpg-eyebrow-center">Everything in one place</span>
        <h2 className="lpg-h2">Built for the whole marketplace</h2>
        <p className="lpg-sub">
          Every role gets a purpose-built dashboard, backed by the same fast, secure
          core.
        </p>
        <div className="lpg-grid lpg-grid-3">
          {FEATURES.map((f) => (
            <article className="lpg-feature" key={f.title}>
              <span className="lpg-feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Roles ──────────────────────────────────────────── */}
      <section className="lpg-section lpg-section-alt" id="roles">
        <span className="lpg-eyebrow lpg-eyebrow-center">One platform, three dashboards</span>
        <h2 className="lpg-h2">Who it's for</h2>
        <p className="lpg-sub">Pick your role — ShopSphere shapes itself around you.</p>
        <div className="lpg-grid lpg-grid-3">
          {ROLES.map((r) => (
            <article className="lpg-role" key={r.title} style={{ '--role-accent': r.accent }}>
              <span className="lpg-role-icon">{r.icon}</span>
              <h3>{r.title}</h3>
              <ul>
                {r.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="lpg-section" id="how">
        <span className="lpg-eyebrow lpg-eyebrow-center">From browse to doorstep</span>
        <h2 className="lpg-h2">How it works</h2>
        <div className="lpg-steps">
          {STEPS.map((s) => (
            <div className="lpg-step" key={s.n}>
              <span className="lpg-step-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="lpg-cta">
        <h2>Ready to dive in?</h2>
        <p>Join thousands of shoppers and sellers already on ShopSphere.</p>
        <div className="lpg-hero-actions">
          <button className="btn btn-lg lpg-btn-light" onClick={() => go('/register')}>
            Create your account
          </button>
          <button className="btn btn-lg btn-secondary" onClick={() => go('/login')}>
            I already have one
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="lpg-footer">
        <div className="lpg-footer-brand">🛍️ ShopSphere</div>
        <p>Multi-vendor e-commerce — customers shop, sellers sell, delivery partners fulfill.</p>
        <div className="lpg-footer-links">
          <a href="#features" onClick={(e) => scrollToSection(e, 'features')}>Features</a>
          <a href="#roles" onClick={(e) => scrollToSection(e, 'roles')}>Who it's for</a>
          <a href="#how" onClick={(e) => scrollToSection(e, 'how')}>How it works</a>
          <button className="lpg-footer-link" onClick={() => go('/login')}>Log in</button>
          <button className="lpg-footer-link" onClick={() => go('/register')}>Register</button>
        </div>
        <small>© {new Date().getFullYear()} ShopSphere. Built with the Freebuff stack.</small>
      </footer>
    </div>
  )
}
