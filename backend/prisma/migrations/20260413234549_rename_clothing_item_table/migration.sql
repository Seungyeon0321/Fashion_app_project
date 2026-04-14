/*
  Warnings:

  - You are about to drop the column `createdAt` on the `clothing_items` table. All the data in the column will be lost.
  - You are about to drop the column `jobId` on the `clothing_items` table. All the data in the column will be lost.
  - You are about to drop the column `maskRatio` on the `clothing_items` table. All the data in the column will be lost.
  - You are about to drop the column `sourceS3Key` on the `clothing_items` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `clothing_items` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `clothing_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "clothing_items_jobId_idx";

-- DropIndex
DROP INDEX "clothing_items_userId_idx";

-- AlterTable
ALTER TABLE "clothing_items" DROP COLUMN "createdAt",
DROP COLUMN "jobId",
DROP COLUMN "maskRatio",
DROP COLUMN "sourceS3Key",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "job_id" TEXT,
ADD COLUMN     "mask_ratio" DOUBLE PRECISION,
ADD COLUMN     "source_s3_key" TEXT,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "clothing_items_user_id_idx" ON "clothing_items"("user_id");

-- CreateIndex
CREATE INDEX "clothing_items_job_id_idx" ON "clothing_items"("job_id");
