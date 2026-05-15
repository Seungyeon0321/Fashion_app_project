// backend/src/style-reference/style-reference.service.ts

import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import { SavePresetStylesDto } from '../dto/save-preset-styles.dto.js'
import { STYLE_PRESETS } from '../style-presets.js'
import { Gender } from '../../generated/prisma/enums.js'

@Injectable()
export class StyleReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 1. 유저 gender 기반 프리셋 목록 반환 ──────────────────
  // 변경 없음
  async getPresets(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    })

    const gender = user?.gender ?? Gender.UNISEX

    const filtered = STYLE_PRESETS.filter((preset) =>
      gender === Gender.UNISEX
        ? true
        : preset.gender.includes(gender) || preset.gender.includes(Gender.UNISEX)
    )

    return filtered
  }

  // ── 2. 선택한 프리셋 스타일 저장 ──────────────────────────
  // 변경 없음
  async savePresetStyles(userId: number, dto: SavePresetStylesDto) {
    await this.prisma.styleReference.deleteMany({
      where: { userId, type: 'PRESET' },
    })

    const created = await this.prisma.styleReference.createMany({
      data: dto.presetKeys.map((key) => ({
        userId,
        type: 'PRESET',
        presetKey: key,
      })),
    })

    return { saved: created.count }
  }

  // ── 3. 저장된 내 스타일 조회 ──────────────────────────────
  //
  // 변경 전: PRESET만 조회, presetKey 기반 string 반환
  //   → ["minimal", "old_money"]
  //
  // 변경 후: PRESET + CUSTOM 전체 조회, id 포함 반환
  //   → [{ id, type, presetKey, imageUrl, preset }, ...]
  //
  // 왜 변경했냐면:
  //   추천 요청 시 style_reference_ids: [1, 2, 3] 을 보내야 하는데
  //   id가 없으면 Style Analyzer가 DB에서 벡터를 못 꺼냄
  //   CUSTOM 레퍼런스도 추천에 반영돼야 함
  //   (CUSTOM 있으면 CUSTOM 우선 사용, CUSTOM 없으면 PRESET 사용)
  async getMyStyles(userId: number) {
    const styles = await this.prisma.styleReference.findMany({
      where: { userId },           // ← PRESET/CUSTOM 구분 없이 전체 조회
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,                  // ← 신규: style_reference_ids 생성용
        type: true,                // ← 신규: 프론트에서 PRESET/CUSTOM 구분용
        presetKey: true,
        originalImageUrl: true,    // ← 신규: CUSTOM 썸네일 표시용
        createdAt: true,
      },
    })

    return styles.map((style) => ({
      id: style.id,
      type: style.type,

      // PRESET 전용: name, description 등 프리셋 메타데이터
      // CUSTOM이면 undefined (UI에서 imageUrl로 표시)
      preset: style.presetKey
        ? STYLE_PRESETS.find((p) => p.key === style.presetKey)
        : undefined,

      presetKey: style.presetKey ?? null,

      // CUSTOM 전용: S3 이미지 URL
      // PRESET이면 null
      imageUrl: style.originalImageUrl ?? null,

      createdAt: style.createdAt,
    }))
  }
}
