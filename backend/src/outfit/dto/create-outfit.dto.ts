// backend/src/outfit/dto/create-outfit.dto.ts
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OutfitItemDto {
  @IsNumber()
  closetItemId: number;
}

export class CreateOutfitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutfitItemDto)
  items: OutfitItemDto[];

  @IsOptional()
  @IsNumber()
  recordedTemp?: number;

  @IsOptional()
  @IsString()
  recordedWeather?: string;
}