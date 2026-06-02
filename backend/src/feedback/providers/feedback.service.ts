import { Injectable } from '@nestjs/common';
import { FeedbackType } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateFeedbackDto } from './../dto/create-feedback.dto.js';
import { FeedbackHistoryDto, FeedbackResponseDto } from './../dto/feedback-response.dto.js';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // 좋아요 저장
  // ─────────────────────────────────────────────
  async like(dto: CreateFeedbackDto): Promise<FeedbackResponseDto> {
    return this.saveFeedback(dto, FeedbackType.LIKE);
  }

  // ─────────────────────────────────────────────
  // 싫어요 저장
  // ─────────────────────────────────────────────
  async dislike(dto: CreateFeedbackDto): Promise<FeedbackResponseDto> {
    return this.saveFeedback(dto, FeedbackType.DISLIKE);
  }

  // ─────────────────────────────────────────────
  // 피드백 이력 조회 (FastAPI outfit_composer용)
  // ─────────────────────────────────────────────
  async getHistory(userId: number): Promise<FeedbackHistoryDto> {
    const preference = await this.prisma.userStylePreference.findUnique({
      where: { userId },
    });

    // 최근 좋아요 5개 mood
    const recentLikes = await this.prisma.outfitFeedback.findMany({
      where: { userId, type: FeedbackType.LIKE },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { proposalMood: true },
    });

    // 최근 싫어요 5개 mood
    const recentDislikes = await this.prisma.outfitFeedback.findMany({
      where: { userId, type: FeedbackType.DISLIKE },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { proposalMood: true },
    });

    return {
      topMood: preference?.topMood ?? null,
      preferredColors: preference?.preferredColors ?? [],
      preferredBrands: preference?.preferredBrands ?? [],
      avoidedColors: preference?.avoidedColors ?? [],
      avoidedBrands: preference?.avoidedBrands ?? [],
      excludedItemKeywords: preference?.excludedItemKeywords ?? [],
      totalLikes: preference?.totalLikes ?? 0,
      totalDislikes: preference?.totalDislikes ?? 0,
      recentLikedMoods: recentLikes.map((f) => f.proposalMood),
      recentDislikedMoods: recentDislikes.map((f) => f.proposalMood),
    };
  }

  // ─────────────────────────────────────────────
  // 내부 공통 저장 로직
  // ─────────────────────────────────────────────
  private async saveFeedback(
    dto: CreateFeedbackDto,
    type: FeedbackType,
  ): Promise<FeedbackResponseDto> {
    // 1. outfitSnapshot에서 메타데이터 추출
    const extractedBrands = dto.outfitSnapshot.items
      .map((i) => i.brand)
      .filter((b): b is string => !!b);

    // 색상은 snapshot에 포함 안 되어 있으므로 빈 배열 (추후 확장 가능)
    const extractedColors: string[] = [];

    // 2. OutfitFeedback 저장 + UserStylePreference upsert를 트랜잭션으로
    const [feedback] = await this.prisma.$transaction([
      // ── 2-a. 피드백 이벤트 로그 저장
      this.prisma.outfitFeedback.create({
        data: {
          userId: dto.userId,
          recommendSessionId: dto.recommendSessionId,
          proposalIndex: dto.proposalIndex,
          proposalMood: dto.proposalMood,
          type,
          outfitSnapshot: JSON.parse(JSON.stringify(dto.outfitSnapshot)),
          extractedBrands,
          extractedColors,
          recommendSource: dto.recommendSource,
          intent: dto.intent,
        },
      }),

      // ── 2-b. UserStylePreference 집계 캐시 업데이트
      this.prisma.userStylePreference.upsert({
        where: { userId: dto.userId },
        create: {
          userId: dto.userId,
          totalLikes: type === FeedbackType.LIKE ? 1 : 0,
          totalDislikes: type === FeedbackType.DISLIKE ? 1 : 0,
          preferredBrands: type === FeedbackType.LIKE ? extractedBrands : [],
          avoidedBrands: type === FeedbackType.DISLIKE ? extractedBrands : [],
          topMood: type === FeedbackType.LIKE ? dto.proposalMood : null,
          moodScores: type === FeedbackType.LIKE
            ? { [dto.proposalMood]: 1.0 }
            : {},
        },
        update:
          type === FeedbackType.LIKE
            ? this.buildLikeUpdate(dto, extractedBrands)
            : this.buildDislikeUpdate(dto, extractedBrands),
      }),
    ]);

    return {
      id: feedback.id,
      type: feedback.type,
      proposalMood: feedback.proposalMood,
      createdAt: feedback.createdAt,
    };
  }

  // ─────────────────────────────────────────────
  // 좋아요 시 UserStylePreference 업데이트 내용
  // ─────────────────────────────────────────────
  private buildLikeUpdate(dto: CreateFeedbackDto, brands: string[]) {
    return {
      totalLikes: { increment: 1 },
      topMood: dto.proposalMood,
      preferredBrands: {
        // push는 배열에 새 항목 추가 (Prisma PostgreSQL 배열 연산)
        push: brands,
      },
    };
  }

  // ─────────────────────────────────────────────
  // 싫어요 시 UserStylePreference 업데이트 내용
  // ─────────────────────────────────────────────
  private buildDislikeUpdate(dto: CreateFeedbackDto, brands: string[]) {
    // 싫어요 아이템의 productName을 excludedItemKeywords에 추가
    const keywords = dto.outfitSnapshot.items.map((i) => i.productName);
    return {
      totalDislikes: { increment: 1 },
      avoidedBrands: { push: brands },
      excludedItemKeywords: { push: keywords },
    };
  }
}