import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../providers/auth.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_REDIRECT_URL || 'http://localhost:5000/api/v1/customers/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, emails, displayName, photos } = profile;

    const result = await this.authService.handleGoogleLogin({
      googleId: id,
      email: emails[0].value,
      nickname: displayName,
      avatarUrl: photos?.[0]?.value,
    });

    // done(에러, 데이터) — Passport 콜백 패턴
    done(null, result);
  }
}