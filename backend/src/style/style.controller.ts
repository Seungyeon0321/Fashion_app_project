// backend/src/style/style.controller.ts

import {
    Controller, Post, Body, Req, UseGuards,
    Sse, MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { StylesService } from './providers/style.service.js';
import { RecommendDto } from './dto/style.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('style')
export class StyleController {
    constructor(private readonly stylesService: StylesService) {}

    // ── 기존: 동기 방식 (Postman 테스트, fallback용) ─────────────────
    @Post('recommend')
    @UseGuards(JwtAuthGuard)
    async recommend(@Body() body: RecommendDto, @Req() req: any) {
        const userId = req.user.id;
        console.log('Recommend (sync) request:', { userId, body });
        return this.stylesService.recommend(userId, body);
    }

    // ── 신규: SSE 스트리밍 ─────────────────────────────────────────────
    // 프론트가 이 엔드포인트를 호출하면
    // NestJS가 JWT 인증 후 FastAPI에 SSE 연결을 열고
    // 그 스트림을 프론트로 흘려보냄.
    //
    // @Sse() 데코레이터의 역할:
    //   - 응답 Content-Type을 자동으로 text/event-stream으로 설정
    //   - Observable을 반환받아서 next() 호출 시마다 "data: ...\n\n" 포맷으로 전송
    //
    // @Post 대신 @Sse만 쓰는 이유:
    //   - @Sse는 GET 기반 엔드포인트를 만듦 (SSE는 본래 GET)
    //   - body는 query string으로 받아야 함... 인데 우리는 body가 복잡하니까
    //   - 별도 컨트롤러 메서드로 분리: 먼저 POST로 요청을 보내서
    //     세션 id를 받고, 그 id로 SSE 연결하는 방식이 정석이지만
    //     MVP에선 query string으로도 충분히 처리 가능
    //
    // 여기서는 body 데이터를 query로 받는 형태로 만들어요.
    // (NestJS @Sse는 GET이라 @Body 사용 불가)
    @Sse('recommend/stream')
    @UseGuards(JwtAuthGuard)
    recommendStream(
        @Req() req: any,
    ): Observable<MessageEvent> {
        const userId = req.user.id;

        // query string에서 파라미터 추출
        // 예: /style/recommend/stream?intent=formal&source=external&anchor_item_id=12
        const query = req.query;

        console.log('Received query parameters:', query);

        const body = {
            intent: query.intent,
            source: query.source,
            anchor_item_id: query.anchor_item_id
                ? Number(query.anchor_item_id)
                : undefined,
            style_reference_ids: query.style_reference_ids
                ? String(query.style_reference_ids)
                    .split(',')
                    .map((id: string) => Number(id))
                    .filter((n) => !isNaN(n))
                : [],
        };

        console.log('Recommend (SSE) request:', { userId, body });

        return this.stylesService.recommendStream(userId, body);
    }
}