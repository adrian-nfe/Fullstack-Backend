import mongoose from 'mongoose'

const venueSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    neighborhood: { type: String, required: true },
    address: { type: String, required: true },
    tables: { type: Number, required: true, min: 1 },
    openingHour: { type: String, required: true },
    closingHour: { type: String, required: true },
    pricePerHour: { type: Number, required: true, min: 0 },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

venueSchema.index({ neighborhood: 1 })
venueSchema.index({ owner: 1 })

export const Venue = mongoose.model('Venue', venueSchema)
