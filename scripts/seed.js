import path from 'node:path'
import { fileURLToPath } from 'node:url'

import 'dotenv/config'
import mongoose from 'mongoose'

import { connectDB, disconnectDB } from '../src/config/db.config.js'
import { Game, Reservation, User, Venue } from '../src/models/index.js'
import { parseCsv } from '../src/utils/parse-csv.util.js'

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const dataFile = (name) => path.join(dataDir, name)

function toNumber(value) {
  if (value === '' || value === undefined || value === null) return undefined
  return Number(value)
}

async function main() {
  const reset = process.argv.includes('--reset') || process.env.SEED_RESET === '1'

  await connectDB()

  if (reset) {
    await Reservation.deleteMany({})
    await Game.deleteMany({})
    await Venue.deleteMany({})
    await User.deleteMany({})
    console.log('[seed] Colecciones vaciadas')
  } else {
    const [userCount, gameCount, venueCount, reservationCount] = await Promise.all([
      User.countDocuments(),
      Game.countDocuments(),
      Venue.countDocuments(),
      Reservation.countDocuments(),
    ])
    if (userCount || gameCount || venueCount || reservationCount) {
      throw new Error('La base ya tiene datos. Usa "pnpm seed:reset" para vaciarla y volver a sembrar.')
    }
  }

  const userRows = parseCsv(dataFile('users.csv'))
  const users = []
  for (const row of userRows) {
    const user = await User.create({
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role || 'player',
      avatarUrl: row.avatarUrl || '',
    })
    users.push(user)
  }

  const userIdByEmail = new Map(users.map((u) => [u.email, u._id]))

  const games = parseCsv(dataFile('games.csv')).map((row) => ({
    externalId: row.externalId,
    name: row.name,
    minPlayers: toNumber(row.minPlayers),
    maxPlayers: toNumber(row.maxPlayers),
    playTimeMin: toNumber(row.playTimeMin),
    complexity: toNumber(row.complexity),
    genre: row.genre,
    publisher: row.publisher || '',
    year: toNumber(row.year),
    language: row.language || 'es',
    imageUrl: row.imageUrl || '',
    description: row.description || '',
  }))
  const insertedGames = await Game.insertMany(games)

  const venueByExternalId = new Map()
  const insertedVenues = []
  for (const row of parseCsv(dataFile('venues.csv'))) {
    const ownerId = userIdByEmail.get(row.ownerEmail)
    if (!ownerId) {
      throw new Error(`ownerEmail desconocido en venues.csv: ${row.ownerEmail} (${row.externalId})`)
    }
    const venue = await Venue.create({
      externalId: row.externalId,
      name: row.name,
      neighborhood: row.neighborhood,
      address: row.address,
      tables: toNumber(row.tables),
      openingHour: row.openingHour,
      closingHour: row.closingHour,
      pricePerHour: toNumber(row.pricePerHour),
      owner: ownerId,
      description: row.description || '',
    })
    insertedVenues.push(venue)
    venueByExternalId.set(venue.externalId, venue._id)
  }

  const reservations = []
  for (const row of parseCsv(dataFile('reservations.csv'))) {
    const userId = userIdByEmail.get(row.userEmail)
    if (!userId) {
      throw new Error(`userEmail desconocido en reservations.csv: ${row.userEmail} (${row.externalId})`)
    }
    const venueId = venueByExternalId.get(row.venueExternalId)
    if (!venueId) {
      throw new Error(`venueExternalId desconocido en reservations.csv: ${row.venueExternalId} (${row.externalId})`)
    }
    const gameId = insertedGames.find((g) => g.externalId === row.gameExternalId)?._id
    if (!gameId) {
      throw new Error(`gameExternalId desconocido en reservations.csv: ${row.gameExternalId} (${row.externalId})`)
    }
    reservations.push({
      externalId: row.externalId,
      user: userId,
      venue: venueId,
      game: gameId,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      players: toNumber(row.players),
      tableNumber: toNumber(row.tableNumber),
      status: row.status || 'confirmed',
      notes: row.notes || '',
    })
  }
  await Reservation.insertMany(reservations)

  const [finalUsers, finalGames, finalVenues, finalReservations] = await Promise.all([
    User.countDocuments(),
    Game.countDocuments(),
    Venue.countDocuments(),
    Reservation.countDocuments(),
  ])
  console.log(`[seed] Users: ${finalUsers}`)
  console.log(`[seed] Games: ${finalGames}`)
  console.log(`[seed] Venues: ${finalVenues}`)
  console.log(`[seed] Reservations: ${finalReservations}`)
}

main()
  .catch((err) => {
    console.error(`[seed] Error: ${err.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDB()
    }
  })
