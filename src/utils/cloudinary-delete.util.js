import {
  CLOUDINARY_CLOUD_NAME,
  cloudinary,
  isCloudinaryConfigured,
} from '../config/cloudinary.config.js'

const CLOUDINARY_HOST = 'res.cloudinary.com'

function publicIdFromUrl(url) {
  if (typeof url !== 'string' || url === '') return null

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.protocol !== 'https:') return null
  if (parsed.hostname !== CLOUDINARY_HOST) return null

  const segments = parsed.pathname.split('/').filter(Boolean)
  if (segments.length < 4) return null
  if (segments[0] !== CLOUDINARY_CLOUD_NAME) return null
  if (segments[1] !== 'image' || segments[2] !== 'upload') return null

  const rest = segments.slice(3)
  if (/^v\d+$/.test(rest[0])) rest.shift()
  if (rest.length === 0) return null

  const fileName = rest[rest.length - 1].replace(/\.[a-zA-Z0-9]+$/, '')
  if (fileName === '') return null

  return [...rest.slice(0, -1), fileName].join('/')
}

export function belongsToFolder(publicId, folder) {
  return typeof publicId === 'string' && publicId.startsWith(`${folder}/`)
}

export async function destroyOwnedImage({ url, folder }) {
  if (!isCloudinaryConfigured) return { deleted: false, reason: 'cloudinary-sin-configurar' }

  const publicId = publicIdFromUrl(url)
  if (!publicId) return { deleted: false, reason: 'url-no-nuestra' }
  if (!belongsToFolder(publicId, folder)) return { deleted: false, reason: 'carpeta-ajena' }

  try {
    const result = await cloudinary.uploader.destroy(publicId)
    if (result?.result === 'not found') {
      return { deleted: false, reason: 'ya-no-existe' }
    }
    return { deleted: true, publicId }
  } catch (err) {
    console.warn(`[cloudinary] No hemos podido eliminar ${publicId}: ${err.message}`)
    return { deleted: false, reason: 'error-cloudinary' }
  }
}
