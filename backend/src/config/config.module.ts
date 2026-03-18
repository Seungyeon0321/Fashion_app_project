import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

/**
 * 전역 Config 모듈
 * System Architecture 문서에 따라:
 * - 모든 서비스는 ConfigService를 주입받아 사용
 * - process.env 직접 사용 금지
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
