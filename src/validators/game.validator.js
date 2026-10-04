import { z } from 'zod'

const hourRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const gameBase = z.object({
  externalId: z
    .string({ message: 'El identificador externo es obligatorio' })
    .trim()
    .min(1, 'El identificador externo es obligatorio'),
  name: z
    .string({ message: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  minPlayers: z.coerce
    .number({ message: 'El mínimo de jugadores debe ser un número' })
    .int()
    .min(1, 'El mínimo de jugadores es 1'),
  maxPlayers: z.coerce
    .number({ message: 'El máximo de jugadores debe ser un número' })
    .int()
    .min(1, 'El máximo de jugadores es 1'),
  playTimeMin: z.coerce
    .number({ message: 'La duración debe ser un número' })
    .int()
    .min(5, 'La duración mínima es de 5 minutos'),
  complexity: z.coerce
    .number({ message: 'La complejidad debe ser un número' })
    .min(1, 'La complejidad va de 1 a 5')
    .max(5, 'La complejidad va de 1 a 5'),
  genre: z.string({ message: 'El género es obligatorio' }).trim().min(1, 'El género es obligatorio'),
  publisher: z.string().trim(),
  year: z.coerce.number().int().optional(),
  language: z.string().trim(),
  description: z.string().trim(),
})

export const createGameSchema = gameBase
  .extend({
    publisher: z.string().trim().default(''),
    language: z.string().trim().default('es'),
    description: z.string().trim().default(''),
  })
  .refine((data) => data.maxPlayers >= data.minPlayers, {
    message: 'El máximo de jugadores no puede ser menor que el mínimo',
    path: ['maxPlayers'],
  })

export const patchGameSchema = gameBase
  .partial()
  .extend({
    isActive: z.boolean({ message: 'isActive debe ser verdadero o falso' }).optional(),
  })
  .refine(
    (data) =>
      data.minPlayers === undefined ||
      data.maxPlayers === undefined ||
      data.maxPlayers >= data.minPlayers,
    {
      message: 'El máximo de jugadores no puede ser menor que el mínimo',
      path: ['maxPlayers'],
    },
  )

export const gamesQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  genre: z.string().trim().toLowerCase().optional(),
  minPlayers: z.coerce.number().int().min(1).optional(),
  maxPlayers: z.coerce.number().int().min(1).optional(),
  isActive: z.enum(['true', 'false', 'all']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
})
