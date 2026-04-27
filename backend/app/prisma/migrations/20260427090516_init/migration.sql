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

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
