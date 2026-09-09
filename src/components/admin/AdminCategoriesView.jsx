import { useEffect, useState } from 'react'
import {
  adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
} from '../../api.js'
import { useToast } from '../../toast.js'
import Loading from '../Loading.jsx'

const ATTR_TYPES = ['text', 'number', 'select', 'multi-select', 'boolean']

// Sort flat categories into a stable tree order (parents before children).
const sortTree = (categories) => {
  const byParent = new Map()
  for (const c of categories) {
    const key = c.parentCategory?._id || c.parentCategory || null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(c)
  }
  const out = []
  const walk = (parentId, depth) => {
    const children = (byParent.get(parentId) || [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    for (const c of children) {
      out.push({ ...c, depth })
      walk(c._id, depth + 1)
    }
  }
  walk(null, 0)
  // Orphans (deleted/invalid parents) go at the end so nothing disappears.
  for (const c of categories) {
    if (!out.some((x) => x._id === c._id)) out.push({ ...c, depth: 0 })
  }
  return out
}

export default function AdminCategoriesView({ token }) {
  const toast = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState(null) // 'new' | category object

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminGetCategories(token, { includeInactive: 'true' })
      .then((res) => { if (!cancelled) setCategories(res.data || []) })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  const tree = sortTree(categories)

  const toggleActive = async (c) => {
    try {
      await adminUpdateCategory(token, c._id, { isActive: !c.isActive })
      toast.success(`${c.name} ${c.isActive ? 'deactivated' : 'activated'}`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const toggleFeatured = async (c) => {
    try {
      await adminUpdateCategory(token, c._id, { isFeatured: !c.isFeatured })
      toast.success(`${c.name} ${c.isFeatured ? 'unfeatured' : 'featured'}`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const remove = async (c) => {
    if (!confirm(`Delete "${c.name}"? Categories with subcategories can't be deleted.`)) return
    try {
      await adminDeleteCategory(token, c._id)
      toast.success('Category deleted')
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="filters">
        <p className="muted small" style={{ margin: 0, flex: 1 }}>
          {categories.length} categories · Top-level categories can have subcategories. Attributes become the template sellers fill in for products.
        </p>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          + New category
        </button>
      </div>

      {loading && <Loading label="Loading categories…" />}

      {!loading && error && categories.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load categories. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🗂️</div>
          <h2>No categories yet</h2>
          <p>Create your first category — sellers need at least one before they can list products.</p>
        </div>
      )}

      {!loading && tree.length > 0 && (
        <div className="orders-list">
          {tree.map((c) => (
            <div className="order-card" key={c._id} style={{ marginLeft: c.depth * 24 }}>
              <div className="order-card-head">
                <div>
                  <strong>{'↳ '.repeat(c.depth > 0 ? 1 : 0)}{c.name}</strong>
                  <p className="muted small">
                    /{c.slug} · Level {c.level}{c.parentCategory?.name ? ` · under ${c.parentCategory.name}` : ''}
                    {c.attributes?.length ? ` · ${c.attributes.length} attribute${c.attributes.length === 1 ? '' : 's'}` : ''}
                  </p>
                  {c.description && <p className="muted small">{c.description}</p>}
                </div>
                <div className="badges">
                  <span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {c.isFeatured && <span className="badge badge-status">⭐ Featured</span>}
                </div>
              </div>
              <div className="order-card-foot">
                <span className="muted small">Sort order: {c.sortOrder ?? 0}</span>
                <div className="order-actions">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => toggleFeatured(c)}>
                    {c.isFeatured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => toggleActive(c)}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(c)}>Edit</button>
                  <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => remove(c)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <CategoryModal
          token={token}
          category={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => setRefresh((r) => r + 1)}
        />
      )}
    </div>
  )
}

function CategoryModal({ token, category, categories, onClose, onSaved }) {
  const toast = useToast()
  const isEdit = Boolean(category)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({
    name: category?.name || '',
    description: category?.description || '',
    parentCategory: category?.parentCategory?._id || category?.parentCategory || '',
    sortOrder: category?.sortOrder ?? 0,
    isFeatured: !!category?.isFeatured,
    isActive: category ? !!category.isActive : true,
    attributes: (category?.attributes || []).map((a) => ({ ...a })),
  }))

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }

  const addAttribute = () => {
    setForm((f) => ({
      ...f,
      attributes: [...f.attributes, { name: '', type: 'text', options: [], isRequired: false }],
    }))
  }

  const patchAttribute = (i, patch) => {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.map((a, j) => (j === i ? { ...a, ...patch } : a)),
    }))
  }

  const removeAttribute = (i) => {
    setForm((f) => ({ ...f, attributes: f.attributes.filter((_, j) => j !== i) }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Category name is required'); return }

    const attributes = form.attributes
      .filter((a) => a.name.trim())
      .map((a) => ({
        name: a.name.trim(),
        type: a.type,
        options: ['select', 'multi-select'].includes(a.type)
          ? (Array.isArray(a.options) ? a.options : String(a.options || '').split(',').map((o) => o.trim()).filter(Boolean))
          : [],
        isRequired: !!a.isRequired,
      }))

    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      isFeatured: form.isFeatured,
      attributes,
    }
    if (isEdit) {
      body.isActive = form.isActive
      body.parentCategory = form.parentCategory || null
    } else if (form.parentCategory) {
      body.parentCategory = form.parentCategory
    }

    setSaving(true)
    setError('')
    try {
      if (isEdit) await adminUpdateCategory(token, category._id, body)
      else await adminCreateCategory(token, body)
      toast.success(isEdit ? 'Category updated ✓' : 'Category created ✓')
      onSaved?.()
      onClose()
    } catch (err) {
      if (err.status !== 401) { setError(err.message); toast.error(err.message) }
    } finally {
      setSaving(false)
    }
  }

  // Prevent picking itself (edit) as a parent.
  const parentOptions = categories.filter((c) => c._id !== category?._id)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>{isEdit ? `Edit “${category.name}”` : 'New category'}</h2>

        <form onSubmit={submit} className="form">
          <label>
            Name *
            <input value={form.name} onChange={set('name')} placeholder="Electronics" />
          </label>

          <label>
            Description
            <textarea value={form.description} onChange={set('description')} rows={2}
              placeholder="What kinds of products belong here?" />
          </label>

          <div className="address-grid">
            <label>
              Parent category
              <select className="select" value={form.parentCategory} onChange={set('parentCategory')}>
                <option value="">None (top-level)</option>
                {parentOptions.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              Sort order
              <input type="number" value={form.sortOrder} onChange={set('sortOrder')} />
            </label>
          </div>

          <label className="checkbox-row">
            <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} />
            Featured category (shown prominently on the storefront)
          </label>

          {isEdit && (
            <label className="checkbox-row">
              <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
              Active (visible to sellers and customers)
            </label>
          )}

          <div className="fieldset">
            <div className="panel-head">
              <p className="fieldset-title" style={{ margin: 0 }}>Attribute template</p>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addAttribute}>+ Add attribute</button>
            </div>
            <p className="muted small">
              Sellers fill these in when creating products — e.g. size, color, warranty. Select/multi-select attributes need options.
            </p>
            {form.attributes.length === 0 && <p className="muted small">No attributes yet.</p>}
            {form.attributes.map((a, i) => (
              <div key={i} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="address-grid">
                  <input placeholder="Attribute name (e.g. Color)" value={a.name}
                    onChange={(e) => patchAttribute(i, { name: e.target.value })} />
                  <select className="select" value={a.type}
                    onChange={(e) => patchAttribute(i, { type: e.target.value })}>
                    {ATTR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {['select', 'multi-select'].includes(a.type) && (
                  <input placeholder="Options, comma separated (Red, Blue, Green)"
                    value={Array.isArray(a.options) ? a.options.join(', ') : (a.options || '')}
                    onChange={(e) => patchAttribute(i, { options: e.target.value })} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="checkbox-row" style={{ margin: 0 }}>
                    <input type="checkbox" checked={!!a.isRequired}
                      onChange={(e) => patchAttribute(i, { isRequired: e.target.checked })} />
                    Required
                  </label>
                  <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => removeAttribute(i)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {isEdit ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
