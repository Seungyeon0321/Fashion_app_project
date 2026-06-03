import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { S3Service } from '../../s3/s3.service.js';
import { AuthProvider } from '../../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findFirst({ where: { googleId } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

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

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    nickname?: string;
    avatarUrl?: string;
  }) {
    const existingByGoogle = await this.findByGoogleId(profile.googleId);
    if (existingByGoogle) return existingByGoogle;

    const existingByEmail = await this.findByEmail(profile.email);
    if (existingByEmail) {
      return this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId: profile.googleId, avatarUrl: profile.avatarUrl },
      });
    }

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

  // ── Step 41: Try-On 사진 업로드/교체 ─────────────────────────
  // 캐시 무효화는 FastAPI /tryon 구현 시 같이 추가 예정
  async updateTryonPhoto(
    userId: number,
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<{ tryonPhotoUrl: string }> {
    // 1. S3 업로드 (고정 경로 → 자동 덮어쓰기)
    const { url } = await this.s3.uploadTryonPhoto(
      imageBuffer,
      String(userId),
      mimeType,
    );

    // 2. DB 업데이트
    await this.prisma.user.update({
      where: { id: userId },
      data: { tryonPhotoUrl: url },
    });

    return { tryonPhotoUrl: url };
  }
}