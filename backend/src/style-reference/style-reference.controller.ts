// backend/src/style-reference/style-reference.controller.ts

import {
  Controller, Get, Post, Delete,
  Body, Param, Req, UseGuards,
  UseInterceptors, UploadedFile,
  ParseIntPipe, BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { StyleReferenceService } from './providers/style-reference.service.js'
import { SavePresetStylesDto } from './dto/save-preset-styles.dto.js'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js'

@Controller('style-reference')
@UseGuards(JwtAuthGuard)
export class StyleReferenceController {
  constructor(private readonly styleReferenceService: StyleReferenceService) {}

  // GET /style-reference/presets
  @Get('presets')
  async getPresets(@Req() req: any) {
    return this.styleReferenceService.getPresets(req.user.id)
  }

  // POST /style-reference/preset
  @Post('preset')
  async savePresetStyles(@Req() req: any, @Body() dto: SavePresetStylesDto) {
    return this.styleReferenceService.savePresetStyles(req.user.id, dto)
  }

  // GET /style-reference/my-styles
  @Get('my-styles')
  async getMyStyles(@Req() req: any) {
    return this.styleReferenceService.getMyStyles(req.user.id)
  }

  // POST /style-reference/custom
  @Post('custom')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new BadRequestException('이미지 파일만 업로드 가능합니다.'), false)
        return
      }
      cb(null, true)
    },
  }))
  async uploadCustom(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('이미지 파일이 없습니다.')
    }
    return this.styleReferenceService.uploadCustom(
      req.user.id,
      file.buffer,
      file.mimetype,
    )
  }

  // DELETE /style-reference/custom/:id
  @Delete('custom/:id')
  async deleteCustom(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.styleReferenceService.deleteCustom(req.user.id, id)
  }
}