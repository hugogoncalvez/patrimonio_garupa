-- CreateEnum
CREATE TYPE "Organismo" AS ENUM ('DE', 'HCD');

-- CreateEnum
CREATE TYPE "TipoCompraDetalle" AS ENUM ('INVENTARIABLE', 'CONSUMIBLE');

-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('REGISTRADA', 'RECIBIDA_PARCIAL', 'RECIBIDA');

-- DropForeignKey
ALTER TABLE "CompraDetalle" DROP CONSTRAINT "CompraDetalle_bienId_fkey";

-- DropIndex
DROP INDEX "CompraDetalle_bienId_idx";

-- AlterTable
ALTER TABLE "Bien" ADD COLUMN     "actaRecepcionDetalleId" INTEGER,
ADD COLUMN     "actaRecepcionId" INTEGER,
ADD COLUMN     "compraDetalleId" INTEGER;

-- AlterTable
ALTER TABLE "Compra" DROP COLUMN "numeroComprobante",
DROP COLUMN "tipoComprobante",
ADD COLUMN     "estado" "EstadoCompra" NOT NULL DEFAULT 'REGISTRADA',
ADD COLUMN     "numeroOrdenPago" VARCHAR(40),
ADD COLUMN     "organismo" "Organismo" NOT NULL DEFAULT 'DE',
ADD COLUMN     "proveedorId" INTEGER;

-- AlterTable
ALTER TABLE "CompraDetalle" DROP COLUMN "bienId",
ADD COLUMN     "cantidadRecibida" DECIMAL(14,3) NOT NULL DEFAULT 0,
ADD COLUMN     "rubroId" INTEGER,
ADD COLUMN     "tipo" "TipoCompraDetalle" NOT NULL DEFAULT 'CONSUMIBLE';

-- AlterTable
ALTER TABLE "Rubro" ADD COLUMN     "codigoCategoria" INTEGER;

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "cuit" VARCHAR(20),
    "telefono" VARCHAR(50),
    "email" VARCHAR(120),
    "direccion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraComprobante" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "numero" VARCHAR(60),
    "fecha" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompraComprobante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContadorBien" (
    "organismo" "Organismo" NOT NULL,
    "rubroId" INTEGER NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContadorBien_pkey" PRIMARY KEY ("organismo","rubroId")
);

-- CreateTable
CREATE TABLE "ContadorActaRecepcion" (
    "ejercicio" INTEGER NOT NULL,
    "ultimoNumero" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContadorActaRecepcion_pkey" PRIMARY KEY ("ejercicio")
);

-- CreateTable
CREATE TABLE "ActaRecepcion" (
    "id" SERIAL NOT NULL,
    "numero" VARCHAR(30) NOT NULL,
    "fecha" DATE NOT NULL,
    "organismo" "Organismo" NOT NULL,
    "compraId" INTEGER NOT NULL,
    "usuarioId" INTEGER,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActaRecepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActaRecepcionDetalle" (
    "id" SERIAL NOT NULL,
    "actaRecepcionId" INTEGER NOT NULL,
    "compraDetalleId" INTEGER NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActaRecepcionDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_nombre_key" ON "Proveedor"("nombre");

-- CreateIndex
CREATE INDEX "Proveedor_activo_idx" ON "Proveedor"("activo");

-- CreateIndex
CREATE INDEX "CompraComprobante_compraId_idx" ON "CompraComprobante"("compraId");

-- CreateIndex
CREATE UNIQUE INDEX "ActaRecepcion_numero_key" ON "ActaRecepcion"("numero");

-- CreateIndex
CREATE INDEX "ActaRecepcion_fecha_idx" ON "ActaRecepcion"("fecha");

-- CreateIndex
CREATE INDEX "ActaRecepcion_compraId_idx" ON "ActaRecepcion"("compraId");

-- CreateIndex
CREATE INDEX "ActaRecepcionDetalle_actaRecepcionId_idx" ON "ActaRecepcionDetalle"("actaRecepcionId");

-- CreateIndex
CREATE INDEX "ActaRecepcionDetalle_compraDetalleId_idx" ON "ActaRecepcionDetalle"("compraDetalleId");

-- CreateIndex
CREATE INDEX "Bien_compraDetalleId_idx" ON "Bien"("compraDetalleId");

-- CreateIndex
CREATE INDEX "Bien_actaRecepcionId_idx" ON "Bien"("actaRecepcionId");

-- CreateIndex
CREATE INDEX "Bien_actaRecepcionDetalleId_idx" ON "Bien"("actaRecepcionDetalleId");

-- CreateIndex
CREATE INDEX "Compra_organismo_idx" ON "Compra"("organismo");

-- CreateIndex
CREATE INDEX "Compra_estado_idx" ON "Compra"("estado");

-- CreateIndex
CREATE INDEX "Compra_proveedorId_idx" ON "Compra"("proveedorId");

-- CreateIndex
CREATE INDEX "Compra_numeroOrdenPago_idx" ON "Compra"("numeroOrdenPago");

-- CreateIndex
CREATE INDEX "CompraDetalle_rubroId_idx" ON "CompraDetalle"("rubroId");

-- CreateIndex
CREATE UNIQUE INDEX "Rubro_codigoCategoria_key" ON "Rubro"("codigoCategoria");

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_compraDetalleId_fkey" FOREIGN KEY ("compraDetalleId") REFERENCES "CompraDetalle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_actaRecepcionId_fkey" FOREIGN KEY ("actaRecepcionId") REFERENCES "ActaRecepcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_actaRecepcionDetalleId_fkey" FOREIGN KEY ("actaRecepcionDetalleId") REFERENCES "ActaRecepcionDetalle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraComprobante" ADD CONSTRAINT "CompraComprobante_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "Rubro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContadorBien" ADD CONSTRAINT "ContadorBien_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "Rubro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaRecepcion" ADD CONSTRAINT "ActaRecepcion_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaRecepcion" ADD CONSTRAINT "ActaRecepcion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaRecepcionDetalle" ADD CONSTRAINT "ActaRecepcionDetalle_actaRecepcionId_fkey" FOREIGN KEY ("actaRecepcionId") REFERENCES "ActaRecepcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActaRecepcionDetalle" ADD CONSTRAINT "ActaRecepcionDetalle_compraDetalleId_fkey" FOREIGN KEY ("compraDetalleId") REFERENCES "CompraDetalle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

