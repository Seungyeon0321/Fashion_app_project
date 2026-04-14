import { Controller, Post, Req, UseGuards, Body, Get, Param, Patch, Delete, ParseIntPipe } from '@nestjs/common';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ClosetService } from './closet.service.js';
import { RegisterClosetItemDto, UpdateClosetItemDto } from './dtos/closet.dtos.js';


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

    // PUT /closet/:id/archive
    @Patch('/:id/archive')
    async archive(@Req() req: any, @Param('id') closetItemId: number) {
        const userId = 1;
        return this.closetService.archive(userId, closetItemId);
    }

    // DELETE /closet/:id
    @Delete('/:id')
    async remove(@Req() req: any, @Param('id') closetItemId: number) {
        const userId = 1;
        return this.closetService.remove(userId, closetItemId);
    }


    // PATCH /closet/:id
    @Patch(':id')
    async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClosetItemDto,
    ) {
    const userId = 1;
    return this.closetService.update(userId, id, dto);
}
}
