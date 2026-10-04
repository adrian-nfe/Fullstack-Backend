import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

import {
  ALLOWED_IMAGE_FORMATS,
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_FOLDERS,
  MAX_IMAGE_SIZE,
  cloudinary,
  isCloudinaryConfigured,
} from '../config/cloudinary.config.js'
import { AppError } from '../utils/app-error.util.js'

const uploaders = new Map()

function normalizeUploadError(err) {
  if (!err || err.status) return err
  if (Number.isInteger(err.http_code) && err.http_code >= 400 && err.http_code < 500) {
    return new AppError(
      'No hemos podido procesar la imagen. Debe ser un archivo jpg, jpeg, png o webp válido y pesar menos de 2 MB.',
      err.http_code,
    )
  }
  return err
}

function getUploader(folder) {
  if (!uploaders.has(folder)) {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder,
        resource_type: 'image',
        allowed_formats: ALLOWED_IMAGE_FORMATS,
      },
    })
    uploaders.set(
      folder,
      multer({
        storage,
        limits: { fileSize: MAX_IMAGE_SIZE },
        fileFilter(_req, file, cb) {
          const extension = file.originalname.split('.').pop()?.toLowerCase()
          if (!ALLOWED_IMAGE_FORMATS.includes(extension)) {
            cb(new AppError('Formato no permitido. Usa jpg, jpeg, png o webp', 400))
            return
          }
          if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
            cb(new AppError('El archivo no es una imagen válida', 400))
            return
          }
          cb(null, true)
        },
      }),
    )
  }
  return uploaders.get(folder)
}

function uploadImageTo(folder) {
  return (req, res, next) => {
    if (!isCloudinaryConfigured) {
      res.status(503).json({
        status: 503,
        message:
          'La subida de imágenes no está configurada en el servidor. Faltan las variables de Cloudinary.',
      })
      return
    }
    getUploader(folder).single('image')(req, res, (err) => {
      if (err) {
        next(normalizeUploadError(err))
        return
      }
      next()
    })
  }
}

export function rejectImageField(field) {
  return (req, _res, next) => {
    if (req.body && field in req.body) {
      next(new AppError('No se puede modificar la imagen desde esta operación', 400))
      return
    }
    next()
  }
}

export const uploadAvatarImage = uploadImageTo(IMAGE_FOLDERS.avatar)

export const uploadGameImage = uploadImageTo(IMAGE_FOLDERS.game)
