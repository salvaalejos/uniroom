-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "email_verificado" BOOLEAN NOT NULL DEFAULT false;

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

-- CreateIndex
CREATE INDEX "VerificacionEmail_email_idx" ON "VerificacionEmail"("email");
