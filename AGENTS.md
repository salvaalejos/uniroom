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