-- AlterTable
ALTER TABLE "ClosetItem" ADD COLUMN     "clothing_item_id" INTEGER,
ADD COLUMN     "crop_s3_key" TEXT,
ADD COLUMN     "is_favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memo" TEXT;
