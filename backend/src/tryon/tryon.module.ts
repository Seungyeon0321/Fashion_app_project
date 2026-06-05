import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TryonController } from './tryon.controller.js';
import { TryonService } from './providers/tryon.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';  // ← 추가
import { S3Module } from '../s3/s3.module.js';               // ← 추가

@Module({
  imports: [
    HttpModule.register({ timeout: 40_000 }),
    PrismaModule,  // ← closetItem 조회용
    S3Module,      // ← cropS3Key presigned URL 생성용
  ],
  controllers: [TryonController],
  providers:   [TryonService],
})
export class TryonModule {}