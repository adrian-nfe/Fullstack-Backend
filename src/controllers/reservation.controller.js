import { findConflict } from '../services/availability.service.js'
import { toMinutes, venueNowMinutes, venueToday } from '../utils/time.util.js'
import { AppError } from '../utils/app-error.util.js'
import { asyncHandler } from '../utils/async-handler.util.js'
import { Game, Reservation, Venue } from '../models/index.js'

const RESERVATION_POPULATE = [
  { path: 'user', select: 'name' },
  { path: 'venue', select: 'name neighborhood owner externalId' },
  { path: 'game', select: 'name minPlayers maxPlayers' },
]

async function loadOwnedVenueIds(user) {
  const venues = await Venue.find({ owner: user._id }).select('_id')
  return venues.map((venue) => venue._id)
}

function canManageReservation(reservation, user) {
  if (user.role === 'admin') return true
  if (user.role !== 'venue') return false
  if (reservation.venue?.owner && String(reservation.venue.owner) === String(user._id)) return true
  return false
}

export const listReservations = asyncHandler(async (req, res) => {
  const filter = {}

  if (req.user.role === 'player') {
    filter.user = req.user._id
  } else if (req.user.role === 'venue') {
    filter.$or = [
      { user: req.user._id },
      { venue: { $in: await loadOwnedVenueIds(req.user) } },
    ]
  }

  const { status, date, venue, page, limit } = req.validatedQuery ?? {}
  if (status) filter.status = status
  if (date) filter.date = date
  if (venue && req.user.role === 'admin') filter.venue = venue

  const currentPage = page ?? 1
  const query = Reservation.find(filter)
    .sort({ date: -1, startTime: -1, _id: -1 })
    .populate(RESERVATION_POPULATE)

  if (limit) {
    query.skip((currentPage - 1) * limit).limit(limit)
  }

  const [total, items] = await Promise.all([Reservation.countDocuments(filter), query])

  res.json({
    items,
    total,
    page: currentPage,
    pages: limit ? Math.max(1, Math.ceil(total / limit)) : 1,
  })
})

export const getReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id).populate(RESERVATION_POPULATE)
  if (!reservation) {
    throw new AppError('No hemos encontrado esa reserva', 404)
  }

  const isOwnerUser = String(reservation.user?._id) === String(req.user._id)
  if (!isOwnerUser && !canManageReservation(reservation, req.user)) {
    throw new AppError('No puedes ver esta reserva', 403)
  }

  res.json({ reservation })
})

export const createReservation = asyncHandler(async (req, res) => {
  const body = req.body

  const venue = await Venue.findById(body.venue)
  if (!venue || !venue.isActive) {
    throw new AppError('No hemos encontrado ese local', 404)
  }

  const game = await Game.findById(body.game)
  if (!game || !game.isActive) {
    throw new AppError('No hemos encontrado ese juego', 404)
  }

  if (toMinutes(body.endTime) <= toMinutes(body.startTime)) {
    throw new AppError('La hora de fin debe ser posterior a la de inicio', 400)
  }

  const now = new Date()
  const today = venueToday(now)
  const nowMinutes = venueNowMinutes(now)

  if (body.date < today) {
    throw new AppError('No puedes reservar en una fecha pasada', 400)
  }

  if (body.date === today && toMinutes(body.startTime) <= nowMinutes) {
    throw new AppError('La hora de inicio ya ha pasado. Elige una franja para más tarde', 400)
  }

  const opening = toMinutes(venue.openingHour)
  const closing = toMinutes(venue.closingHour)
  if (toMinutes(body.startTime) < opening || toMinutes(body.endTime) > closing) {
    throw new AppError(
      'La reserva debe estar dentro del horario del local (' +
        venue.openingHour + ' a ' + venue.closingHour + ')',
      400,
    )
  }

  if (body.tableNumber > venue.tables) {
    throw new AppError('Ese local solo tiene ' + venue.tables + ' mesas', 400)
  }

  if (
    body.players < game.minPlayers ||
    body.players > game.maxPlayers
  ) {
    throw new AppError(
      'Ese juego admite entre ' + game.minPlayers + ' y ' + game.maxPlayers + ' jugadores',
      400,
    )
  }

  const conflict = await findConflict({
    venueId: venue._id,
    date: body.date,
    tableNumber: body.tableNumber,
    startTime: body.startTime,
    endTime: body.endTime,
  })
  if (conflict) {
    throw new AppError('Esa mesa ya está reservada en esa franja', 409)
  }

  const reservation = await Reservation.create({
    ...body,
    user: req.user._id,
    status: 'confirmed',
  })
  await reservation.populate(RESERVATION_POPULATE)

  res.status(201).json({ reservation })
})

export const updateReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id).populate(RESERVATION_POPULATE)
  if (!reservation) {
    throw new AppError('No hemos encontrado esa reserva', 404)
  }

  const isOwnerUser = String(reservation.user?._id) === String(req.user._id)
  const isManager = canManageReservation(reservation, req.user)

  if (!isOwnerUser && !isManager) {
    throw new AppError('No puedes modificar esta reserva', 403)
  }
  if (isOwnerUser && !isManager && req.body.status !== 'cancelled') {
    throw new AppError('Solo puedes cancelar tus reservas', 403)
  }
  if (reservation.status === 'cancelled' && req.body.status === 'confirmed') {
    throw new AppError('Una reserva cancelada no se puede volver a confirmar', 400)
  }

  reservation.status = req.body.status
  await reservation.save()

  res.json({ reservation })
})
