import { useState } from 'react'
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { login, saveSession, requestActivation, API_BASE_URL } from '../api.js'
import { navigate } from '../router.js'
import { useToast } from '../toast.js'
import Spinner from './Spinner.jsx'
import AuthPromoSide from './auth/AuthPromoSide.jsx'
import '../glassAuth.css'

export default function Login({ onSwitchToRegister, onAuthed, onBack }) {
  const toast = useToast()
  const [pendingSeller, setPendingSeller] = useState(false) // 'pending' | 'rejected' | false
  const [deactivated, setDeactivated] = useState(null)
  const [requestSent, setRequestSent] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/')
    }
  }

  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})

    const nextErrors = {}
    if (!email.trim()) {
      nextErrors.email = 'Email address is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!password) {
      nextErrors.password = 'Password is required.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    try {
      setSubmitting(true)
      const res = await login({ email: email.trim(), password })
      saveSession(res.data.user, res.data.accessToken)
      toast.success('✨ Welcome back to ShopSphere!')
      onAuthed?.({ token: res.data.accessToken, user: res.data.user })
    } catch (err) {
      if (err.status === 403 && err.message?.includes('pending admin approval')) {
        setPendingSeller('pending')
      } else if (err.status === 403 && err.message?.includes('rejected')) {
        setPendingSeller('rejected')
      } else if (err.status === 403 && err.message?.includes('deactivated')) {
        setDeactivated(email.trim())
      } else {
        toast.error(err.message || 'Login failed. Please check your credentials.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestActivation = async () => {
    if (!deactivated) return
    try {
      setRequesting(true)
      await requestActivation(deactivated)
      setRequestSent(true)
      toast.success('Reactivation request sent to admin team')
    } catch (err) {
      toast.error(err.message || 'Failed to send request')
    } finally {
      setRequesting(false)
    }
  }

  const handleGoogleLogin = () => {
    toast.info('Connecting to Google OAuth authentication...')
    window.location.href = `${API_BASE_URL}/auth/google`
  }

  return (
    <div className="glass-auth-page">
      <div className="glass-auth-container">
        {/* Left Side: Rich Promotional Section */}
        <AuthPromoSide mode="login" />

        {/* Right Side: Glass Form Container */}
        <div className="glass-form-side">
          <div className="glass-form-wrapper">
            {/* Top Back Navigation Bar */}
            <div className="glass-top-back-nav">
              <button type="button" className="glass-back-btn" onClick={handleBack}>
                <ArrowLeft size={15} /> Back to Store
              </button>
              <span className="glass-mobile-brand">ShopSphere</span>
            </div>

            {/* Status Case 1: Account Deactivated */}
            {deactivated ? (
              <div className="glass-status-card">
                <div className="glass-status-emoji-badge">🚫</div>
                <h2 className="glass-form-title">
                  {requestSent ? 'Request Submitted' : 'Account Deactivated'}
                </h2>
                <p className="glass-form-subtitle">
                  {requestSent
                    ? "Your reactivation request has been sent to the admin team. You'll receive an email once activated."
                    : 'Your account was deactivated. Request a review from our admin team below.'}
                </p>

                <ul className="glass-steps-list">
                  <li className="glass-step-item">
                    <CheckCircle2 size={16} color="#10b981" /> Reactivation request queued
                  </li>
                  <li className="glass-step-item">
                    <Sparkles size={16} color="#0d9488" /> Admin verification in progress
                  </li>
                </ul>

                {!requestSent ? (
                  <button
                    type="button"
                    className="glass-submit-btn"
                    onClick={handleRequestActivation}
                    disabled={requesting}
                  >
                    {requesting ? <><Spinner small /> Submitting…</> : 'Request Reactivation'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="glass-submit-btn"
                    onClick={() => {
                      setDeactivated(null)
                      setRequestSent(false)
                    }}
                  >
                    Return to Log In
                  </button>
                )}
              </div>
            ) : pendingSeller ? (
              /* Status Case 2: Pending Seller Approval */
              <div className="glass-status-card">
                <div className="glass-status-emoji-badge">
                  {pendingSeller === 'rejected' ? '⛔' : '⏳'}
                </div>
                <h2 className="glass-form-title">
                  {pendingSeller === 'rejected' ? 'Application Rejected' : 'Approval In Progress'}
                </h2>
                <p className="glass-form-subtitle">
                  {pendingSeller === 'rejected'
                    ? 'Your seller application was not approved. Please reach out to customer support.'
                    : 'Your seller store application is currently under review by our onboarding team.'}
                </p>

                <ul className="glass-steps-list">
                  <li className="glass-step-item">
                    <CheckCircle2 size={16} color="#10b981" /> Registration received
                  </li>
                  <li className="glass-step-item">
                    <Sparkles size={16} color="#0d9488" /> KYC document verification
                  </li>
                  <li className="glass-step-item">
                    <Lock size={16} color="#64748b" /> Seller dashboard unlocked upon approval
                  </li>
                </ul>

                <button
                  type="button"
                  className="glass-submit-btn"
                  onClick={() => setPendingSeller(false)}
                >
                  Back to Log In
                </button>
              </div>
            ) : (
              /* Normal Login Form */
              <>
                <div className="glass-form-header">
                  <h2 className="glass-form-title">Welcome back</h2>
                  <p className="glass-form-subtitle">
                    Enter your credentials to access your cart, orders, and saved wishlist.
                  </p>
                </div>

                {/* Google Quick Login */}
                <button
                  type="button"
                  className="glass-google-btn"
                  onClick={handleGoogleLogin}
                >
                  <svg className="glass-google-svg" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="glass-divider">
                  <span>or continue with email</span>
                </div>

                <form onSubmit={handleSubmit} className="glass-form" noValidate>
                  {/* Email Field */}
                  <div className="glass-field-group">
                    <label className="glass-field-label" htmlFor="login-email">
                      Email Address
                    </label>
                    <div className="glass-input-wrapper">
                      <Mail size={17} className="glass-input-icon" />
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          clearFieldError('email')
                        }}
                        placeholder="jane@example.com"
                        required
                        autoComplete="email"
                        className={`glass-input ${fieldErrors.email ? 'error' : ''}`}
                      />
                    </div>
                    {fieldErrors.email && (
                      <span className="glass-field-error">{fieldErrors.email}</span>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="glass-field-group">
                    <div className="glass-field-label">
                      <label htmlFor="login-password">Password</label>
                      <button
                        type="button"
                        className="glass-link-btn"
                        onClick={() =>
                          toast.info('Password reset instructions will be sent to your registered email.')
                        }
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="glass-input-wrapper">
                      <Lock size={17} className="glass-input-icon" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          clearFieldError('password')
                        }}
                        placeholder="••••••••••••"
                        required
                        autoComplete="current-password"
                        className={`glass-input ${fieldErrors.password ? 'error' : ''}`}
                      />
                      <button
                        type="button"
                        className="glass-input-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <span className="glass-field-error">{fieldErrors.password}</span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    className="glass-submit-btn"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Spinner small /> Authenticating…
                      </>
                    ) : (
                      'Sign In to Account'
                    )}
                  </button>
                </form>

                <p className="glass-form-footer">
                  New to ShopSphere?{' '}
                  <button
                    type="button"
                    className="glass-link-btn"
                    onClick={onSwitchToRegister}
                  >
                    Create an account
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
