// backend/src/style/providers/style.service.ts

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RecommendSource } from '../dto/style.dto.js';

@Injectable()
export class StylesService {
    constructor(private readonly httpService: HttpService) {}

    // 신규 — user_id + fastapi_url 반환
    // JWT 인증을 통해 검증된 user_id를 프론트에 전달
    // 프론트는 이 값으로 FastAPI SSE에 직접 연결
    getContext(userId: number) {
        return {
            user_id:     userId,
            fastapi_url: process.env.FASTAPI_URL ?? 'http://localhost:8000',
        };
    }

    // 기존 유지
    async recommend(
        userId: number,
        body: {
            intent: string;
            source: RecommendSource;
            anchor_item_id?: number;
            style_reference_ids?: number[];
        }
    ) {
        const fastapiUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000';

        try {
            const response = await firstValueFrom(
                this.httpService.post(`${fastapiUrl}/recommend/sync`, {
                    user_id: userId,
                    ...body,
                })
            );
            return response.data;
        } catch (error: any) {
            throw new HttpException(
                error.response?.data ?? 'Failed to recommend styles',
                HttpStatus.BAD_GATEWAY
            );
        }
    }
}