import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TryonService } from './providers/tryon.service.js';
import { TryonRequestDto } from './dto/tryon.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('tryon')
export class TryonController {
  constructor(private readonly tryonService: TryonService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async runTryon(@Req() req: any, @Body() body: TryonRequestDto) {
    // user_id는 서버에서 JWT로 직접 꺼냄 → 클라이언트 body에서 받지 않음
    return this.tryonService.runTryon(
      req.user.id,
      body.garment_url,
      body.category,
    );
  }
}