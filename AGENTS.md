# UniRoom Agent Instructions

## Project Overview
Monorepo with Bun/Elysia backend + React Native/Expo mobile app. PostgreSQL database via Docker.

## Quick Start

### Database
```powershell
docker-compose up -d  # Starts PostgreSQL on port 5435
```

### Backend
```powershell
cd backend/app
bun install
bun run dev  # Runs on http://localhost:3000
```

### Mobile
```powershell
cd mobile/uniroom
npm install
npx expo start
```

## Key Commands

| Task | Command |
|------|---------|
| Run migrations | `cd backend/app && npx prisma migrate dev --name <name>` |
| Generate Prisma client | `cd backend/app && npx prisma generate` |
| DB visual editor | `cd backend/app && npx prisma studio` |
| Reset DB (nuclear) | `docker-compose down`, delete `uniroom_data` volume, `docker-compose up -d` |

## Architecture

- **Backend entry**: `backend/app/src/index.ts` (Elysia on port 3000)
- **Mobile entry**: `mobile/uniroom/`
- **DB schema**: `backend/app/prisma/schema.prisma`
- **Routes**: Auth, users, payments, citas, inmuebles, notificacion, calificaciones

## Environment Variables

### `backend/.env`
```
DATABASE_URL="postgresql://uniroom_user:12345@127.0.0.1:5435/uniroom?schema=public&connect_timeout=30&sslmode=disable"
JWT_SECRET="your_secret"
RESEND_API_KEY="re_xxxxx"
```

### `mobile/uniroom/.env`
```
MAPBOX_TOKEN="provided externally"
```

## Important Notes
- Use port **5435** for PostgreSQL (5432 conflicts on Windows)
- Use `127.0.0.1`, NOT `localhost` in DATABASE_URL
- Backend uses Bun + Elysia (not vanilla Node.js/Express)
- Maps feature only works on mobile, not web
- Email verification uses Resend for OTP emails

## Profile Feature Context

### EditProfile Screen (`mobile/uniroom/src/screens/EditProfile.tsx`)
- Nueva pantalla para editar perfil de usuario
- Campos editables: nombre, apellidos, teléfono, género, foto de perfil
- Email es **solo lectura** (no editable por seguridad)
- Recibe via `route.params`: `userId`, `token`, `userData` (datos actuales del usuario)
- Sube fotos a `POST /users/:id/upload-foto` (multipart/form-data)
- Actualiza datos con `PUT /users/:id` (application/json)
- Usa flag `photoChanged` para distinguir foto nueva vs existente
- Al guardar exitosamente, hace `navigation.goBack()`

### ProfileScreen (`mobile/uniroom/src/screens/ProfileScreen.tsx`)
- Botón "Editar Perfil" navega a `EditProfile` pasando `{ userId, token, userData }`
- Usa `navigation.addListener('focus', ...)` para re-fetch datos al volver de EditProfile
- Así los cambios se reflejan inmediatamente sin reiniciar la app

### Navigation (`mobile/uniroom/src/screens/NavigationMenu.tsx`)
- `EditProfile` registrado como Stack.Screen modal dentro de `Profile_Menu`

### Backend (`backend/app/src/routes/users.ts`)
- Endpoint `POST /users/:id/upload-foto` — recibe imagen via multipart/form-data, guarda en `./uploads/`, actualiza DB
- Endpoint `PUT /users/:id` — ya existía, acepta campos parciales (nombre, apellidos, numero_contacto, genero, foto como string)
- Fotos servidas via `@elysiajs/static` con prefix `/public`
- `t.File()` funciona nativamente en Elysia 1.x (no requiere @elysiajs/form-data)

### Paleta de colores
| Uso | Color |
|-----|-------|
| Fondo general | `#DCEEFF` |
| Botones principales | `#205EA6` |
| Texto principal | `#0F2C4F` |
| Cards / inputs | `#FFFFFF` |
| Acentos / selección | `#3498DB` |

## Citas & Navigation Context

### Navigation Fix (Nested Nav)
- **Problem**: `InmuebleScreen` is a Root Modal. Direct navigation to deep screens like `AgendarCita` failed because they were inside a nested Tab/Stack.
- **Solution**: Use full path for nested navigation. 
  ```javascript
  navigation.navigate("Navigator", {
      screen: "Inmuebles",
      params: {
          screen: "AgendarCita",
          params: { inmueble, token }
      }
  })
  ```
- **Context**: Root (App.tsx) -> "Navigator" (NavigationMenu.tsx) -> "Inmuebles" (Tab) -> "AgendarCita" (Stack Screen).

### Appointment System (Citas & Disponibilidad)
- **DB Schema (`schema.prisma`)**:
    - `Disponibilidad`: Stores dates (`fecha`: String) and time slots (`horas`: String[]) per property (`id_inmueble`).
    - `Cita`: Stores actual requested appointments between `Usuario` (Student) and `Inmueble`.
- **Backend (`backend/app/src/routes/inmuebles.ts`)**:
    - `POST /` & `PUT /:id`: Handle `horariosVisita` from `FormData`.
    - `GET /:id`: Returns `disponibilidad` array in the property JSON.
- **Rental Upload (`Upload_Renta.tsx`)**:
    - Landlords define visit schedules using a calendar and time picker.
    - Data is sent as a JSON string within `FormData` under the key `horariosVisita`.
- **Agendar Cita (`AgendarCita.tsx`)**:
    - Dynamically fetches property availability from `/inmuebles/:id`.
    - Allows students to select a slot and calls `POST /citas/solicitar`.
    - Integrated with the Payment flow (tarifa de servicio).

## Calificaciones y Reseñas System

### DB Schema (`schema.prisma`)
- Model `Calificacion` already exists with: `id_calificacion`, `calificacion (Int)`, `descripcion (String?)`, `id_estudiante`, `id_inmueble`.
- Linked to `Usuario` (as `estudiante`) and `Inmueble`.

### Backend Routes

#### `POST /calificaciones` (`calificaciones.ts`)
- Authenticated via JWT (same `.derive()` pattern as `users.ts`).
- Body: `{ id_inmueble (number), calificacion (int 1-5), comentario? (string) }`.
- Prevents duplicate reviews (checks if student already rated this property).
- Creates record in `Calificacion` table.
- Returns `{ success: true }`.

#### `GET /inmuebles/:id` (`inmuebles.ts`)
- Now includes `calificaciones` with `estudiante: { nombre, apellidos, foto }` in the response.
- Frontend calculates average rating from the `calificaciones` array.

### Frontend Screens

#### `HomeScreen.tsx` — Post-Cancellation Rating Modal
- After canceling a rental (`DELETE /users/:id/cancelar-renta` → success), opens rating modal.
- Modal features:
  - Title: "¿Cómo calificas tu experiencia?"
  - 5 selectable stars (rating 0 = no rating, sends directly).
  - Optional text input for comment.
  - "Omitir" button (top-right) → confirmation modal: "Tu opinión puede ayudar a más usuarios".
  - "Enviar calificación" button → calls `POST /calificaciones`.
- States: `modalCalificacionVisible`, `modalOmitirVisible`, `rating`, `comentario`, `enviando`.
- Images use `getMediaUri()` helper for dynamic IP resolution.

#### `InmuebleScreen.tsx` — Real Reviews Display
- Calculates `ratingPromedio` from `inmueble.calificaciones` array (average of all ratings).
- Shows `totalOpiniones` = `calificaciones.length`.
- If no reviews, shows "Aún no hay reseñas" placeholder.
- Reviews section (previously commented out) now active:
  - Header with star icon and review count.
  - Collapsible with chevron toggle (`verComentarios` state).
  - Each review shows: student name, mini star rating (1-5), comment text, student avatar.
  - Only reviews with non-empty `descripcion` are displayed.
  - Student avatar uses `getMediaUri()` for dynamic IP; falls back to `ANFITRION` default image.
- Added `getMediaUri()` helper function for consistent image URL resolution.

#### `api.ts`
- Added: `crearCalificacion(data)` — POST to `/calificaciones`.

### Media URI Resolution Pattern
- **Problem**: Backend returns relative paths (e.g., `/public/houses/...`, `/public/1777916351144-...png`). On physical devices, `localhost` doesn't resolve to the backend server.
- **Solution**: Use `Constants.expoConfig?.hostUri` to detect device IP and prepend it to relative paths.
- **Helper function** (used in `HomeScreen.tsx` and `InmuebleScreen.tsx`):
  ```javascript
  const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
  const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';
  
  const getMediaUri = (src) => {
      if (!src) return 0;
      if (src.startsWith("http")) return { uri: src };
      return { uri: `${API_BASE_URL}${src}` };
  };
  ```

## Auth Derive Pattern (Elysia 1.x)

### Critical Pattern for `users.ts`
- Elysia 1.x `.derive()` **does NOT short-circuit** on early return. When auth fails, the derive returns `{ error: "..." }` but the route handler still executes, causing `authenticatedUser.rol` to throw on `undefined`.
- **Solution**: Use try-catch around `jwt.verify()` in derive, and add `if ("error" in (authenticatedUser as any)) return authenticatedUser;` at the top of each route handler.
- Example in `users.ts`:
  ```typescript
  .derive(async ({ jwt, headers: { authorization }, set }) => {
    if (!authorization?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "No autorizado" };
    }
    const token = authorization.slice(7);
    let payload: any;
    try {
      payload = await jwt.verify(token);
    } catch {
      set.status = 401;
      return { error: "Token inválido" };
    }
    // ... rest of auth logic
  })
  ```

## Rental System (Renta Flow)

### DB Schema (`schema.prisma`)
- `EstadoCita`: Extended with `REALIZADA`, `RENTA_APROBADA`, `RENTA_RECHAZADA`.
- `Inmueble`: Added `id_estudiante_autorizado` (String), `fecha_inicio_renta` (DateTime?), `fecha_fin_renta` (DateTime?).
- `Notificacion`: Added `relacionado_a` (String?) for rental relation tracking.
- `Cita`: Already linked to `Usuario` and `Inmueble`.

### WebSocket Server (`backend/app/src/ws-server.ts`)
- Runs on port **3001** alongside the main API server.
- Clients connect via `ws://<host>:3001`.
- Supports message types: `register` (subscribe to user channel), `ping`/`pong` (keep-alive).
- Backend sends notifications via `wsServer.sendToUser(userId, payload)`.

### Backend Routes

#### `POST /citas/:id/realizada` (`citas.ts`)
- Marks a visit as completed (`estado: "REALIZADA"`).
- Only accessible to the landlord of the property.
- Triggers WebSocket + DB notification to the student: "Tu visita fue marcada como completada. Ya puedes rentar este inmueble si deseas."

#### `PATCH /citas/:id/decision-renta` (`citas.ts`)
- Landlord approves (`APROBAR`) or rejects (`RECHAZAR`) a rental request.
- On approve: sets `id_estudiante_autorizado` on the property, updates `Cita.estado` to `RENTA_APROBADA`.
- On reject: updates `Cita.estado` to `RENTA_RECHAZAR`, clears `id_estudiante_autorizado`.
- Triggers notification to student with the decision.

#### `POST /payments/process-renta` (`payments.ts`)
- Receives `{ mp_order_id, monto, id_inmueble }`.
- Verifies payment with Mercado Pago.
- On success: sets `estado: "OCUPADO"` on the property, sets `fecha_inicio_renta` to now, `fecha_fin_renta` to +1 month.
- Triggers notification to student: "¡Tu renta fue confirmada! Contrato activo por 1 mes."

#### `GET /users/:id/renta-actual` (`users.ts`)
- Returns the active rental for the user if they have one.
- Response includes: `titulo`, `precio_mensual`, `fecha_inicio_renta`, `fecha_fin_renta`, `estado`, `media` (up to 4 items with `src` and `tipo`), `arrendador` (nombre, numero_contacto, foto), `servicios`, `restricciones`, `dias_restantes`, `fecha_inicio_str`, `fecha_fin_str`.
- Returns `{ rentaActual: null }` if no active rental.

#### `DELETE /users/:id/cancelar-renta` (`users.ts`)
- Cancels the active rental for the user.
- Sets `estado: "DISPONIBLE"` on the property, clears `id_estudiante_autorizado`, `fecha_inicio_renta`, `fecha_fin_renta`.
- Returns success message.

#### `GET /inmuebles/:id` (`inmuebles.ts`)
- Now returns `puede_rentar` (boolean): true if the user has a `REALIZADA` cita for this property.
- Now returns `usuario_actualmente_rentando` (boolean): true if the requesting user already has an active lease elsewhere.

### Frontend Screens

#### `HomeScreen.tsx`
- Fetches active rental via `obtenerRentaActual(userId)` on mount.
- Displays: property title, price, contract dates with timeline, landlord info, services, rules, and a gallery of media (images + videos).
- Provides a "Cancelar contrato" option via a modal.
- If no active rental, shows a placeholder with a button to explore properties.

#### `InmuebleScreen.tsx`
- Checks `usuario_actualmente_rentando` from the API response.
- If true, shows a disabled "Rentar" button with a lock icon and "Ya tienes una renta activa" text.
- If `puede_rentar` is true and not already renting, shows the "Rentar" button (opens confirmation modal → PaymentScreen).
- Otherwise, shows "Agendar Cita" button.

#### `NotificationScreen.tsx`
- Handles new notification types: `VISITA_REALIZADA`, `RENTA_APROBADA`, `RENTA_RECHAZADA`, `RENTA_CONFIRMADA`.
- For `RENTA_APROBADA`: shows a "Proceder al Pago" button that navigates to PaymentScreen with the property info.
- For `RENTA_RECHAZADA`: shows a "Ver otros inmuebles" button.
- Uses WebSocket for real-time updates via `websocketService`.

#### `PaymentScreen.tsx`
- Updated to handle `tipo: "renta"` with dynamic amount from `route.params.monto`.
- On successful rent payment, calls `POST /payments/process-renta`.

#### `api.ts`
- Added: `marcarCitaRealizada(id)`, `decisionRenta(id, decision)`, `obtenerRentaActual(userId)`, `cancelarRenta(userId)`, `crearCalificacion(data)`.

#### `websocketService.ts`
- Uses dynamic host IP via `Constants.expoConfig?.hostUri`.
- Connects to `ws://<host>:3001`.
- Exposes `send`, `onMessage`, `disconnect`.

## Map Screen & Filters System

### Overview
The MapScreen displays properties on a Mapbox map with real-time filtering capabilities.

### Backend Changes (`backend/app/src/routes/inmuebles.ts`)
- **New query parameters** for `GET /inmuebles`:
  - `precioMax` (string): Filters properties with `precio_mensual <= value` in DB
  - `servicios` (string, comma-separated): Filters using `servicios: { some: { nombre: { in: [...] } } }` in DB
  - `restricciones` (string, comma-separated): Filters using `restricciones: { some: { nombre: { in: [...] } } }` in DB
  - `distanciaMax` (string): Post-query filter using Haversine formula (distance from TEC_ITM)
  - `calificacionMin` (string): Post-query filter based on average rating from `calificaciones`

### Frontend Changes (`mobile/uniroom/src/screens/MapScreen.tsx`)
- **`fetchInmuebles(filtros?)`**: Now accepts optional filter object and builds `URLSearchParams` for API call
- **`filtrarInmuebles(datos)`**: Calls API with filters directly (no local filtering)
- **Camera reset on filter**: Uses `setTimeout(500ms)` with `cameraRef.current.setCamera()` to avoid race conditions with Mapbox viewport adjustments
  - Repositions to TEC_ITM (19.721869, -101.185483) with zoom 14.5
  - Uses `animationMode: 'flyTo'` for smooth animation
  - Dependency array: `[mapaListo, inmuebles]` to trigger on filter changes

### Frontend Changes (`mobile/uniroom/src/screens/FiltrosModal.tsx`)
- **Fixed toggle deselection**: Replaced `toggleItem` helper with inline functional state updates
  - Services: `setServicios(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s])`
  - Restrictions: Same pattern as services
  - Star rating: `setEstrellasMin(prev => prev === s ? 0 : s)` (tap again to deselect)
  - Distance chips: Tap again to reset to default (5km)
- **Added console.log** for debugging filter toggles

### Filter Behavior
1. User selects filters in modal and taps "Aplicar Filtros"
2. Modal closes, `filtrarInmuebles()` is called
3. API is called with query params: `GET /inmuebles?precioMax=3000&servicios=WiFi,Luz...`
4. Backend filters in DB (price, services, restrictions) and post-query (distance, rating)
5. Filtered results return to frontend
6. `inmuebles` state updates → triggers useEffect
7. After 500ms delay, camera repositions to TEC_ITM with zoom 14.5

### Important Notes
- Service/restriction names in FiltrosModal **must match** database exactly (e.g., "WiFi" in modal = "WiFi" in DB)
- Camera uses `setTimeout(500)` to win race condition against Mapbox's internal viewport adjustment
- No loading screen during filtering (map stays mounted, only pins update)
- Default distance chip is 5km (resets to this if user deselects)

## Development Lifecycle for Agents
1. **Migrations**: If changing `schema.prisma`, run `npx prisma db push` or `prisma migrate dev`.
2. **Backend**: If adding new data fields, ensure they are handled in both `POST` (create) and `PUT` (update) routes.
3. **Frontend**: Use `Constants.expoConfig?.hostUri` for API URLs to ensure connectivity on physical devices.
4. **Navigation**: Always verify if a target screen is in the same Navigator or requires nested path.
5. **WebSocket**: WS server runs on port 3001. Starts automatically with `bun run dev` in `backend/app`.
6. **Rental Flow**: Visit → Mark as Done → Student requests rent → Landlord approves → Student pays → Contract active (1 month).
7. **Map Filters**: When adding new filter types, update both backend query params and frontend URL builder in `fetchInmuebles()`.