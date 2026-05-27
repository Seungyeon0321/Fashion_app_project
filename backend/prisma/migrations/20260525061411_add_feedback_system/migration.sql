-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('LIKE', 'DISLIKE');

-- CreateTable
CREATE TABLE "outfit_feedbacks" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "recommend_session_id" TEXT NOT NULL,
    "proposal_index" INTEGER NOT NULL,
    "proposal_mood" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL DEFAULT 'LIKE',
    "outfit_snapshot" JSONB NOT NULL,
    "extracted_brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extracted_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommend_source" TEXT NOT NULL,
    "intent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_style_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "mood_scores" JSONB NOT NULL DEFAULT '{}',
    "top_mood" TEXT,
    "preferred_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoided_colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoided_brands" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excluded_item_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_likes" INTEGER NOT NULL DEFAULT 0,
    "total_dislikes" INTEGER NOT NULL DEFAULT 0,
    "last_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_style_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outfit_feedbacks_user_id_type_idx" ON "outfit_feedbacks"("user_id", "type");

-- CreateIndex
CREATE INDEX "outfit_feedbacks_user_id_created_at_idx" ON "outfit_feedbacks"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "outfit_feedbacks_user_id_proposal_mood_idx" ON "outfit_feedbacks"("user_id", "proposal_mood");

-- CreateIndex
CREATE UNIQUE INDEX "user_style_preferences_user_id_key" ON "user_style_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "outfit_feedbacks" ADD CONSTRAINT "outfit_feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_style_preferences" ADD CONSTRAINT "user_style_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
