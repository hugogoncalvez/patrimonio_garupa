-- CreateTable
CREATE TABLE "CategoriaConsumible" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaConsumible_pkey" PRIMARY KEY ("id")
);

-- Migrar las categorías existentes antes de eliminar la columna de texto
INSERT INTO "CategoriaConsumible" ("nombre", "createdAt", "updatedAt")
SELECT DISTINCT TRIM("categoria"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Consumible"
WHERE "categoria" IS NOT NULL AND TRIM("categoria") <> '';

-- AlterTable
ALTER TABLE "Consumible" ADD COLUMN "categoriaId" INTEGER;

UPDATE "Consumible" AS c
SET "categoriaId" = categoria."id"
FROM "CategoriaConsumible" AS categoria
WHERE TRIM(c."categoria") = categoria."nombre";

ALTER TABLE "Consumible" DROP COLUMN "categoria";

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaConsumible_nombre_key" ON "CategoriaConsumible"("nombre");

-- CreateIndex
CREATE INDEX "Consumible_categoriaId_idx" ON "Consumible"("categoriaId");

-- AddForeignKey
ALTER TABLE "Consumible" ADD CONSTRAINT "Consumible_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaConsumible"("id") ON DELETE SET NULL ON UPDATE CASCADE;
