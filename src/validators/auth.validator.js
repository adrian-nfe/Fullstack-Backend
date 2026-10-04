import { z } from 'zod'

const nameSchema = z
  .string({ message: 'El nombre es obligatorio' })
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(80, 'El nombre no puede superar los 80 caracteres')

export const registerSchema = z.object({
  name: nameSchema,
  email: z
    .string({ message: 'El email es obligatorio' })
    .trim()
    .toLowerCase()
    .email('Introduce un email válido'),
  password: z
    .string({ message: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const loginSchema = z.object({
  email: z
    .string({ message: 'El email es obligatorio' })
    .trim()
    .toLowerCase()
    .email('Introduce un email válido'),
  password: z.string({ message: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
})

export const updateMeSchema = z.object({
  name: nameSchema.optional(),
})
