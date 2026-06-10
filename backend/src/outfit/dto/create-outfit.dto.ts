// backend/src/outfit/dto/create-outfit.dto.ts  ← 기존 파일 수정

import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OutfitItemDto {
  // 내부 아이템 — closetItemId만 있으면 됨
  @IsOptional()
  @IsNumber()
  closetItemId?: number;

  // 외부 아이템 필드들 — is_external=true일 때만 사용
  @IsOptional()
  @IsBoolean()
  isExternal?: boolean;

  @IsOptional()
  @IsString()
  externalId?: string;      // "naver_56445104219"

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;        // 원본 이미지 URL

  @IsOptional()
  @IsString()
  purchaseUrl?: string;     // 구매 링크

  @IsOptional()
  @IsString()
  category?: string;
}

export class CreateOutfitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutfitItemDto)
  items!: OutfitItemDto[];

  @IsOptional()
  @IsString()
  recommendSource?: string;   // ← 추가


  @IsOptional()
  @IsNumber()
  recordedTemp?: number;

  @IsOptional()
  @IsString()
  recordedWeather?: string;
}