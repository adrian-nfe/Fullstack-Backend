import 'dotenv/config'
import app from './app.js'
import env from './config/env.config.js'
import { connectDB } from './config/db.config.js'

try {
  await connectDB()
  console.log('[MesaNexo] MongoDB conectada')
} catch (err) {
  console.warn(`[MesaNexo] MongoDB no disponible: ${err.message}`)
  console.warn('[MesaNexo] La API arranca igualmente, pero las rutas de datos fallarán')
}

app.listen(env.PORT, () => {
  console.log(`[MesaNexo] API escuchando en http://localhost:${env.PORT}`)
})
