import mongoose from 'mongoose'

import env from './env.config.js'

export async function connectDB(uri = env.MONGO_URI) {
  await mongoose.connect(uri)
  return mongoose.connection
}

export async function disconnectDB() {
  await mongoose.disconnect()
}
