// src/s3/s3.service.ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly referenceBucket: string;
  private readonly region: string;

  constructor() {
    this.region = this.getRequiredEnv('AWS_REGION');
    const accessKeyId = this.getRequiredEnv('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.getRequiredEnv('AWS_SECRET_ACCESS_KEY');
    this.bucket = this.getRequiredEnv('AWS_S3_BUCKET');
    this.referenceBucket = this.getRequiredEnv('AWS_S3_REFERENCE_BUCKET');

    this.client = new S3Client({
      region: this.region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async uploadClothingImage(
    imageBuffer: Buffer,
    userId: string,
    jobId: string,
    mimeType: string = 'image/jpeg',
  ): Promise<{ key: string; url: string }> {
    const ext = mimeType.split('/')[1];
    const key = `originals/${userId}/${jobId}/original.${ext}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: imageBuffer,
      ContentType: mimeType,
    }));

    return {
      key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
    };
  }

  async uploadReferenceImage(
    imageBuffer: Buffer,
    userId: string,
    referenceId: string,
    mimeType: string = 'image/jpeg',
  ): Promise<{ key: string; url: string }> {
    const ext = mimeType.split('/')[1] || 'jpg';
    const date = new Date().toISOString().slice(0, 10);
    const uuid = randomUUID().slice(0, 8);
    const key = `${userId}/references/${date}_${uuid}.${ext}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.referenceBucket,
      Key: key,
      Body: imageBuffer,
      ContentType: mimeType,
    }));

    return {
      key,
      url: `https://${this.referenceBucket}.s3.${this.region}.amazonaws.com/${key}`,
    };
  }

  // ── Step 41: Virtual Try-On 사진 업로드 ──────────────────────
  // 유저당 1장 고정 → 경로 고정으로 자동 덮어쓰기
  // 변경 시 이전 파일 별도 삭제 불필요 (같은 key로 덮어씀)
  async uploadTryonPhoto(
    imageBuffer: Buffer,
    userId: string,
    mimeType: string = 'image/jpeg',
  ): Promise<{ key: string; url: string }> {
    const ext = mimeType.split('/')[1] || 'jpg';
    const key = `tryon/${userId}.jpg`;
    // 경로 고정: tryon/123.jpg
    // → 같은 유저가 사진 바꿔도 동일 key로 PutObject → 자동 덮어쓰기

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: imageBuffer,
      ContentType: mimeType,
    }));

    return {
      key,
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
    };
  }

  async getPresignedUrl(s3Key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
      { expiresIn: 60 * 60 },
    );
  }

  async getReferencePresignedUrl(s3Key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.referenceBucket, Key: s3Key }),
      { expiresIn: 60 * 60 },
    );
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
  }
}