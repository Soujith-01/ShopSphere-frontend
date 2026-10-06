import { useState, useRef, useEffect } from 'react'
import {
  Search,
  Heart,
  User,
  ShoppingBag,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  LogOut,
  Package,
  Layers,
  Store,
  HelpCircle,
  Phone,
  Info,
  Truck,
  LogIn,
  Check,
} from 'lucide-react'
import { navigate } from '../router.js'
import { getSession, clearSession } from '../api.js'
import { useLocalization } from '../i18n.jsx'
import {
  TrackingModal,
  FaqModal,
  AboutModal,
  ContactModal,
  GiftCardModal,
  SpecialEventModal,
} from './HeaderModals.jsx'

export default function FigmaHeader({
  cartCount = 0,
  wishlistCount = 0,
  onSearch,
  searchValue = '',
  categories = [],
  selectedCategory = '',
  onSelectCategory,
  onCartClick,
  onWishlistClick,
}) {
  const session = getSession()
  const {
    language,
    setLanguage,
    currentLangObj,
    t,
    LANGUAGES,
  } = useLocalization()

  const [query, setQuery] = useState(searchValue)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)

  // Modal states
  const [activeModal, setActiveModal] = useState(null) // 'tracking' | 'faq' | 'about' | 'contact' | 'giftcards' | 'specialevent'

  const userMenuRef = useRef(null)
  const catMenuRef = useRef(null)
  const langMenuRef = useRef(null)

  useEffect(() => {
    setQuery(searchValue)
  }, [searchValue])

  useEffect(() => {
    const handleOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
      if (catMenuRef.current && !catMenuRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false)
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.()
    if (onSearch) {
      onSearch(query)
    } else {
      navigate(`/customer/explore?q=${encodeURIComponent(query)}`)
    }
  }

  const handleLogout = () => {
    clearSession()
    setUserMenuOpen(false)
    navigate('/login')
  }

  return (
    <>
      <header className="figma-header-wrapper">
        {/* ── Top Utility Bar ───────────────────────────────── */}
        <div className="figma-topbar">
          <div className="figma-container figma-topbar-inner">
            <div className="figma-topbar-left">
              {/* Language Selector Dropdown */}
              <div className="figma-select-wrapper" ref={langMenuRef}>
                <button
                  type="button"
                  className="figma-select-pill"
                  onClick={() => {
                    setLangDropdownOpen(!langDropdownOpen)
                    setCurrDropdownOpen(false)
                  }}
                  aria-label="Select Language"
                >
                  <span>{currentLangObj.flag} {currentLangObj.label}</span>
                  <ChevronDown size={12} strokeWidth={2.5} />
                </button>
                {langDropdownOpen && (
                  <div className="figma-select-dropdown">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        className={`figma-select-item ${language === lang.code ? 'active' : ''}`}
                        onClick={() => {
                          setLanguage(lang.code)
                          setLangDropdownOpen(false)
                        }}
                      >
                        <span className="lang-flag">{lang.flag}</span>
                        <span className="lang-name">{lang.label}</span>
                        {language === lang.code && <Check size={14} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="figma-topbar-right">
              <button
                type="button"
                className="figma-topbar-link"
                onClick={() => setActiveModal('tracking')}
              >
                <Truck size={13} /> {t('trackingPackage')}
              </button>
              <button
                type="button"
                className="figma-topbar-link"
                onClick={() => setActiveModal('faq')}
              >
                <HelpCircle size={13} /> {t('faq')}
              </button>
              <button
                type="button"
                className="figma-topbar-link"
                onClick={() => setActiveModal('about')}
              >
                <Info size={13} /> {t('aboutUs')}
              </button>
              <button
                type="button"
                className="figma-topbar-link"
                onClick={() => setActiveModal('contact')}
              >
                <Phone size={13} /> {t('contactUs')}
              </button>
              <button
                type="button"
                className="figma-topbar-link figma-topbar-signin-btn"
                onClick={() => navigate(session ? '/customer/profile' : '/login')}
              >
                <LogIn size={13} /> {session ? (session.user?.name ? `Hi, ${session.user.name.split(' ')[0]}` : 'Account') : t('logIn')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Navigation Bar ────────────────────────────── */}
        <div className="figma-navbar">
          <div className="figma-container figma-navbar-inner">
            {/* Logo */}
            <button className="figma-logo" onClick={() => navigate('/')}>
              <img src="/eazy-logo.png" alt="Eazy Logo" className="brand-logo-img" />
              <span>EAZY</span>
            </button>

            {/* Search Bar */}
            <form className="figma-search-form" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="figma-search-input"
              />
              <button type="submit" className="figma-search-btn" aria-label="Search">
                <Search size={16} strokeWidth={2.2} />
              </button>
            </form>

            {/* Desktop Nav Menu Links */}
            <nav className="figma-nav-links">
              <div className="figma-dropdown-wrapper" ref={catMenuRef}>
                <button
                  type="button"
                  className="figma-nav-link dropdown-trigger"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                >
                  <span>
                    {selectedCategory
                      ? categories.find((c) => c._id === selectedCategory || c.slug === selectedCategory)?.name || t('allCategory')
                      : t('allCategory')}
                  </span>
                  <ChevronDown size={14} strokeWidth={2.2} />
                </button>
                {categoryDropdownOpen && (
                  <div className="figma-dropdown-menu">
                    <button
                      type="button"
                      className={`figma-dropdown-item ${!selectedCategory ? 'active' : ''}`}
                      onClick={() => {
                        onSelectCategory?.('')
                        setCategoryDropdownOpen(false)
                        navigate('/customer/explore')
                      }}
                    >
                      {t('allCategories')}
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c._id || c.slug}
                        type="button"
                        className={`figma-dropdown-item ${selectedCategory === c._id || selectedCategory === c.slug ? 'active' : ''}`}
                        onClick={() => {
                          onSelectCategory?.(c._id || c.slug)
                          setCategoryDropdownOpen(false)
                          navigate(`/customer/explore?cat=${c.slug || c._id}`)
                        }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* Action Icons */}
            <div className="figma-nav-actions">
              {/* Wishlist */}
              <button
                type="button"
                className="figma-action-icon-btn"
                onClick={() => (onWishlistClick ? onWishlistClick() : navigate(session ? '/customer/wishlist' : '/login'))}
                aria-label="Wishlist"
              >
                <Heart size={20} strokeWidth={2} />
                {wishlistCount > 0 && <span className="figma-badge">{wishlistCount}</span>}
              </button>

              {/* Profile / Account Menu */}
              <div className="figma-user-wrapper" ref={userMenuRef}>
                <button
                  type="button"
                  className="figma-action-icon-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Account"
                >
                  <User size={20} strokeWidth={2} />
                </button>

                {userMenuOpen && (
                  <div className="figma-user-dropdown">
                    {session ? (
                      <>
                        <div className="figma-user-header">
                          <strong>{session.user?.name || 'User'}</strong>
                          <span>{session.user?.email}</span>
                          <span className="figma-user-role">{session.user?.role}</span>
                        </div>
                        <div className="figma-dropdown-divider" />
                        <button type="button" className="figma-dropdown-item" onClick={() => { setUserMenuOpen(false); navigate('/customer/profile') }}>
                          <User size={15} /> {t('myProfile')}
                        </button>
                        <button type="button" className="figma-dropdown-item" onClick={() => { setUserMenuOpen(false); navigate('/customer/orders') }}>
                          <Package size={15} /> {t('myOrders')}
                        </button>
                        <button type="button" className="figma-dropdown-item" onClick={() => { setUserMenuOpen(false); navigate('/customer/explore') }}>
                          <Layers size={15} /> {t('shopCatalog')}
                        </button>
                        {session.user?.role === 'seller' && (
                          <button type="button" className="figma-dropdown-item" onClick={() => { setUserMenuOpen(false); navigate('/seller/overview') }}>
                            <Store size={15} /> {t('sellerDashboard')}
                          </button>
                        )}
                        <div className="figma-dropdown-divider" />
                        <button type="button" className="figma-dropdown-item text-danger" onClick={handleLogout}>
                          <LogOut size={15} /> {t('logOut')}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="figma-user-header">
                          <strong>{t('welcomeToStore')}</strong>
                          <span>{t('signInPrompt')}</span>
                        </div>
                        <div className="figma-dropdown-divider" />
                        <button type="button" className="figma-btn-primary-pill" onClick={() => { setUserMenuOpen(false); navigate('/login') }}>
                          {t('logIn')}
                        </button>
                        <button type="button" className="figma-btn-outline-pill" onClick={() => { setUserMenuOpen(false); navigate('/register') }}>
                          {t('createAccount')}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Shopping Bag / Cart */}
              <button
                type="button"
                className="figma-action-icon-btn cart-btn"
                onClick={() => (onCartClick ? onCartClick() : navigate(session ? '/customer/cart' : '/login'))}
                aria-label="Shopping Cart"
              >
                <ShoppingBag size={20} strokeWidth={2} />
                {cartCount > 0 && <span className="figma-badge">{cartCount}</span>}
              </button>

              {/* Mobile Hamburger Toggle */}
              <button
                type="button"
                className="figma-mobile-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Drawer ─────────────────────────────────── */}
        {mobileMenuOpen && (
          <div className="figma-mobile-drawer">
            <form className="figma-mobile-search" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="submit"><Search size={16} /></button>
            </form>

            <div className="figma-mobile-selectors">
              <div className="figma-mobile-select-row">
                <span>Language:</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="figma-mobile-select">
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="figma-mobile-links">
              <button onClick={() => { setMobileMenuOpen(false); navigate('/customer/explore') }}>{t('allCategories')}</button>
              <button onClick={() => { setMobileMenuOpen(false); setActiveModal('tracking') }}>{t('trackingPackage')}</button>
              <button onClick={() => { setMobileMenuOpen(false); setActiveModal('faq') }}>{t('faq')}</button>
              <button onClick={() => { setMobileMenuOpen(false); setActiveModal('about') }}>{t('aboutUs')}</button>
              <button onClick={() => { setMobileMenuOpen(false); setActiveModal('contact') }}>{t('contactUs')}</button>
              <div className="figma-mobile-auth">
                {session ? (
                  <button className="figma-btn-outline-pill" onClick={handleLogout}>{t('logOut')} ({session.user?.name})</button>
                ) : (
                  <div className="figma-mobile-auth-btns">
                    <button className="figma-btn-primary-pill" onClick={() => { setMobileMenuOpen(false); navigate('/login') }}>{t('logIn')}</button>
                    <button className="figma-btn-outline-pill" onClick={() => { setMobileMenuOpen(false); navigate('/register') }}>{t('createAccount')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Active Header Utility Modals ────────────────────── */}
      <TrackingModal
        isOpen={activeModal === 'tracking'}
        onClose={() => setActiveModal(null)}
        session={session}
      />
      <FaqModal
        isOpen={activeModal === 'faq'}
        onClose={() => setActiveModal(null)}
      />
      <AboutModal
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
      />
      <ContactModal
        isOpen={activeModal === 'contact'}
        onClose={() => setActiveModal(null)}
      />
      <GiftCardModal
        isOpen={activeModal === 'giftcards'}
        onClose={() => setActiveModal(null)}
      />
      <SpecialEventModal
        isOpen={activeModal === 'specialevent'}
        onClose={() => setActiveModal(null)}
      />
    </>
  )
}
