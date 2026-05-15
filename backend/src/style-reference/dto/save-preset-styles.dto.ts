// backend/src/style-reference/dto/save-preset-styles.dto.ts

import { IsArray, IsIn, ArrayMaxSize, ArrayMinSize, IsInt, IsOptional, IsString } from 'class-validator'

const VALID_PRESET_KEYS = [
  'minimal',
  'old_money',
  'streetwear',
  'y2k',
  'coquette',
  'dark_academia',
  'athleisure',
  'vintage',
  'quiet_luxury',
  'gorpcore',
] as const

export type PresetKey = typeof VALID_PRESET_KEYS[number]

export class SavePresetStylesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsIn(VALID_PRESET_KEYS, { each: true })
  presetKeys: PresetKey[]
}

export class StyleReferenceResponseDto {
  @IsInt()
  id!: number;
  // StyleReference DB PK
  // 프론트가 이걸 모아서 style_reference_ids: [1, 2, 3] 로 전송
 
  @IsIn(['PRESET', 'CUSTOM'])
  type!: 'PRESET' | 'CUSTOM';
  // PRESET: presetKey로 식별되는 미리 정의된 스타일
  // CUSTOM: 유저가 직접 업로드한 이미지 기반 스타일
 
  @IsString()
  @IsOptional()
  presetKey!: string | null;
  // PRESET일 때만 값 있음: "minimal" | "old_money" | "streetwear" ...
  // CUSTOM이면 null
 
  @IsString()
  @IsOptional()
  imageUrl!: string | null;
  // CUSTOM일 때만 값 있음: S3 원본 이미지 URL
  // PRESET이면 null (프리셋 이미지는 프론트에서 S3 URL 조합)
}