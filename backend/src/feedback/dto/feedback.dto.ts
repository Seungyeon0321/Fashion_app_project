// backend/src/feedback/feedback.dto.ts

import { IsString, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SnapshotItemDto {
  @IsString()                   category: string;
  @IsOptional() @IsString()     productName?: string;
  @IsOptional() @IsString()     brand?: string;
  @IsOptional() @IsString()     imageUrl?: string;
  @IsOptional() @IsString()     purchaseUrl?: string;
}

class OutfitSnapshotDto {
  @ValidateNested({ each: true })
  @Type(() => SnapshotItemDto)
  items: SnapshotItemDto[];

  @IsOptional() @IsNumber()     anchor_item_id?: number;
}

export class FeedbackDto {
  @IsString()                   session_id: string;
  @IsNumber()                   proposal_index: number;
  @IsString()                   proposal_mood: string;

  @ValidateNested()
  @Type(() => OutfitSnapshotDto)
  outfit_snapshot: OutfitSnapshotDto;

  @IsArray() @IsString({ each: true })  extracted_brands: string[];
  @IsArray() @IsString({ each: true })  extracted_colors: string[];
  @IsString()                           recommend_source: string;
  @IsOptional() @IsString()             intent?: string;
}