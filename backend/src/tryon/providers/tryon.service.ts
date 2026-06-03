import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TryonService {
  constructor(private readonly httpService: HttpService) {}

  async runTryon(
    userId: number,
    garmentUrl: string,
    category: string,
  ): Promise<{ result_url: string; cached: boolean }> {
    const fastapiUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000';

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${fastapiUrl}/tryon`,
          {
            user_id: userId,      // ← JWT에서 꺼낸 값, 클라이언트 입력 무시
            garment_url: garmentUrl,
            category,
          },
          {
            timeout: 40_000,      // ← Fashn.ai polling ~17초이므로 40초로 명시
          },
        ),
      );
      return response.data;

    } catch (error: any) {
      const status  = error.response?.status;
      const detail  = error.response?.data?.detail;

      // FastAPI → NestJS 에러 코드 매핑
      // "no tryon photo" → 409, 업스트림 실패 → 502, 타임아웃 → 504
      if (status === 404 && detail?.includes('tryon_photo')) {
        throw new HttpException(
          'Try-On 사진이 등록되지 않았습니다. 먼저 사진을 등록해 주세요.',
          HttpStatus.CONFLICT,           // 409
        );
      }

      if (error.code === 'ECONNABORTED' || status === 408) {
        throw new HttpException(
          'AI 합성 처리 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
          HttpStatus.GATEWAY_TIMEOUT,    // 504
        );
      }

      console.error('💥 [Tryon] FastAPI 에러:', error?.message);
      throw new HttpException(
        detail ?? 'AI 합성에 실패했습니다.',
        HttpStatus.BAD_GATEWAY,          // 502
      );
    }
  }
}