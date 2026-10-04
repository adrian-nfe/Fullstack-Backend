import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { login, logout, me, register, removeAvatar, updateAvatar, updateMe } from '../controllers/auth.controller.js'
import { rejectImageField, uploadAvatarImage } from '../middlewares/upload.middleware.js'
import { protect } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { loginSchema, registerSchema, updateMeSchema } from '../validators/auth.validator.js'

const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: 'Demasiadas peticiones. Inténtalo de nuevo en unos minutos.' },
})

authRouter.post('/register', authLimiter, validate(registerSchema), register)
authRouter.post('/login', authLimiter, validate(loginSchema), login)
authRouter.post('/logout', logout)
authRouter.get('/me', protect, me)
authRouter.post('/me/avatar', protect, uploadAvatarImage, updateAvatar)
authRouter.delete('/me/avatar', protect, removeAvatar)
authRouter.patch('/me', protect, rejectImageField('avatarUrl'), validate(updateMeSchema), updateMe)

export default authRouter
