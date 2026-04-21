/*
  Warnings:

  - You are about to drop the column `userId` on the `closet_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `closet_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- DropForeignKey
ALTER TABLE "closet_items" DROP CONSTRAINT "closet_items_userId_fkey";

-- DropIndex
DROP INDEX "closet_items_userId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "closet_items" DROP COLUMN "userId",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "closet_items_user_id_idx" ON "closet_items"("user_id");

-- AddForeignKey
ALTER TABLE "closet_items" ADD CONSTRAINT "closet_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
