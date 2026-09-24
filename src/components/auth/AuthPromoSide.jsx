import React from 'react'
import {
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Zap,
  Bot,
  Store,
  Star,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { navigate } from '../../router.js'

export default function AuthPromoSide({ mode = 'login' }) {
  return (
    <div className="glass-promo-side">
      {/* Background ambient glowing orbs */}
      <div className="glass-orb glass-orb-1" />
      <div className="glass-orb glass-orb-2" />
      <div className="glass-orb glass-orb-3" />

      <div className="glass-promo-content">
        {/* Top Brand Tag */}
        <div className="glass-brand-header" onClick={() => navigate('/')} role="button" tabIndex={0}>
          <div className="glass-brand-icon-box">
            <ShoppingBag size={24} strokeWidth={2.3} className="glass-brand-svg" />
          </div>
          <div className="glass-brand-text">
            <span className="glass-brand-title">Eazy</span>
            <span className="glass-brand-tagline">Multi-Vendor Marketplace</span>
          </div>
        </div>

        {/* Main Hero Headline */}
        <div className="glass-hero-headline-block">
          <div className="glass-pill-badge">
            <Sparkles size={14} className="text-teal-accent" />
            <span>Curated Lifestyle & Fashion</span>
          </div>
          <h1 className="glass-main-heading">
            A Marketplace<br />
            <span className="glass-heading-gradient">for Everyone.</span>
          </h1>
          <p className="glass-main-subtext">
            Discover thousands of unique products from verified independent creators, boutique designers, and global artisans — powered by Gemini AI styling.
          </p>
        </div>

        {/* Visual Showcase Card with Floating Glass Micro-Pills */}
        <div className="glass-showcase-card">
          <div className="glass-showcase-img-wrap">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=85"
              alt="Eazy Premium Collection"
              className="glass-showcase-img"
              loading="lazy"
            />
            <div className="glass-showcase-overlay" />
          </div>

          {/* Floating Glass Pill: 4.9 Rating */}
          <div className="glass-float-card glass-float-top-right">
            <div className="glass-rating-stars">
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <strong>4.9 / 5.0</strong>
            </div>
            <span>24k+ Happy Shoppers</span>
          </div>

          {/* Floating Glass Pill: Express Delivery */}
          <div className="glass-float-card glass-float-bottom-left">
            <div className="glass-float-icon-bubble">
              <Zap size={14} />
            </div>
            <div>
              <strong>Express Tracked Delivery</strong>
              <span>Real-time GPS status</span>
            </div>
          </div>

          {/* Floating Glass Pill: Buyer Protection */}
          <div className="glass-float-card glass-float-bottom-right">
            <div className="glass-float-icon-bubble shield">
              <ShieldCheck size={14} />
            </div>
            <div>
              <strong>100% Buyer Protection</strong>
              <span>30-Day Instant Refund</span>
            </div>
          </div>
        </div>

        {/* 4 Key Benefits Grid */}
        <div className="glass-benefits-grid">
          <div className="glass-benefit-item">
            <div className="glass-benefit-icon-box">
              <ShoppingBag size={18} />
            </div>
            <div className="glass-benefit-text">
              <h4>Wide Variety</h4>
              <p>10,000+ curated items across 50+ categories</p>
            </div>
          </div>

          <div className="glass-benefit-item">
            <div className="glass-benefit-icon-box">
              <Store size={18} />
            </div>
            <div className="glass-benefit-text">
              <h4>Trusted Sellers</h4>
              <p>100% verified artisan stores & secure checkout</p>
            </div>
          </div>

          <div className="glass-benefit-item">
            <div className="glass-benefit-icon-box">
              <ShieldCheck size={18} />
            </div>
            <div className="glass-benefit-text">
              <h4>Fast & Secure</h4>
              <p>Express tracked shipping & encrypted transactions</p>
            </div>
          </div>

          <div className="glass-benefit-item">
            <div className="glass-benefit-icon-box">
              <Bot size={18} />
            </div>
            <div className="glass-benefit-text">
              <h4>Smart Shopping</h4>
              <p>Gemini AI styling suggestions & 24/7 assistance</p>
            </div>
          </div>
        </div>

        {/* Social Proof Footer */}
        <div className="glass-promo-footer">
          <div className="glass-avatar-stack">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" alt="User 1" />
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" alt="User 2" />
            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" alt="User 3" />
            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" alt="User 4" />
          </div>
          <div className="glass-footer-stat">
            <strong>Join 50,000+ members</strong>
            <span>shopping with confidence on Eazy</span>
          </div>
        </div>
      </div>
    </div>
  )
}
