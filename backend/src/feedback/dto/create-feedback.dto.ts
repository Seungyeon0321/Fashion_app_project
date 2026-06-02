import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class OutfitSnapshotItemDto {
  @IsString()
  category!: string;

  @IsString()
  productName!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  purchaseUrl?: string;
}

export class OutfitSnapshotDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutfitSnapshotItemDto)
  items!: OutfitSnapshotItemDto[];

  @IsOptional()
  @IsNumber()
  anchor_item_id?: number | null;
}

export class CreateFeedbackDto {
  @IsNumber()
  userId!: number;

  @IsString()
  @IsNotEmpty()
  recommendSessionId!: string;

  @IsNumber()
  proposalIndex!: number;

  @IsString()
  @IsNotEmpty()
  proposalMood!: string;

  @ValidateNested()
  @Type(() => OutfitSnapshotDto)
  outfitSnapshot!: OutfitSnapshotDto;

  @IsString()
  @IsNotEmpty()
  recommendSource!: string;

  @IsOptional()
  @IsString()
  intent?: string;
}