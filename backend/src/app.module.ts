import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PostsModule } from './posts/posts.module.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { S3Module } from './s3/s3.module.js';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [PostsModule, ConfigModule, PrismaModule, S3Module, BullModule.forRoot({
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }),
  BullModule.registerQueue({
    name: 'clothing',
  }),
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
