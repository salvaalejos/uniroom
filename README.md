# ERRORES EN LA CREACIÓN DE INMUEBLE
Al momento de querer ingresar una hora para un día de una casa, no permite poner los minutos (el teclado solo deja poner números exactos, no existe el dos puntos) 
Las fechas para citas deben ser días de la semana, no días exactos del año
También, en el mapa para seleccionar ubicación exacta al momento de dar de alta un inmueble dice "mover el mapa hasta que el marcador..." y no hay un marcador (en caso de que se vea, hacerlo más grande, más visible en el mini mapa). 


## IMPORTANTE!!! 
1. Los mapas en la parte de rutas solamente pueden ejecutarse en móvil, no en web. (Si entran a esa pestaña por accidente en web, recargen la página). 

# SETUP.ps1
1. Abrir Docker para la BD. 
2. Abrir un PowerShell y ejecutar el archivo en la carpeta raíz del proyecto (en caso que de no deje ejecutarlo por Windows chillón, dar permisos de ejecución). 



# Como correr en mobile este proyecto. 
![./ignore.gif](https://media.tenor.com/6DlKoODackcAAAAM/evangelion-rei.gif)

1. Abrir el proyecto en VSCode o el IDE de su preferencia, y entrar a la carpeta de /mobile/uniroom

```bash
cd mobile
cd uniroom
```

2. Si es tu primera vez *en el proyecto* muy importante descargar las dependencias, nunca olvidar, indispensable antes de correr un proyecto descargado.  

```bash
npm install 
```

3. Y aqui tienes de a dos, o descargar el android SFX (ya sea aparte o usar el que viene incluido con Android Studio) o conectar tu celu. Te recomiendo usar tu celu, luego se traba. Eso si, incluso si tienes conectado el cel por cable, debes tener una buena conexión a internet para que se actualicen los cambios en tiempo real. (Debo averiguar porque no manda los cambios por el mismo cable xd, maybe pq crea un servidor al correr el proyecto pero es poco eficiente si se tiene el teléfono conectado). 
En cambio, si usas el simulador de Android debería actualizarse mejor, pero eso si, debes poner tu cuenta de Google y descargar Expo Go. 

4. Ahora si, en la terminal donde hiciste 1 y 2, debes correr el siguiente comando. 
```bash
npx expo start
```
Debería tardar lo suyo, pero una vez cargado te aparece un QR con un menú de opciones. 

5. En la misma terminal oprimes 
```bash
a 
```
Y debería abrir el proyecto en el celu que tengas conectado. 
## IMPORTANTE: 
Tu celu debe estar en la misma red que tu lap.
A veces al proyecto se le va la onda y dice que hubo un error. En esos casos oprime _Ctrl + C_ para cancelar el servidor y vuelvelo a correr, no se cargo bien el proyecto. (Tambien sirve revisar si tienes buena conexión a internet que no puede descargar el proyecto, si esta de la patada, mejor abre el celu en la lap xd)

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
(Puede que en algunas ocaciones ese comando no funcione y se ocupe usar: docker compose up -d)
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

(=^･ω･^=)






NOTAAA QUE LE FALTO A JUANITO XD: El backend recuerden que estamos trabajando con bun y elysia, por lo que primero deben correr el siguiente comando para instalar bun en su compu:


```
powershell -c "irm bun.sh/install.ps1 | iex"

```

Luego este para instalar elysia dentro de la carpeta backend:


```
bun install

```

y finalmente:

```
bun run dev
```

Despues ya corre normal  el back :D
