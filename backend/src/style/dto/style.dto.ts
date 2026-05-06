import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RecommendDto {
    @IsString()
    @IsNotEmpty()
    user_message: string;
    @IsString()
    @IsNotEmpty()
    intent: string;
    @IsArray()
    @IsOptional()
    excluded_items: number[];
  }