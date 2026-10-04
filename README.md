# MesaNexo · Backend

API de **MesaNexo**, una aplicación para encontrar cafeterías de juegos de mesa en Madrid, consultar qué mesas están libres a una hora concreta y reservar partida para grupos de 1 a 10 personas.

Este repositorio contiene solo el servidor (Express + MongoDB). El cliente está en https://github.com/adrian-nfe/Fullstack-Frontend.

---

## 1. Stack

| Paquete | Uso |
|---------|-----|
| express | servidor HTTP |
| mongoose | modelos y conexión a MongoDB |
| dotenv | carga de `.env` |
| zod | validación de variables de entorno, body y query |
| jsonwebtoken | firma y verificación del JWT |
| bcryptjs | hash de contraseñas |
| cookie-parser | lectura de la cookie httpOnly `token` |
| cors | CORS con origen `CLIENT_URL` y credenciales |
| helmet | cabeceras de seguridad |
| morgan | log de peticiones HTTP (formato `dev`) |
| express-rate-limit | límite de peticiones en el login y el registro |
| csv-parse | parseo de los CSV del seed |
| multer | recepción de `multipart/form-data` |
| cloudinary | SDK oficial (v2) |
| multer-storage-cloudinary | storage de Multer que sube directamente a Cloudinary |

Requisitos: Node.js 20 o superior y **pnpm**. No se usa `nodemon`: el modo desarrollo usa `node --watch`.

## 2. Arquitectura

```text
scripts/
  seed.js            siembra la base desde data/*.csv
data/                users.csv, games.csv, venues.csv, reservations.csv
src/
  server.js          arranque: dotenv → connectDB → listen
  app.js             Express: middlewares globales, rutas y errores
  config/            env (zod), db, cloudinary
  models/            User, Game, Venue, Reservation + index.js
  controllers/       auth, game, venue, reservation
  routes/            /auth, /games, /venues, /reservations (montadas bajo /api)
  middlewares/       auth (protect, optionalAuth), roles, validate, upload, error
  services/          availability.service (solapes y mesas libres del día)
  validators/        esquemas zod por dominio
  utils/             async-handler, app-error, parse-csv, active-filter,
                     time (horarios), regex, cloudinary-delete
```

Flujo de una petición:

```text
helmet → cors → morgan → express.json → cookieParser
  → router (auth → roles → validate → controller) → errorMiddleware
```

Los errores se devuelven siempre como `{ status, message }` con el mensaje en español. Casos especiales: clave duplicada (`11000`) → 409, `CastError` → 400 y `MulterError` → 400.

## 3. Puesta en marcha

```bash
pnpm install
cp .env.example .env      # rellena MONGO_URI y JWT_SECRET
pnpm seed                 # siembra la base (debe estar vacía)
pnpm dev                  # http://localhost:4000
```

`GET /health` responde `{ "ok": true, "uploads": true | false }`; `uploads` indica si Cloudinary está configurado.

## 4. Datos y seed

Los datos de partida están en cuatro CSV dentro de `data/`: 12 usuarios, 80 juegos, 15 locales y 40 reservas (147 registros). El seed los lee con `fs.readFileSync` + `csv-parse/sync`; no hay datos escritos a mano en el código.

### Origen de los datos: hoja de cálculo

Los datos se preparan en una hoja de cálculo con una pestaña por colección (`users`, `venues`, `games`, `reservations`). [`data/mesanexo-seed.xlsx`](data/mesanexo-seed.xlsx)

Flujo: hoja de cálculo → cada pestaña se descarga como CSV en `data/` → `pnpm seed` lee los CSV y crea los documentos. El seed no lee el Excel; solo los CSV.

Las colecciones se relacionan por columnas de la propia hoja, que el seed resuelve a `ObjectId` al insertar:

| Pestaña | Columna | Apunta a |
|---------|---------|----------|
| `venues` | `ownerEmail` | `users.email` (dueño del local) |
| `reservations` | `userEmail` | `users.email` (quién reserva) |
| `reservations` | `venueExternalId` | `venues.externalId` |
| `reservations` | `gameExternalId` | `games.externalId` |


```bash
pnpm seed         # falla con un mensaje claro si la base ya tiene datos
pnpm seed:reset   # vacía las colecciones y vuelve a sembrar
```

Los usuarios se crean uno a uno con `User.create` para que el hook `pre('save')` del modelo cifre la contraseña con bcryptjs (coste 10).

Usuarios de prueba:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@mesanexo.dev | Admin1234! | admin |
| venue1@mesanexo.dev … venue3@mesanexo.dev | Venue1234! | venue (5 locales cada uno) |
| player1@mesanexo.dev … player8@mesanexo.dev | Player1234! | player |

## 5. Roles y autenticación

Roles: `player`, `venue` y `admin`.

| Acción | Quién |
|--------|-------|
| Ver catálogos y disponibilidad | cualquiera |
| Reservar, ver sus reservas y cancelarlas | cualquier usuario con sesión |
| Ver, cancelar las reservas de sus locales | `venue` propietario y `admin` |
| Editar un local | `venue` propietario y `admin` |
| Crear y editar juegos y locales, ver todas las reservas | `admin` |

- **Sesión**: al iniciar sesión el JWT se guarda en una cookie httpOnly `token` (`sameSite=lax`, `secure` solo en producción) y también se devuelve en el JSON.
- También se acepta la cabecera `Authorization: Bearer <token>`, útil para probar con curl o Postman.
- **Rate limit**: 20 peticiones cada 15 minutos por IP en `POST /api/auth/login` y `POST /api/auth/register` (429). El resto de `/api/auth` no tiene límite: `/me` se consulta en cada carga de página.

## 6. API

Base: `http://localhost:4000/api`

### Auth

| Método | Ruta | Acceso |
|--------|------|--------|
| POST | `/auth/register` | público |
| POST | `/auth/login` | público |
| POST | `/auth/logout` | público (sin efecto si no hay sesión) |
| GET | `/auth/me` | con sesión |
| PATCH | `/auth/me` (solo `name`) | con sesión |
| POST | `/auth/me/avatar` (multipart, campo `image`) | con sesión |
| DELETE | `/auth/me/avatar` | con sesión |

### Juegos

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/games` (`q`, `genre`, `minPlayers`, `maxPlayers`, `page`, `limit`, `isActive`) | público |
| GET | `/games/:id` | público |
| POST | `/games` | admin |
| PATCH | `/games/:id` | admin |
| POST | `/games/:id/image` (multipart, campo `image`) | admin |
| DELETE | `/games/:id/image` | admin |

### Locales

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/venues` (`q`, `neighborhood`, `mine=1`, `page`, `limit`, `isActive`) | público (`mine=1` requiere sesión) |
| GET | `/venues/owners` (usuarios con rol `venue` o `admin`) | admin |
| GET | `/venues/:id` | público |
| GET | `/venues/:id/availability?date=AAAA-MM-DD` | público |
| POST | `/venues` | admin |
| PATCH | `/venues/:id` | propietario o admin |

### Reservas

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/reservations` (`status`, `date`, `venue`, `page`, `limit`) | con sesión |
| GET | `/reservations/:id` | autor, propietario del local o admin |
| POST | `/reservations` | con sesión |
| PATCH | `/reservations/:id` (solo `status`) | autor: `cancelled`; propietario/admin: `confirmed` o `cancelled` |

`GET /reservations` devuelve solo lo que cada rol puede ver: el `player`, sus reservas; el `venue`, las suyas y las de sus locales; el `admin`, todas. El filtro `venue` solo lo aplica el admin. Sin `limit` se devuelven todas en una página. Una reserva cancelada no puede volver a confirmarse.

Reglas al crear una reserva:

- Mesa dentro de `1..venue.tables`.
- Jugadores dentro de `[game.minPlayers, game.maxPlayers]` (y siempre entre 1 y 10).
- Franja dentro del horario del local.
- Ni fechas pasadas ni, si la fecha es hoy, horas de inicio ya superadas (400).
- Sin solapes en el mismo local, fecha y mesa (**409** «Esa mesa ya está reservada en esa franja»).

### Horario de los locales

Los horarios no pueden cruzar al día siguiente. Un cierre a `00:00` significa medianoche (24:00): `16:00-00:00` es válido, mientras que `00:00-16:00` o dos horas iguales no lo son.

La regla está en `src/utils/time.util.js` (`isValidSchedule`) y se aplica en los validadores de creación y edición y, además, en `updateVenue` sobre el horario ya combinado con el guardado, para cubrir un `PATCH` que solo envía una de las dos horas. Un horario inválido nunca llega a la base (400).

### Registros inactivos

Juegos y locales no se borran: se desactivan con `isActive`.

- Los listados devuelven solo registros activos. El admin puede pedir `isActive=true | false | all`.
- `GET /games/:id` y `GET /venues/:id` responden **404** a un registro inactivo salvo para el admin.
- La regla vive en `utils/active-filter.util.js` (`canSeeInactive`).
- Las reservas existentes siguen mostrando el nombre del local o del juego aunque se desactiven, porque se resuelven con `populate`.

### Imágenes (Cloudinary)

- El cliente nunca envía URLs de imagen: el avatar y la imagen de un juego se suben en su propio endpoint. `PATCH /auth/me`, `POST /games` y `PATCH /games/:id` devuelven **400** si reciben `avatarUrl` o `imageUrl`.
- La carpeta la fija el servidor (`IMAGE_FOLDERS` en `config/cloudinary.config.js`): `project-3/avatars` y `project-3/games`.
- Se validan extensión, tipo MIME y tamaño máximo de **2 MB** antes de subir; si Cloudinary rechaza el archivo, el error se traduce a un mensaje claro en lugar de un 500.
- Al sustituir una imagen, primero se guarda la nueva y después se borra la anterior, solo si pertenece a nuestra nube y a la carpeta esperada. Si el borrado falla, la petición no falla: queda un aviso en el log.
- Si la subida funciona pero falla el guardado en MongoDB, se elimina la imagen recién subida.
- Sin Cloudinary configurado, los endpoints de subida responden **503** y el servidor arranca igualmente.

## 7. Variables de entorno

```text
NODE_ENV=development
PORT=4000
MONGO_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/mesanexo
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
TRUST_PROXY=1
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`TRUST_PROXY` es el número de proxies delante de la API en producción (por defecto 1). Se usa para que el límite de peticiones del login y el registro cuente por la IP real de cada cliente. En desarrollo se ignora.

`MONGO_URI` admite también una base local (`mongodb://127.0.0.1:27017/mesanexo`). Todas se validan al arrancar con zod (`config/env.config.js`); las de Cloudinary son opcionales.

## 8. Scripts

```bash
pnpm dev          # node --watch src/server.js
pnpm start        # node src/server.js
pnpm seed         # node scripts/seed.js
pnpm seed:reset   # node scripts/seed.js --reset
```
