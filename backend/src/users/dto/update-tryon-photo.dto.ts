// backend/src/users/dto/update-tryon-photo.dto.ts

import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateTryonPhotoDto {
  @IsString()
  @IsNotEmpty()
  imageBase64!: string;
  // 프론트에서 base64로 인코딩된 이미지 문자열을 받아요
  // 예: "data:image/jpeg;base64,/9j/4AAQ..."

  @IsString()
  @IsNotEmpty()
  mimeType!: string;
  // "image/jpeg" | "image/png" | "image/webp"
}