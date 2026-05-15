/*
  Warnings:

  - You are about to drop the column `wishlistItemId` on the `OutfitItem` table. All the data in the column will be lost.
  - You are about to drop the `WishlistItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OutfitItem" DROP CONSTRAINT "OutfitItem_wishlistItemId_fkey";

-- DropForeignKey
ALTER TABLE "WishlistItem" DROP CONSTRAINT "WishlistItem_originStyleId_fkey";

-- DropForeignKey
ALTER TABLE "WishlistItem" DROP CONSTRAINT "WishlistItem_userId_fkey";

-- AlterTable
ALTER TABLE "Outfit" ADD COLUMN     "aiComment" TEXT,
ADD COLUMN     "anchorItemId" INTEGER,
ADD COLUMN     "conflictWarning" TEXT,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "intent" TEXT,
ADD COLUMN     "recommendSource" TEXT;

-- AlterTable
ALTER TABLE "OutfitItem" DROP COLUMN "wishlistItemId",
ADD COLUMN     "externalItemId" INTEGER,
ADD COLUMN     "isAnchor" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "WishlistItem";

-- CreateTable
CREATE TABLE "ExternalItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
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

    CONSTRAINT "ExternalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalItem_userId_idx" ON "ExternalItem"("userId");

-- CreateIndex
CREATE INDEX "ExternalItem_source_idx" ON "ExternalItem"("source");

-- CreateIndex
CREATE INDEX "Outfit_userId_source_idx" ON "Outfit"("userId", "source");

-- CreateIndex
CREATE INDEX "Outfit_userId_feedback_idx" ON "Outfit"("userId", "feedback");

-- AddForeignKey
ALTER TABLE "ExternalItem" ADD CONSTRAINT "ExternalItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_externalItemId_fkey" FOREIGN KEY ("externalItemId") REFERENCES "ExternalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
