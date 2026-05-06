// backend/src/style-reference/dto/save-preset-styles.dto.ts

import { IsArray, IsIn, ArrayMaxSize, ArrayMinSize } from 'class-validator'

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