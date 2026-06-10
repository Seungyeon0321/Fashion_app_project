// backend/src/outfit/outfit.module.ts
import { Module } from '@nestjs/common';
import { OutfitController } from './outfit.controller.js';
import { OutfitService } from './providers/outfit.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { S3Module } from '../s3/s3.module.js';

@Module({
  imports: [PrismaModule, S3Module],  // ← S3Module 추가
  controllers: [OutfitController],
  providers: [OutfitService],
})
export class OutfitModule {}