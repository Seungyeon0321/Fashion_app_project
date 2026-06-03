import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import { S3Service } from '../../s3/s3.service.js';
import { AuthProvider } from '../../generated/prisma/client.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    private readonly httpService: HttpService, // ← 추가
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

  // ── Step 41/42: Try-On 사진 업로드/교체 ──────────────────────
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

    // 3. FastAPI에 캐시 무효화 요청 (Step 42-B)
    // 실패해도 사진 업로드는 성공 처리 — 캐시는 부가기능
    // FastAPI가 다운 = Try-On 자체도 안 되는 상황 → TTL(24h) 만료로 자연 해소
    try {
      const fastapiUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000';
      await firstValueFrom(
        this.httpService.delete(`${fastapiUrl}/tryon/cache/${userId}`),
      );
      console.log(`[TryOn Cache] 무효화 완료 user=${userId}`);
    } catch (e: any) {
      console.error(`[TryOn Cache] 무효화 실패, 무시하고 계속: ${e?.message}`);
    }

    return { tryonPhotoUrl: url };
  }
}