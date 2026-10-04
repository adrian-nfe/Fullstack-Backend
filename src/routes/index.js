import { Router } from 'express'

import authRoutes from './auth.routes.js'
import gameRoutes from './game.routes.js'
import reservationRoutes from './reservation.routes.js'
import venueRoutes from './venue.routes.js'

const apiRouter = Router()

apiRouter.use('/auth', authRoutes)
apiRouter.use('/games', gameRoutes)
apiRouter.use('/venues', venueRoutes)
apiRouter.use('/reservations', reservationRoutes)

export default apiRouter
