import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getCategories, getProductReviews,
  sellerCreateProduct, sellerUpdateProduct, sellerUpdateProductStock,
  sellerGetProducts, sellerGetProduct, sellerDeleteProduct, sellerSubmitProduct,
  sellerSyncFromSheet, sellerGetSheets,
  sellerCreateVariant, sellerUpdateVariant, sellerDeleteVariant,
  sellerDiscardImages, sellerUploadImage,
  generateDescriptionAI, chatDescriptionAI,
} from '../../api.js'
import ImageEditorPicker from './ImageEditorPicker.jsx'
import { downscaleImageFile } from '../../imageResize.js'
import { useToast } from '../../toast.js'
import { formatINR, formatDate, PRODUCT_STATUS_LABELS, productStatusFlavor, productImageUrl, getDiscountLabel } from '../../format.js'
import Loading from '../Loading.jsx'
import Spinner from '../Spinner.jsx'

const STATUS_FILTERS = ['', 'draft', 'pending', 'active', 'inactive', 'rejected']

export default function SellerProductsView({ token, store }) {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState(null) // product id or 'new'
  const [reviewsFor, setReviewsFor] = useState(null)
  const [restockItem, setRestockItem] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [sheetsInfo, setSheetsInfo] = useState(null)

  useEffect(() => {
    let cancelled = false
    sellerGetSheets(token)
      .then((res) => { if (!cancelled) setSheetsInfo(res.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [token, refresh])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await sellerGetProducts(token, {
        status: status || undefined, search: appliedSearch || undefined, page, limit: 12,
      })
      setProducts(res.data || [])
      setPagination(res.pagination || null)
    } catch (err) {
      if (err.status !== 401) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token, status, appliedSearch, page, refresh]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  const submitSearch = (e) => { e.preventDefault(); setPage(1); setAppliedSearch(search.trim()) }

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"? Drafts are removed permanently; live items are deactivated.`)) return
    try {
      await sellerDeleteProduct(token, p._id)
      toast.success('Product deleted')
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  const handleSubmitReview = async (p) => {
    try {
      const res = await sellerSubmitProduct(token, p._id)
      toast.success(res.message || `"${p.name}" submitted for review`)
      setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  // Pull the seller's Google Sheet back in: new rows become products, edited
  // rows (price, stock, …) update products that already exist.
  const handleSyncFromSheet = async () => {
    setSyncing(true)
    try {
      const res = await sellerSyncFromSheet(token)
      const { imported = [], updated = [], errors = [] } = res.data || {}
      const summary = [
        imported.length ? `${imported.length} added` : '',
        updated.length ? `${updated.length} updated` : '',
      ].filter(Boolean).join(' · ')

      if (errors.length) {
        toast.error(`Synced with ${errors.length} problem row${errors.length === 1 ? '' : 's'}: ${errors[0].reason}`)
      } else if (summary) {
        toast.success(`Google Sheet synced — ${summary}`)
      } else {
        toast.success('Already up to date with your Google Sheet')
      }

      if (imported.length || updated.length) setRefresh((r) => r + 1)
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const spreadsheetUrl =
    sheetsInfo?.spreadsheetUrl ||
    store?.googleSheet?.spreadsheetUrl ||
    (store?.googleSheet?.spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${store.googleSheet.spreadsheetId}/edit`
      : 'https://docs.google.com/spreadsheets/d/19Mxj2xBBfUDo1Kd1BJmy7frN_mDi9QnyPvIJ7IBX1nk/edit')

  return (
    <div>
      <div className="filters">
        <form className="search-form" onSubmit={submitSearch}>
          <input type="search" placeholder="Search products…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>
          + New product
        </button>
        {spreadsheetUrl ? (
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            title="Open your store Google Spreadsheet in a new tab"
          >
            📊 Open Google Sheet ↗
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => toast.info('Google Sheet is being provisioned for your store. Visit the My Store tab to view or reshare.')}
            title="Open Google Sheet"
          >
            📊 Open Google Sheet
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleSyncFromSheet}
          disabled={syncing}
          title="Create products from new rows in your Google Sheet and apply your edits to existing ones"
        >
          {syncing ? <><Spinner small /> Syncing…</> : '🔄 Sync from Google Sheet'}
        </button>
      </div>

      <div className="filters-status">
        {STATUS_FILTERS.map((s) => (
          <button key={s || 'all'} type="button"
            className={`chip-btn ${status === s ? 'active' : ''}`}
            onClick={() => { setStatus(s); setPage(1) }}>
            {s ? PRODUCT_STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      {loading && <Loading label="Loading products…" />}

      {!loading && error && products.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">⚠️</div>
          <p>Couldn't load products. Please try again in a moment.</p>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🛍️</div>
          <h2>No products {status ? `with status “${PRODUCT_STATUS_LABELS[status]}”` : 'yet'}</h2>
          <p>{status || appliedSearch ? 'Try a different filter.' : 'Add your first product — it goes live for customers as soon as you create it.'}</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <div className="orders-list">
            {products.map((p) => (
              <div className="order-card" key={p._id}>
                <div className="order-card-head">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="cart-item-media" style={{ position: 'relative' }}>
                      {getDiscountLabel(p.discount) && (
                        <span className="product-discount-badge seller-discount-badge" aria-label={`Discount: ${getDiscountLabel(p.discount)}`}>
                          {getDiscountLabel(p.discount)}
                        </span>
                      )}
                      {productImageUrl(p)
                        ? <img src={productImageUrl(p)} alt={p.name} />
                        : <div className="img-ph">📦</div>}
                    </div>
                    <div>
                      <strong>{p.name}</strong>
                      <p className="muted small">{p.category?.name || 'Uncategorised'} · {formatINR(p.price)}</p>
                      <p className="muted small">★ {p.stats?.avgRating || 'No'} rating{p.stats?.totalReviews ? ` · ${p.stats.totalReviews} review${p.stats.totalReviews === 1 ? '' : 's'}` : ''}</p>
                      {p.rejectionReason && <p className="muted small" style={{ color: 'var(--danger)' }}>Rejected: {p.rejectionReason}</p>}
                    </div>
                  </div>
                  <div className="badges">
                    <span className={`badge badge-${productStatusFlavor(p.status)}`}>{PRODUCT_STATUS_LABELS[p.status] || p.status}</span>
                    {p.stock !== undefined && (
                      <span className={`badge ${p.stock <= 0 ? 'badge-danger' : p.stock <= 5 ? 'badge-warning' : 'badge-success'}`}>
                        {p.stock <= 0 ? '⛔ Out of stock' : p.stock <= 5 ? `⚠️ Low stock: ${p.stock}` : `📦 ${p.stock} in stock`}
                      </span>
                    )}
                    {getDiscountLabel(p.discount) && <span className="badge badge-success">{getDiscountLabel(p.discount)}</span>}
                    {p.stats?.totalSold > 0 && <span className="badge badge-muted">{p.stats.totalSold} sold</span>}
                    {p.hasVariants && <span className="badge badge-muted">Variants</span>}
                    {p.stats?.totalReviews > 0 && <span className="badge badge-status">{p.stats.totalReviews} reviews</span>}
                  </div>
                </div>
                <div className="order-card-foot">
                  <span className="muted small">Updated {new Date(p.updatedAt).toLocaleDateString('en-IN')}</span>
                  <div className="order-actions">
                    {['draft', 'rejected'].includes(p.status) && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => handleSubmitReview(p)}>Submit for review</button>
                    )}
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRestockItem(p)}>
                      Restock
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setReviewsFor(p)}>
                      {p.stats?.totalReviews > 0 ? 'View reviews' : 'Reviews'}
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(p._id)}>Edit</button>
                    <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(p)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}>← Prev</button>
              <span className="page-info">Page {pagination.page} of {pagination.pages}</span>
              <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {editing && (
        <ProductEditor
          token={token}
          store={store}
          productId={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setRefresh((r) => r + 1)}
        />
      )}

      {reviewsFor && (
        <ReviewsModal product={reviewsFor} token={token} onClose={() => setReviewsFor(null)} />
      )}

      {restockItem && (
        <RestockModal
          product={restockItem}
          token={token}
          onClose={() => setRestockItem(null)}
          onRestocked={() => {
            setRestockItem(null)
            setRefresh((r) => r + 1)
          }}
        />
      )}
    </div>
  )
}

function flattenCategories(categories, depth = 0) {
  const out = []
  for (const c of categories) {
    out.push({ ...c, depth })
    if (c.children?.length) out.push(...flattenCategories(c.children, depth + 1))
  }
  return out
}

const AI_QUICK_PROMPTS = [
  'Make this description shorter',
  'Make it more professional',
  'Add key selling points',
  'Make it SEO friendly',
  'Rewrite it in simple language',
  'Generate bullet-point highlights',
]

function ProductEditor({ token, store, productId, onClose, onSaved }) {
  const toast = useToast()
  const [detail, setDetail] = useState(null) // null until loaded for edits
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(null)
  const [images, setImages] = useState([])
  const [variants, setVariants] = useState([]) // backend variants + temp new rows
  const [hasVariants, setHasVariants] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // AI description assistant state
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiStatus, setAiStatus] = useState('idle') // 'idle' | 'success' | 'error'
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  // Photo-upload state. One busy flag per source (device, gallery picker, camera
  // picker) so the form can block submission while any upload is in flight.
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [galleryBusy, setGalleryBusy] = useState(false)
  const [cameraBusy, setCameraBusy] = useState(false)
  const [replaceIndex, setReplaceIndex] = useState(null)
  // Cloudinary ids uploaded since the last successful save. If the seller closes
  // the form without saving we ask the backend to delete them, so an abandoned
  // form never leaves orphaned photos behind.
  const sessionUploadsRef = useRef([])
  const replaceInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const busyUploading = uploading || galleryBusy || cameraBusy

  const isEdit = Boolean(productId)

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) {
      setForm({
        name: '', description: '', price: '', stock: '', discountType: '', discountValue: '',
        category: '', subCategory: '', tags: '', weight: '', shippingCost: '', freeShipping: false,
      })
      return
    }
    let cancelled = false
    sellerGetProduct(token, productId)
      .then((res) => {
        if (cancelled) return
        const p = res.data
        setDetail(p)
        setForm({
          name: p.name || '', description: p.description || '', price: p.price ?? '',
          stock: p.stock ?? '',
          discountType: p.discount?.type || '', discountValue: p.discount?.value ?? '',
          category: p.category?._id || p.category || '', subCategory: p.subCategory?._id || p.subCategory || '',
          tags: (p.tags || []).join(', '), weight: p.shipping?.weight ?? '',
          shippingCost: p.shipping?.shippingCost ?? '', freeShipping: !!p.shipping?.freeShipping,
        })
        setImages(
          [...(p.images || [])]
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((i) => ({ url: i.url, publicId: i.publicId || '' }))
        )
        setHasVariants(!!p.hasVariants)
        setVariants((p.variants || []).map((v) => ({ ...v, sku: v.sku || '', label: v.label || '' })))
      })
      .catch((err) => {
        if (!cancelled && err.status !== 401) { setError(err.message); toast.error(err.message) }
      })
    return () => { cancelled = true }
  }, [productId, token, isEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    if (key === 'category') setForm((f) => ({ ...f, subCategory: '' }))
    if (key === 'description') setAiStatus('idle')
  }

  // Current product fields in the shape the AI endpoints expect.
  const currentProductContext = () => {
    const cat = flatCats.find((c) => c._id === form?.category)
    const sub = selectedCat?.children?.find((c) => c._id === form?.subCategory)
    const tags = (form?.tags || '').split(',').map((t) => t.trim()).filter(Boolean)
    return {
      name: form?.name || '',
      category: cat?.name || '',
      subCategory: sub?.name || '',
      description: form?.description || '',
      brand: '',
      attributes: variants.filter((v) => v.label?.trim()).map((v) => ({ name: 'Variant', value: v.label.trim() })),
      features: tags,
      tags,
      variants: variants.filter((v) => v.label?.trim() || v.sku?.trim())
        .map((v) => ({ label: v.label || '', sku: v.sku || '' })),
      imageUrl: images.find((i) => i?.url)?.url || '',
    }
  }

  const handleGenerate = async () => {
    if (!form?.name.trim()) {
      toast.error('Add a product name first, then generate a description')
      return
    }
    setAiGenerating(true)
    setAiStatus('idle')
    try {
      const ctx = currentProductContext()
      const res = await generateDescriptionAI(token, {
        name: ctx.name,
        category: ctx.category,
        attributes: ctx.attributes,
        features: ctx.features,
        tags: ctx.tags,
        imageUrl: ctx.imageUrl || undefined,
      })
      setForm((f) => ({ ...f, description: res.data.description }))
      setAiStatus('success')
      toast.success('Description generated — review and edit before saving ✓')
    } catch (err) {
      if (err.status !== 401) {
        setAiStatus('error')
        toast.error(err.message || 'Could not generate description. Try again.')
      }
    } finally {
      setAiGenerating(false)
    }
  }

  const handleChatSend = async (text) => {
    const msg = String(text || '').trim()
    if (!msg || chatBusy) return
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }])
    setChatInput('')
    setChatBusy(true)
    try {
      const ctx = currentProductContext()
      const res = await chatDescriptionAI(token, {
        message: msg,
        product: {
          name: ctx.name,
          category: ctx.category,
          description: ctx.description,
          brand: ctx.brand,
          attributes: ctx.attributes,
          features: ctx.features,
          tags: ctx.tags,
        },
        history: chatMessages.slice(-10),
        imageUrl: ctx.imageUrl || undefined,
      })
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      if (err.status !== 401) {
        toast.error(err.message || 'AI could not respond. Try again.')
        setChatMessages((prev) => [...prev, { role: 'assistant', content: '⚠️ Sorry, I could not respond right now. Please try again.' }])
      }
    } finally {
      setChatBusy(false)
    }
  }

  const applyToDescription = (text) => {
    setForm((f) => ({ ...f, description: String(text || '').trim() }))
    setAiStatus('idle')
    toast.success('Added to description — review before saving')
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [chatMessages, chatBusy])

  const flatCats = useMemo(() => flattenCategories(categories), [categories])
  const selectedCat = categories.find((c) => c._id === form?.category)
  const subCats = selectedCat?.children || []

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      { _temp: `new-${Date.now()}`, label: '', sku: '', price: '', stock: '', lowStockThreshold: 5, isNew: true },
    ])
  }

  const patchVariant = (id, patch) => {
    setVariants((prev) => prev.map((v) => (v._id === id || v._temp === id ? { ...v, ...patch } : v)))
  }

  const removeVariant = async (v) => {
    if (v.isNew || !v._id) {
      setVariants((prev) => prev.filter((x) => x._temp !== v._temp))
      return
    }
    if (!confirm('Delete this variant?')) return
    try {
      await sellerDeleteVariant(token, productId, v._id)
      toast.success('Variant deleted')
      setVariants((prev) => prev.filter((x) => x._id !== v._id))
    } catch (err) {
      if (err.status !== 401) toast.error(err.message)
    }
  }

  // One file → compressed in the browser → posted to the API (which streams it
  // to Cloudinary) → { url, publicId } kept in the product's image list.
  const uploadOne = async (file) => {
    const prepared = await downscaleImageFile(file)
    const res = await sellerUploadImage(token, prepared)
    const uploaded = res?.data
    if (!uploaded?.url) throw new Error('Upload failed — please try again')
    if (uploaded.publicId) sessionUploadsRef.current.push(uploaded.publicId)
    return { url: uploaded.url, publicId: uploaded.publicId || '' }
  }

  // Upload several files one at a time so progress is visible and one bad photo
  // doesn't lose the rest.
  const uploadFiles = async (files) => {
    if (!files.length) return []
    setUploading(true)
    const uploaded = []
    try {
      for (let i = 0; i < files.length; i += 1) {
        setUploadProgress(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : 'Uploading photo…')
        try {
          uploaded.push(await uploadOne(files[i]))
        } catch (err) {
          if (err.status === 401) throw err // session expired — stop the batch
          toast.error(`${files[i].name || 'Photo'}: ${err.message}`)
        }
      }

      if (uploaded.length) {
        setImages((prev) => [...prev, ...uploaded])
        toast.success(uploaded.length === 1 ? 'Photo uploaded ✓' : `${uploaded.length} photos uploaded ✓`)
      }
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
    return uploaded
  }

  const handlePickPhotos = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    uploadFiles(files)
  }

  // Replace one photo in place, keeping its position in the gallery. The old
  // Cloudinary asset is deleted by the backend once the product update is saved.
  const handleReplaceFile = async (e) => {
    const file = (e.target.files || [])[0]
    e.target.value = ''
    const index = replaceIndex
    setReplaceIndex(null)
    if (!file || index === null) return

    setUploading(true)
    setUploadProgress('Uploading replacement…')
    try {
      const uploaded = await uploadOne(file)
      setImages((prev) => prev.map((img, i) => (i === index ? uploaded : img)))
      toast.success('Photo replaced ✓ — the old one is removed when you save')
    } catch (err) {
      if (err.status !== 401) toast.error(err.message || 'Could not replace that photo')
    } finally {
      setUploading(false)
      setUploadProgress('')
    }
  }

  // Photos the pickers uploaded that no product references yet — clean them up
  // when the form is closed without saving.
  const discardSessionUploads = () => {
    const publicIds = sessionUploadsRef.current
    sessionUploadsRef.current = []
    if (publicIds.length) sellerDiscardImages(token, publicIds).catch(() => {})
  }

  const handleClose = () => {
    discardSessionUploads()
    onClose()
  }

  // Photos that came back from the crop / gallery / camera pickers.
  const addPickedImages = (added = []) => {
    added.forEach((img) => {
      if (img?.publicId) sessionUploadsRef.current.push(img.publicId)
    })
    setImages((prev) => [...prev, ...added])
  }

  const moveImage = (index, delta) => {
    setImages((prev) => {
      const target = index + delta
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(target, 0, item)
      return copy
    })
  }

  const setAsCover = (index) => {
    if (index === 0) return
    setImages((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.unshift(item)
      return copy
    })
    toast.success('Cover photo updated ✓')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (busyUploading) {
      toast.error('Please wait for the photos to finish uploading')
      return
    }
    if (!form.name.trim() || form.price === '' || !form.category) {
      toast.error('Name, price, and category are required')
      return
    }
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0 || !Number.isInteger(Number(form.stock))) {
      toast.error('Stock quantity is required and must be a non-negative integer (e.g. 0, 1, 10)')
      return
    }

    setSaving(true)
    setError('')
    const base = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.category,
      subCategory: form.subCategory || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      images: images.filter((i) => i?.url),
      discount: form.discountType && Number(form.discountValue) > 0
        ? { type: form.discountType, value: Number(form.discountValue) } : {},
      shipping: {
        weight: Number(form.weight) || 0,
        freeShipping: !!form.freeShipping,
        shippingCost: Number(form.shippingCost) || 0,
      },
      hasVariants,
      variantOptions: hasVariants
        ? [{ name: 'Option', values: variants.map((v) => v.label).filter(Boolean) }] : [],
    }
    if (!isEdit) base.store = store?._id

    try {
      let pid = productId
      if (isEdit) {
        await sellerUpdateProduct(token, pid, base)
      } else {
        const created = await sellerCreateProduct(token, base)
        pid = created.data._id
      }
      // The uploads are now attached to a saved product — nothing to clean up.
      sessionUploadsRef.current = []

      toast.success(isEdit ? 'Product updated ✓' : "Product created — it's now live ✓")

      if (hasVariants) {
        for (const v of variants) {
          if (!v.label.trim() || !v.sku.trim() || !v.price) {
            toast.error('Every variant needs a label, SKU, and price')
            continue
          }
          const payload = {
            options: { Option: v.label.trim() },
            label: v.label.trim(),
            sku: v.sku.trim(),
            price: Number(v.price),
            stock: Number(v.stock) || 0,
            lowStockThreshold: Number(v.lowStockThreshold) || 5,
          }
          if (v.isNew || !v._id) await sellerCreateVariant(token, pid, payload)
          else await sellerUpdateVariant(token, pid, v._id, payload)
        }
      } else if (isEdit && detail?.variants?.length) {
        // Variants disabled → delete the remaining ones.
        for (const v of detail.variants) await sellerDeleteVariant(token, pid, v._id)
      }

      onSaved?.()
      onClose()
    } catch (err) {
      if (err.status !== 401) { setError(err.message); toast.error(err.message) }
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && !detail) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          <Loading label="Loading product…" />
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        <h2>{isEdit ? 'Edit product' : 'New product'}</h2>
        <p className="muted small">New products go live on the storefront as soon as you create them.</p>

        <form onSubmit={handleSubmit} className="form">
          {!form ? <Loading label="Loading form…" /> : (
            <>
              <label>
                Name *
                <input value={form.name} onChange={set('name')} placeholder="Wireless Bluetooth Headphones" />
              </label>

              <div className="ai-desc">
                <div className="ai-desc-head">
                  <span className="fieldset-title">Description</span>
                  <div className="ai-desc-actions">
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleGenerate}
                      disabled={aiGenerating || saving}>
                      {aiGenerating ? <><Spinner small /> Generating…</> : '✨ Generate Description with AI'}
                    </button>
                    <button type="button"
                      className={`btn btn-sm ${chatOpen ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setChatOpen((o) => !o)}>
                      🤖 Ask AI
                    </button>
                  </div>
                </div>
                <textarea value={form.description} onChange={set('description')} rows={3}
                  placeholder="Features, materials, what's in the box…" />
                {aiStatus === 'success' && (
                  <p className="ai-note ai-note-success">✨ Description generated — review and edit before saving.</p>
                )}
                {aiStatus === 'error' && (
                  <p className="ai-note ai-note-error">Couldn't generate a description right now — check your connection and try again.</p>
                )}

                {chatOpen && (
                  <div className="fieldset ai-chat-panel">
                    <div className="ai-chat-head">
                      <span className="fieldset-title">Ask AI · product assistant</span>
                      <span className="muted small">Uses your product details & first image as context</span>
                    </div>

                    <div className="ai-chat-suggestions">
                      {AI_QUICK_PROMPTS.map((p) => (
                        <button key={p} type="button" className="chip-btn" disabled={chatBusy}
                          onClick={() => handleChatSend(p)}>
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="ai-chat-messages">
                      {chatMessages.length === 0 && (
                        <p className="muted small" style={{ margin: 0 }}>
                          Try a suggestion above or type your own instruction — e.g. “add key selling points”.
                        </p>
                      )}
                      {chatMessages.map((m, i) => (
                        <div key={i} className={`chat-bubble ${m.role === 'user' ? 'mine' : 'theirs'}`}>
                          <p>{m.content}</p>
                          {m.role === 'assistant' && (
                            <button type="button" className="btn btn-sm btn-secondary ai-use-btn"
                              onClick={() => applyToDescription(m.content)}>
                              Use this
                            </button>
                          )}
                        </div>
                      ))}
                      {chatBusy && (
                        <div className="chat-bubble theirs">
                          <Spinner small /> <span className="muted small">Thinking…</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="chat-input">
                      <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend(chatInput) } }}
                        placeholder="Ask AI to rewrite, shorten, or improve…" />
                      <button type="button" className="btn btn-sm btn-primary" disabled={chatBusy || !chatInput.trim()}
                        onClick={() => handleChatSend(chatInput)}>
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="address-grid">
                <label>
                  Price (₹) *
                  <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="1999" />
                </label>
                <label>
                  Stock Quantity (Pieces) *
                  <input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} placeholder="e.g. 25" required />
                </label>
                <div className="fieldset" style={{ padding: '6px 10px' }}>
                  <span className="muted small">Discount</span>
                  <div className="coupon-form">
                    <select className="select" value={form.discountType} onChange={set('discountType')}>
                      <option value="">None</option>
                      <option value="percentage">% off</option>
                      <option value="flat">Flat ₹</option>
                    </select>
                    <input type="number" min="0" value={form.discountValue} onChange={set('discountValue')}
                      placeholder="0" disabled={!form.discountType} />
                  </div>
                </div>
              </div>

              <label>
                Category *
                <select className="select" value={form.category} onChange={set('category')}>
                  <option value="">Choose a category</option>
                  {flatCats.map((c) => (
                    <option key={c._id} value={c._id}>{'— '.repeat(c.depth)}{c.name}</option>
                  ))}
                </select>
              </label>

              {selectedCat?.children?.length > 0 && (
                <label>
                  Sub-category
                  <select className="select" value={form.subCategory} onChange={set('subCategory')}>
                    <option value="">None</option>
                    {subCats.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </label>
              )}

              <label>
                Tags (comma separated)
                <input value={form.tags} onChange={set('tags')} placeholder="wireless, bluetooth, headphones" />
              </label>

              <div className="fieldset">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p className="fieldset-title" style={{ margin: 0 }}>Product Photos</p>
                  <span className="badge badge-status">
                    {images.length} {images.length === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
                <p className="muted small" style={{ margin: '0 0 10px 0' }}>
                  Upload multiple photos. The first photo is the main cover image shown on the Explore page; customers can slide or scroll smoothly across the card to view the other photos!
                </p>

                {images.length > 0 && (
                  <div className="img-gallery-grid">
                    {images.map((img, i) => (
                      <div className={`img-card-chip ${i === 0 ? 'is-cover' : ''}`} key={`${img.url}-${i}`}>
                        <div className="img-card-thumb">
                          {img.url ? <img src={img.url} alt="" /> : <span>?</span>}
                          {i === 0 && <span className="cover-badge">★ Cover</span>}
                        </div>
                        <div className="img-card-actions">
                          {i > 0 && (
                            <button type="button" className="btn-icon-chip" title="Set as main cover" onClick={() => setAsCover(i)}>
                              ★
                            </button>
                          )}
                          {i > 0 && (
                            <button type="button" className="btn-icon-chip" title="Move left" onClick={() => moveImage(i, -1)}>
                              ◀
                            </button>
                          )}
                          {i < images.length - 1 && (
                            <button type="button" className="btn-icon-chip" title="Move right" onClick={() => moveImage(i, 1)}>
                              ▶
                            </button>
                          )}
                          <button type="button" className="btn-icon-chip" title="Replace this photo"
                            onClick={() => { setReplaceIndex(i); replaceInputRef.current?.click() }}>
                            ↻
                          </button>
                          <button type="button" className="btn-icon-chip btn-danger-chip" title="Remove photo"
                            onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="photo-upload-controls">
                  <ImageEditorPicker
                    token={token}
                    multiple
                    label="🖼️ Choose photos (crop / resize)"
                    onDone={addPickedImages}
                    onBusyChange={setGalleryBusy}
                  />

                  {/* Mobile: opens the phone camera directly. Browsers without
                      capture support fall back to the normal photo picker. */}
                  <ImageEditorPicker
                    token={token}
                    capture="environment"
                    label="📷 Take photo"
                    onDone={addPickedImages}
                    onBusyChange={setCameraBusy}
                  />

                  <label className="btn btn-sm btn-secondary photo-upload-btn">
                    {uploading ? <><Spinner small /> {uploadProgress || 'Uploading…'}</> : '📁 Add from this device'}
                    <input type="file" multiple accept="image/*" hidden onChange={handlePickPhotos} disabled={uploading} />
                  </label>

                  {/* Hidden input driven by the per-photo Replace buttons */}
                  <input ref={replaceInputRef} type="file" accept="image/*" hidden onChange={handleReplaceFile} />
                </div>

                <p className="muted small photo-upload-hint">
                  Photos are resized on your device before upload, so full-size camera photos work on mobile.
                </p>
              </div>

              <div className="fieldset">
                <p className="fieldset-title">Shipping</p>
                <div className="address-grid">
                  <input type="number" min="0" placeholder="Weight (g)" value={form.weight} onChange={set('weight')} />
                  <input type="number" min="0" placeholder="Shipping cost (₹)" value={form.shippingCost} onChange={set('shippingCost')} />
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={form.freeShipping} onChange={set('freeShipping')} />
                  Free shipping
                </label>
              </div>

              <label className="checkbox-row">
                <input type="checkbox" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} />
                This product has variants (size / color / etc.)
              </label>

              {hasVariants && (
                <div className="fieldset">
                  <div className="panel-head">
                    <p className="fieldset-title" style={{ margin: 0 }}>Variants</p>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={addVariant}>+ Add variant</button>
                  </div>
                  <p className="muted small">Each variant needs a label (e.g. “L - Blue”), a unique SKU, price, and stock.</p>
                  {variants.map((v) => (
                    <div className="address-grid" key={v._id || v._temp} style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      <input placeholder="Label (L - Blue)" value={v.label}
                        onChange={(e) => patchVariant(v._id || v._temp, { label: e.target.value })} />
                      <input placeholder="SKU (unique)" value={v.sku}
                        onChange={(e) => patchVariant(v._id || v._temp, { sku: e.target.value })} />
                      <input type="number" min="0" placeholder="Price" value={v.price}
                        onChange={(e) => patchVariant(v._id || v._temp, { price: e.target.value })} />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="number" min="0" placeholder="Stock" value={v.stock}
                          onChange={(e) => patchVariant(v._id || v._temp, { stock: e.target.value })} />
                        <button type="button" className="btn btn-sm btn-danger-ghost"
                          onClick={() => removeVariant(v)}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="form-error">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || busyUploading}
                  title={busyUploading ? 'Wait for the photos to finish uploading' : undefined}>
                  {saving
                    ? <><Spinner small /> Saving…</>
                    : busyUploading
                      ? <><Spinner small /> Uploading photos…</>
                      : (isEdit ? 'Save changes' : 'Create product')}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

const renderStars = (rating) => (
  <span aria-label={`${rating} out of 5`} style={{ color: '#f5a623', letterSpacing: 2 }}>
    {'★'.repeat(rating)}<span style={{ color: 'var(--border)' }}>{'★'.repeat(Math.max(0, 5 - rating))}</span>
  </span>
)

function ReviewsModal({ product, token, onClose }) {
  const toast = useToast()
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setReviews(null)
    setError('')
    getProductReviews(token, product._id, { limit: 50 })
      .then((res) => { if (!cancelled) setReviews(res.data || []) })
      .catch((err) => { if (!cancelled && err.status !== 401) setError(err.message) })
    return () => { cancelled = true }
  }, [product._id, token])

  useEffect(() => { if (error) toast.error(error) }, [error, toast])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>Reviews · {product.name}</h2>
        <p className="muted small">
          {product.stats?.totalReviews > 0
            ? <>★ {product.stats.avgRating} average from {product.stats.totalReviews} review{product.stats.totalReviews === 1 ? '' : 's'}</>
            : 'No reviews yet — approved customer reviews appear here.'}
        </p>

        {!reviews && !error && <Loading label="Loading reviews…" />}
        {error && <p className="muted small">Couldn't load reviews — close and try again.</p>}

        {reviews && reviews.length === 0 && (
          <div className="empty-state" style={{ padding: '30px 10px' }}>
            <div className="empty-emoji">🗣️</div>
            <p>No approved reviews yet for this product.</p>
          </div>
        )}

        {reviews && reviews.length > 0 && (
          <div className="orders-list">
            {reviews.map((r) => (
              <div className="order-card" key={r._id} style={{ padding: 14 }}>
                <div className="order-card-head">
                  <div>
                    <strong>{r.user?.name || 'Customer'}</strong>
                    <p className="muted small">{formatDate(r.createdAt)}</p>
                  </div>
                  {renderStars(r.rating || 0)}
                </div>
                {r.title && <p style={{ margin: '6px 0 0' }}><strong>{r.title}</strong></p>}
                {r.comment && <p className="muted" style={{ margin: '4px 0 0' }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RestockModal({ product, token, onClose, onRestocked }) {
  const toast = useToast()
  const [stock, setStock] = useState(product?.stock ?? 0)
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    const num = Number(stock)
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      toast.error('Please enter a valid non-negative integer for stock')
      return
    }
    setSaving(true)
    try {
      await sellerUpdateProductStock(token, product._id, num)
      toast.success(`Stock updated to ${num} pieces ✓`)
      onRestocked?.()
    } catch (err) {
      if (err.status !== 401) toast.error(err.message || 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h3>Quick Restock</h3>
        <p className="muted small" style={{ marginTop: 4 }}>
          Update stock for <strong>{product.name}</strong>. Increasing stock above 0 automatically makes this product available for purchase again.
        </p>

        <form onSubmit={handleSave} className="form" style={{ marginTop: 16 }}>
          <label>
            Available Stock (Pieces)
            <input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
              autoFocus
            />
          </label>
          <div className="modal-actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><Spinner small /> Updating…</> : 'Save Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

