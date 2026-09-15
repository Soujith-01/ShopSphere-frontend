import { useEffect, useId, useRef, useState } from 'react'
import { sellerUploadImage } from '../../api.js'
import { EXPORT_MAX_DIM, MAX_UPLOAD_BYTES, downscaleImageFile } from '../../imageResize.js'
import { useToast } from '../../toast.js'
import Spinner from '../Spinner.jsx'

// Reusable picker: choose image(s) → crop/resize each in a modal → upload to
// Cloudinary → onDone([{ url, publicId }, …]).
//
// Works on desktop (file picker) and mobile (gallery, or the camera when
// `capture="environment"` is passed), and reports its in-flight state through
// onBusyChange so the parent can block form submission while uploading.
export default function ImageEditorPicker({
  token,
  multiple = false,
  onDone,
  label = 'Upload image',
  hint,
  capture = null,
  onBusyChange,
}) {
  const toast = useToast()
  const inputId = useId()
  const [queue, setQueue] = useState([])      // files awaiting editing
  const [current, setCurrent] = useState(0)   // index into queue
  const [done, setDone] = useState([])        // uploaded results
  const [uploading, setUploading] = useState(false)

  const pickFiles = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    setQueue(files)
    setCurrent(0)
    setDone([])
  }

  const uploadAndContinue = async (blobFile) => {
    setUploading(true)
    try {
      const res = await sellerUploadImage(token, blobFile)
      const added = [...done, res.data]
      setDone(added)
      const next = current + 1
      if (next >= queue.length) {
        toast.success(added.length === 1 ? 'Image uploaded ✓' : `${added.length} images uploaded ✓`)
        finish(added)
      } else {
        setCurrent(next)
      }
    } catch (err) {
      if (err.status !== 401) {
        toast.error(blobFile.name ? `${blobFile.name}: ${err.message}` : err.message)
        const next = current + 1
        if (next >= queue.length) finish(done)
        else setCurrent(next)
      }
    } finally {
      setUploading(false)
    }
  }

  const cancelAll = () => {
    if (queue.length > 0) toast.info('Upload cancelled')
    finish([])
  }

  const finish = (results) => {
    setQueue([])
    setCurrent(0)
    setDone([])
    if (results.length > 0) onDone?.(results)
  }

  const open = Boolean(queue.length > 0 && current < queue.length)

  // Tell the parent form an upload is in flight (it disables its Save button).
  useEffect(() => { onBusyChange?.(uploading) }, [uploading, onBusyChange])

  return (
    <div className="coupon-form">
      <input
        type="file"
        id={inputId}
        accept="image/*"
        multiple={multiple}
        capture={capture || undefined}
        hidden
        onChange={pickFiles}
      />
      <label htmlFor={inputId} className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
        {uploading ? <><Spinner small /> Uploading…</> : label}
      </label>
      {hint && <span className="muted small">{hint}</span>}

      {open && !uploading && (
        <CropModal
          file={queue[current]}
          onConfirm={uploadAndContinue}
          onCancel={cancelAll}
          isLast={current + 1 >= queue.length}
        />
      )}
    </div>
  )
}

// ─── Crop / resize modal ────────────────────────────────────────────────
const RATIOS = [
  { value: 'free', label: 'Free' },
  { value: '1:1', label: 'Square (1:1)' },
  { value: '4:3', label: 'Landscape (4:3)' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: 'Portrait (2:3)' },
]

function CropModal({ file, onConfirm, onCancel, isLast }) {
  const toast = useToast()
  const [preview, setPreview] = useState('')
  const [natural, setNatural] = useState(null) // { w, h } once image loads
  const [ratio, setRatio] = useState('free')
  const [selection, setSelection] = useState(null) // natural px {x0,y0,x1,y1}
  const [dragStart, setDragStart] = useState(null)
  const [working, setWorking] = useState(false)

  const imgRef = useRef(null)
  const boxRef = useRef(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    const reader = new FileReader()
    reader.onload = () => { if (!cancelled) setPreview(reader.result) }
    reader.readAsDataURL(file)
    return () => { cancelled = true }
  }, [file])

  const onImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    setSelection(null)
  }

  const toNaturalCoords = (e) => {
    const img = imgRef.current
    const rect = img.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * img.naturalWidth,
      y: ((e.clientY - rect.top) / rect.height) * img.naturalHeight,
    }
  }

  const startDrag = (e) => {
    e.preventDefault()
    setDragStart(toNaturalCoords(e))
  }

  const moveDrag = (e) => {
    if (!dragStart) return
    setSelection(constrain(dragStart, toNaturalCoords(e), ratio, natural))
  }

  const stopDrag = () => setDragStart(null)

  const confirmCrop = async () => {
    const img = imgRef.current
    if (!img || !natural) return
    setWorking(true)
    try {
      const rect = selection || { x0: 0, y0: 0, x1: natural.w, y1: natural.h }
      const cropW = Math.max(1, rect.x1 - rect.x0)
      const cropH = Math.max(1, rect.y1 - rect.y0)
      const scale = Math.min(1, EXPORT_MAX_DIM / Math.max(cropW, cropH))
      const outW = Math.max(1, Math.round(cropW * scale))
      const outH = Math.max(1, Math.round(cropH * scale))

      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, rect.x0, rect.y0, cropW, cropH, 0, 0, outW, outH)

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Could not process image')
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
      await onConfirm(new File([blob], name, { type: 'image/jpeg' }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setWorking(false)
    }
  }

  const skipOriginal = async () => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Image is larger than 8 MB — crop it first or choose a smaller file')
      return
    }

    // No crop, but still shrink it in the browser so mobile uploads stay small.
    setWorking(true)
    try {
      await onConfirm(await downscaleImageFile(file))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onCancel} aria-label="Cancel">✕</button>
        <h2>Edit image</h2>
        <p className="muted small">Drag on the photo to select the crop area, then confirm. Output is resized to {EXPORT_MAX_DIM}px max and uploaded to Cloudinary.</p>

        <div className="fieldset" style={{ margin: '10px 0' }}>
          <div className="coupon-form">
            <label className="muted small" style={{ fontWeight: 600 }}>Crop ratio</label>
            <select className="select" value={ratio} onChange={(e) => { setRatio(e.target.value); setSelection(null) }}>
              {RATIOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {preview && (
            <div
              ref={boxRef}
              className="crop-stage"
              style={{ position: 'relative', touchAction: 'none', cursor: 'crosshair', userSelect: 'none' }}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={stopDrag}
              onPointerLeave={stopDrag}
            >
              <img
                ref={imgRef}
                src={preview}
                alt=""
                onLoad={onImgLoad}
                style={{ display: 'block', width: '100%', borderRadius: 10, pointerEvents: 'none' }}
                draggable={false}
              />
              {selection && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(selection.x0 / natural.w) * 100}%`,
                    top: `${(selection.y0 / natural.h) * 100}%`,
                    width: `${((selection.x1 - selection.x0) / natural.w) * 100}%`,
                    height: `${((selection.y1 - selection.y0) / natural.h) * 100}%`,
                    border: '2px solid var(--accent)',
                    background: 'rgba(108, 62, 242, 0.12)',
                    pointerEvents: 'none',
                    borderRadius: 4,
                  }}
                />
              )}
            </div>
          )}

          {natural && (
            <p className="muted small">
              {natural.w}×{natural.h}px{selection ? ` → ${Math.max(1, Math.round((selection.x1 - selection.x0) * Math.min(1, EXPORT_MAX_DIM / Math.max(selection.x1 - selection.x0, selection.y1 - selection.y0))))}×${Math.max(1, Math.round((selection.y1 - selection.y0) * Math.min(1, EXPORT_MAX_DIM / Math.max(selection.x1 - selection.x0, selection.y1 - selection.y0))))}px` : ` → resized (max ${EXPORT_MAX_DIM}px)`}
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel all</button>
          <button type="button" className="btn btn-secondary" disabled={working} onClick={skipOriginal}>
            {working ? <><Spinner small /> Compressing…</> : 'Upload without cropping'}
          </button>
          <button type="button" className="btn btn-primary" disabled={working || !preview || !natural} onClick={confirmCrop}>
            {working ? <><Spinner small /> Processing…</> : (isLast ? 'Confirm & upload' : 'Confirm & next')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Build a normalized, clamped selection rectangle honoring a fixed ratio.
function constrain(start, cur, ratioValue, natural) {
  if (!natural) return null
  let rw = null
  let rh = null
  if (ratioValue !== 'free') {
    const [w, h] = ratioValue.split(':').map(Number)
    rw = w
    rh = h
  }

  let dx = cur.x - start.x
  let dy = cur.y - start.y
  if (rw && rh) {
    // Stretch the shorter delta to keep the ratio locked.
    const len = Math.max(Math.abs(dx) / rw, Math.abs(dy) / rh)
    dx = Math.sign(dx || 1) * len * rw
    dy = Math.sign(dy || 1) * len * rh
  }

  let x0 = Math.min(start.x, start.x + dx)
  let y0 = Math.min(start.y, start.y + dy)
  let x1 = Math.max(start.x, start.x + dx)
  let y1 = Math.max(start.y, start.y + dy)

  // Clamp into the image, keeping the anchor fixed as much as possible.
  if (x0 < 0) { x1 -= x0; x0 = 0 }
  if (y0 < 0) { y1 -= y0; y0 = 0 }
  if (x1 > natural.w) { x0 -= x1 - natural.w; x1 = natural.w }
  if (y1 > natural.h) { y0 -= y1 - natural.h; y1 = natural.h }
  if (x0 < 0) x0 = 0
  if (y0 < 0) y0 = 0

  if (rw && rh) {
    // After clamping the box may no longer match the ratio — shrink to fit.
    const cw = x1 - x0
    const ch = y1 - y0
    if (cw / ch > rw / rh) {
      const newW = ch * (rw / rh)
      const shrink = cw - newW
      x0 += shrink / 2
      x1 -= shrink / 2
    } else {
      const newH = cw * (rh / rw)
      const shrink = ch - newH
      y0 += shrink / 2
      y1 -= shrink / 2
    }
  }

  const w = Math.max(1, x1 - x0)
  const h = Math.max(1, y1 - y0)
  return { x0, y0, x1: x0 + w, y1: y0 + h }
}
