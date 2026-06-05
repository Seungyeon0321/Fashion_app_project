// backend/src/users/users.controller.ts

import {
  Controller,
  Patch,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UsersService } from './providers/users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // PATCH /users/me/gender
  @UseGuards(JwtAuthGuard)
  @Patch('me/gender')
  async updateGender(
    @Req() req: any,
    @Body() body: { gender: 'MALE' | 'FEMALE' | 'UNISEX' },
  ) {
    return this.usersService.updateGender(req.user.id, body.gender);
  }

  // PATCH /users/me/tryon-photo
  // multipart/form-data: field name = "photo"
  @UseGuards(JwtAuthGuard)
  @Patch('me/tryon-photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
      fileFilter: (req, file, cb) => {
        // jpeg, png, webp만 허용
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('jpeg, png, webp만 업로드 가능합니다'), false);
        }
      },
    }),
  )
  async updateTryonPhoto(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('we need a photo file');
    }

    return this.usersService.updateTryonPhoto(
      req.user.id,
      file.buffer,
      file.mimetype,
    );
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('me/tryon-photo-url')
  async getTryonPhotoUrl(@Req() req: any) {
    if (!req.user.tryonPhotoUrl) return { presignedUrl: null };
    const presignedUrl = await this.usersService.getTryonPhotoPresignedUrl(
      req.user.tryonPhotoUrl,
    );
    return { presignedUrl };
  } 
}