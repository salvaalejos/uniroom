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
- **Routes**: Auth, users, payments, citas, inmuebles, notificacion

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

## Development Lifecycle for Agents
1. **Migrations**: If changing `schema.prisma`, run `npx prisma db push` or `prisma migrate dev`.
2. **Backend**: If adding new data fields, ensure they are handled in both `POST` (create) and `PUT` (update) routes.
3. **Frontend**: Use `Constants.expoConfig?.hostUri` for API URLs to ensure connectivity on physical devices.
4. **Navigation**: Always verify if a target screen is in the same Navigator or requires nested path.