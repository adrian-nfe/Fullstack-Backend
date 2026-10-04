import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { errorMiddleware } from './middlewares/error.middleware.js'
import apiRouter from './routes/index.js'
import env from './config/env.config.js'
import { isCloudinaryConfigured } from './config/cloudinary.config.js'

const app = express()

if (env.NODE_ENV === 'production') {
  app.set('trust proxy', env.TRUST_PROXY)
}

app.use(helmet())
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
)
app.use(morgan('dev'))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (_req, res) => {
  res.json({ ok: true, uploads: isCloudinaryConfigured })
})

app.use('/api', apiRouter)

app.use(errorMiddleware)

export default app
