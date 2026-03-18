/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostsService } from './providers/posts.service.js';

@Controller('posts')
export class PostsController {
    // Inject the PostsService to use its methods in this controller
    // this service object will be used in only this controller
    constructor(private readonly postsService: PostsService) {}

    @Get('/registerMyClothes')
    public async getUploadURL(@Query('fileName') filename: string) {
        return await this.postsService.postMyitems(filename);
    }
}
