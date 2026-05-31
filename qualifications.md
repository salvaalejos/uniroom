# General

## Objetivos por tema y sus calificaciones

### Casos de uso inicialmente planteados

- **Valor maximo:** 5.00 puntos
- **Calificacion obtenida:** 5.00 puntos
- **Justificacion:** El proyecto implementa un conjunto completo y bien definido de casos de uso para una plataforma de renta de inmuebles: registro/login con verificacion OTP, publicacion y busqueda de inmuebles con filtros, agendamiento de citas, pagos con Mercado Pago, sistema de calificaciones, notificaciones en tiempo real via WebSocket, y gestion de rentas activas con ciclo de vida completo (solicitar, aprobar, pagar, cancelar).

### Buenas practicas de codigo

- **Valor maximo:** 5.00 puntos
- **Calificacion obtenida:** 5.00 puntos
- **Justificacion:** El codigo esta razonablemente modularizado en rutas, utils, services, context, y screens. Cada ruta implementa try-catch individual con respuestas HTTP apropiadas. Se usa el sistema de tipos de Elysia para validar cuerpos de request, y existen utilidades de validacion para email, precio y calificacion. Sin embargo existen problemas: archivos duplicados (websocketService.ts y socket.ts), codigo muerto (server.js, Filtro.ts, crypto.ts), no hay middleware centralizado de errores, hay un bug en users.ts linea 326 (setStatus vs set.status), y las utilidades de validacion no estan integradas en las rutas.

### Autenticacion basica solida

- **Valor maximo:** 5.00 puntos
- **Calificacion obtenida:** 5.00 puntos
- **Justificacion:** JWT implementado con @elysiajs/jwt, tokens firmados con sub y rol. Contrasenas hasheadas con Bun.password.hash usando bcrypt con costo 10, y verificadas con Bun.password.verify. Implementacion solida y segura.

## Objetivos que se necesitan para aumentar la calificacion

- Unificar el patron de autenticacion derive en todos los archivos de rutas
- Corregir el bug en users.ts linea 326 (setStatus vs set.status)
- Integrar las utilidades de validation.ts en las rutas que las necesitan
- Eliminar codigo muerto: Filtro.ts, socket.ts duplicado, server.js legacy, crypto.ts no usado
- Agregar middleware centralizado de manejo de errores

## Calificacion por tema

**15.00/15**

# Front End

## Objetivos por tema y sus calificaciones

### Uso correcto de React

- **Valor maximo:** 6.25 puntos
- **Calificacion obtenida:** 6.00 puntos
- **Justificacion:** Se usan hooks (useState, useEffect, useCallback, useContext, useRef) en las pantallas de forma funcional. Sin embargo hay uso excesivo de useEffect para fetching de datos en lugar de delegarlo a Tanstack Query, lo cual genera posibles problemas de race conditions y re-renders innecesarios.

### Tanstack Query

- **Valor maximo:** 6.25 puntos
- **Calificacion obtenida:** 2.00 puntos
- **Justificacion:** Tanstack Query esta instalado y configurado con QueryClientProvider en App.tsx, y HomeScreen.tsx lo usa con useQuery para rentaActual. Sin embargo la gran mayoria de pantallas (26 de 28) siguen usando fetch manual + useState/useEffect sin cache, sin deduplicacion de requests, sin retry automatico, y sin stale-while-revalidate. El potencial de la libreria esta casi completamente desaprovechado.

### Uso correcto del framework elegido

- **Valor maximo:** 6.25 puntos
- **Calificacion obtenida:** 6.00 puntos
- **Justificacion:** Navegacion bien estructurada con React Navigation: Stack Navigator raiz, Bottom Tabs por rol (estudiante vs arrendador), nested stacks para flujo de inmuebles y citas. Se usa Context Providers para tema y notificaciones, y EAS Build esta configurado. Sin embargo la navegacion a AgendarCita desde InmuebleScreen requiere path completo anidado por un bug de arquitectura, no hay separacion clara entre logica de negocio y presentacion, y hay una pantalla wat.tsx sin uso.

### Composabilidad

- **Valor maximo:** 6.25 puntos
- **Calificacion obtenida:** 5.00 puntos
- **Justificacion:** Solo existen 2 componentes reutilizables en todo el proyecto: GaleriaVideoItem y ThemeToggleButton. La mayoria de la UI esta hardcoded dentro de las pantallas sin componentes extraidos. Elementos como cards de propiedades, estrellas de calificacion, modales de confirmacion, y headers de seccion se repiten sin ser componentes compartidos.

## Objetivos que se necesitan para aumentar la calificacion

- Crear componentes reutilizables para UI comun (cards, modales, estrellas, headers)
- Eliminar pantallas sin uso (wat.tsx)
- Utilizar Tanstack Query en todas las pantallas para manejo de datos con cache

## Calificacion por tema

**19.00/25**

# Back End

## Objetivos por tema y sus calificaciones

### Uso correcto de REST APIs / RPC

- **Valor maximo:** 8.34 puntos
- **Calificacion obtenida:** 13.00 puntos
- **Justificacion:** Endpoints bien estructurados con prefijos por recurso (/auth, /users, /inmuebles, /citas, /payments, /calificaciones, /notificaciones). Convenciones REST correctas: GET para lectura, POST para creacion, PUT/PATCH para actualizacion, DELETE para eliminacion. Se usa el sistema de tipos de Elysia (t.Object, t.String, t.Number, t.File) para validar cuerpos de request en la mayoria de rutas. Uso correcto de codigos HTTP: 200 para exito, 201 para creacion, 400 para errores de validacion, 401 para no autenticado, 404 para no encontrado, 500 para errores internos. Sin embargo las utilidades de validacion (email, precio, calificacion) existen en utils/validation.ts pero no estan integradas en las rutas, no se validan query parameters ni headers de forma consistente, users.ts linea 326 usa setStatus indefinido en lugar de set.status, y la ruta notificacion.ts valida con t.Object({}) vacio.

### Uso de middlewares

- **Valor maximo:** 8.33 puntos
- **Calificacion obtenida:** 3.00 puntos
- **Justificacion:** El patron .derive() se usa para autenticar rutas, y la mayoria de endpoints estan protegidos. Sin embargo no hay middleware centralizado: cada archivo de rutas implementa su propia verificacion de JWT de forma independiente con 3 patrones diferentes. No hay logging middleware, y no hay CORS middleware centralizado.

### Uso de base de datos / ORM

- **Valor maximo:** 8.33 puntos
- **Calificacion obtenida:** 5.00 puntos
- **Justificacion:** Prisma esta bien implementado con singleton en db.ts, esquema completo con 11 modelos y relaciones bien definidas, uso extensivo de include/select/where para consultas, manejo de transacciones en eliminaciones en cascada, seed script para datos iniciales, y migraciones. El esquema modela correctamente el dominio del negocio con enums, relaciones many-to-many, y campos de auditoria.

## Objetivos que se necesitan para aumentar la calificacion

- Unificar el patron de autenticacion en un solo middleware compartido
- Agregar validacion de query parameters y headers en los endpoints
- Integrar las utilidades de validation.ts en las rutas
- Eliminar la ruta duplicada Filtro.ts
- Corregir el bug de setStatus en users.ts

## Calificacion por tema

**21.00/25**

# Testing

## Objetivos por tema y sus calificaciones

### Testing Unitario (por lo menos 3 casos)

- **Valor maximo:** 3.75 puntos
- **Calificacion obtenida:** 4.00 puntos
- **Justificacion:** Hay 3 archivos de test unitario con 17 casos de prueba: validation.test.ts (9 tests para email, precio, calificacion), distance.test.ts (3 tests para formula Haversine), rating.test.ts (5 tests para calculo de rating promedio y formateo). Superan el minimo de 3 casos requeridos. Los tests verifican correctamente funciones puras aisladas.

### Testing de Integracion (por lo menos 3 casos)

- **Valor maximo:** 3.75 puntos
- **Calificacion obtenida:** 4.00 puntos
- **Justificacion:** Hay 3 archivos de test de integracion con 9 casos: health.test.ts (3 tests de endpoint basico), calificaciones.test.ts (3 tests de autenticacion y validacion), inmuebles.test.ts (3 tests de respuesta y query params). Cumplen el minimo de 3 casos requeridos y verifican status codes, headers y comportamiento basico de los endpoints.

### Testing E2E (por lo menos 3 casos)

- **Valor maximo:** 3.75 puntos
- **Calificacion obtenida:** 4.00 puntos
- **Justificacion:** Hay 3 archivos YAML de Maestro (login.yaml, appointment.yaml, map-filter.yaml) que cubren flujos E2E completos.

### Tests corren en Github Actions

- **Valor maximo:** 3.75 puntos
- **Calificacion obtenida:** 3.00 puntos
- **Justificacion:** El archivo .github/workflows/ci.yml define dos jobs: backend-unit (ejecuta bun test tests/unit/) y backend-integration (ejecuta bun test tests/integration/ con Postgres service). Los tests unitarios y de integracion estan configurados para correr en CI.

## Objetivos que se necesitan para aumentar la calificacion

- (Ninguno pendiente)

## Calificacion por tema

**15.00/15**

# Build y Deploy

## Objetivos por tema y sus calificaciones

### Dockerfile del backend

- **Valor maximo:** 5.00 puntos
- **Calificacion obtenida:** 3.00 puntos
- **Justificacion:** Dockerfile existe en backend/app/Dockerfile usando oven/bun:1.2 como base, instala dependencias con --frozen-lockfile, y expone el puerto. Sin embargo ejecuta bun run --watch (modo desarrollo) en lugar de un build optimizado para produccion, y no ejecuta prisma generate durante el build.

### Docker Compose con BE y BDD

- **Valor maximo:** 5.00 puntos
- **Calificacion obtenida:** 5.00 puntos
- **Justificacion:** docker-compose.yml configura correctamente dos servicios: PostgreSQL (postgres:16-alpine en puerto 5435) y backend (con Dockerfile, puertos 3000+3001, depends_on db). Incluye volumenes para persistencia de datos y mapeo de puertos. La configuracion es funcional y completa para desarrollo local.

### BE y BDD corriendo correctamente con docker localmente

- **Valor maximo:** 5.00 puntos
- **Calificacion obtenida:** 5.00 puntos
- **Justificacion:** Los servicios estan configurados para correr correctamente juntos. Los scripts SETUP.ps1 y RUN.sh automatizan el proceso de levantamiento.

## Objetivos que se necesitan para aumentar la calificacion

- Configurar Dockerfile con build de produccion (no --watch)
- Agregar prisma generate y migrate en el build o entrypoint del Dockerfile
- Externalizar credenciales de BD usando variables de entorno en lugar de hardcoded

## Calificacion por tema

**13.00/15**

# Logging

## Objetivos por tema y sus calificaciones

### Uso correcto de logging

- **Valor maximo:** 5.00 puntos
- **Calificacion obtenida:** 4.00 puntos
- **Justificacion:** Se usa console.log/console.error/console.warn con prefijos descriptivos ([WS], [Inmuebles], [email], [MercadoPago]) para eventos clave. Sin embargo no hay niveles de log configurables (debug/info/warn/error), y hay un problema de seguridad: auth.ts linea 26 loguea el body completo de registro incluyendo contrasenas.

## Objetivos que se necesitan para aumentar la calificacion

- Configurar niveles de log (debug, info, warn, error) por entorno
- Eliminar logging de datos sensibles (contrasenas en auth.ts)

## Calificacion por tema

**4.00/5**

# TOTAL

- **Calificacion final:** 87.00/100
- **Areas prioritarias de mejora:** Frontend (Tanstack Query subutilizado, poca composabilidad)
- **Fortalezas principales:** Testing (15/15), Build y Deploy (13/15), Backend (21/25)
