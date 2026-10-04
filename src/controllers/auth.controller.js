import jwt from 'jsonwebtoken'

import { destroyOwnedImage } from '../utils/cloudinary-delete.util.js'
import { IMAGE_FOLDERS } from '../config/cloudinary.config.js'
import env from '../config/env.config.js'
import { User } from '../models/index.js'
import { AppError } from '../utils/app-error.util.js'
import { asyncHandler } from '../utils/async-handler.util.js'

const isProd = env.NODE_ENV === 'production'
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
}

function publicUser(doc) {
  const user = doc.toJSON()
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  }
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  const existing = await User.findOne({ email })
  if (existing) {
    throw new AppError('Ese email ya está registrado', 409)
  }

  const user = await User.create({ name, email, password })
  const token = signToken(user._id)
  res.cookie('token', token, cookieOptions)
  res.json({ user: publicUser(user), token })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email }).select('+password')
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    throw new AppError('Email o contraseña incorrectos', 401)
  }

  const token = signToken(user._id)
  res.cookie('token', token, cookieOptions)
  res.json({ user: publicUser(user), token })
})

export const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
  })
  res.json({ message: 'Sesión cerrada' })
}

export const me = (req, res) => {
  res.json({ user: publicUser(req.user) })
}

function destroyAvatar(url) {
  return destroyOwnedImage({ url, folder: IMAGE_FOLDERS.avatar })
}

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file?.path) {
    throw new AppError('No hemos recibido ninguna imagen', 400)
  }

  const previous = req.user.avatarUrl || ''
  const next = req.file.path

  req.user.avatarUrl = next
  try {
    await req.user.save()
  } catch (err) {
    await destroyAvatar(next)
    throw err
  }

  if (previous && previous !== next) {
    await destroyAvatar(previous)
  }

  res.json({ user: publicUser(req.user) })
})

export const removeAvatar = asyncHandler(async (req, res) => {
  const previous = req.user.avatarUrl || ''

  req.user.avatarUrl = ''
  await req.user.save()

  if (previous) {
    await destroyAvatar(previous)
  }

  res.json({ user: publicUser(req.user) })
})

export const updateMe = asyncHandler(async (req, res) => {
  if ('avatarUrl' in req.body) {
    throw new AppError(
      'No se puede modificar la imagen de perfil desde esta operación',
      400,
    )
  }

  const { name } = req.body
  if (typeof name === 'string' && name !== req.user.name) {
    req.user.name = name
    await req.user.save()
  }

  res.json({ user: publicUser(req.user) })
})
