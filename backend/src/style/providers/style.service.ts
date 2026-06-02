// backend/src/style/providers/style.service.ts

import { HttpException, HttpStatus, Injectable, MessageEvent } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, Observable } from 'rxjs';
import { RecommendSource } from '../dto/style.dto.js';

@Injectable()
export class StylesService {
    constructor(private readonly httpService: HttpService) {}

    async recommend(
        userId: number,
        body: {
            intent:              string;
            source:              RecommendSource;
            anchor_item_id?:     number;
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
            console.log('💥 FastAPI 에러:', error?.message);
            throw new HttpException(
                error.response?.data ?? 'Failed to recommend styles',
                HttpStatus.BAD_GATEWAY,
            );
        }
    }

    recommendStream(
        userId: number,
        body: {
            intent:               string;
            source:               RecommendSource;
            anchor_item_id?:      number;
            style_reference_ids?: number[];
            session_id?:          string;   // ← 추가
        },
    ): Observable<MessageEvent> {
        const fastapiUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000';
        const url        = `${fastapiUrl}/recommend`;
        const payload    = { user_id: userId, ...body };  // session_id 자동 포함

        console.log('📡 [SSE] FastAPI 연결 시작:', url);
        console.log('📡 [SSE] payload:', JSON.stringify(payload));

        return new Observable<MessageEvent>((subscriber) => {
            this.httpService.axiosRef
                .post(url, payload, { responseType: 'stream' })
                .then((response) => {
                    console.log('📡 [SSE] FastAPI 스트림 연결 성공, status:', response.status);
                    let buffer = '';

                    response.data.on('data', (chunk: Buffer) => {
                        const text = chunk.toString('utf-8');
                        console.log('📡 [SSE] 청크 수신:', text.slice(0, 120));

                        buffer += text;
                        const parts = buffer.split('\n\n');
                        buffer = parts.pop() ?? '';

                        for (const part of parts) {
                            const line = part.trim();
                            if (!line.startsWith('data:')) continue;

                            const jsonStr = line.slice(5).trim();
                            try {
                                const event = JSON.parse(jsonStr);
                                console.log('📡 [SSE] 이벤트 emit:', event.type, event.message ?? '');
                                subscriber.next({ data: event });

                                if (event.type === 'result' || event.type === 'error') {
                                    subscriber.complete();
                                }
                            } catch {
                                // heartbeat 무시
                            }
                        }
                    });

                    response.data.on('end', () => {
                        console.log('📡 [SSE] 스트림 종료');
                        subscriber.complete();
                    });

                    response.data.on('error', (err: Error) => {
                        console.log('💥 [SSE] FastAPI stream error:', err.message);
                        subscriber.next({
                            data: { type: 'error', message: `FastAPI 연결 끊김: ${err.message}` },
                        });
                        subscriber.complete();
                    });
                })
                .catch((error) => {
                    console.log('💥 [SSE] FastAPI 연결 실패:', error?.message);
                    subscriber.next({
                        data: { type: 'error', message: `FastAPI 연결 실패: ${error?.message ?? 'unknown'}` },
                    });
                    subscriber.complete();
                });
        });
    }
}