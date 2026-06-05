import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service.js';  // ← 추가

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {  // ← 추가
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default_secret',
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, gender: true, tryonPhotoUrl: true },  // ← gender 및 tryonPhotoUrl 추가
    });

    return {
      id: user?.id,
      email: user?.email,
      gender: user?.gender,  // ← 추가
      tryonPhotoUrl: user?.tryonPhotoUrl ?? null,  // ← 추가
    };
  }
}