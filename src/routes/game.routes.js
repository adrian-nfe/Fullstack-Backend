import { Router } from 'express'

import {
  createGame,
  getGame,
  listGames,
  removeGameImage,
  setGameImage,
  updateGame,
} from '../controllers/game.controller.js'
import { authorize } from '../middlewares/roles.middleware.js'
import { optionalAuth, protect } from '../middlewares/auth.middleware.js'
import { rejectImageField, uploadGameImage } from '../middlewares/upload.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { createGameSchema, gamesQuerySchema, patchGameSchema } from '../validators/game.validator.js'

const gameRouter = Router()

gameRouter.get('/', optionalAuth, validate(gamesQuerySchema, 'query'), listGames)
gameRouter.get('/:id', optionalAuth, getGame)
gameRouter.post('/', protect, authorize('admin'), rejectImageField('imageUrl'), validate(createGameSchema), createGame)
gameRouter.patch('/:id', protect, authorize('admin'), rejectImageField('imageUrl'), validate(patchGameSchema), updateGame)
gameRouter.post('/:id/image', protect, authorize('admin'), uploadGameImage, setGameImage)
gameRouter.delete('/:id/image', protect, authorize('admin'), removeGameImage)

export default gameRouter
