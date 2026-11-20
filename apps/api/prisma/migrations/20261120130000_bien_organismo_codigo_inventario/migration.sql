ALTER TABLE "Bien" ADD COLUMN "organismo" "Organismo";

UPDATE "Bien" AS b
SET "organismo" = c."organismo"
FROM "CompraDetalle" AS cd
JOIN "Compra" AS c ON c."id" = cd."compraId"
WHERE b."compraDetalleId" = cd."id"
  AND b."organismo" IS NULL;

UPDATE "Bien" AS b
SET "organismo" = ar."organismo"
FROM "ActaRecepcion" AS ar
WHERE b."actaRecepcionId" = ar."id"
  AND b."organismo" IS NULL;

UPDATE "Bien"
SET "organismo" = CASE
  WHEN "codigoInventario" LIKE '1-%' THEN 'DE'::"Organismo"
  WHEN "codigoInventario" LIKE '2-%' THEN 'HCD'::"Organismo"
  ELSE NULL
END
WHERE "organismo" IS NULL;

CREATE INDEX "Bien_organismo_rubroId_idx" ON "Bien"("organismo", "rubroId");

WITH codigos AS (
  SELECT
    CASE split_part(b."codigoInventario", '-', 1)
      WHEN '1' THEN 'DE'::"Organismo"
      WHEN '2' THEN 'HCD'::"Organismo"
    END AS "organismo",
    split_part(b."codigoInventario", '-', 2)::int AS "codigoCategoria",
    split_part(b."codigoInventario", '-', 3)::int AS "numero"
  FROM "Bien" AS b
  WHERE b."codigoInventario" ~ '^[12]-[0-9]+-[0-9]+$'
)
INSERT INTO "ContadorBien" ("organismo", "rubroId", "ultimoNumero", "updatedAt")
SELECT
  c."organismo",
  r."id",
  MAX(c."numero"),
  NOW()
FROM codigos AS c
JOIN "Rubro" AS r ON r."codigoCategoria" = c."codigoCategoria"
GROUP BY c."organismo", r."id"
ON CONFLICT ("organismo", "rubroId") DO UPDATE
SET
  "ultimoNumero" = GREATEST("ContadorBien"."ultimoNumero", EXCLUDED."ultimoNumero"),
  "updatedAt" = NOW();
