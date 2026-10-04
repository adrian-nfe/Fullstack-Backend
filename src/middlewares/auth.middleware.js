import jwt from 'jsonwebtoken'

import env from '../config/env.config.js'
import { User } from '../models/index.js'
import { AppError } from '../utils/app-error.util.js'
import { asyncHandler } from '../utils/async-handler.util.js'

function readToken(req) {
  if (req.cookies?.token) return req.cookies.token
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return undefined
}

export const protect = asyncHandler(async (req, _res, next) => {
  const token = readToken(req)
  if (!token) {
    throw new AppError('No has iniciado sesión', 401)
  }

  let payload
  try {
    payload = jwt.verify(token, env.JWT_SECRET)
  } catch {
    throw new AppError('Sesión no válida o caducada', 401)
  }

  const user = await User.findById(payload.sub)
  if (!user || !user.isActive) {
    throw new AppError('No tienes una cuenta activa', 401)
  }

  req.user = user
  next()
})

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req)
  if (!token) {
    next()
    return
  }

  let payload
  try {
    payload = jwt.verify(token, env.JWT_SECRET)
  } catch {
    next()
    return
  }

  const user = await User.findById(payload.sub)
  if (user && user.isActive) {
    req.user = user
  }
  next()
})
