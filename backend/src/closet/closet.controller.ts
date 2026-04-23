import { Controller, Post, Req, UseGuards, Body, Get, Param, Patch, Delete, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ClosetService } from './providers/closet.service.js';
import { RegisterClosetItemDto, UpdateClosetItemDto } from './dtos/closet.dtos.js';

@UseGuards(JwtAuthGuard)
@Controller('closet')
export class ClosetController {
    constructor(private readonly closetService: ClosetService) {}

    @Post('/register')
    async register(@Req() req: any, @Body() dto: RegisterClosetItemDto) {
        const userId = req.user.id;
        return this.closetService.register(userId, dto);
    }

    @Get()
    async findAll(@Req() req: any) {
        const userId = req.user.id;
        return this.closetService.findAllByUserId(userId);
    }

    @Get('/:id')
    async findOne(@Req() req: any, @Param('id') closetItemId: number) {
        const userId = req.user.id;
        return this.closetService.findOneById(userId, closetItemId);
    }

    @Patch('/:id/archive')
    async archive(@Req() req: any, @Param('id') closetItemId: number) {
        const userId = req.user.id;
        return this.closetService.archive(userId, closetItemId);
    }

    @Delete('/:id')
    async remove(@Req() req: any, @Param('id') closetItemId: number) {
        const userId = req.user.id;
        return this.closetService.remove(userId, closetItemId);
    }

    @Patch(':id')
    async update(
        @Req() req: any,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateClosetItemDto,
    ) {
        const userId = req.user.id;
        return this.closetService.update(userId, id, dto);
    }
}