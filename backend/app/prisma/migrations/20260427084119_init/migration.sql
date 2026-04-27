/*
  Warnings:

  - Added the required column `remitente_nombre` to the `Notificacion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'REAGENDADA');

-- AlterTable
ALTER TABLE "Notificacion" ADD COLUMN     "remitente_nombre" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "mp_customer_id" VARCHAR(100);

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

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_id_inmueble_fkey" FOREIGN KEY ("id_inmueble") REFERENCES "Inmueble"("id_inmueble") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_id_estudiante_fkey" FOREIGN KEY ("id_estudiante") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_id_anfitrion_fkey" FOREIGN KEY ("id_anfitrion") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
