import mongoose from 'mongoose'

const reservationSchema = new mongoose.Schema(
  {
    externalId: { type: String, unique: true, sparse: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
    },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    players: { type: Number, required: true, min: 1 },
    tableNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

reservationSchema.index({ venue: 1, date: 1, tableNumber: 1, status: 1 })

export const Reservation = mongoose.model('Reservation', reservationSchema)
