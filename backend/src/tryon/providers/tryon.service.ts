import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { S3Service } from '../../s3/s3.service.js';

@Injectable()
export class TryonService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma:      PrismaService,  // ← 추가
    private readonly s3:          S3Service,       // ← 추가
  ) {}

  async runTryon(
    userId:         number,
    category:       string,
    garmentUrl?:    string,
    closetItemId?:  number,
    modelImageUrl?: string | null,
  ): Promise<{ result_url: string; cached: boolean }> {

    // ── garment_url 결정 ──────────────────────────────────────
    let finalGarmentUrl: string;
    let garmentPhotoType: 'flat-lay' | 'model' | 'auto';

    if (closetItemId) {
      // 내 옷장 아이템: DB에서 cropS3Key 조회 → presigned URL
      // cropS3Key = SegFormer 누끼 PNG (배경 제거, 원본 해상도)
      const item = await this.prisma.closetItem.findUnique({
        where:  { id: closetItemId, userId },  // userId 검증 필수
        select: { cropS3Key: true },
      });

      if (!item?.cropS3Key) {
        throw new HttpException(
          'Closet item not found.',
          HttpStatus.NOT_FOUND,
        );
      }

      finalGarmentUrl  = await this.s3.getPresignedUrl(item.cropS3Key);
      garmentPhotoType = 'flat-lay'; // 배경 제거된 이미지 → Fashn.ai 최적 설정
    } else if (garmentUrl) {
      // 외부 아이템 (Naver Shopping): URL 그대로 사용
      finalGarmentUrl  = garmentUrl;
      garmentPhotoType = 'model';    // Naver 이미지는 모델 착용 사진
    } else {
      throw new HttpException(
        'garment_url or closet_item_id is required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // ── FastAPI 호출 ──────────────────────────────────────────
    const fastapiUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000';

    const payload: Record<string, any> = {
      user_id:            userId,
      garment_url:        finalGarmentUrl,
      category,
      garment_photo_type: garmentPhotoType,
    };
    if (modelImageUrl) payload.model_image_url = modelImageUrl;

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${fastapiUrl}/tryon`, payload, { timeout: 40_000 }),
      );
      return response.data;

    } catch (error: any) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      if (status === 400 && detail?.includes('사진이 없습니다')) {
        throw new HttpException(
          'Try-On photo is not registered. Please register your photo first.',
          HttpStatus.CONFLICT,
        );
      }
      if (error.code === 'ECONNABORTED' || status === 408) {
        throw new HttpException(
          'AI processing timed out. Please try again.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      console.error('💥 [Tryon] FastAPI error:', error?.message);
      throw new HttpException(
        detail ?? 'AI processing failed.',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}