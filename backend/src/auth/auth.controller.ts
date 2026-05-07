import { Controller, Post, Get, UseGuards, Req, Body } from '@nestjs/common';
import { AuthService } from './providers/auth.service.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /auth/register — 로컬 회원가입
  @Post('register')
  async register(
    @Body() body: { email: string; password: string; nickname?: string; gender?: 'MALE' | 'FEMALE' | 'UNISEX' },) {
    return this.authService.register(body.email, body.password, body.nickname, body.gender);
  }

  // POST /auth/login — 로컬 로그인
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: any) {
    return this.authService.generateToken(req.user);
  }

  // GET /auth/google — Google 로그인 페이지로 리다이렉트
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  async googleLogin() {
    // Guard가 Google 로그인 페이지로 리다이렉트 — 여기 코드는 실행 안 됨
  }

  // GET /auth/google/callback — Google 로그인 성공 후 콜백
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: any) {
    return req.user;
  }

  // GET /auth/me — 토큰으로 현재 유저 확인 (테스트용)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    return req.user;
  }
}