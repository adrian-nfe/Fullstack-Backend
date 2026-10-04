import { v2 as cloudinary } from 'cloudinary'

import env from './env.config.js'

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME || undefined,
  api_key: env.CLOUDINARY_API_KEY || undefined,
  api_secret: env.CLOUDINARY_API_SECRET || undefined,
})

export const CLOUDINARY_CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME || ''

export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
)

export const IMAGE_FOLDERS = {
  avatar: 'project-3/avatars',
  game: 'project-3/games',
}

export const ALLOWED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp']

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024

export { cloudinary }
