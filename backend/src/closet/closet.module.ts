import { Module } from '@nestjs/common';
import { ClosetService } from './providers/closet.service.js';
import { ClosetController } from './closet.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { S3Module } from '../s3/s3.module.js';

@Module({
  providers: [ClosetService],
  imports: [PrismaModule, S3Module],
  controllers: [ClosetController]
})
export class ClosetModule {}
