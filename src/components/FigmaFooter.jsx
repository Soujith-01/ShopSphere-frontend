import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { navigate } from '../router.js'
import { useToast } from '../toast.js'
import { useLocalization } from '../i18n.jsx'

export default function FigmaFooter({ onOpenModal }) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const toast = useToast()
  const { t } = useLocalization()

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    setSubscribed(true)
    toast.success(t('subscribedSuccess'))
    setEmail('')
  }

  const triggerModal = (name) => {
    if (onOpenModal) {
      onOpenModal(name)
    } else {
      window.dispatchEvent(new CustomEvent('shopsphere:open-modal', { detail: name }))
    }
  }

  return (
    <footer className="figma-footer">
      <div className="figma-container figma-footer-inner">
        {/* Top Newsletter & Brand Column */}
        <div className="figma-footer-main-grid">
          <div className="figma-footer-brand-col">
            <div className="figma-footer-logo-wrap" onClick={() => navigate('/')}>
              <img src="/eazy-logo.png" alt="Eazy Logo" className="brand-logo-img figma-footer-logo-img" />
              <h2 className="figma-footer-logo">
                EAZY
              </h2>
            </div>
            <p className="figma-footer-desc">
              {t('footerAbout')}
            </p>
            <form className="figma-newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder={t('enterEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="figma-newsletter-input"
              />
              <button type="submit" className="figma-newsletter-submit-btn">
                {subscribed ? <Check size={16} /> : t('subscribe')}
              </button>
            </form>
          </div>

          {/* Links Column: POPULAR */}
          <div className="figma-footer-col">
            <h4 className="figma-footer-col-title">{t('popular')}</h4>
            <ul className="figma-footer-links-list">
              <li><button type="button" onClick={() => navigate('/customer/explore?cat=shoes')}>Shoes</button></li>
              <li><button type="button" onClick={() => navigate('/customer/explore?cat=tshirt')}>T-Shirt</button></li>
              <li><button type="button" onClick={() => navigate('/customer/explore?cat=jackets')}>Jackets</button></li>
              <li><button type="button" onClick={() => navigate('/customer/explore?cat=hat')}>Hat</button></li>
              <li><button type="button" onClick={() => navigate('/customer/explore?cat=accessories')}>Accessories</button></li>
            </ul>
          </div>

          {/* Links Column: MENU */}
          <div className="figma-footer-col">
            <h4 className="figma-footer-col-title">{t('shop')}</h4>
            <ul className="figma-footer-links-list">
              <li><button type="button" onClick={() => navigate('/customer/explore')}>{t('allCategories')}</button></li>
              <li><button type="button" onClick={() => triggerModal('giftcards')}>{t('giftCards')}</button></li>
              <li><button type="button" onClick={() => triggerModal('specialevent')}>{t('specialEvent')}</button></li>
              <li><a href="#testimonial">Testimonial</a></li>
              <li><a href="#blog">Blog</a></li>
            </ul>
          </div>

          {/* Links Column: OTHER */}
          <div className="figma-footer-col">
            <h4 className="figma-footer-col-title">{t('helpAndSupport')}</h4>
            <ul className="figma-footer-links-list">
              <li><button type="button" onClick={() => triggerModal('tracking')}>{t('trackingPackage')}</button></li>
              <li><button type="button" onClick={() => triggerModal('faq')}>{t('faq')}</button></li>
              <li><button type="button" onClick={() => triggerModal('about')}>{t('aboutUs')}</button></li>
              <li><button type="button" onClick={() => triggerModal('contact')}>{t('contactUs')}</button></li>
              <li><button type="button" onClick={() => triggerModal('faq')}>Terms & Policy</button></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="figma-footer-bottom">
          <p className="figma-copyright">
            © {new Date().getFullYear()} Eazy · E-commerce UI. {t('rights')}
          </p>
          <div className="figma-footer-bottom-links">
            <button type="button" onClick={() => triggerModal('faq')} className="figma-footer-text-btn">Privacy Policy</button>
            <span>·</span>
            <button type="button" onClick={() => triggerModal('faq')} className="figma-footer-text-btn">Terms of Service</button>
            <span>·</span>
            <button type="button" onClick={() => triggerModal('about')} className="figma-footer-text-btn">About Marketplace</button>
          </div>
        </div>
      </div>
    </footer>
  )
}
