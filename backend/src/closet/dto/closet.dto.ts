import { ApiProperty } from "@nestjs/swagger";
import { Category, SubCategory, FitType } from "../../generated/prisma/client.js";
import { IsNumber, IsNotEmpty, IsEnum, IsString, IsOptional, IsArray, IsBoolean } from "class-validator";

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

export class UpdateClosetItemDto {
    @ApiProperty({ description: 'The sub category of the clothing item' })
    @IsEnum(SubCategory)
    @IsOptional()
    subCategory?: SubCategory;

    @ApiProperty({ description: 'The category of the clothing item' })
    @IsEnum(Category)
    @IsOptional()
    category?: Category;

    @ApiProperty({ description: 'The brand of the clothing item' })
    @IsString()
    @IsOptional()
    brand?: string;

    @ApiProperty({ description: 'The colors of the clothing item' })
    @IsArray()
    @IsOptional()
    colors?: string[];

    @ApiProperty({ description: 'The memo of the clothing item' })
    @IsString()
    @IsOptional()
    memo?: string;

    @ApiProperty({ description: 'The is favorite of the clothing item' })
    @IsBoolean()
    @IsOptional()
    isFavorite?: boolean;

    // ── ClothingDetailPopup에서 수집하는 추가 입력 필드 ──────────────────
    // 옷 등록 후 팝업으로 수집: "재질/핏을 추가하면 AI 추천이 더 정확해져요!"
    // 입력 시 name 자동 업데이트 → LLM 코디 설명 품질 향상

    @ApiProperty({
        description: '재질 (cotton, wool, linen, denim, knit, polyester, leather 등)',
        example: 'wool',
    })
    @IsString()
    @IsOptional()
    material?: string;

    @ApiProperty({
        description: '핏 타입',
        enum: FitType,
        example: FitType.SLIM,
    })
    @IsEnum(FitType)
    @IsOptional()
    fit?: FitType;
}