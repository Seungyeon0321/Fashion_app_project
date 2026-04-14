import { Module } from '@nestjs/common';
import { ClosetService } from './closet.service.js';
import { ClosetController } from './closet.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  providers: [ClosetService],
  imports: [PrismaModule],
  controllers: [ClosetController]
})
export class ClosetModule {}
