CREATE TYPE "FamiliaBien" AS ENUM (
  'INMUEBLE',
  'MUEBLE',
  'MAQUINARIA',
  'VEHICULO',
  'MAQUINARIA_VIAL',
  'BIBLIOTECA',
  'OTRO'
);

CREATE TYPE "SituacionInmueble" AS ENUM (
  'OCUPADO',
  'DESOCUPADO',
  'ALQUILADO',
  'CEDIDO_COMODATO',
  'EN_LITIGIO',
  'OTRO'
);

ALTER TABLE "Rubro"
ADD COLUMN "familia" "FamiliaBien" NOT NULL DEFAULT 'OTRO';

UPDATE "Rubro"
SET "familia" = 'INMUEBLE'
WHERE "codigoInterno" = 'INM' OR UPPER("nombre") LIKE '%INMUEBLE%';

UPDATE "Rubro"
SET "familia" = 'MUEBLE'
WHERE "codigoInterno" = 'MUE' OR UPPER("nombre") LIKE 'MUEBLES%';

UPDATE "Rubro"
SET "familia" = 'MAQUINARIA'
WHERE "codigoInterno" = 'MAQ' OR UPPER("nombre") LIKE 'MAQUINAS MOTORES%';

UPDATE "Rubro"
SET "familia" = 'VEHICULO'
WHERE "codigoInterno" = 'TRA' OR UPPER("nombre") LIKE 'MEDIOS DE TRANSPORTE%';

UPDATE "Rubro"
SET "familia" = 'MAQUINARIA_VIAL'
WHERE "codigoInterno" = 'MVI' OR UPPER("nombre") LIKE 'MAQUINAS VIALES%';

UPDATE "Rubro"
SET "familia" = 'BIBLIOTECA'
WHERE "codigoInterno" = 'BIB' OR UPPER("nombre") LIKE 'BIBLIOTECAS%';

CREATE INDEX "Rubro_familia_idx" ON "Rubro"("familia");

ALTER TABLE "Bien"
ADD COLUMN "situacionInmueble" "SituacionInmueble",
ADD COLUMN "tipoInmueble" VARCHAR(80),
ADD COLUMN "domicilioInmueble" VARCHAR(200),
ADD COLUMN "localidadInmueble" VARCHAR(120),
ADD COLUMN "provinciaInmueble" VARCHAR(120),
ADD COLUMN "codigoPostalInmueble" VARCHAR(20),
ADD COLUMN "partidaInmobiliaria" VARCHAR(80),
ADD COLUMN "nomenclaturaCatastral" VARCHAR(120),
ADD COLUMN "matriculaInmobiliaria" VARCHAR(80),
ADD COLUMN "superficieTerreno" DECIMAL(12, 2),
ADD COLUMN "superficieCubierta" DECIMAL(12, 2),
ADD COLUMN "destinoInmueble" VARCHAR(120),
ADD COLUMN "fechaEscritura" DATE,
ADD COLUMN "numeroEscritura" VARCHAR(80),
ADD COLUMN "notaria" VARCHAR(120);

INSERT INTO "EstadoBien" ("nombre", "activo", "createdAt", "updatedAt")
SELECT 'En desuso', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "EstadoBien" WHERE "nombre" = 'En desuso'
);
