import { Reservation } from '../models/index.js'
import { toMinutes } from '../utils/time.util.js'

export function timesOverlap(startA, endA, startB, endB) {
  return (
    toMinutes(startA) < toMinutes(endB) &&
    toMinutes(endA) > toMinutes(startB)
  )
}

export async function findConflict({ venueId, date, tableNumber, startTime, endTime, excludeId }) {
  const filter = {
    venue: venueId,
    date,
    tableNumber,
    status: { $ne: 'cancelled' },
  }
  if (excludeId) {
    filter._id = { $ne: excludeId }
  }

  const candidates = await Reservation.find(filter).select('startTime endTime')

  return candidates.find((candidate) => timesOverlap(candidate.startTime, candidate.endTime, startTime, endTime)) ?? null
}

export async function getVenueDayAvailability(venue, date) {
  const reservations = await Reservation.find({
    venue: venue._id,
    date,
    status: { $ne: 'cancelled' },
  })
    .sort({ tableNumber: 1, startTime: 1 })
    .select('startTime endTime tableNumber')

  const busyByTable = new Map()
  for (const reservation of reservations) {
    const busy = busyByTable.get(reservation.tableNumber) ?? []
    busy.push({
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      reservationId: String(reservation._id),
    })
    busyByTable.set(reservation.tableNumber, busy)
  }

  return Array.from({ length: venue.tables }, (_item, index) => ({
    tableNumber: index + 1,
    busy: busyByTable.get(index + 1) ?? [],
  }))
}
