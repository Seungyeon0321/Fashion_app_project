// backend/src/feedback/feedback.module.ts

import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './providers/feedback.service.js';
import { PrismaModule } from '../prisma/prisma.module.js'; // 기존 경로 확인 후 수정

@Module({
  imports:     [PrismaModule],
  controllers: [FeedbackController],
  providers:   [FeedbackService],
})
export class FeedbackModule {}