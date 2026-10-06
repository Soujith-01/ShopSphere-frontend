import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Heart,
  Phone,
  RotateCcw,
  Sparkles,
  ShoppingBag,
} from 'lucide-react'
import { getProducts, getCategories, getCart, addToCart, getWishlist, toggleWishlist, getSession } from '../api.js'
import { navigate } from '../router.js'
import { productImageUrl, formatINR, getDiscountLabel } from '../format.js'
import { useToast } from '../toast.js'
import { useLocalization } from '../i18n.jsx'
import FigmaHeader from './FigmaHeader.jsx'
import FigmaFooter from './FigmaFooter.jsx'
import ProductModal from './customer/ProductModal.jsx'
import {
  TrackingModal,
  FaqModal,
  AboutModal,
  ContactModal,
  GiftCardModal,
  SpecialEventModal,
} from './HeaderModals.jsx'
import {
  FIGMA_IMAGES,
  FIGMA_COLORS,
  FIGMA_CATEGORY_TABS,
} from '../assets/figmaAssets.js'
import '../figma.css'

export default function Landing() {
  const toast = useToast()
  const session = getSession()
  const { t, formatPrice, language } = useLocalization()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [activeColor, setActiveColor] = useState(null)
  const [cartCount, setCartCount] = useState(0)
  const [wishlistIds, setWishlistIds] = useState(new Set())
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [activeFooterModal, setActiveFooterModal] = useState(null)

  // Listen to footer modal events
  useEffect(() => {
    const handleOpenModal = (e) => {
      if (e.detail) setActiveFooterModal(e.detail)
    }
    window.addEventListener('shopsphere:open-modal', handleOpenModal)
    return () => window.removeEventListener('shopsphere:open-modal', handleOpenModal)
  }, [])

  // Load real recent products from all stores & categories from API
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getCategories()
      .then((res) => {
        if (!cancelled && res.data) setCategories(res.data)
      })
      .catch(() => {})

    getProducts({ sort: 'newest', limit: 30 })
      .then((res) => {
        if (!cancelled) {
          const list = Array.isArray(res.data) ? res.data : []
          setProducts(list)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load recent uploads:', err)
        if (!cancelled) {
          setProducts([])
          setLoading(false)
        }
      })

    if (session?.token) {
      getCart(session.token)
        .then((res) => {
          if (!cancelled) setCartCount(res.data?.totalItems || 0)
        })
        .catch(() => {})

      getWishlist(session.token)
        .then((res) => {
          if (!cancelled && res.data) {
            setWishlistIds(new Set((res.data || []).map((p) => p._id || p.id)))
          }
        })
        .catch(() => {})
    }

    return () => { cancelled = true }
  }, [session?.token])

  const handleToggleWishlist = async (productId, e) => {
    e?.stopPropagation?.()
    if (!session) {
      navigate('/login')
      return
    }
    try {
      await toggleWishlist(session.token, productId)
      setWishlistIds((prev) => {
        const next = new Set(prev)
        if (next.has(productId)) next.delete(productId)
        else next.add(productId)
        return next
      })
      toast.success('Wishlist updated')
    } catch (err) {
      toast.error(err.message || 'Could not update wishlist')
    }
  }

  const handleQuickAdd = async (product, e) => {
    e?.stopPropagation?.()
    if (!session) {
      navigate('/login')
      return
    }
    try {
      await addToCart(session.token, { productId: product._id, quantity: 1 })
      setCartCount((c) => c + 1)
      toast.success(t('addedToCart'))
    } catch (err) {
      toast.error(err.message || 'Could not add to cart')
    }
  }

  // Filter products by dynamic tab & color
  const filteredProducts = products.filter((p) => {
    if (activeTab !== 'all') {
      const catId = String(p.category?._id || p.category || '').toLowerCase()
      const catSlug = String(p.category?.slug || '').toLowerCase()
      const catName = String(p.category?.name || '').toLowerCase()
      const tabStr = String(activeTab).toLowerCase()
      const matchCat = catId === tabStr ||
        catSlug === tabStr ||
        catName === tabStr ||
        catName.includes(tabStr) ||
        (p.name || '').toLowerCase().includes(tabStr)
      if (!matchCat) return false
    }
    if (activeColor) {
      const matchColor = (p.color || '').toLowerCase().includes(activeColor.filter) ||
        (p.name || '').toLowerCase().includes(activeColor.filter) ||
        (p.description || '').toLowerCase().includes(activeColor.filter)
      if (!matchColor) return false
    }
    return true
  })

  // Dynamic Category Tabs from DB categories or fallback
  const categoryTabs = [
    { id: 'all', label: t('all', 'All') },
    ...(categories && categories.length > 0
      ? categories.slice(0, 6).map((c) => ({ id: c._id || c.slug || c.name, label: c.name }))
      : FIGMA_CATEGORY_TABS),
  ]

  return (
    <div className="figma-landing-wrapper">
      {/* ── Top Header ───────────────────────────────────────── */}
      <FigmaHeader
        cartCount={cartCount}
        wishlistCount={wishlistIds.size}
        categories={categories}
        onSearch={(q) => navigate(`/customer/explore?q=${encodeURIComponent(q)}`)}
        onCartClick={() => navigate(session ? '/customer/cart' : '/login')}
        onWishlistClick={() => navigate(session ? '/customer/wishlist' : '/login')}
      />

      <main>
        {/* ── 1. Bento Grid Hero Section ──────────────────────── */}
        <section className="figma-hero-section">
          <div className="figma-container">
            <div className="figma-hero-bento-grid">
              {/* Main Card: Color of Summer Outfit */}
              <div
                className="figma-hero-main-card"
                style={{ backgroundImage: `url(${FIGMA_IMAGES.heroSummer})` }}
              >
                <div className="figma-hero-main-content">
                  <h1 className="figma-hero-main-title">
                    {t('heroMainTitle1')}<br />{t('heroMainTitle2')}<br />{t('heroMainTitle3')}
                  </h1>
                  <p className="figma-hero-main-desc">
                    {t('heroMainDesc')}
                  </p>
                  <button
                    type="button"
                    className="figma-hero-main-btn"
                    onClick={() => navigate('/customer/explore')}
                  >
                    {t('viewCollections')}
                  </button>
                </div>
              </div>

              {/* Right Stack: Outdoor Active & Casual Comfort */}
              <div className="figma-hero-right-stack">
                <div
                  className="figma-hero-sub-card outdoor"
                  style={{ backgroundImage: `url(${FIGMA_IMAGES.heroOutdoor})` }}
                  onClick={() => navigate('/customer/explore?cat=outdoor')}
                >
                  <h2 className="figma-hero-sub-title">{t('outdoorActive')}</h2>
                </div>

                <div
                  className="figma-hero-sub-card comfort"
                  style={{ backgroundImage: `url(${FIGMA_IMAGES.heroCasual})` }}
                  onClick={() => navigate('/customer/explore?cat=casual')}
                >
                  <h2 className="figma-hero-sub-title">{t('casualComfort')}</h2>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Casual Inspirations Section ──────────────────── */}
        <section className="figma-inspirations-section">
          <div className="figma-container">
            <div className="figma-inspirations-grid">
              {/* Left Text Block */}
              <div className="figma-inspire-text-card">
                <h2 className="figma-inspire-heading">
                  {t('casualInspirations')}
                </h2>
                <p className="figma-inspire-desc">
                  {t('casualInspirationsDesc')}
                </p>
                <div>
                  <button
                    type="button"
                    className="figma-btn-outline-pill"
                    onClick={() => navigate('/customer/explore')}
                  >
                    {t('browseInspirations')}
                  </button>
                </div>
              </div>

              {/* Middle Card: Say it with Shirt */}
              <div
                className="figma-inspire-photo-card"
                style={{ backgroundImage: `url(${FIGMA_IMAGES.inspireSayShirt})` }}
                onClick={() => navigate('/customer/explore?cat=tshirt')}
              >
                <span className="figma-inspire-card-title">{t('sayItWithShirt')}</span>
                <span className="figma-inspire-arrow-btn" aria-label="Explore shirts">
                  <ArrowUpRight size={18} strokeWidth={2.5} />
                </span>
              </div>

              {/* Right Card: Funky never get old */}
              <div
                className="figma-inspire-photo-card"
                style={{ backgroundImage: `url(${FIGMA_IMAGES.inspireFunky})` }}
                onClick={() => navigate('/customer/explore?cat=jackets')}
              >
                <span className="figma-inspire-card-title">{t('funkyNeverGetOld')}</span>
                <span className="figma-inspire-arrow-btn" aria-label="Explore jackets">
                  <ArrowUpRight size={18} strokeWidth={2.5} />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Recent Uploads Section ──────────────────────── */}
        <section className="figma-trending-section">
          <div className="figma-container">
            <div className="figma-trending-header">
              <h2 className="figma-section-title">Recent Uploads</h2>
              <div className="figma-category-tabs">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`figma-cat-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setActiveColor(null)
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="figma-product-grid">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="figma-skeleton-card">
                    <div className="figma-skeleton-img" />
                    <div className="figma-skeleton-text short" />
                    <div className="figma-skeleton-text" />
                  </div>
                ))
              ) : filteredProducts.length === 0 ? (
                <div className="figma-empty-products">
                  <ShoppingBag size={44} strokeWidth={1.5} color="#9ca3af" />
                  <h3>No products found in this category</h3>
                  <p>Browse all available items from verified stores across ShopSphere.</p>
                  <button
                    type="button"
                    className="figma-btn-primary-pill"
                    onClick={() => {
                      setActiveTab('all')
                      setActiveColor(null)
                    }}
                  >
                    View All Products
                  </button>
                </div>
              ) : (
                filteredProducts.slice(0, 12).map((product) => {
                  const img = productImageUrl(product)
                  const isWish = wishlistIds.has(product._id)
                  const discountLabel = getDiscountLabel(product.discount)
                  const storeName = product.store?.name || (typeof product.store === 'string' ? product.store : '')
                  const catName = product.category?.name || (typeof product.category === 'string' ? product.category : '')

                  return (
                    <div
                      key={product._id}
                      className="figma-product-card"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="figma-product-img-wrapper">
                        <button
                          type="button"
                          className={`figma-product-wishlist-btn ${isWish ? 'active' : ''}`}
                          onClick={(e) => handleToggleWishlist(product._id, e)}
                          aria-label="Wishlist"
                        >
                          <Heart size={16} strokeWidth={2.2} fill={isWish ? 'currentColor' : 'none'} />
                        </button>
                        {discountLabel && (
                          <span className="figma-product-discount-badge">{discountLabel}</span>
                        )}
                        {img ? (
                          <img
                            src={img}
                            alt={product.name}
                            className="figma-product-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="figma-product-placeholder">
                            <ShoppingBag size={34} strokeWidth={1.5} />
                            <span>{product.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="figma-product-info">
                        <div className="figma-product-meta-row">
                          {storeName && (
                            <span className="figma-product-store" title={`Store: ${storeName}`}>
                              {storeName}
                            </span>
                          )}
                          {catName && (
                            <span className="figma-product-cat">{catName}</span>
                          )}
                        </div>
                        <h3 className="figma-product-title">{product.name}</h3>
                        <div className="figma-product-card-bottom">
                          <span className="figma-product-price">{formatINR(product.price)}</span>
                          <button
                            type="button"
                            className="figma-quick-add-btn"
                            onClick={(e) => handleQuickAdd(product, e)}
                          >
                            {t('add')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {/* ── 4. Explore by Colors Section ────────────────────── */}
        <section className="figma-colors-section">
          <div className="figma-container">
            <div className="figma-colors-container">
              <h2 className="figma-colors-title">
                Explore<br />by Colors
              </h2>
              <div className="figma-colors-pills-grid">
                {FIGMA_COLORS.map((col) => {
                  const isSelected = activeColor?.name === col.name
                  return (
                    <button
                      key={col.name}
                      type="button"
                      className={`figma-color-pill-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setActiveColor(isSelected ? null : col)}
                    >
                      <span
                        className="figma-color-dot"
                        style={{
                          backgroundColor: col.hex,
                          border: col.border ? `1px solid ${col.border}` : 'none',
                        }}
                      />
                      <span>{col.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Testimonial Dark Banner ──────────────────────── */}
        <section className="figma-testimonial-section" id="testimonial">
          <div className="figma-container">
            <div className="figma-testimonial-card">
              <div className="figma-testimonial-content">
                <span className="figma-testimonial-eyebrow">What people said</span>
                <h2 className="figma-testimonial-heading">
                  Love the way they<br />handle the order.
                </h2>
                <p className="figma-testimonial-quote">
                  {t('testimonialQuote')}
                </p>
                <div className="figma-testimonial-author">
                  <strong>{t('testimonialAuthor')}</strong>
                  <span>{t('testimonialRole')}</span>
                </div>
              </div>
              <img
                src={FIGMA_IMAGES.testimonialSamantha}
                alt="Samantha William"
                className="figma-testimonial-img"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        {/* ── 6. Value Proposition Section ────────────────────── */}
        <section className="figma-why-section" id="about">
          <div className="figma-container">
            <h2 className="figma-why-title">
              {t('whyShopTitle')}
            </h2>
            <div className="figma-why-grid">
              <div className="figma-why-item">
                <div className="figma-why-icon-circle">
                  <Heart size={22} strokeWidth={2.2} fill="currentColor" />
                </div>
                <h3 className="figma-why-heading">{t('fastDeliveryTitle')}</h3>
                <p className="figma-why-desc">
                  {t('fastDeliveryDesc')}
                </p>
              </div>

              <div className="figma-why-item">
                <div className="figma-why-icon-circle">
                  <Phone size={22} strokeWidth={2.2} />
                </div>
                <h3 className="figma-why-heading">{t('supportTitle')}</h3>
                <p className="figma-why-desc">
                  {t('supportDesc')}
                </p>
              </div>

              <div className="figma-why-item">
                <div className="figma-why-icon-circle">
                  <RotateCcw size={22} strokeWidth={2.2} />
                </div>
                <h3 className="figma-why-heading">{t('moneyBackTitle')}</h3>
                <p className="figma-why-desc">
                  {t('moneyBackDesc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. From The Blog Section ────────────────────────── */}
        <section className="figma-blog-section" id="blog">
          <div className="figma-container">
            <h4 className="figma-blog-label">{t('fromTheBlog')}</h4>
            <div className="figma-blog-grid">
              <div className="figma-blog-img-container">
                <img
                  src={FIGMA_IMAGES.blogWardrobe}
                  alt="Daily Outfit Combinations"
                  className="figma-blog-img"
                  loading="lazy"
                />
              </div>
              <div className="figma-blog-content">
                <h2 className="figma-blog-title">
                  {t('summerTrends')}
                </h2>
                <p className="figma-blog-desc">
                  {t('summerTrendsDesc')}
                </p>
                <div>
                  <button
                    type="button"
                    className="figma-btn-outline-pill"
                    onClick={() => setActiveFooterModal('about')}
                  >
                    {t('readArticle')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Dark Global Footer ──────────────────────────────── */}
      <FigmaFooter onOpenModal={(modal) => setActiveFooterModal(modal)} />

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          token={session?.token}
          user={session?.user}
          isWishlisted={wishlistIds.has(selectedProduct._id)}
          onToggleWishlist={async (id) => {
            await handleToggleWishlist(id)
          }}
          onClose={() => setSelectedProduct(null)}
          onCartChanged={() => setCartCount((c) => c + 1)}
        />
      )}

      {/* Modals triggered from footer or global events */}
      <TrackingModal
        isOpen={activeFooterModal === 'tracking'}
        onClose={() => setActiveFooterModal(null)}
        session={session}
      />
      <FaqModal
        isOpen={activeFooterModal === 'faq'}
        onClose={() => setActiveFooterModal(null)}
      />
      <AboutModal
        isOpen={activeFooterModal === 'about'}
        onClose={() => setActiveFooterModal(null)}
      />
      <ContactModal
        isOpen={activeFooterModal === 'contact'}
        onClose={() => setActiveFooterModal(null)}
      />
      <GiftCardModal
        isOpen={activeFooterModal === 'giftcards'}
        onClose={() => setActiveFooterModal(null)}
      />
      <SpecialEventModal
        isOpen={activeFooterModal === 'specialevent'}
        onClose={() => setActiveFooterModal(null)}
      />
    </div>
  )
}
