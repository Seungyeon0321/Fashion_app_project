import {
  Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards,
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
    return this.tryonService.runTryon(
      req.user.id,
      body.category,
      body.garment_url,
      body.closet_item_id,
      body.model_image_url,
    );
  }
}