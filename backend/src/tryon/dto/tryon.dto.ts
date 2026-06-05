import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class TryonRequestDto {
  @IsOptional()
  @IsString()
  garment_url?: string;

  @IsOptional()
  @IsNumber()
  closet_item_id?: number;

  @IsNotEmpty()
  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  model_image_url?: string;
}