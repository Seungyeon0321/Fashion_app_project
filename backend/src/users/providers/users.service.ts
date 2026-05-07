import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthProvider } from '../../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 이메일로 유저 찾기
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // Google ID로 유저 찾기
  async findByGoogleId(googleId: string) {
    return this.prisma.user.findFirst({ where: { googleId } });
  }

  // ID로 유저 찾기
  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // 로컬 회원가입 (이메일 + 비밀번호)
  async createLocalUser(email: string, password: string, nickname?: string, gender?: 'MALE' | 'FEMALE' | 'UNISEX') {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nickname,
        gender,
        provider: AuthProvider.LOCAL,
      },
    });
  }

  // Google 유저 생성 (또는 기존 유저 반환)
  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    nickname?: string;
    avatarUrl?: string;
  }) {
    // 1. googleId로 먼저 찾기
    const existingByGoogle = await this.findByGoogleId(profile.googleId);
    if (existingByGoogle) return existingByGoogle;

    // 2. 같은 이메일로 로컬 가입한 유저가 있으면 Google 정보 연결
    const existingByEmail = await this.findByEmail(profile.email);
    if (existingByEmail) {
      return this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.googleId,
          avatarUrl: profile.avatarUrl,
        },
      });
    }

    // 3. 완전히 새로운 유저 생성
    return this.prisma.user.create({
      data: {
        email: profile.email,
        nickname: profile.nickname,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl,
        provider: AuthProvider.GOOGLE,
      },
    });
  }

  async updateGender(userId: number, gender: 'MALE' | 'FEMALE' | 'UNISEX') {
  return this.prisma.user.update({
    where: { id: userId },
    data: { gender },
  });
}
}