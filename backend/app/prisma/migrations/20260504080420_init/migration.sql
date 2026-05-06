-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ESTUDIANTE', 'ARRENDADOR');

-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoInmueble" AS ENUM ('DISPONIBLE', 'OCUPADO', 'OCULTO');

-- CreateEnum
CREATE TYPE "TipoInmueble" AS ENUM ('CASA', 'DEPA', 'CUARTO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'REAGENDADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id_usuario" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "nombre" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "numero_contacto" VARCHAR(20),
    "genero" "Genero",
    "edad" INTEGER,
    "foto" TEXT,
    "visibilidad" BOOLEAN NOT NULL DEFAULT false,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "mp_customer_id" VARCHAR(100),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "Inmueble" (
    "id_inmueble" SERIAL NOT NULL,
    "id_arrendador" TEXT NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "precio_mensual" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoInmueble" NOT NULL DEFAULT 'DISPONIBLE',
    "descripcion" TEXT,
    "direccion_latitud" DECIMAL(65,30),
    "direccion_longitud" DECIMAL(65,30),
    "tipo_inmueble" "TipoInmueble" NOT NULL,
    "id_estudiante" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inmueble_pkey" PRIMARY KEY ("id_inmueble")
);

-- CreateTable
CREATE TABLE "Servicios" (
    "id_servicios" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Servicios_pkey" PRIMARY KEY ("id_servicios")
);

-- CreateTable
CREATE TABLE "Restricciones" (
    "id_restriccion" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Restricciones_pkey" PRIMARY KEY ("id_restriccion")
);

-- CreateTable
CREATE TABLE "Calificacion" (
    "id_calificacion" SERIAL NOT NULL,
    "descripcion" TEXT,
    "calificacion" INTEGER NOT NULL,
    "id_estudiante" TEXT NOT NULL,
    "id_inmueble" INTEGER NOT NULL,

    CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id_calificacion")
);

-- CreateTable
CREATE TABLE "Imagenes" (
    "id_imagen" SERIAL NOT NULL,
    "imagen" TEXT NOT NULL,
    "id_inmueble" INTEGER NOT NULL,

    CONSTRAINT "Imagenes_pkey" PRIMARY KEY ("id_imagen")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "visto" BOOLEAN NOT NULL DEFAULT false,
    "tipo" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remitente_nombre" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaccion" (
    "id_transaccion" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pending',
    "payment_id" TEXT,
    "descripcion" TEXT,
    "id_usuario" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaccion_pkey" PRIMARY KEY ("id_transaccion")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id_cita" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PENDIENTE',
    "motivo_rechazo" TEXT,
    "id_inmueble" INTEGER NOT NULL,
    "id_estudiante" TEXT NOT NULL,
    "id_anfitrion" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id_cita")
);

-- CreateTable
CREATE TABLE "VerificacionEmail" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificacionEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_InmuebleToServicios" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_InmuebleToRestricciones" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "VerificacionEmail_email_idx" ON "VerificacionEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_InmuebleToServicios_AB_unique" ON "_InmuebleToServicios"("A", "B");

-- CreateIndex
CREATE INDEX "_InmuebleToServicios_B_index" ON "_InmuebleToServicios"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_InmuebleToRestricciones_AB_unique" ON "_InmuebleToRestricciones"("A", "B");

-- CreateIndex
CREATE INDEX "_InmuebleToRestricciones_B_index" ON "_InmuebleToRestricciones"("B");

-- AddForeignKey
ALTER TABLE "Inmueble" ADD CONSTRAINT "Inmueble_id_arrendador_fkey" FOREIGN KEY ("id_arrendador") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inmueble" ADD CONSTRAINT "Inmueble_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "Usuario"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_id_inmueble_fkey" FOREIGN KEY ("id_inmueble") REFERENCES "Inmueble"("id_inmueble") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imagenes" ADD CONSTRAINT "Imagenes_id_inmueble_fkey" FOREIGN KEY ("id_inmueble") REFERENCES "Inmueble"("id_inmueble") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_id_inmueble_fkey" FOREIGN KEY ("id_inmueble") REFERENCES "Inmueble"("id_inmueble") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_id_anfitrion_fkey" FOREIGN KEY ("id_anfitrion") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InmuebleToServicios" ADD CONSTRAINT "_InmuebleToServicios_A_fkey" FOREIGN KEY ("A") REFERENCES "Inmueble"("id_inmueble") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InmuebleToServicios" ADD CONSTRAINT "_InmuebleToServicios_B_fkey" FOREIGN KEY ("B") REFERENCES "Servicios"("id_servicios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InmuebleToRestricciones" ADD CONSTRAINT "_InmuebleToRestricciones_A_fkey" FOREIGN KEY ("A") REFERENCES "Inmueble"("id_inmueble") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_InmuebleToRestricciones" ADD CONSTRAINT "_InmuebleToRestricciones_B_fkey" FOREIGN KEY ("B") REFERENCES "Restricciones"("id_restriccion") ON DELETE CASCADE ON UPDATE CASCADE;
