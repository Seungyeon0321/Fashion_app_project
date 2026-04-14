import { ApiProperty } from "@nestjs/swagger";
import { Category, SubCategory } from "../../generated/prisma/client.js";
import { IsNumber, IsNotEmpty, IsEnum, IsString, IsOptional, IsArray } from "class-validator";

// elements sent by the user to register a closet item, 즉 Ai 처리 과정에서 유저가 선택할 수 항목만 해당 dto에 정의
export class RegisterClosetItemDto {
    @ApiProperty({ description: 'The ID of the clothing item to register' })
    @IsNumber()
    @IsNotEmpty()
    clothingItemId: number;

    @ApiProperty({ description: 'The sub category of the clothing item' })
    @IsEnum(SubCategory)
    @IsNotEmpty()
    subCategory: SubCategory;
    
    @ApiProperty({ description: 'The category of the clothing item' })
    @IsEnum(Category)
    @IsNotEmpty()
    category: Category;
    
    @ApiProperty({ description: 'The brand of the clothing item' })
    @IsString()
    @IsOptional()
    brand?: string;
    
    @ApiProperty({ description: 'The color of the clothing item' })
    @IsArray()
    @IsOptional()
    colors?: string[];
    
    @ApiProperty({ description: 'The memo of the clothing item' })
    @IsString()
    @IsOptional()
    memo?: string;
  }