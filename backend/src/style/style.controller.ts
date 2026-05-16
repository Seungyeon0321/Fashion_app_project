import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { StylesService } from './providers/style.service.js';
import { RecommendDto } from './dto/style.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('style')
export class StyleController {
    constructor(private readonly stylesService: StylesService) {}

    @Post('recommend')
    @UseGuards(JwtAuthGuard)  // JWT 인증 필수
    async recommend(@Body() body: RecommendDto, @Req() req: any) {
        const userId = req.user.id  // JwtAuthGuard가 JWT 디코딩 후 req.user에 주입
        return this.stylesService.recommend(userId, body);
    }
}