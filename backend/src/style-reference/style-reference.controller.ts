// backend/src/style-reference/style-reference.controller.ts

import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common'
import { StyleReferenceService } from './providers/style-reference.service.js'
import { SavePresetStylesDto } from './dto/save-preset-styles.dto.js'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js'

@Controller('style-reference')
@UseGuards(JwtAuthGuard)
export class StyleReferenceController {
  constructor(private readonly styleReferenceService: StyleReferenceService) {}

  // GET /style-reference/presets
  // 유저 gender 기반 프리셋 목록 반환
  @Get('presets')
  async getPresets(@Req() req: any) {
    const userId = req.user.id
    return this.styleReferenceService.getPresets(userId)
  }

  // POST /style-reference/preset
  // 선택한 스타일 저장 (최대 3개)
  @Post('preset')
  async savePresetStyles(
    @Req() req: any,
    @Body() dto: SavePresetStylesDto,
  ) {
    const userId = req.user.id
    return this.styleReferenceService.savePresetStyles(userId, dto)
  }

  // GET /style-reference/my-styles
  // 저장된 내 스타일 조회
  @Get('my-styles')
  async getMyStyles(@Req() req: any) {
    const userId = req.user.id
    return this.styleReferenceService.getMyStyles(userId)
  }
}