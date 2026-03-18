import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION});

const expiresIn = 300; // URL expiration time in seconds

export async function createPresignedUrl(filename: string) {
  try {
  const key = `${Date.now()}_${filename}`;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: 'image/jpeg',
  });

  const url = await getSignedUrl(s3, command, { expiresIn: expiresIn });
  return url;
} catch (error) {
  console.error('Error creating presigned URL:', error);
  throw error;
}
}
