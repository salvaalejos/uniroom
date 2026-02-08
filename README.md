
---

# 🚀 Guía de Configuración: Base de Datos UniRoom

Este proyecto usa **PostgreSQL con Docker**.
**IMPORTANTE:** No intenten instalar Postgres manualmente en Windows. Usaremos Docker para evitar conflictos de puertos.

## 🛠 Prerrequisitos

1. Tener **Docker Desktop** instalado y corriendo (con el ícono de la ballena en verde).
2. Tener **Node.js** instalado.

---

## PASO 1: Configurar Variables de Entorno

Entren a la carpeta `backend` y creen un archivo llamado `.env` (si no existe). Peguen **EXACTAMENTE** esto.

> **NOTA:** Estamos usando el puerto **5435** porque el 5432 suele dar problemas en Windows. **NO LO CAMBIEN.**

```env
# backend/.env

# Conexión a la BD (Usuario: uniroom_user / Pass: 12345 / Puerto: 5435)
DATABASE_URL="postgresql://uniroom_user:12345@127.0.0.1:5435/uniroom?schema=public&connect_timeout=30&sslmode=disable"

```

---

## PASO 2: Verificar el `docker-compose.yml`

Asegúrense de que el archivo `docker-compose.yml` en la raíz del proyecto tenga esta configuración exacta para coincidir con el `.env`:

```yaml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    container_name: uniroom_db_v3
    restart: always
    ports:
      - "5435:5432"  # <--- IMPORTANTE: Mapeo del puerto 5435 externo
    environment:
      POSTGRES_USER: uniroom_user
      POSTGRES_PASSWORD: '12345'
      POSTGRES_DB: uniroom
    volumes:
      - ./postgres-data:/var/lib/postgresql/data

```

---

## PASO 3: Levantar la Base de Datos

Abran la terminal en la carpeta raíz del proyecto y ejecuten:

```powershell
docker-compose up -d

```

Esperen 10 segundos a que la base de datos inicie correctamente.

---

## PASO 4: Crear las Tablas (Migración)

Ahora vamos a crear la estructura (Usuarios, Inmuebles, etc.) en la base de datos.
Entren a la carpeta `backend` y ejecuten:

```powershell
cd backend
npm install
npx prisma migrate dev --name init

```

Si todo sale bien, verán un mensaje verde diciendo que las migraciones se aplicaron.

Finalmente, para actualizar el cliente de código:

```powershell
npx prisma generate

```

---

## 🆘 Solución de Errores Comunes

### 1. Error `P1001: Can't reach database server`

* Revisen que Docker esté prendido.
* Asegúrense de que en el `.env` diga `127.0.0.1:5435` y NO `localhost`.

### 2. Error de autenticación (`password authentication failed`)

Esto pasa si Docker se quedó con una configuración vieja guardada. Para arreglarlo de raíz ("Opción Nuclear"):

1. Apagar todo: `docker-compose down`
2. **BORRAR** manualmente la carpeta `postgres-data` que está en la raíz del proyecto.
3. Volver a levantar: `docker-compose up -d`

---

## 👀 ¿Cómo ver los datos?

Para ver y editar la base de datos visualmente (tipo Excel), ejecuten dentro de `backend`:

```powershell
npx prisma studio

```

Se abrirá una pestaña en su navegador en `http://localhost:5555`.