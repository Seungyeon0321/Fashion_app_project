import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/providers/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) {}

    async validateLocalUser(email: string, password: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return user;
    }

    generateToken(user: {id: number; email: string}) {
        const payload = { sub: user.id, email: user.email };
        return {accessToken: this.jwtService.sign(payload)};
    }

    async register(email: string, password: string, nickname?: string, gender?: 'MALE' | 'FEMALE' | 'UNISEX') {
        // check if the email is already in use
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new BadRequestException('Email already in use');
        }
        // create a new user
        const user = await this.usersService.createLocalUser(email, password, nickname, gender);
        return this.generateToken(user);
    }

async handleGoogleLogin(data: {
  googleId: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
}) {
  // findOrCreateGoogleUser가 3가지 케이스 모두 처리
  const user = await this.usersService.findOrCreateGoogleUser(data);

  const payload = { sub: user.id, email: user.email };
  const access_token = this.jwtService.sign(payload);

  return { access_token, user };
}

async handleGoogleMobileLogin(idToken: string) {
  const { OAuth2Client } = await import('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  // idToken 검증 (code 교환 불필요 — 훨씬 심플!)
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const googlePayload = ticket.getPayload()!;

  return this.handleGoogleLogin({
    googleId: googlePayload.sub,
    email: googlePayload.email!,
    nickname: googlePayload.name || googlePayload.email!,
    avatarUrl: googlePayload.picture,
  });
}
}
