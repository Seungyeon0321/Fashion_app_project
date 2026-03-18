import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * 전역 Prisma 모듈
 * 모든 모듈에서 PrismaService를 사용할 수 있도록 전역으로 등록합니다.
 */

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
