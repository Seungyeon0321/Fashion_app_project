import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TryonRequestDto {
  
  @IsString()
  @IsNotEmpty()
  garment_url!: string;

  @IsString()
  @IsNotEmpty()
  category!: 'TOP' | 'BOTTOM' | 'OUTER' | 'FULL'; ;
}