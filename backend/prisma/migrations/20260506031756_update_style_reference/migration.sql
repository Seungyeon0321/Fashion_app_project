/*
  Warnings:

  - Added the required column `type` to the `StyleReference` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StyleRefType" AS ENUM ('PRESET', 'CUSTOM');

-- AlterTable
ALTER TABLE "StyleReference" ADD COLUMN     "presetKey" TEXT,
ADD COLUMN     "type" "StyleRefType" NOT NULL,
ALTER COLUMN "originalImageUrl" DROP NOT NULL;
