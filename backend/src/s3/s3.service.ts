// src/s3/s3.service.ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';


@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.region = this.getRequiredEnv('AWS_REGION');
    const accessKeyId = this.getRequiredEnv('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.getRequiredEnv('AWS_SECRET_ACCESS_KEY');
    this.bucket = this.getRequiredEnv('AWS_S3_BUCKET');

    // create S3 client to connect to S3
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadClothingImage(
    imageBuffer: Buffer,
    userId: string,
    jobId: string,           // ← 추가
    mimeType: string = 'image/jpeg',
  ): Promise<{ key: string; url: string }> {
    const ext = mimeType.split('/')[1];
    const key = `originals/${userId}/${jobId}/original.${ext}`;  // ← 변경
  
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: imageBuffer,
      ContentType: mimeType,
    });
  
    await this.client.send(command);
  
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { key, url };
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }
}