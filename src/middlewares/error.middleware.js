export function errorMiddleware(err, _req, res, _next) {
  let status = err.status ?? err.statusCode ?? 500
  let message = err.message || 'Error interno del servidor'

  if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'El cuerpo de la petición no es un JSON válido'
  } else if (err.name === 'ZodError') {
    status = 400
    message = err.issues[0]?.message ?? 'Datos no válidos'
  } else if (err.name === 'ValidationError') {
    status = 400
    message = Object.values(err.errors)[0]?.message ?? 'Datos no válidos'
  } else if (err.name === 'MulterError') {
    status = 400
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen supera el tamaño máximo de 2 MB'
        : 'No hemos podido procesar la imagen'
  } else if (err.name === 'CastError') {
    status = 400
    message = 'Identificador no válido'
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0]
    status = 409
    message = field === 'email' ? 'Ese email ya está registrado' : `Ese valor de "${field}" ya existe`
  }

  if (status >= 500) {
    console.error(err)
  }

  res.status(status).json({ status, message })
}
