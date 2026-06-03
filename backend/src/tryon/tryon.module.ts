import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TryonController } from './tryon.controller.js';
import { TryonService } from './tryon.service.js';

@Module({
  imports: [
    HttpModule.register({
      timeout: 40_000,   // 모듈 기본값도 설정 (서비스 옵션과 이중 보호)
    }),
  ],
  controllers: [TryonController],
  providers:   [TryonService],
})
export class TryonModule {}