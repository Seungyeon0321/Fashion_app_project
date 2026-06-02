import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { FeedbackService } from './providers/feedback.service.js';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('like')
  like(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.like(dto);
  }

  @Post('dislike')
  dislike(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.dislike(dto);
  }

  // FastAPI outfit_composer가 추천 시작 전 이 엔드포인트를 호출
  @Get('history/:userId')
  getHistory(@Param('userId', ParseIntPipe) userId: number) {
    return this.feedbackService.getHistory(userId);
  }
}