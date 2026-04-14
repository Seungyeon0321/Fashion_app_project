import { Controller, Post, Req, UseGuards, Body, Get } from '@nestjs/common';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ClosetService } from './closet.service.js';
import { RegisterClosetItemDto } from './dtos/closet.dtos.js';


// @UseGuards(JwtAuthGuard)
@Controller('closet')
export class ClosetController {
    constructor(private readonly closetService: ClosetService) {}

    // POST /closet/register
    @Post('/register')
    async register(@Req() req: any, @Body() dto: RegisterClosetItemDto) {
        const userId = 1
        return this.closetService.register(userId, dto);
    }

    // GET /closet
    @Get()
    async findAll(@Req() req: any) {
        const userId = 1;
        return this.closetService.findAllByUserId(userId);
    }
}
