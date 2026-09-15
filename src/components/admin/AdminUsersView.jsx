import { useEffect, useState } from 'react'
import {
  adminGetUserStats, adminGetUsers, adminGetUser, adminUpdateUser, adminDeactivateUser, adminActivateUser,
} from '../../api.js'
import { useToast } from '../../toast.js'
import { formatDate } from '../../format.js'
import Loading from '../Loading.jsx'

const ROLES = ['', 'customer', 'seller', 'admin', 'support', 'delivery']
const ROLE_PLURAL = {
  customer: 'Customers', seller: 'Sellers', admin: 'Admins', support: 'Support', delivery: 'Delivery',
}

const ACTIVE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
  { value: 'requested', label: '📩 Reactivation requested' },
]

export default function AdminUsersView({ token }) {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [role, setRole] = useState('')
  const [isActive, setIsActive] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    adminGetUserStats(token)
      .then((res) => setStats(res.data))
      .catch((err) => { if (err.status !== 401) toast.error(err.message) })
  }, [token, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminGetUsers(token, {
      role: role || undefined,
      isActive: isActive === '' || isActive === 'requested' ? undefined : isActive,
      activationRequested: isActive === 'requested' ? 'true' : undefined,
      search: appliedSearch || undefined,
      page,
      limit: 20,
    })
      .then((res) => {
        if (cancelled) return
        setUsers(res.data || [])
        setPagination(res.pagination || null)
      })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, role, isActive, appliedSearch, page, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()) }

  const deactivate = async (u) => {
    if (!confirm(`Deactivate ${u.name} (${u.email})? They will be logged out and unable to sign in.`)) return
    try {
      await adminDeactivateUser(token, u._id)
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, isActive: false } : x)))
      toast.success(`${u.name} deactivated`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const reactivate = async (u) => {
    if (!confirm(`Reactivate ${u.name} (${u.email})? They will be able to log in again.`)) return
    try {
      await adminActivateUser(token, u._id)
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, isActive: true } : x)))
      toast.success(`${u.name} reactivated`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const roleCount = (r) => stats?.byRole?.find((x) => x._id === r)?.count ?? 0

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Total users</span>
          <span className="stat-num">{stats?.total ?? '—'}</span>
          <span className="stat-sub">{stats?.active ?? '—'} active · {stats?.inactive ?? '—'} inactive</span>
        </div>
        {ROLES.slice(1).map((r) => (
          <div className="stat-card" key={r}>
            <span className="stat-label">{ROLE_PLURAL[r]}</span>
            <span className="stat-num">{stats ? roleCount(r) : '—'}</span>
            <span className="stat-sub">
              <button type="button" className="btn-ghost" style={{ fontSize: 12, padding: 0 }}
                onClick={() => { setRole(r); setPage(1) }}>
                Filter →
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="filters">
        <form className="search-form" onSubmit={submitSearch}>
          <input type="search" placeholder="Search by name, email, or phone…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>

      <div className="filters-status">
        {ROLES.map((r) => (
          <button key={r || 'all-roles'} type="button"
            className={`chip-btn ${role === r ? 'active' : ''}`}
            onClick={() => { setRole(r); setPage(1) }}>
            {r ? ROLE_PLURAL[r] : 'All roles'}
          </button>
        ))}
        <span style={{ width: 10 }} />
        {ACTIVE_FILTERS.map((f) => (
          <button key={f.value || 'all-status'} type="button"
            className={`chip-btn ${isActive === f.value ? 'active' : ''}`}
            onClick={() => { setIsActive(f.value); setPage(1) }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading users…" />}

      {!loading && error && users.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load users. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">👥</div>
          <h2>No users found</h2>
          <p>Try a different role, status, or search term.</p>
        </div>
      )}

      {!loading && users.length > 0 && (
        <>
          <div className="orders-list">
            {users.map((u) => (
              <div className="order-card" key={u._id}>
                <div className="order-card-head">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="sidebar-avatar">
                      {(u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{u.name}</strong>
                      <p className="muted small">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                      <p className="muted small">Joined {formatDate(u.createdAt)}</p>
                    </div>
                  </div>
                  <div className="badges">
                    <span className="badge badge-status">{ROLE_PLURAL[u.role] || u.role}</span>
                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {!u.isActive && u.activationRequestedAt && (
                      <span className="badge badge-status">📩 Reactivation requested</span>
                    )}
                    {u.isEmailVerified && <span className="badge badge-muted">Email verified</span>}
                  </div>
                </div>
                <div className="order-card-foot">
                  <span className="muted small">
                    {u.role === 'admin' ? 'Full platform access' : `Role: ${u.role}`}
                  </span>
                  <div className="order-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingId(u._id)}>
                      View / edit
                    </button>
                    {u.isActive
                      ? <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => deactivate(u)}>Deactivate</button>
                      : <button type="button" className="btn btn-sm btn-primary" onClick={() => reactivate(u)}>
                          {u.activationRequestedAt ? 'Approve reactivation' : 'Reactivate'}
                        </button>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="page-info">Page {pagination.page} of {pagination.pages} · {pagination.total} users</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {editingId && (
        <UserModal
          token={token}
          userId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => setRefresh((r) => r + 1)}
        />
      )}
    </div>
  )
}

function UserModal({ token, userId, onClose, onSaved }) {
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    adminGetUser(token, userId)
      .then((res) => {
        if (cancelled) return
        setUser(res.data)
        setForm({
          name: res.data.name || '',
          phone: res.data.phone || '',
          role: res.data.role || 'customer',
          isActive: !!res.data.isActive,
        })
      })
      .catch((err) => { if (!cancelled && err.status !== 401) { setError(err.message); toast.error(err.message) } })
    return () => { cancelled = true }
  }, [token, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminUpdateUser(token, userId, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: form.role,
        isActive: form.isActive,
      })
      toast.success('User updated ✓')
      onSaved?.()
      onClose()
    } catch (err) {
      if (err.status !== 401) { setError(err.message); toast.error(err.message) }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {!user && !error && <Loading label="Loading user…" />}

        {user && form && (
          <>
            <h2>{user.name}</h2>
            <p className="muted small">{user.email} · Joined {formatDate(user.createdAt)}</p>
            <div className="badges" style={{ margin: '10px 0' }}>
              <span className="badge badge-status">{user.role}</span>
              <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {user.addresses?.length > 0 && (
              <>
                <h3 className="section-title">Saved addresses</h3>
                {user.addresses.map((a, i) => (
                  <p className="muted small" key={i} style={{ margin: '2px 0' }}>
                    {a.label}: {a.fullName} · {a.phone} · {a.street}, {a.pincode}
                  </p>
                ))}
              </>
            )}

            <h3 className="section-title">Edit user</h3>
            <form onSubmit={save} className="form">
              <label>
                Name
                <input value={form.name} onChange={set('name')} />
              </label>
              <label>
                Phone
                <input value={form.phone} onChange={set('phone')} placeholder="Phone" />
              </label>
              <label>
                Role
                <select className="select" value={form.role} onChange={set('role')}>
                  {ROLES.slice(1).map((r) => (
                    <option key={r} value={r}>{ROLE_PLURAL[r] || r}</option>
                  ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
                Account active (user can sign in)
              </label>

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>Save changes</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
