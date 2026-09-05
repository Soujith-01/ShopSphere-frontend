import { useEffect, useState } from 'react'
import {
  getCustomerMe, updateCustomerMe,
  addAddress, updateAddress, deleteAddress, setDefaultAddress,
} from '../../api.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'

export default function ProfileView({ token }) {
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [addressForm, setAddressForm] = useState(null) // null | {} -> show add form
  const [error, setError] = useState('')

  // Surface load failures as a toast; the content area shows a fallback state.
  useEffect(() => {
    if (error) toast.error(error)
  }, [error, toast])

  const load = async () => {
    const res = await getCustomerMe(token)
    setUser(res.data)
    setForm({ name: res.data.name || '', phone: res.data.phone || '' })
  }

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    try {
      const res = await updateCustomerMe(token, { name: form.name.trim(), phone: form.phone.trim() })
      setUser(res.data)
      toast.success('Profile updated ✓')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleSaveAddress = async (e) => {
    e.preventDefault()
    const isEdit = Boolean(addressForm._id)
    try {
      if (isEdit) {
        await updateAddress(token, addressForm._id, addressForm)
      } else {
        await addAddress(token, addressForm)
      }
      setAddressForm(null)
      toast.success(isEdit ? 'Address updated' : 'Address added')
      await load()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleDeleteAddress = async (a) => {
    if (!confirm(`Delete address for ${a.fullName}?`)) return
    try {
      await deleteAddress(token, a._id)
      toast.success('Address deleted')
      await load()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleDefault = async (a) => {
    try {
      await setDefaultAddress(token, a._id)
      toast.success('Default address updated')
      await load()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  if (loading) return <Loading label="Loading your profile…" />

  if (!user) {
    return (
      <div className="empty-state">
        <div className="empty-emoji">⚠️</div>
        <h2>Couldn't load your profile</h2>
        <p>Please try again in a moment.</p>
      </div>
    )
  }

  return (
    <div className="profile-layout">
      <section className="panel">
        <h2>Profile</h2>
        <form className="form" onSubmit={handleSaveProfile}>
          <label>
            Name
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label>
            Phone
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91…" />
          </label>
          <label>
            Email
            <input type="email" value={user.email} disabled />
          </label>
          <button type="submit" className="btn btn-primary">Save changes</button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Addresses</h2>
          {!addressForm && (
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAddressForm({ label: 'Home', fullName: form.name || '', phone: form.phone || '', street: '', pincode: '', isDefault: false })}>
              + Add address
            </button>
          )}
        </div>

        {user.addresses?.length === 0 && !addressForm && (
          <p className="muted">No addresses yet. Add one to speed up checkout.</p>
        )}

        {addressForm && (
          <form className="form address-form" onSubmit={handleSaveAddress}>
            <div className="address-grid">
              <input placeholder="Label (Home/Work)" value={addressForm.label || ''} required
                onChange={(e) => setAddressForm((a) => ({ ...a, label: e.target.value }))} />
              <input placeholder="Full name" value={addressForm.fullName || ''} required
                onChange={(e) => setAddressForm((a) => ({ ...a, fullName: e.target.value }))} />
              <input placeholder="Phone" value={addressForm.phone || ''} required
                onChange={(e) => setAddressForm((a) => ({ ...a, phone: e.target.value }))} />
              <input placeholder="Street / area / city" value={addressForm.street || ''} required
                onChange={(e) => setAddressForm((a) => ({ ...a, street: e.target.value }))} />
              <input placeholder="Pincode" value={addressForm.pincode || ''} required
                onChange={(e) => setAddressForm((a) => ({ ...a, pincode: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-sm btn-primary">Save address</button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAddressForm(null)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="address-list">
          {user.addresses?.map((a) => (
            <div className={`address-option read-only ${a.isDefault ? 'active' : ''}`} key={a._id}>
              <div className="address-info">
                <strong>{a.label}</strong> · {a.fullName} · {a.phone}
                <p className="muted small">{a.street}, {a.pincode}</p>
                {a.isDefault && <span className="badge badge-status">Default</span>}
              </div>
              <div className="address-actions">
                {!a.isDefault && (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => handleDefault(a)}>Set default</button>
                )}
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAddressForm({ ...a })}>Edit</button>
                <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => handleDeleteAddress(a)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}