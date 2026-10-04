import { Router } from 'express'

import {
  createReservation,
  getReservation,
  listReservations,
  updateReservation,
} from '../controllers/reservation.controller.js'
import { protect } from '../middlewares/auth.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  createReservationSchema,
  patchReservationSchema,
  reservationsQuerySchema,
} from '../validators/reservation.validator.js'

const reservationRouter = Router()

reservationRouter.use(protect)

reservationRouter.get('/', validate(reservationsQuerySchema, 'query'), listReservations)
reservationRouter.get('/:id', getReservation)
reservationRouter.post('/', validate(createReservationSchema), createReservation)
reservationRouter.patch('/:id', validate(patchReservationSchema), updateReservation)

export default reservationRouter
