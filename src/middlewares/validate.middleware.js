import { AppError } from '../utils/app-error.util.js'

export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const raw = source === 'query' ? req.query : (req[source] ?? {})
    const result = schema.safeParse(raw ?? {})
    if (!result.success) {
      const first = result.error.issues[0]
      next(new AppError(first?.message ?? 'Datos no válidos', 400))
      return
    }
    if (source === 'query') {
      req.validatedQuery = result.data
    } else {
      req[source] = result.data
    }
    next()
  }
}
