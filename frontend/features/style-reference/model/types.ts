export type PresetKey =
  | 'minimal'
  | 'old_money'
  | 'streetwear'
  | 'y2k'
  | 'coquette'
  | 'dark_academia'
  | 'athleisure'
  | 'vintage'
  | 'quiet_luxury'
  | 'gorpcore'

export type StylePreset = {
  key: PresetKey
  name: string
  description: string
  gender: string[]
  keywords: string[]
  imageUrl: string
}