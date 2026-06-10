/*
  Warnings:

  - You are about to drop the `ExternalItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExternalItem" DROP CONSTRAINT "ExternalItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "OutfitItem" DROP CONSTRAINT "OutfitItem_externalItemId_fkey";

-- DropTable
DROP TABLE "ExternalItem";

-- CreateTable
CREATE TABLE "external_items" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" "Category" NOT NULL,
    "price" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "imageUrl" TEXT NOT NULL,
    "purchaseUrl" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'naver_shopping',
    "styleKeywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_items_userId_idx" ON "external_items"("userId");

-- CreateIndex
CREATE INDEX "external_items_source_idx" ON "external_items"("source");

-- CreateIndex
CREATE UNIQUE INDEX "external_items_userId_external_id_key" ON "external_items"("userId", "external_id");

-- AddForeignKey
ALTER TABLE "external_items" ADD CONSTRAINT "external_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_externalItemId_fkey" FOREIGN KEY ("externalItemId") REFERENCES "external_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
