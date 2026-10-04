import { Router } from 'express'

import {
  createVenue,
  getAvailability,
  getVenue,
  listVenueOwners,
  listVenues,
  updateVenue,
} from '../controllers/venue.controller.js'
import { protect, optionalAuth } from '../middlewares/auth.middleware.js'
import { authorize } from '../middlewares/roles.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  availabilityQuerySchema,
  createVenueSchema,
  patchVenueSchema,
  venuesQuerySchema,
} from '../validators/venue.validator.js'

const venueRouter = Router()

venueRouter.get('/', optionalAuth, validate(venuesQuerySchema, 'query'), listVenues)
venueRouter.get('/owners', protect, authorize('admin'), listVenueOwners)
venueRouter.get('/:id', optionalAuth, getVenue)
venueRouter.get('/:id/availability', validate(availabilityQuerySchema, 'query'), getAvailability)
venueRouter.post('/', protect, authorize('admin'), validate(createVenueSchema), createVenue)
venueRouter.patch('/:id', protect, authorize('venue', 'admin'), validate(patchVenueSchema), updateVenue)

export default venueRouter
