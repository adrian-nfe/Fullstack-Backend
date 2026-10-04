import { Game } from '../models/index.js'
import { IMAGE_FOLDERS } from '../config/cloudinary.config.js'
import { AppError } from '../utils/app-error.util.js'
import { asyncHandler } from '../utils/async-handler.util.js'
import { applyActiveFilter, canSeeInactive } from '../utils/active-filter.util.js'
import { destroyOwnedImage } from '../utils/cloudinary-delete.util.js'
import { escapeRegex } from '../utils/regex.util.js'

export const listGames = asyncHandler(async (req, res) => {
  const { q, genre, minPlayers, maxPlayers, isActive, page, limit } = req.validatedQuery

  const filter = applyActiveFilter({}, isActive, req.user)
  if (q) {
    filter.name = { $regex: escapeRegex(q), $options: 'i' }
  }
  if (genre) {
    filter.genre = genre
  }
  if (minPlayers !== undefined) {
    filter.maxPlayers = { $gte: minPlayers }
  }
  if (maxPlayers !== undefined) {
    filter.minPlayers = { $lte: maxPlayers }
  }

  const [total, items] = await Promise.all([
    Game.countDocuments(filter),
    Game.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ])

  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})

export const getGame = asyncHandler(async (req, res) => {
  const game = await Game.findById(req.params.id)
  if (!game || (!game.isActive && !canSeeInactive(req.user))) {
    throw new AppError('No hemos encontrado ese juego', 404)
  }
  res.json({ game })
})

export const createGame = asyncHandler(async (req, res) => {
  const game = await Game.create(req.body)
  res.status(201).json({ game })
})

export const updateGame = asyncHandler(async (req, res) => {
  const game = await Game.findById(req.params.id)
  if (!game) {
    throw new AppError('No hemos encontrado ese juego', 404)
  }

  Object.assign(game, req.body)

  if (game.maxPlayers < game.minPlayers) {
    throw new AppError('El máximo de jugadores no puede ser menor que el mínimo', 400)
  }

  await game.save()

  res.json({ game })
})

function destroyGameImage(url) {
  return destroyOwnedImage({ url, folder: IMAGE_FOLDERS.game })
}

export const setGameImage = asyncHandler(async (req, res) => {
  const game = await Game.findById(req.params.id)
  if (!game) {
    throw new AppError('No hemos encontrado ese juego', 404)
  }
  if (!req.file?.path) {
    throw new AppError('No hemos recibido ninguna imagen', 400)
  }

  const previous = game.imageUrl || ''
  const next = req.file.path

  game.imageUrl = next
  try {
    await game.save()
  } catch (err) {
    await destroyGameImage(next)
    throw err
  }

  if (previous && previous !== next) {
    await destroyGameImage(previous)
  }

  res.json({ game })
})

export const removeGameImage = asyncHandler(async (req, res) => {
  const game = await Game.findById(req.params.id)
  if (!game) {
    throw new AppError('No hemos encontrado ese juego', 404)
  }

  const previous = game.imageUrl || ''

  game.imageUrl = ''
  await game.save()

  if (previous) {
    await destroyGameImage(previous)
  }

  res.json({ game })
})
