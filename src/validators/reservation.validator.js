import { z } from 'zod'

const hourRegex = /^([01]\d|2[0-3]):[0-5]\d$/
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export const createReservationSchema = z.object({
  venue: z.string({ message: 'El local es obligatorio' }).min(1, 'El local es obligatorio'),
  game: z.string({ message: 'El juego es obligatorio' }).min(1, 'El juego es obligatorio'),
  date: z
    .string({ message: 'La fecha es obligatoria' })
    .regex(dateRegex, 'La fecha debe tener formato AAAA-MM-DD'),
  startTime: z
    .string({ message: 'La hora de inicio es obligatoria' })
    .regex(hourRegex, 'La hora de inicio debe tener formato HH:MM'),
  endTime: z
    .string({ message: 'La hora de fin es obligatoria' })
    .regex(hourRegex, 'La hora de fin debe tener formato HH:MM'),
  players: z.coerce
    .number({ message: 'El número de jugadores debe ser un número' })
    .int()
    .min(1, 'Debe haber al menos 1 jugador')
    .max(10, 'No se admiten grupos tan grandes'),
  tableNumber: z.coerce
    .number({ message: 'La mesa debe ser un número' })
    .int()
    .min(1, 'La mesa debe ser como mínimo la 1'),
  notes: z.string().trim().max(500, 'Las notas no pueden superar los 500 caracteres').optional(),
})

export const patchReservationSchema = z.object({
  status: z.enum(['confirmed', 'cancelled'], {
    message: 'El estado solo puede ser confirmed o cancelled',
  }),
})

export const reservationsQuerySchema = z.object({
  status: z.enum(['confirmed', 'cancelled'], {
    message: 'El estado solo puede ser confirmed o cancelled',
  }).optional(),
  date: z.string().regex(dateRegex, 'La fecha debe tener formato AAAA-MM-DD').optional(),
  venue: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'El local no es válido')
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
})
