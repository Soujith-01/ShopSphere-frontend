import { useState } from 'react'
import { useToast } from '../../toast.js'

const VEHICLE_OPTIONS = ['', 'Bike', 'Scooter', 'Car', 'Van', 'Truck']

// Partner profile: on/off-duty availability + vehicle type. Both are stored on
// the user's deliveryPartner sub-document via PUT /delivery/profile.
export default function DeliveryProfileView({ partner, onSave }) {
  const toast = useToast()
  const dp = partner?.deliveryPartner || {}
  const [isAvailable, setIsAvailable] = useState(dp.isAvailable ?? false)
  const [vehicleType, setVehicleType] = useState(dp.vehicleType || '')
  const [saving, setSaving] = useState(false)

  const toggleAvailability = async () => {
    const next = !isAvailable
    setSaving(true)
    try {
      await onSave({ isAvailable: next })
      setIsAvailable(next)
      toast.success(next ? 'You went online 🚚' : 'You went offline. Have a good rest!')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveVehicle = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ vehicleType: vehicleType.trim() })
      toast.success('Vehicle type updated')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-layout">
      <section className="panel">
        <div className="panel-head">
          <h2>Availability</h2>
          <span className={`badge ${isAvailable ? 'badge-success' : 'badge-muted'}`}>
            {isAvailable ? 'On duty' : 'Off duty'}
          </span>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          {isAvailable
            ? 'You’re online — available shipments will appear in the Available tab.'
            : 'You’re offline. Flip this switch when you’re ready to accept shipments.'}
        </p>
        <button
          type="button"
          className={`btn ${isAvailable ? 'btn-secondary' : 'btn-primary'}`}
          disabled={saving}
          onClick={toggleAvailability}
        >
          {saving ? 'Updating…' : isAvailable ? 'Go offline' : 'Go online'}
        </button>
      </section>

      <section className="panel">
        <h2>Profile</h2>
        <form className="form" onSubmit={saveVehicle}>
          <label>
            Name
            <input type="text" value={partner?.name || ''} disabled />
          </label>
          <label>
            Email
            <input type="email" value={partner?.email || ''} disabled />
          </label>
          <label>
            Vehicle type
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
              {VEHICLE_OPTIONS.map((v) => (
                <option key={v} value={v}>{v || '— Select vehicle —'}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>
    </div>
  )
}
