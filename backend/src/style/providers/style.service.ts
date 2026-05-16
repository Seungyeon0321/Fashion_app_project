import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RecommendSource } from '../dto/style.dto.js';

@Injectable()
export class StylesService {
    constructor(private readonly httpService: HttpService) {}

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
    console.log('📤 FastAPI 호출:', `${fastapiUrl}/recommend`);
    console.log('📤 payload:', JSON.stringify({ user_id: userId, ...body }));

    try {
        const response = await firstValueFrom(
            this.httpService.post(`${fastapiUrl}/recommend`, {
                user_id: userId,
                ...body,
            })
        );
        console.log('📥 FastAPI 응답:', JSON.stringify(response.data));
        return response.data;
    } catch (error: any) {
        console.log('💥 FastAPI 에러 전체:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.log('💥 error.code:', error?.code);
    console.log('💥 error.response?.status:', error?.response?.status);
   
        throw new HttpException(
            error.response?.data ?? 'Failed to recommend styles',
            HttpStatus.BAD_GATEWAY
        );
    }
    }
}