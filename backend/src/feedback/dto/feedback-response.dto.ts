import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class FeedbackResponseDto {
  @IsNumber()
  id!: number;

  @IsString()
  type!: 'LIKE' | 'DISLIKE';

  @IsString()
  proposalMood!: string;

  createdAt!: Date;
}

export class FeedbackHistoryDto {
  @IsOptional()
  @IsString()
  topMood!: string | null;

  @IsArray()
  preferredColors!: string[];

  @IsArray()
  preferredBrands!: string[];

  @IsArray()
  avoidedColors!: string[];

  @IsArray()
  avoidedBrands!: string[];

  @IsArray()
  excludedItemKeywords!: string[];

  @IsNumber()
  totalLikes!: number;

  @IsNumber()
  totalDislikes!: number;

  @IsArray()
  recentLikedMoods!: string[];

  @IsArray()
  recentDislikedMoods!: string[];
}