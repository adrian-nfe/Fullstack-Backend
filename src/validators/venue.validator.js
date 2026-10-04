import { z } from 'zod'

import { isValidSchedule } from '../utils/time.util.js'

const hourRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const VENUE_HOURS_ERROR = 'La hora de cierre debe ser posterior a la de apertura'

const venueBase = z.object({
  externalId: z
    .string({ message: 'El identificador externo es obligatorio' })
    .trim()
    .min(1, 'El identificador externo es obligatorio'),
  name: z
    .string({ message: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  neighborhood: z
    .string({ message: 'El barrio es obligatorio' })
    .trim()
    .min(1, 'El barrio es obligatorio'),
  address: z
    .string({ message: 'La dirección es obligatoria' })
    .trim()
    .min(1, 'La dirección es obligatoria'),
  tables: z.coerce
    .number({ message: 'El número de mesas debe ser un número' })
    .int()
    .min(1, 'Debe haber al menos 1 mesa'),
  openingHour: z
    .string({ message: 'La hora de apertura es obligatoria' })
    .regex(hourRegex, 'La hora de apertura debe tener formato HH:MM'),
  closingHour: z
    .string({ message: 'La hora de cierre es obligatoria' })
    .regex(hourRegex, 'La hora de cierre debe tener formato HH:MM'),
  pricePerHour: z.coerce
    .number({ message: 'El precio por hora debe ser un número' })
    .min(0, 'El precio por hora no puede ser negativo'),
  owner: z
    .string({ message: 'El propietario es obligatorio' })
    .min(1, 'El propietario es obligatorio'),
  description: z.string().trim().default(''),
})

export const createVenueSchema = venueBase.refine(
  (data) => isValidSchedule(data.openingHour, data.closingHour),
  { message: VENUE_HOURS_ERROR, path: ['closingHour'] },
)

export const patchVenueSchema = venueBase
  .omit({ owner: true })
  .partial()
  .extend({
    isActive: z.boolean({ message: 'isActive debe ser verdadero o falso' }).optional(),
  })
  .refine(
    (data) =>
      data.openingHour === undefined ||
      data.closingHour === undefined ||
      isValidSchedule(data.openingHour, data.closingHour),
    { message: VENUE_HOURS_ERROR, path: ['closingHour'] },
  )

export const venuesQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().max(80).optional(),
  mine: z.enum(['0', '1']).optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
})

export const availabilityQuerySchema = z.object({
  date: z
    .string({ message: 'La fecha es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha es obligatoria con formato AAAA-MM-DD'),
})
