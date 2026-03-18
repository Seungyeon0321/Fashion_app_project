/*
https://docs.nestjs.com/modules
*/

import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { PostsController } from './posts.controller.js';
import { PostsService } from './providers/posts.service.js';
import { FileCheckMiddleware } from './middleware/posts.middleware.js';

@Module({
    controllers: [PostsController],
    providers: [PostsService],
})

export class PostsModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(FileCheckMiddleware).forRoutes({ path: 'posts', method: RequestMethod.POST });
    }
}
