// backend/src/style-reference/style-reference.service.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service.js'
import { S3Service } from '../../s3/s3.service.js'
import { SavePresetStylesDto } from '../dto/save-preset-styles.dto.js'
import { STYLE_PRESETS } from '../style-presets.js'
import { Gender } from '../../generated/prisma/enums.js'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

@Injectable()
export class StyleReferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  // ── 1. 유저 gender 기반 프리셋 목록 반환 (기존 유지)
  async getPresets(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    })
    const gender = user?.gender ?? Gender.UNISEX
    return STYLE_PRESETS.filter((preset) =>
      gender === Gender.UNISEX
        ? true
        : preset.gender.includes(gender) || preset.gender.includes(Gender.UNISEX)
    )
  }

  // ── 2. 프리셋 스타일 저장 (기존 유지)
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

  // ── 3. 저장된 내 스타일 조회 (기존 유지)
  async getMyStyles(userId: number) {
    const styles = await this.prisma.styleReference.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        presetKey: true,
        originalImageUrl: true,
        createdAt: true,
      },
    })
    return styles.map((style) => ({
      id: style.id,
      type: style.type,
      preset: style.presetKey
        ? STYLE_PRESETS.find((p) => p.key === style.presetKey)
        : undefined,
      presetKey: style.presetKey ?? null,
      imageUrl: style.originalImageUrl ?? null,
      createdAt: style.createdAt,
    }))
  }

  // ── 4. CUSTOM 레퍼런스 업로드 ─────────────────────────────
  //
  // 리사이즈 기준: 768×768 이내로 축소, 비율 유지
  //   - CLIP 분석에 충분한 해상도
  //   - 텍스처/패턴 정보 보존
  //   - 원본이 768 이하면 그대로 사용 (확대 없음)
  //   - JPEG quality 85: 용량↓ 품질↑ 균형점
  async uploadCustom(
    userId: number,
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<{ id: number; imageUrl: string }> {

    // ① 리사이즈
    // sharp: Node.js 이미지 처리 라이브러리
    // withoutEnlargement: 원본이 작으면 확대 안 함
    // fit: 'inside' → 가로/세로 중 긴 쪽이 768에 맞춰짐 (비율 유지)
    const resizedBuffer = await sharp(imageBuffer)
      .resize(768, 768, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    // ② S3 업로드 (리사이즈된 이미지, 레퍼런스 전용 버킷)
    const { key, url } = await this.s3.uploadReferenceImage(
      resizedBuffer,
      String(userId),
      'image/jpeg',  // sharp가 jpeg로 변환했으므로 고정
    )

    // ③ DB 저장 (embedding null — AI Worker가 채움)
    const reference = await this.prisma.styleReference.create({
      data: {
        userId,
        type: 'CUSTOM',
        presetKey: null,
        originalImageUrl: url,
        originalS3Key: key,
      },
    })

    // ④ fire-and-forget — AI Worker 인코딩 요청
    // await 없음 → 사용자는 즉시 응답 받음
    this._requestEncoding(reference.id, key).catch((err) => {
      console.error(`[StyleReference] 인코딩 요청 실패 id=${reference.id}:`, err)
    })

    return { id: reference.id, imageUrl: url }
  }

  // ── 5. CUSTOM 레퍼런스 삭제
  async deleteCustom(userId: number, referenceId: number) {
    const reference = await this.prisma.styleReference.findUnique({
      where: { id: referenceId, userId },
    })
    if (!reference || reference.type !== 'CUSTOM') {
      throw new Error('Custom reference not found')
    }
    await this.prisma.styleReference.delete({ where: { id: referenceId } })
    return { deleted: referenceId }
  }

  // ── Private: AI Worker 인코딩 요청
  private async _requestEncoding(
    referenceId: number,
    s3Key: string,
  ): Promise<void> {
    const aiWorkerUrl = process.env.AI_WORKER_URL ?? 'http://ai-worker:8000'

     console.log(`[StyleReference] 인코딩 요청 시작 id=${referenceId}, url=${aiWorkerUrl}`)  // ← 추가


    const res = await fetch(`${aiWorkerUrl}/encode/reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference_id: referenceId, s3_key: s3Key }),
    })

    console.log(`[StyleReference] 인코딩 응답: ${res.status}`)  // ← 추가
    
    if (!res.ok) throw new Error(`AI Worker 응답 오류: ${res.status}`)
  }
}