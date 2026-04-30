// backend/src/outfit/outfit.controller.ts
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OutfitService } from './providers/outfit.service.js';
import { CreateOutfitDto } from './dto/create-outfit.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('outfits')
@UseGuards(JwtAuthGuard)
export class OutfitController {
  constructor(private readonly outfitService: OutfitService) {}

  // POST /outfits — 코디 저장
  @Post()
  create(@Req() req: any, @Body() dto: CreateOutfitDto) {
    return this.outfitService.create(req.user.id, dto);
  }

  // GET /outfits — 내 코디 히스토리
  @Get()
  findAll(@Req() req: any) {
    return this.outfitService.findAllByUser(req.user.id);
  }
}