/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Param, Post, Query, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { PostsService } from './providers/posts.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsInterceptor } from './posts.interceptors.js';
import { Request } from 'express';
import { Multer } from 'multer';

@Controller('posts')
export class PostsController {
    // Inject the PostsService to use its methods in this controller
    // this service object will be used in only this controller
    constructor(private readonly postsService: PostsService) {}

    @Get('/registerMyClothes')
    // public async getUploadURL(@Query('fileName') filename: string) {
    //     return await this.postsService.registerMyClothes(filename);
    // }

    @Post('/registerMyClothes')
    @UseInterceptors(FileInterceptor('image'), PostsInterceptor)
    public async registerMyClothes(
        @UploadedFile() file: Multer.File, 
        @Req() req: Request) {
            const validation = (req as any).clothingValidation;

            const result = await this.postsService.registerMyClothes(file, validation);

            return {
                success: true,
                data: result,
            }
    }
}
