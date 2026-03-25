/*
https://docs.nestjs.com/controllers#controllers
*/

import { Controller, Get, Param, Post, Query, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { PostsService } from './providers/posts.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsInterceptor } from './posts.interceptors.js';
import { S3Service } from '../s3/s3.service.js';

@Controller('posts')
export class PostsController {
    // Inject the PostsService to use its methods in this controller
    // this service object will be used in only this controller
    constructor(private readonly postsService: PostsService, private readonly s3Service: S3Service) {}

    @Get('/registerMyClothes')
    public async getUploadURL(@Query('fileName') filename: string) {
        // return await this.postsService.registerMyClothes(filename);
        console.log('this is test to get upload URL')
    }

    @Post('/registerMyClothes')
    @UseInterceptors(FileInterceptor('image'), PostsInterceptor)
    public async registerMyClothes(
        @UploadedFile() file: Express.Multer.File, 
        @Req() req: any) {
            const validation = (req as any).clothingValidation;

            if (!validation.valid) {
                throw new BadRequestException('Invalid clothing image');
            }

            console.log('this is test to get file buffer', file.buffer)

            const { key, url } = await this.s3Service.uploadClothingImage(file.buffer, 'seungyeon');

            console.log('this is test to get key and url', key, url)
            
            return { key, url }

            // const result = await this.postsService.registerMyClothes(file, validation);

            // return {
            //     success: true,
            //     data: result,
            // }
    }
}
