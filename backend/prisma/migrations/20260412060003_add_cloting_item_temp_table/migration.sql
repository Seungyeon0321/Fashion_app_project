-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNISEX');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('TOP', 'BOTTOM', 'OUTER', 'DRESS', 'SHOES', 'BAG', 'ACC');

-- CreateEnum
CREATE TYPE "SubCategory" AS ENUM ('T_SHIRT_SHORT', 'T_SHIRT_LONG', 'SHIRT', 'KNIT', 'SWEATSHIRT', 'HOODIE', 'VEST', 'CARDIGAN', 'WINDBREAKER', 'JACKET', 'COAT', 'PADDED_LIGHT', 'PADDED_HEAVY', 'DENIM', 'SLACKS', 'COTTON_PANTS', 'SWEATPANTS', 'SHORTS', 'SKIRT');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'FALL', 'WINTER', 'ALL');

-- CreateEnum
CREATE TYPE "OutfitSource" AS ENUM ('MANUAL', 'AI_SUGGEST', 'CALENDAR');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT,
    "gender" "Gender",
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClothingItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "label_id" INTEGER NOT NULL,
    "sourceS3Key" TEXT,
    "bbox" JSONB,
    "maskRatio" DOUBLE PRECISION,
    "embedding" vector(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClothingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosetItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
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
    "wearCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleReference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "originalImageUrl" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "analysisResult" JSONB,
    "embedding" vector(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StyleReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT,
    "recordedTemp" DOUBLE PRECISION,
    "recordedWeather" TEXT,
    "source" "OutfitSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutfitItem" (
    "id" SERIAL NOT NULL,
    "outfitId" INTEGER NOT NULL,
    "closetItemId" INTEGER,
    "wishlistItemId" INTEGER,
    "position" TEXT,

    CONSTRAINT "OutfitItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productName" TEXT,
    "brand" TEXT,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "imageUrl" TEXT NOT NULL,
    "purchaseUrl" TEXT NOT NULL,
    "embedding" vector(512),
    "category" "Category" NOT NULL,
    "subCategory" "SubCategory" NOT NULL,
    "originStyleId" INTEGER,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "ClothingItem_userId_idx" ON "ClothingItem"("userId");

-- CreateIndex
CREATE INDEX "ClosetItem_userId_idx" ON "ClosetItem"("userId");

-- CreateIndex
CREATE INDEX "ClosetItem_category_subCategory_idx" ON "ClosetItem"("category", "subCategory");

-- CreateIndex
CREATE INDEX "Outfit_userId_idx" ON "Outfit"("userId");

-- AddForeignKey
ALTER TABLE "ClosetItem" ADD CONSTRAINT "ClosetItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleReference" ADD CONSTRAINT "StyleReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outfit" ADD CONSTRAINT "Outfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "ClosetItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_wishlistItemId_fkey" FOREIGN KEY ("wishlistItemId") REFERENCES "WishlistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_originStyleId_fkey" FOREIGN KEY ("originStyleId") REFERENCES "StyleReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
