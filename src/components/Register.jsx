import { useState } from 'react'
import { register, registerDelivery, saveSession } from '../api.js'
import { useToast } from '../toast.js'
import Spinner from './Spinner.jsx'

const VEHICLE_TYPES = ['Bike', 'Scooter', 'Car', 'Van', 'Truck']

export default function Register({ onSwitchToLogin, onAuthed }) {
  const toast = useToast()
  const [pendingApproval, setPendingApproval] = useState(null)
  const [pendingApprovalRole, setPendingApprovalRole] = useState('seller')
  const [pendingName, setPendingName] = useState('')
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
    setForm((f) => ({ ...f, [key]: e.target.value }))
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

    // Show visible "required" messages instead of relying on native tooltips.
    const nextErrors = {}
    if (!form.name.trim()) {
      nextErrors.name = 'Full name is required.'
    }
    if (!form.email.trim()) {
      nextErrors.email = 'Email is required.'
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
      if (!form.vehicleType) nextErrors.vehicleType = 'Vehicle type is required.'
      if (!form.vehicleNumber.trim()) nextErrors.vehicleNumber = 'Vehicle number is required.'
      if (!form.licenseNumber.trim()) nextErrors.licenseNumber = 'Driving license number is required.'
      if (!licenseFile) nextErrors.licensePhoto = 'Please upload a photo of your driving license.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    // Customers/sellers go as JSON; delivery agents go as multipart/form-data
    // because the license photo has to be uploaded with the registration.
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

      // Sellers and delivery agents don't get a session yet — an admin must
      // approve them first.
      if (res.data?.requiresApproval) {
        setPendingApproval(res.data.user)
        setPendingApprovalRole(isDelivery ? 'delivery' : 'seller')
        setPendingName(form.name.trim())
        return
      }

      saveSession(res.data.user, res.data.accessToken)
      toast.success('✅ Registered successfully')
      onAuthed?.({ token: res.data.accessToken, user: res.data.user })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (pendingApproval) {
    const isAgent = pendingApprovalRole === 'delivery'
    return (
      <div className="card">
        <div className="card-emoji">{isAgent ? '🛵' : '⏳'}</div>
        <h2>{isAgent ? 'Delivery partner application sent' : 'Seller application sent'}</h2>
        <p className="card-sub">
          Thanks, {pendingName}! Your {isAgent ? 'documents' : 'application for'}
          {isAgent && <> are now awaiting admin verification.</>}
          {!isAgent && <>{' '}<strong>{form.businessName.trim() || 'your store'}</strong> is now awaiting admin approval.</>}
        </p>
        <ul className="pending-steps">
          <li>✅ Registration complete</li>
          <li>⏳ Admin {isAgent ? 'document verification' : 'approval'} — in progress</li>
          <li>🔒 Log in — unlocked after approval</li>
        </ul>
        <p className="muted small">
          We'll review your {isAgent ? 'vehicle details and driving license' : 'application'} shortly. Once approved, log in with
          <strong> {pendingApproval.email}</strong>{isAgent ? ' to start accepting deliveries.' : ' to open your seller dashboard.'}
        </p>
        <div className="card-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onSwitchToLogin}>
            Back to log in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-emoji">🛍️</div>
      <h2>Create your account</h2>
      <p className="card-sub">Join ShopSphere as a customer, seller or delivery agent.</p>

      <form onSubmit={handleSubmit} className="form">
        <label>
          Full name
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            placeholder="Jane Doe"
            required
            autoComplete="name"
          />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="jane@example.com"
            required
            autoComplete="email"
          />
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </label>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>

        <label>
          I want to
          <select value={form.role} onChange={set('role')}>
            <option value="customer">Shop as a customer</option>
            <option value="seller">Sell on ShopSphere (seller)</option>
            <option value="delivery">Deliver for ShopSphere (delivery agent)</option>
          </select>
        </label>

        {isSeller && (
          <>
            <label>
              Business name
              <input
                type="text"
                value={form.businessName}
                onChange={set('businessName')}
                placeholder="My Store Co."
                required
                autoComplete="organization"
              />
              {fieldErrors.businessName && <span className="field-error">{fieldErrors.businessName}</span>}
            </label>

            <label>
              Business type
              <select value={form.businessType} onChange={set('businessType')}>
                <option value="individual">Individual</option>
                <option value="partnership">Partnership</option>
                <option value="private_ltd">Private Ltd</option>
                <option value="llp">LLP</option>
              </select>
            </label>
          </>
        )}

        {isDelivery && (
          <>
            <label>
              Phone number
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="9876543210"
                required
                autoComplete="tel"
              />
              {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
            </label>

            <label>
              Vehicle type
              <select value={form.vehicleType} onChange={set('vehicleType')}>
                <option value="">— Select vehicle —</option>
                {VEHICLE_TYPES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              {fieldErrors.vehicleType && <span className="field-error">{fieldErrors.vehicleType}</span>}
            </label>

            <label>
              Vehicle number
              <input
                type="text"
                value={form.vehicleNumber}
                onChange={set('vehicleNumber')}
                placeholder="KA05MJ4831"
                required
                style={{ textTransform: 'uppercase' }}
              />
              {fieldErrors.vehicleNumber && <span className="field-error">{fieldErrors.vehicleNumber}</span>}
            </label>

            <label>
              Driving license number
              <input
                type="text"
                value={form.licenseNumber}
                onChange={set('licenseNumber')}
                placeholder="KA0520230001234"
                required
                style={{ textTransform: 'uppercase' }}
              />
              {fieldErrors.licenseNumber && <span className="field-error">{fieldErrors.licenseNumber}</span>}
            </label>

            <label>
              Driving license photo
              <input
                type="file"
                accept="image/*"
                onChange={handleLicenseChange}
                required
              />
              {licenseFile && (
                <span className="muted small">Selected: {licenseFile.name}</span>
              )}
              {fieldErrors.licensePhoto && <span className="field-error">{fieldErrors.licensePhoto}</span>}
            </label>
          </>
        )}

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting
            ? <><Spinner small /> Creating account…</>
            : isSeller ? 'Submit seller application'
              : isDelivery ? 'Submit delivery application'
                : 'Create account'}
        </button>
        {isSeller && (
          <p className="muted small" style={{ marginTop: 8 }}>
            Your application will be reviewed by an admin. You can log in once it's approved.
          </p>
        )}
        {isDelivery && (
          <p className="muted small" style={{ marginTop: 8 }}>
            Our team verifies your vehicle details and driving license. You can log in once approved —
            then orders are assigned to you automatically when you're on duty.
          </p>
        )}
      </form>

      <p className="card-foot">
        Already have an account?{' '}
        <button type="button" className="link" onClick={onSwitchToLogin}>
          Log in
        </button>
      </p>
    </div>
  )
}
