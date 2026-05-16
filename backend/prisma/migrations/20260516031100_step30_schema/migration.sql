-- CreateEnum
CREATE TYPE "FitType" AS ENUM ('SLIM', 'REGULAR', 'OVERSIZED', 'RELAXED');

-- AlterTable
ALTER TABLE "closet_items" ADD COLUMN     "fit" "FitType",
ADD COLUMN     "material" TEXT,
ADD COLUMN     "name" TEXT;
