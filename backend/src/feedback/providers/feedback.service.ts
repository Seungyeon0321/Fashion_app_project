// backend/src/feedback/providers/feedback.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js'; // 기존 서비스 파일과 경로 맞춰서 수정
import { FeedbackDto } from '../dto/feedback.dto.js';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  // ── LIKE ─────────────────────────────────────────────────────────────────
  async like(userId: number, dto: FeedbackDto) {
    // 1. 이벤트 로그 저장 (append-only)
    await this.prisma.outfitFeedback.create({
      data: {
        userId,
        recommendSessionId: dto.session_id,
        proposalIndex:      dto.proposal_index,
        proposalMood:       dto.proposal_mood,
        type:               'LIKE',
        outfitSnapshot:     dto.outfit_snapshot as any,
        extractedBrands:    dto.extracted_brands,
        extractedColors:    dto.extracted_colors,
        recommendSource:    dto.recommend_source,
        intent:             dto.intent,
      },
    });

    // 2. 선호도 프로필 업데이트
    await this._updatePreferenceOnLike(userId, dto);

    return { success: true };
  }

  // ── DISLIKE ───────────────────────────────────────────────────────────────
  async dislike(userId: number, dto: FeedbackDto) {
    await this.prisma.outfitFeedback.create({
      data: {
        userId,
        recommendSessionId: dto.session_id,
        proposalIndex:      dto.proposal_index,
        proposalMood:       dto.proposal_mood,
        type:               'DISLIKE',
        outfitSnapshot:     dto.outfit_snapshot as any,
        extractedBrands:    dto.extracted_brands,
        extractedColors:    dto.extracted_colors,
        recommendSource:    dto.recommend_source,
        intent:             dto.intent,
      },
    });

    // dislike는 카운트만 증가 (피하고 싶은 스타일 학습은 데이터 충분히 쌓인 후 추가)
    await this.prisma.userStylePreference.upsert({
      where:  { userId },
      update: { totalDislikes: { increment: 1 } },
      create: { userId, totalDislikes: 1 },
    });

    return { success: true };
  }

  // ── 내부: LIKE 시 선호도 업데이트 ────────────────────────────────────────
  private async _updatePreferenceOnLike(userId: number, dto: FeedbackDto) {
    const existing = await this.prisma.userStylePreference.findUnique({
      where: { userId },
    });

    const totalBefore = existing?.totalLikes ?? 0;

    // ① moodScores: 정규화 점수 → 카운트 역산 → 새 무드 +1 → 재정규화
    const savedScores = (existing?.moodScores ?? {}) as Record<string, number>;
    const countMap: Record<string, number> = {};
    for (const [mood, score] of Object.entries(savedScores)) {
      countMap[mood] = Math.round(score * totalBefore);
    }
    countMap[dto.proposal_mood] = (countMap[dto.proposal_mood] ?? 0) + 1;

    const totalNew = totalBefore + 1;
    const normalizedScores: Record<string, number> = {};
    for (const [mood, count] of Object.entries(countMap)) {
      normalizedScores[mood] = Math.round((count / totalNew) * 100) / 100;
    }

    // ② topMood: 가장 높은 점수의 무드
    const topMood = Object.entries(normalizedScores)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? dto.proposal_mood;

    // ③ 색상/브랜드: 새 것을 앞에 두고 중복 제거, 최대 10개
    const preferredColors = [
      ...new Set([...dto.extracted_colors, ...(existing?.preferredColors ?? [])]),
    ].slice(0, 10);

    const preferredBrands = [
      ...new Set([...dto.extracted_brands, ...(existing?.preferredBrands ?? [])]),
    ].slice(0, 10);

    await this.prisma.userStylePreference.upsert({
      where:  { userId },
      update: { totalLikes: { increment: 1 }, moodScores: normalizedScores, topMood, preferredColors, preferredBrands },
      create: { userId, totalLikes: 1, moodScores: normalizedScores, topMood, preferredColors, preferredBrands },
    });
  }
}