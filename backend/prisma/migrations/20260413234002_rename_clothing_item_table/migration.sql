/*
  Warnings:

  - You are about to drop the `ClothingItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ClothingItem";

-- CreateTable
CREATE TABLE "clothing_items" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jobId" TEXT,
    "label" TEXT NOT NULL,
    "label_id" INTEGER NOT NULL,
    "sourceS3Key" TEXT,
    "bbox" JSONB,
    "maskRatio" DOUBLE PRECISION,
    "embedding" vector(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clothing_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clothing_items_userId_idx" ON "clothing_items"("userId");
