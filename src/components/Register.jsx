import { useState } from 'react'
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Store,
  Building,
  Phone,
  Truck,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { register, registerDelivery, saveSession, API_BASE_URL } from '../api.js'
import { navigate } from '../router.js'
import { useToast } from '../toast.js'
import Spinner from './Spinner.jsx'
import AuthPromoSide from './auth/AuthPromoSide.jsx'
import '../glassAuth.css'

const VEHICLE_TYPES = ['Bike', 'Scooter', 'Car', 'Van', 'Truck']

export default function Register({ onSwitchToLogin, onAuthed, onBack }) {
  const toast = useToast()
  const [pendingApproval, setPendingApproval] = useState(null)
  const [pendingApprovalRole, setPendingApprovalRole] = useState('seller')
  const [pendingName, setPendingName] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/')
    }
  }

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    businessName: '',
    businessType: 'individual',
    phone: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
  })
  const [licenseFile, setLicenseFile] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const isSeller = form.role === 'seller'
  const isDelivery = form.role === 'delivery'

  const set = (key) => (e) => {
    const val = typeof e === 'string' ? e : e?.target?.value
    setForm((f) => ({ ...f, [key]: val }))
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleLicenseChange = (e) => {
    const file = e.target.files?.[0] || null
    setLicenseFile(file)
    setFieldErrors((prev) => {
      if (!('licensePhoto' in prev)) return prev
      const next = { ...prev }
      delete next.licensePhoto
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})

    const nextErrors = {}
    if (!form.name.trim()) {
      nextErrors.name = 'Full name is required.'
    }
    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.'
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (form.password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }
    if (isSeller && !form.businessName.trim()) {
      nextErrors.businessName = 'Business name is required for sellers.'
    }
    if (isDelivery) {
      if (!form.phone.trim()) nextErrors.phone = 'Phone number is required for delivery agents.'
      if (!form.vehicleType) nextErrors.vehicleType = 'Please select a vehicle type.'
      if (!form.vehicleNumber.trim()) nextErrors.vehicleNumber = 'Vehicle number is required.'
      if (!form.licenseNumber.trim()) nextErrors.licenseNumber = 'Driving license number is required.'
      if (!licenseFile) nextErrors.licensePhoto = 'Please upload a photo of your driving license.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    let res
    try {
      setSubmitting(true)

      if (isDelivery) {
        const payload = new FormData()
        payload.append('name', form.name.trim())
        payload.append('email', form.email.trim())
        payload.append('password', form.password)
        payload.append('role', 'delivery')
        payload.append('phone', form.phone.trim())
        payload.append('vehicleType', form.vehicleType)
        payload.append('vehicleNumber', form.vehicleNumber.trim())
        payload.append('licenseNumber', form.licenseNumber.trim())
        payload.append('licensePhoto', licenseFile)
        res = await registerDelivery(payload)
      } else {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: isSeller ? 'seller' : 'customer',
        }
        if (isSeller) {
          payload.businessName = form.businessName.trim()
          payload.businessType = form.businessType
        }
        res = await register(payload)
      }

      if (res.data?.requiresApproval) {
        setPendingApproval(res.data.user)
        setPendingApprovalRole(isDelivery ? 'delivery' : 'seller')
        setPendingName(form.name.trim())
        return
      }

      saveSession(res.data.user, res.data.accessToken)
      toast.success('✨ Account created successfully! Welcome to Eazy.')
      onAuthed?.({ token: res.data.accessToken, user: res.data.user })
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignup = () => {
    toast.info('Connecting to Google OAuth registration...')
    window.location.href = `${API_BASE_URL}/auth/google`
  }

  return (
    <div className="glass-auth-page">
      <div className="glass-auth-container">
        {/* Left Side: Rich Promotional Section */}
        <AuthPromoSide mode="register" />

        {/* Right Side: Glass Form Container */}
        <div className="glass-form-side">
          <div className="glass-form-wrapper">
            {/* Top Back Navigation Bar */}
            <div className="glass-top-back-nav">
              <button type="button" className="glass-back-btn" onClick={handleBack}>
                <ArrowLeft size={15} /> Back to Store
              </button>
              <div className="glass-mobile-brand-wrap" onClick={handleBack} role="button" tabIndex={0}>
                <img src="/eazy-logo.png" alt="Eazy Logo" className="brand-logo-img mobile-brand-logo-img" />
                <span className="glass-mobile-brand">Eazy</span>
              </div>
            </div>

            {/* Status Case: Application Awaiting Admin Review */}
            {pendingApproval ? (
              <div className="glass-status-card">
                <div className="glass-status-emoji-badge">
                  {pendingApprovalRole === 'delivery' ? '🛵' : '🏪'}
                </div>
                <h2 className="glass-form-title">
                  {pendingApprovalRole === 'delivery'
                    ? 'Delivery Partner Application Sent'
                    : 'Seller Application Sent'}
                </h2>
                <p className="glass-form-subtitle">
                  Thanks, <strong>{pendingName}</strong>! Your application for{' '}
                  {pendingApprovalRole === 'delivery'
                    ? 'delivery partner verification'
                    : <strong>{form.businessName.trim() || 'your store'}</strong>}{' '}
                  is now under review by our admin team.
                </p>

                <ul className="glass-steps-list">
                  <li className="glass-step-item">
                    <CheckCircle2 size={16} color="#10b981" /> Registration & details received
                  </li>
                  <li className="glass-step-item">
                    <Clock size={16} color="#0d9488" /> Document & identity verification in progress
                  </li>
                  <li className="glass-step-item">
                    <Sparkles size={16} color="#64748b" /> Dashboard access unlocked upon approval
                  </li>
                </ul>

                <p className="muted small" style={{ marginBottom: 16 }}>
                  You will receive an activation email at <strong>{pendingApproval.email}</strong>.
                </p>

                <button
                  type="button"
                  className="glass-submit-btn"
                  onClick={onSwitchToLogin}
                >
                  Proceed to Log In
                </button>
              </div>
            ) : (
              /* Registration Form */
              <>
                <div className="glass-form-header">
                  <h2 className="glass-form-title">Create an account</h2>
                  <p className="glass-form-subtitle">
                    Join Eazy to discover exclusive products, sell items, or partner with us.
                  </p>
                </div>

                {/* Role Selector Tabs */}
                <div className="glass-role-selector">
                  <button
                    type="button"
                    className={`glass-role-tab ${form.role === 'customer' ? 'active' : ''}`}
                    onClick={() => set('role')('customer')}
                  >
                    <span>🛍️ Customer</span>
                  </button>
                  <button
                    type="button"
                    className={`glass-role-tab ${form.role === 'seller' ? 'active' : ''}`}
                    onClick={() => set('role')('seller')}
                  >
                    <span>🏪 Seller</span>
                  </button>
                  <button
                    type="button"
                    className={`glass-role-tab ${form.role === 'delivery' ? 'active' : ''}`}
                    onClick={() => set('role')('delivery')}
                  >
                    <span>🛵 Delivery</span>
                  </button>
                </div>

                {/* Google Quick Signup (for Customer role) */}
                {form.role === 'customer' && (
                  <>
                    <button
                      type="button"
                      className="glass-google-btn"
                      onClick={handleGoogleSignup}
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
                      <span>Sign up with Google</span>
                    </button>

                    <div className="glass-divider">
                      <span>or continue with email</span>
                    </div>
                  </>
                )}

                <form onSubmit={handleSubmit} className="glass-form" noValidate>
                  {/* Full Name */}
                  <div className="glass-field-group">
                    <label className="glass-field-label" htmlFor="reg-name">
                      Full Name
                    </label>
                    <div className="glass-input-wrapper">
                      <User size={17} className="glass-input-icon" />
                      <input
                        id="reg-name"
                        type="text"
                        value={form.name}
                        onChange={set('name')}
                        placeholder="Jane Doe"
                        required
                        autoComplete="name"
                        className={`glass-input ${fieldErrors.name ? 'error' : ''}`}
                      />
                    </div>
                    {fieldErrors.name && (
                      <span className="glass-field-error">{fieldErrors.name}</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="glass-field-group">
                    <label className="glass-field-label" htmlFor="reg-email">
                      Email Address
                    </label>
                    <div className="glass-input-wrapper">
                      <Mail size={17} className="glass-input-icon" />
                      <input
                        id="reg-email"
                        type="email"
                        value={form.email}
                        onChange={set('email')}
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

                  {/* Password */}
                  <div className="glass-field-group">
                    <label className="glass-field-label" htmlFor="reg-password">
                      Password
                    </label>
                    <div className="glass-input-wrapper">
                      <Lock size={17} className="glass-input-icon" />
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={set('password')}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        autoComplete="new-password"
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

                  {/* Seller Extra Fields */}
                  {isSeller && (
                    <>
                      <div className="glass-field-group">
                        <label className="glass-field-label" htmlFor="reg-business">
                          Store / Business Name
                        </label>
                        <div className="glass-input-wrapper">
                          <Store size={17} className="glass-input-icon" />
                          <input
                            id="reg-business"
                            type="text"
                            value={form.businessName}
                            onChange={set('businessName')}
                            placeholder="Aura Artisan Studio"
                            required
                            autoComplete="organization"
                            className={`glass-input ${fieldErrors.businessName ? 'error' : ''}`}
                          />
                        </div>
                        {fieldErrors.businessName && (
                          <span className="glass-field-error">{fieldErrors.businessName}</span>
                        )}
                      </div>

                      <div className="glass-field-group">
                        <label className="glass-field-label" htmlFor="reg-bus-type">
                          Business Structure
                        </label>
                        <div className="glass-input-wrapper">
                          <Building size={17} className="glass-input-icon" />
                          <select
                            id="reg-bus-type"
                            value={form.businessType}
                            onChange={set('businessType')}
                            className="glass-select"
                          >
                            <option value="individual">Individual Creator / Artisan</option>
                            <option value="partnership">Partnership Firm</option>
                            <option value="private_ltd">Private Limited Company</option>
                            <option value="llp">Limited Liability Partnership (LLP)</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Delivery Extra Fields */}
                  {isDelivery && (
                    <>
                      <div className="glass-field-group">
                        <label className="glass-field-label" htmlFor="reg-phone">
                          Phone Number
                        </label>
                        <div className="glass-input-wrapper">
                          <Phone size={17} className="glass-input-icon" />
                          <input
                            id="reg-phone"
                            type="tel"
                            value={form.phone}
                            onChange={set('phone')}
                            placeholder="9876543210"
                            required
                            autoComplete="tel"
                            className={`glass-input ${fieldErrors.phone ? 'error' : ''}`}
                          />
                        </div>
                        {fieldErrors.phone && (
                          <span className="glass-field-error">{fieldErrors.phone}</span>
                        )}
                      </div>

                      <div className="glass-field-group">
                        <label className="glass-field-label" htmlFor="reg-vehicle-type">
                          Vehicle Type
                        </label>
                        <div className="glass-input-wrapper">
                          <Truck size={17} className="glass-input-icon" />
                          <select
                            id="reg-vehicle-type"
                            value={form.vehicleType}
                            onChange={set('vehicleType')}
                            className={`glass-select ${fieldErrors.vehicleType ? 'error' : ''}`}
                          >
                            <option value="">— Select Vehicle Type —</option>
                            {VEHICLE_TYPES.map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        </div>
                        {fieldErrors.vehicleType && (
                          <span className="glass-field-error">{fieldErrors.vehicleType}</span>
                        )}
                      </div>

                      <div className="glass-field-group">
                        <label className="glass-field-label" htmlFor="reg-veh-num">
                          Vehicle Registration Number
                        </label>
                        <div className="glass-input-wrapper">
                          <FileText size={17} className="glass-input-icon" />
                          <input
                            id="reg-veh-num"
                            type="text"
                            value={form.vehicleNumber}
                            onChange={set('vehicleNumber')}
                            placeholder="KA-05-MJ-4831"
                            required
                            style={{ textTransform: 'uppercase' }}
                            className={`glass-input ${fieldErrors.vehicleNumber ? 'error' : ''}`}
                          />
                        </div>
                        {fieldErrors.vehicleNumber && (
                          <span className="glass-field-error">{fieldErrors.vehicleNumber}</span>
                        )}
                      </div>

                      <div className="glass-field-group">
                        <label className="glass-field-label" htmlFor="reg-lic-num">
                          Driving License Number
                        </label>
                        <div className="glass-input-wrapper">
                          <FileText size={17} className="glass-input-icon" />
                          <input
                            id="reg-lic-num"
                            type="text"
                            value={form.licenseNumber}
                            onChange={set('licenseNumber')}
                            placeholder="DL-0420110012345"
                            required
                            style={{ textTransform: 'uppercase' }}
                            className={`glass-input ${fieldErrors.licenseNumber ? 'error' : ''}`}
                          />
                        </div>
                        {fieldErrors.licenseNumber && (
                          <span className="glass-field-error">{fieldErrors.licenseNumber}</span>
                        )}
                      </div>

                      {/* Driving License Photo Drop-zone */}
                      <div className="glass-field-group">
                        <label className="glass-field-label">
                          Upload Driving License Photo
                        </label>
                        <div className="glass-file-upload-box">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLicenseChange}
                            required
                            className="glass-file-upload-input"
                          />
                          <div className="glass-file-upload-content">
                            <UploadCloud size={24} />
                            <span>Click to upload or drag & drop</span>
                            <span className="sub">PNG, JPG, or WEBP (Max 8MB)</span>
                            {licenseFile && (
                              <div className="glass-file-preview-badge">
                                <CheckCircle2 size={13} /> {licenseFile.name}
                              </div>
                            )}
                          </div>
                        </div>
                        {fieldErrors.licensePhoto && (
                          <span className="glass-field-error">{fieldErrors.licensePhoto}</span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Submit Button */}
                  <button
                    className="glass-submit-btn"
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Spinner small /> Creating account…
                      </>
                    ) : isSeller ? (
                      'Submit Seller Application'
                    ) : isDelivery ? (
                      'Submit Delivery Application'
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>

                <p className="glass-form-footer">
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="glass-link-btn"
                    onClick={onSwitchToLogin}
                  >
                    Sign in
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
