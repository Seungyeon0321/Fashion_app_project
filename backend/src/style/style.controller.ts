// backend/src/style/style.controller.ts

import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { StylesService } from './providers/style.service.js';
import { RecommendDto } from './dto/style.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('style')
export class StyleController {
    constructor(private readonly stylesService: StylesService) {}

    // 기존 — 유지 (Postman 테스트 / fallback용)
    @Post('recommend')
    @UseGuards(JwtAuthGuard)
    async recommend(@Body() body: RecommendDto, @Req() req: any) {
        const userId = req.user.id;
        return this.stylesService.recommend(userId, body);
    }

    // 신규 — SSE 연결 전 user_id + fastapi_url 발급
    // 프론트가 이걸 먼저 호출해서 user_id를 안전하게 받아간 뒤
    // FastAPI에 직접 SSE 연결할 때 사용
    @Get('context')
    @UseGuards(JwtAuthGuard)
    getContext(@Req() req: any) {
        return this.stylesService.getContext(req.user.id);
    }
}