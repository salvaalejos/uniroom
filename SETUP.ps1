# UniR00M Setup Script for Windows
$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host "`n--- $msg ---" -ForegroundColor Cyan
}

Write-Step "VERIFICANDO REQUISITOS PREVIOS"

# 1. Verificar Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Docker no está instalado. Por favor instala Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit
}

# 2. Verificar Node.js
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js/NPM no está instalado. Por favor instálalo: https://nodejs.org/" -ForegroundColor Red
    exit
}

# 3. Instalar Bun si no existe
if (!(Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Step "Instalando Bun..."
    powershell -c "irm bun.sh/install.ps1 | iex"
    # Añadir bun al path de la sesión actual
    $env:Path += ";$env:USERPROFILE\.bun\bin"
}

Write-Step "LEVANTANDO INFRAESTRUCTURA (DOCKER)"
docker-compose up -d

Write-Step "CONFIGURANDO BACKEND"
Set-Location "backend/app"

# Verificar .env
if (!(Test-Path ".env")) {
    Write-Host "Creando archivo .env básico..." -ForegroundColor Yellow
    "DATABASE_URL=`"postgresql://postgres:postgres@localhost:5432/uniroom?schema=public`"`nJWT_SECRET=`"super_secret_elysia_key`"`nWS_URL=`"http://localhost:3001`"" | Out-File -FilePath ".env" -Encoding utf8
}

Write-Host "Instalando dependencias del Backend..."
bun install

Write-Host "Esperando a que la Base de Datos esté lista..."
Start-Sleep -Seconds 10

Write-Host "Sincronizando esquema de Base de Datos (Prisma)..."
bunx prisma db push

Write-Host "Poblando base de datos con catálogos (WiFi, Reglas, etc)..."
bunx prisma db seed

Write-Host "Generando cliente de Prisma..."
bunx prisma generate

Write-Step "CONFIGURANDO MOBILE"
Set-Location "../../mobile/uniroom"


Write-Host "Instalando dependencias del Móvil (esto puede tardar un poquito lol)..."
npm install
npx expo install @react-native-async-storage/async-storage

Write-Step "PROCESO COMPLETADO"
Write-Host "Para iniciar el Backend: cd backend/app; bun run src/index.ts" -ForegroundColor Green
Write-Host "Para iniciar el Móvil: cd mobile/uniroom; npm start" -ForegroundColor Green

Set-Location "../../"

$answer = Read-Host "`n¿Deseas iniciar el servidor de Backend ahora? (S/N)"
if ($answer -eq "S" -or $answer -eq "s") {
    Set-Location "backend/app"
    bun run src/index.ts
}
