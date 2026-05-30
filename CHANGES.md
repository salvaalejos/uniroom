# Reporte de Cambios y Cumplimiento de Retroalimentación

Este documento detalla las acciones correctivas y refactorizaciones implementadas durante las 4 fases de trabajo recientes, mapeadas directamente a los objetivos de mejora requeridos para alcanzar la calificación máxima (100/100).

---

## 1. General & Back End (Resolución de Bugs, Arquitectura y Código Muerto)
**Objetivos requeridos:** Unificar patrón de autenticación, corregir bug en `users.ts`, integrar utilidades de validación, eliminar código muerto, agregar middleware de errores.

**✅ Cambios Implementados (Fase 1 y 2):**
- **Eliminación de Código Muerto:** Se purgó el repositorio eliminando archivos inactivos y duplicados: `Filtro.ts` (ruta duplicada), `socket.ts` (unificado en `websocketService.ts`), `server.js` (código legacy) y `crypto.ts` (utilidad sin uso).
- **Corrección de Bugs Críticos:** Se corrigió la línea 326 en `backend/app/src/routes/users.ts`, cambiando la sintaxis inválida `setStatus = 400` por el formato correcto del framework Elysia: `set.status = 400`. Adicionalmente se blindó la ruta `/calificaciones` para evitar errores 500 cuando el token es nulo, retornando correctamente un HTTP 401.
- **Middleware de Autenticación Unificado:** Se creó `src/middlewares/auth.ts` con el plugin `.derive()`. Se eliminó la lógica de verificación manual en todos los archivos de rutas, inyectando un único middleware centralizado que procesa los tokens JWT de manera uniforme.
- **Manejo Centralizado de Errores:** Se implementó `src/middlewares/errorHandler.ts` configurado de manera global para interceptar y formatear errores (404, 400, 500) devolviendo respuestas estructuradas sin romper la aplicación.
- **Integración de Validaciones:** Las funciones de `src/utils/validation.ts` (`esEmailValido`, `esPrecioValido`, etc.) fueron conectadas formalmente a los endpoints de creación (ej. `/auth/register` e `/inmuebles`), garantizando la integridad de datos desde la entrada.

---

## 2. Front End (Composabilidad y Reactividad)
**Objetivos requeridos:** Crear componentes reutilizables, eliminar pantallas sin uso (`wat.tsx`), utilizar Tanstack Query en todas las pantallas.

**✅ Cambios Implementados (Fase 1 y 3):**
- **Eliminación de Pantallas Inútiles:** Se borró por completo `wat.tsx` limpiando el árbol de navegación.
- **Migración total a TanStack Query:** Se erradicó el uso excesivo de `useEffect` y peticiones fetch manuales.
  - **Consultas (`useQuery`):** Se implementaron consultas con caché automatizado, deduplicación y manejo de estados nativo (`isPending`, `isError`) en `HomeScreen` (rentas activas), `Inmuebles` (listados con filtros), `ProfileScreen`, `MapScreen` y `NotificationScreen`.
  - **Mutaciones (`useMutation`):** Los flujos de `LoginScreen`, `RegisterScreen`, `Upload_Renta` y Edición de Perfil ahora mutan datos de manera atómica e invalidan el caché (`queryClient.invalidateQueries`) para actualizar las pantallas en tiempo real sin recargar.
- **Arquitectura de Componentes Reutilizables:** Se modularizó el UI extrayendo elementos duros a `src/components/`, incluyendo:
  - `InmuebleCard`: Estandarización visual de las propiedades.
  - `RatingStars`: Componente aislado de interactividad y pintado de valoraciones.
  - `ConfirmModal`: Componente genérico para re-uso de modales (cancelar rentas, cerrar sesión).
  - `SectionHeader` / `LoadingSpinner`: Componentes base para carga e interfaces adaptadas a temas oscuros.

---

## 3. Build y Deploy (Optimización de Producción)
**Objetivos requeridos:** Configurar Dockerfile sin `--watch`, agregar `prisma generate`, externalizar credenciales de BD.

**✅ Cambios Implementados (Fase 4):**
- **Refactor del Dockerfile:** Se eliminó el flag iterativo `--watch` en el comando `CMD` para que el servidor de Bun corra de manera optimizada en producción. Se incluyó el paso `RUN bunx prisma generate` durante el build para asegurar que los binarios del cliente Prisma existan antes de arrancar.
- **Gestión Estricta de Variables de Entorno:**
  - Se eliminaron las contraseñas hardcodeadas (`12345`) en `docker-compose.yml`. Todo el sistema ahora depende de variables como `${POSTGRES_USER}` y `${POSTGRES_PASSWORD}`.
  - Se creó un archivo dedicado `docker-compose.prod.yml` que prescinde del contenedor local de PostgreSQL, asumiendo la inyección limpia del `DATABASE_URL` (para Supabase o RDS externo) con el objetivo de ahorrar recursos de servidor.
  - Se modificó `schema.prisma` para incluir soporte a `directUrl` requerido para manejar el Pooling de conexiones (PgBouncer) de plataformas como Supabase al hacer migraciones.

---

## 4. Logging (Seguridad y Niveles de Traza)
**Objetivos requeridos:** Configurar niveles de log, eliminar logging de datos sensibles.

**✅ Cambios Implementados (Fase 1 y 2):**
- **Saneamiento de Privacidad:** Se borró el `console.log` de la línea 26 en `auth.ts` que exponía el body completo (incluyendo la contraseña en texto plano) durante los registros de nuevos estudiantes.
- **Sistema de Logs Semánticos:** Se creó e integró un logger centralizado (`src/middlewares/logger.ts`) que tipifica la salida de la consola por niveles de importancia (`info`, `warn`, `error`, `debug`), estructurando mejor los logs vinculados al middleware global de errores.
