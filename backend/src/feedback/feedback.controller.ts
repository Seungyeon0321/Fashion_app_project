// backend/src/feedback/feedback.controller.ts

import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FeedbackService } from './providers/feedback.service.js';
import { FeedbackDto } from './dto/feedback.dto.js';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('like')
  like(@Req() req: any, @Body() dto: FeedbackDto) {
    return this.feedbackService.like(req.user.id, dto);
  }

  @Post('dislike')
  dislike(@Req() req: any, @Body() dto: FeedbackDto) {
    return this.feedbackService.dislike(req.user.id, dto);
  }
}