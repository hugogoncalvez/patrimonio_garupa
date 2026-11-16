-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('REGISTRADA', 'ANULADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccionAuditoria" ADD VALUE 'IMPRIMIR';
ALTER TYPE "AccionAuditoria" ADD VALUE 'ANULAR';

-- AlterTable
ALTER TABLE "MovimientoStock" ADD COLUMN     "entregaId" INTEGER,
ADD COLUMN     "nombreConsumibleSnapshot" VARCHAR(150),
ADD COLUMN     "orden" INTEGER,
ADD COLUMN     "unidadMedidaSnapshot" VARCHAR(20);

-- CreateTable
CREATE TABLE "ContadorActa" (
    "ejercicio" INTEGER NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContadorActa_pkey" PRIMARY KEY ("ejercicio")
);

-- CreateTable
CREATE TABLE "EntregaConsumible" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(30) NOT NULL,
    "fecha" DATE NOT NULL,
    "areaDestinoId" INTEGER NOT NULL,
    "areaNombreSnapshot" VARCHAR(120) NOT NULL,
    "responsableNombreSnapshot" VARCHAR(220),
    "firmanteNombre" VARCHAR(150) NOT NULL,
    "firmanteDni" VARCHAR(20) NOT NULL,
    "usuarioId" INTEGER,
    "usuarioNombreSnapshot" VARCHAR(220),
    "observaciones" TEXT,
    "estado" "EstadoEntrega" NOT NULL DEFAULT 'REGISTRADA',
    "anuladaPorId" INTEGER,
    "fechaAnulacion" TIMESTAMP(3),
    "motivoAnulacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntregaConsumible_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntregaConsumible_numero_key" ON "EntregaConsumible"("numero");

-- CreateIndex
CREATE INDEX "EntregaConsumible_fecha_idx" ON "EntregaConsumible"("fecha");

-- CreateIndex
CREATE INDEX "EntregaConsumible_areaDestinoId_idx" ON "EntregaConsumible"("areaDestinoId");

-- CreateIndex
CREATE INDEX "EntregaConsumible_estado_idx" ON "EntregaConsumible"("estado");

-- CreateIndex
CREATE INDEX "MovimientoStock_entregaId_idx" ON "MovimientoStock"("entregaId");

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "EntregaConsumible"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaConsumible" ADD CONSTRAINT "EntregaConsumible_areaDestinoId_fkey" FOREIGN KEY ("areaDestinoId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaConsumible" ADD CONSTRAINT "EntregaConsumible_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntregaConsumible" ADD CONSTRAINT "EntregaConsumible_anuladaPorId_fkey" FOREIGN KEY ("anuladaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

