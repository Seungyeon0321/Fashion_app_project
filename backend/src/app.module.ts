import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PostsModule } from './posts/posts.module.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { S3Module } from './s3/s3.module.js';
import { BullModule } from '@nestjs/bullmq';
import { ClosetModule } from './closet/closet.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { StyleModule } from './style/style.module.js';
import { OutfitModule } from './outfit/outfit.module.js';
import { StyleReferenceModule } from './style-reference/style-reference.module.js';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    PostsModule,
    ConfigModule,
    PrismaModule,
    S3Module,
    ClosetModule,
    AuthModule,
    UsersModule,
    StyleModule,
    OutfitModule,
    StyleReferenceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
