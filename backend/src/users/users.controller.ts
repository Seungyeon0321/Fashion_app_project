// backend/src/users/users.controller.ts

import { Controller, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UsersService } from './providers/users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // PATCH /users/me/gender — 젠더 업데이트
  @UseGuards(JwtAuthGuard)
  @Patch('me/gender')
  async updateGender(
    @Req() req: any,
    @Body() body: { gender: 'MALE' | 'FEMALE' | 'UNISEX' },
  ) {
    return this.usersService.updateGender(req.user.id, body.gender);
  }
}