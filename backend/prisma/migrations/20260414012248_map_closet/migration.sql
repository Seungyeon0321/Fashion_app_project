/*
  Warnings:

  - You are about to drop the `ClosetItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ClosetItem" DROP CONSTRAINT "ClosetItem_userId_fkey";

-- DropForeignKey
ALTER TABLE "OutfitItem" DROP CONSTRAINT "OutfitItem_closetItemId_fkey";

-- DropTable
DROP TABLE "ClosetItem";

-- CreateTable
CREATE TABLE "closet_items" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "clothing_item_id" INTEGER,
    "imageUrl" TEXT,
    "crop_s3_key" TEXT,
    "category" "Category" NOT NULL,
    "subCategory" "SubCategory" NOT NULL,
    "minTemp" DOUBLE PRECISION,
    "maxTemp" DOUBLE PRECISION,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isWashing" BOOLEAN NOT NULL DEFAULT false,
    "embedding" vector(512),
    "colors" TEXT[],
    "season" "Season",
    "brand" TEXT,
    "memo" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "wearCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "closet_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "closet_items_userId_idx" ON "closet_items"("userId");

-- CreateIndex
CREATE INDEX "closet_items_category_subCategory_idx" ON "closet_items"("category", "subCategory");

-- AddForeignKey
ALTER TABLE "closet_items" ADD CONSTRAINT "closet_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "closet_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
