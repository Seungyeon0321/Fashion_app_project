// backend/src/outfit/outfit.module.ts
import { Module } from '@nestjs/common';
import { OutfitController } from './outfit.controller.js';
import { OutfitService } from './providers/outfit.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [OutfitController],
  providers: [OutfitService],
})
export class OutfitModule {}