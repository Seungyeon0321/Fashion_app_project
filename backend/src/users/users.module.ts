// backend/src/users/users.module.ts

import { Module } from '@nestjs/common';
import { UsersService } from './providers/users.service.js';
import { UsersController } from './users.controller.js';
import { S3Module } from '../s3/s3.module.js';

@Module({
  imports: [S3Module],       // ← S3Service 주입 가능해짐
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}