import { Reservation, User, Venue } from '../models/index.js'
import { AppError } from '../utils/app-error.util.js'
import { asyncHandler } from '../utils/async-handler.util.js'
import { applyActiveFilter, canSeeInactive } from '../utils/active-filter.util.js'
import { VENUE_HOURS_ERROR } from '../validators/venue.validator.js'
import { isValidSchedule, toMinutes, venueToday } from '../utils/time.util.js'
import { getVenueDayAvailability } from '../services/availability.service.js'
import { escapeRegex } from '../utils/regex.util.js'

export const listVenues = asyncHandler(async (req, res) => {
  const { q, neighborhood, mine, isActive, page, limit } = req.validatedQuery

  let filter = {}

  if (mine === '1' && req.user) {
    if (req.user.role === 'venue') {
      filter = { owner: req.user._id }
    } else if (req.user.role === 'admin') {
      filter = {}
    } else {
      filter = { isActive: true }
    }
  } else {
    filter = applyActiveFilter(filter, isActive, req.user)
  }

  if (neighborhood) {
    filter.neighborhood = new RegExp(`^${escapeRegex(neighborhood)}$`, 'i')
  }
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' }
    filter.$or = [{ name: rx }, { address: rx }]
  }

  const [total, items] = await Promise.all([
    Venue.countDocuments(filter),
    Venue.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ])

  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})

export const listVenueOwners = asyncHandler(async (_req, res) => {
  const items = await User.find({ role: { $in: ['venue', 'admin'] }, isActive: true })
    .sort({ name: 1 })
    .select('name email role')
    .lean()

  res.json({ items })
})

export const getVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id).populate('owner', 'name')
  if (!venue || (!venue.isActive && !canSeeInactive(req.user))) {
    throw new AppError('No hemos encontrado ese local', 404)
  }
  res.json({ venue })
})

export const getAvailability = asyncHandler(async (req, res) => {
  const { date } = req.validatedQuery
  const venue = await Venue.findById(req.params.id)
  if (!venue || !venue.isActive) {
    throw new AppError('No hemos encontrado ese local', 404)
  }

  const tables = await getVenueDayAvailability(venue, date)

  res.json({
    venueId: String(venue._id),
    date,
    openingHour: venue.openingHour,
    closingHour: venue.closingHour,
    tables,
  })
})

export const createVenue = asyncHandler(async (req, res) => {
  const ownerExists = await User.exists({ _id: req.body.owner, role: { $in: ['venue', 'admin'] } })
  if (!ownerExists) {
    throw new AppError('El propietario indicado debe existir y tener rol de local o administrador', 400)
  }
  const venue = await Venue.create(req.body)
  res.status(201).json({ venue })
})

export const updateVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id)
  if (!venue) {
    throw new AppError('No hemos encontrado ese local', 404)
  }
  const isOwner = String(venue.owner) === String(req.user._id)
  if (!isOwner && req.user.role !== 'admin') {
    throw new AppError('Solo el dueño del local o un administrador puede editarlo', 403)
  }
  if (req.body.isActive !== undefined && req.user.role !== 'admin') {
    throw new AppError('Solo el administrador puede activar o desactivar un local', 403)
  }

  Object.assign(venue, req.body)

  if (!isValidSchedule(venue.openingHour, venue.closingHour)) {
    throw new AppError(VENUE_HOURS_ERROR, 400)
  }

  const affectsAvailability =
    req.body.tables !== undefined ||
    req.body.openingHour !== undefined ||
    req.body.closingHour !== undefined

  if (affectsAvailability) {
    const active = await Reservation.find({
      venue: venue._id,
      status: { $ne: 'cancelled' },
      date: { $gte: venueToday() },
    }).select('date startTime endTime tableNumber')

    const outOfTables = active.find((reservation) => reservation.tableNumber > venue.tables)
    if (outOfTables) {
      throw new AppError(
        'Hay una reserva activa en la mesa ' +
          outOfTables.tableNumber +
          ' (' +
          outOfTables.date +
          '). No puedes dejar el local con menos mesas.',
        400,
      )
    }

    const opening = toMinutes(venue.openingHour)
    const closing = toMinutes(venue.closingHour)
    const outOfHours = active.find(
      (reservation) =>
        toMinutes(reservation.startTime) < opening || toMinutes(reservation.endTime) > closing,
    )
    if (outOfHours) {
      throw new AppError(
        'La reserva del ' +
          outOfHours.date +
          ' de ' +
          outOfHours.startTime +
          ' a ' +
          outOfHours.endTime +
          ' se quedaria fuera del horario. No puedes cambiar el horario con reservas activas.',
        400,
      )
    }
  }

  await venue.save()

  res.json({ venue })
})
