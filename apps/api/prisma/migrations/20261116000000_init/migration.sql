-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('CONTABLE', 'PATRIMONIO');

-- CreateEnum
CREATE TYPE "TipoIncorporacion" AS ENUM ('COMPRA', 'DONACION', 'TRANSFERENCIA', 'PRESTAMO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMovimientoStock" AS ENUM ('INGRESO', 'ENTREGA', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TipoMovimientoCustodia" AS ENUM ('ASIGNACION', 'TRANSFERENCIA', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "TipoMovimientoUbicacion" AS ENUM ('ASIGNACION', 'TRANSFERENCIA', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('FACTURA', 'REMITO', 'ACTA', 'RESOLUCION', 'OTRO');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREAR', 'ACTUALIZAR', 'ELIMINAR', 'LOGIN');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "usuario" VARCHAR(50) NOT NULL,
    "pass" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'PATRIMONIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "direccion" VARCHAR(200),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "responsableId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "dni" VARCHAR(20),
    "cargo" VARCHAR(120),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "areaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubro" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "codigoInterno" VARCHAR(30),
    "codigoCuenta" VARCHAR(30),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadoBien" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstadoBien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bien" (
    "id" SERIAL NOT NULL,
    "codigoInventario" VARCHAR(40) NOT NULL,
    "numeroIdentificacion" VARCHAR(40) NOT NULL,
    "descripcion" VARCHAR(300) NOT NULL,
    "marca" VARCHAR(120),
    "modelo" VARCHAR(120),
    "numeroSerie" VARCHAR(120),
    "numeroMotor" VARCHAR(120),
    "patente" VARCHAR(30),
    "material" VARCHAR(120),
    "medidas" VARCHAR(120),
    "color" VARCHAR(80),
    "rubroId" INTEGER NOT NULL,
    "estadoId" INTEGER NOT NULL,
    "areaId" INTEGER,
    "subresponsableId" INTEGER,
    "tipoIncorporacion" "TipoIncorporacion" NOT NULL DEFAULT 'COMPRA',
    "fechaAlta" DATE NOT NULL,
    "valorHistorico" DECIMAL(14,2),
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaBaja" DATE,
    "motivoBaja" VARCHAR(200),
    "destinoBaja" VARCHAR(200),
    "numeroOrdenPago" VARCHAR(40),
    "numeroResolucionBaja" VARCHAR(40),
    "fechaResolucionBaja" DATE,
    "valorBaja" DECIMAL(14,2),
    "ejercicioAlta" INTEGER,
    "creadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consumible" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(100),
    "unidadMedida" VARCHAR(20) NOT NULL DEFAULT 'unidad',
    "stockActual" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "stockMinimo" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consumible_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "proveedor" VARCHAR(150),
    "tipoComprobante" VARCHAR(50),
    "numeroComprobante" VARCHAR(50),
    "numeroExpediente" VARCHAR(50),
    "observaciones" TEXT,
    "creadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraDetalle" (
    "id" SERIAL NOT NULL,
    "compraId" INTEGER NOT NULL,
    "bienId" INTEGER,
    "consumibleId" INTEGER,
    "cantidad" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "precioUnitario" DECIMAL(14,2),
    "descripcion" VARCHAR(250),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompraDetalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" SERIAL NOT NULL,
    "consumibleId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoStock" NOT NULL,
    "cantidad" DECIMAL(14,3) NOT NULL,
    "areaDestinoId" INTEGER,
    "compraId" INTEGER,
    "usuarioId" INTEGER,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCustodia" (
    "id" SERIAL NOT NULL,
    "bienId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoCustodia" NOT NULL,
    "personaOrigenId" INTEGER,
    "personaDestinoId" INTEGER,
    "usuarioId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCustodia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoUbicacion" (
    "id" SERIAL NOT NULL,
    "bienId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoUbicacion" NOT NULL,
    "areaOrigenId" INTEGER,
    "areaDestinoId" INTEGER,
    "usuarioId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" VARCHAR(200),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoUbicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "numero" VARCHAR(60),
    "fecha" DATE,
    "nombreArchivo" VARCHAR(255) NOT NULL,
    "archivoUrl" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100),
    "tamano" INTEGER,
    "bienId" INTEGER,
    "compraId" INTEGER,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER,
    "accion" "AccionAuditoria" NOT NULL,
    "entidad" VARCHAR(80) NOT NULL,
    "entidadId" INTEGER,
    "datosAnteriores" JSONB,
    "datosNuevos" JSONB,
    "ip" VARCHAR(60),
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Area_nombre_key" ON "Area"("nombre");

-- CreateIndex
CREATE INDEX "Area_responsableId_idx" ON "Area"("responsableId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_dni_key" ON "Persona"("dni");

-- CreateIndex
CREATE INDEX "Persona_areaId_idx" ON "Persona"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "Rubro_nombre_key" ON "Rubro"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Rubro_codigoInterno_key" ON "Rubro"("codigoInterno");

-- CreateIndex
CREATE UNIQUE INDEX "EstadoBien_nombre_key" ON "EstadoBien"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Bien_codigoInventario_key" ON "Bien"("codigoInventario");

-- CreateIndex
CREATE UNIQUE INDEX "Bien_numeroIdentificacion_key" ON "Bien"("numeroIdentificacion");

-- CreateIndex
CREATE INDEX "Bien_rubroId_idx" ON "Bien"("rubroId");

-- CreateIndex
CREATE INDEX "Bien_estadoId_idx" ON "Bien"("estadoId");

-- CreateIndex
CREATE INDEX "Bien_areaId_idx" ON "Bien"("areaId");

-- CreateIndex
CREATE INDEX "Bien_subresponsableId_idx" ON "Bien"("subresponsableId");

-- CreateIndex
CREATE INDEX "Bien_activo_idx" ON "Bien"("activo");

-- CreateIndex
CREATE INDEX "Consumible_activo_idx" ON "Consumible"("activo");

-- CreateIndex
CREATE INDEX "Consumible_nombre_idx" ON "Consumible"("nombre");

-- CreateIndex
CREATE INDEX "Compra_fecha_idx" ON "Compra"("fecha");

-- CreateIndex
CREATE INDEX "CompraDetalle_compraId_idx" ON "CompraDetalle"("compraId");

-- CreateIndex
CREATE INDEX "CompraDetalle_bienId_idx" ON "CompraDetalle"("bienId");

-- CreateIndex
CREATE INDEX "CompraDetalle_consumibleId_idx" ON "CompraDetalle"("consumibleId");

-- CreateIndex
CREATE INDEX "MovimientoStock_consumibleId_idx" ON "MovimientoStock"("consumibleId");

-- CreateIndex
CREATE INDEX "MovimientoStock_areaDestinoId_idx" ON "MovimientoStock"("areaDestinoId");

-- CreateIndex
CREATE INDEX "MovimientoStock_compraId_idx" ON "MovimientoStock"("compraId");

-- CreateIndex
CREATE INDEX "MovimientoStock_fecha_idx" ON "MovimientoStock"("fecha");

-- CreateIndex
CREATE INDEX "MovimientoCustodia_bienId_idx" ON "MovimientoCustodia"("bienId");

-- CreateIndex
CREATE INDEX "MovimientoCustodia_personaOrigenId_idx" ON "MovimientoCustodia"("personaOrigenId");

-- CreateIndex
CREATE INDEX "MovimientoCustodia_personaDestinoId_idx" ON "MovimientoCustodia"("personaDestinoId");

-- CreateIndex
CREATE INDEX "MovimientoCustodia_fecha_idx" ON "MovimientoCustodia"("fecha");

-- CreateIndex
CREATE INDEX "MovimientoUbicacion_bienId_idx" ON "MovimientoUbicacion"("bienId");

-- CreateIndex
CREATE INDEX "MovimientoUbicacion_areaOrigenId_idx" ON "MovimientoUbicacion"("areaOrigenId");

-- CreateIndex
CREATE INDEX "MovimientoUbicacion_areaDestinoId_idx" ON "MovimientoUbicacion"("areaDestinoId");

-- CreateIndex
CREATE INDEX "MovimientoUbicacion_fecha_idx" ON "MovimientoUbicacion"("fecha");

-- CreateIndex
CREATE INDEX "Documento_bienId_idx" ON "Documento"("bienId");

-- CreateIndex
CREATE INDEX "Documento_compraId_idx" ON "Documento"("compraId");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "Auditoria_entidad_entidadId_idx" ON "Auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "Auditoria_fecha_idx" ON "Auditoria"("fecha");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "Rubro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_estadoId_fkey" FOREIGN KEY ("estadoId") REFERENCES "EstadoBien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_subresponsableId_fkey" FOREIGN KEY ("subresponsableId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraDetalle" ADD CONSTRAINT "CompraDetalle_consumibleId_fkey" FOREIGN KEY ("consumibleId") REFERENCES "Consumible"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_consumibleId_fkey" FOREIGN KEY ("consumibleId") REFERENCES "Consumible"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_areaDestinoId_fkey" FOREIGN KEY ("areaDestinoId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCustodia" ADD CONSTRAINT "MovimientoCustodia_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCustodia" ADD CONSTRAINT "MovimientoCustodia_personaOrigenId_fkey" FOREIGN KEY ("personaOrigenId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCustodia" ADD CONSTRAINT "MovimientoCustodia_personaDestinoId_fkey" FOREIGN KEY ("personaDestinoId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCustodia" ADD CONSTRAINT "MovimientoCustodia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoUbicacion" ADD CONSTRAINT "MovimientoUbicacion_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoUbicacion" ADD CONSTRAINT "MovimientoUbicacion_areaOrigenId_fkey" FOREIGN KEY ("areaOrigenId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoUbicacion" ADD CONSTRAINT "MovimientoUbicacion_areaDestinoId_fkey" FOREIGN KEY ("areaDestinoId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoUbicacion" ADD CONSTRAINT "MovimientoUbicacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_bienId_fkey" FOREIGN KEY ("bienId") REFERENCES "Bien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
