-- AlterTable
ALTER TABLE "Compra" ADD COLUMN     "areaDestinoId" INTEGER;

-- CreateIndex
CREATE INDEX "Compra_areaDestinoId_idx" ON "Compra"("areaDestinoId");

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_areaDestinoId_fkey" FOREIGN KEY ("areaDestinoId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
