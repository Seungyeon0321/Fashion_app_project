import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsersService } from './providers/users.service.js';
import { UsersController } from './users.controller.js';
import { S3Module } from '../s3/s3.module.js';

@Module({
  imports: [
    S3Module,
    HttpModule,   // ← FastAPI 캐시 무효화 호출용
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}