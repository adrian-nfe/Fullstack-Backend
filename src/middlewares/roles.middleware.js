import { AppError } from '../utils/app-error.util.js'

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError('No has iniciado sesión', 401))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError('No tienes permisos para esta acción', 403))
      return
    }
    next()
  }
}
