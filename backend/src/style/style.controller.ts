import { Controller, Post, Body } from '@nestjs/common';
import { StylesService } from './providers/style.service.js';
import { RecommendDto } from './dtos/style.dto.js';

@Controller('style')
export class StyleController {
    constructor(private readonly stylesService: StylesService) {}

    @Post('recommend')
    async recommend(@Body() body: RecommendDto) {
        return this.stylesService.recommend(body);
    }
}
