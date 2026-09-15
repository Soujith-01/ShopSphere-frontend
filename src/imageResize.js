// Client-side photo compression used by every seller upload path.
//
// Phone cameras produce 3–12 MB photos. Downscaling on the device before upload
// keeps mobile uploads fast and cheap on data, and stays well inside the
// backend's 8 MB per-file limit. Nothing here ever sends image bytes to MongoDB —
// the file goes straight to Cloudinary through our API.
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 // must match Backend MAX_IMAGE_BYTES
export const EXPORT_MAX_DIM = 1600

const JPEG_QUALITY = 0.85
// Photos already this small gain nothing from re-encoding.
const SKIP_UNDER_BYTES = 400 * 1024

export const isImageFile = (file) => Boolean(file && /^image\//i.test(file.type || ''))

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image'))
    }
    img.src = url
  })
}

/**
 * Downscale + re-encode a photo in the browser.
 *
 * Always resolves with something uploadable: when the file can't be decoded or
 * the result would be bigger, the original file is returned and the server-side
 * validation takes over.
 *
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function downscaleImageFile(file, { maxDim = EXPORT_MAX_DIM, quality = JPEG_QUALITY } = {}) {
  if (!isImageFile(file)) return file

  // SVG scales losslessly and GIF would lose its animation — send unchanged.
  if (/image\/(svg|gif)/i.test(file.type)) return file

  let image
  try {
    image = await loadImageElement(file)
  } catch {
    return file
  }

  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) return file

  const scale = Math.min(1, maxDim / Math.max(width, height))
  const needsResize = scale < 1
  const needsReencode = file.size > SKIP_UNDER_BYTES
  if (!needsResize && !needsReencode) return file

  const outWidth = Math.max(1, Math.round(width * scale))
  const outHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outWidth
  canvas.height = outHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  // White backing so transparent areas don't turn black when flattened to JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outWidth, outHeight)
  ctx.drawImage(image, 0, 0, outWidth, outHeight)

  // Keep PNGs as PNG (logos/mockups), compress everything else as JPEG.
  const keepPng = /image\/png/i.test(file.type)
  const mime = keepPng ? 'image/png' : 'image/jpeg'

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
  if (!blob || blob.size >= file.size) return file

  const name = `${String(file.name || 'photo').replace(/\.[^.]+$/, '')}${keepPng ? '.png' : '.jpg'}`
  return new File([blob], name, { type: mime, lastModified: Date.now() })
}

export default downscaleImageFile
