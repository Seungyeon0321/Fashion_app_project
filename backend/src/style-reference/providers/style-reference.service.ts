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
  async getPresets(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    })

    const gender = user?.gender ?? Gender.UNISEX

    // gender 기반 필터링
    // UNISEX 유저는 전체 다 보여줌
    const filtered = STYLE_PRESETS.filter((preset) =>
      gender === Gender.UNISEX
        ? true
        : preset.gender.includes(gender) || preset.gender.includes(Gender.UNISEX)
    )

    return filtered
  }

  // ── 2. 선택한 스타일 저장 (기존 삭제 후 새로 저장) ──────────
  async savePresetStyles(userId: number, dto: SavePresetStylesDto) {
    // 기존 PRESET 스타일 전부 삭제 후 새로 저장
    // 왜? 3개 제한 관리가 단순해지고
    //     "이전 선택 유지하면서 1개만 추가" 같은
    //     복잡한 로직 불필요
    await this.prisma.styleReference.deleteMany({
      where: {
        userId,
        type: 'PRESET',
      },
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
  async getMyStyles(userId: number) {
    const styles = await this.prisma.styleReference.findMany({
      where: {
        userId,
        type: 'PRESET',
      },
      select: {
        id: true,
        presetKey: true,
        createdAt: true,
      },
    })

    // presetKey 기반으로 전체 프리셋 데이터 붙여서 반환
    return styles.map((style) => ({
      ...style,
      preset: STYLE_PRESETS.find((p) => p.key === style.presetKey),
    }))
  }
}