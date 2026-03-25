/*
https://docs.nestjs.com/modules
*/

import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { PostsController } from './posts.controller.js';
import { PostsService } from './providers/posts.service.js';
import { FileCheckMiddleware } from './middleware/posts.middleware.js';
import { ClothingValidationService } from './clothing-class/clothing-validation.service.js';
import { S3Module } from '../s3/s3.module.js';

@Module({
    imports: [S3Module],
    controllers: [PostsController],
    providers: [PostsService, ClothingValidationService],
})

export class PostsModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(FileCheckMiddleware).forRoutes({ path: 'posts', method: RequestMethod.POST });
    }
}
