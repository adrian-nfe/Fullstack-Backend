import mongoose from 'mongoose'

const gameSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    minPlayers: { type: Number, required: true, min: 1 },
    maxPlayers: { type: Number, required: true, min: 1 },
    playTimeMin: { type: Number, required: true, min: 5 },
    complexity: { type: Number, required: true, min: 1, max: 5 },
    genre: { type: String, required: true },
    publisher: { type: String, default: '' },
    year: { type: Number },
    language: { type: String, default: 'es' },
    imageUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

gameSchema.index({ name: 'text', genre: 1 })

export const Game = mongoose.model('Game', gameSchema)
