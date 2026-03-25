import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PostsModule } from './posts/posts.module.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { S3Module } from './s3/s3.module.js';

@Module({
  imports: [PostsModule, ConfigModule, PrismaModule, S3Module],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
