// backend/src/style-reference/style-presets.ts

export type PresetStyle = {
  key: string
  name: string
  description: string
  gender: ('MALE' | 'FEMALE' | 'UNISEX')[]
  keywords: string[]
}

export const STYLE_PRESETS: PresetStyle[] = [
  {
    key: 'minimal',
    name: 'Minimal',
    description: 'Clean lines, neutral tones, no excess.',
    gender: ['MALE', 'FEMALE', 'UNISEX'],
    keywords: ['monochrome', 'clean', 'simple', 'neutral'],
  },
  {
    key: 'old_money',
    name: 'Old Money',
    description: 'Classic, refined, understated luxury.',
    gender: ['MALE', 'FEMALE', 'UNISEX'],
    keywords: ['classic', 'preppy', 'tailored', 'luxury'],
  },
  {
    key: 'streetwear',
    name: 'Streetwear',
    description: 'Oversized, graphic, urban edge.',
    gender: ['MALE', 'FEMALE', 'UNISEX'],
    keywords: ['oversized', 'graphic', 'urban', 'sneakers'],
  },
  {
    key: 'y2k',
    name: 'Y2K',
    description: '2000s nostalgia, bold colors, playful.',
    gender: ['FEMALE'],
    keywords: ['y2k', 'crop', 'lowrise', 'colorful'],
  },
  {
    key: 'coquette',
    name: 'Coquette',
    description: 'Feminine, romantic, soft and delicate.',
    gender: ['FEMALE'],
    keywords: ['feminine', 'ribbon', 'satin', 'romantic'],
  },
  {
    key: 'dark_academia',
    name: 'Dark Academia',
    description: 'Intellectual, vintage, moody tones.',
    gender: ['MALE', 'FEMALE', 'UNISEX'],
    keywords: ['tweed', 'vintage', 'dark', 'scholarly'],
  },
  {
    key: 'athleisure',
    name: 'Athleisure',
    description: 'Sporty comfort meets everyday style.',
    gender: ['MALE', 'FEMALE', 'UNISEX'],
    keywords: ['sporty', 'comfortable', 'activewear', 'casual'],
  },
  {
    key: 'vintage',
    name: 'Vintage',
    description: 'Retro finds, thrifted gems, timeless.',
    gender: ['MALE', 'FEMALE', 'UNISEX'],
    keywords: ['retro', 'thrift', 'secondhand', 'classic'],
  },
  {
    key: 'quiet_luxury',
    name: 'Quiet Luxury',
    description: 'No logos, premium fabrics, subtle elegance.',
    gender: ['MALE', 'FEMALE', 'UNISEX'],
    keywords: ['logoless', 'cashmere', 'beige', 'elegant'],
  },
  {
    key: 'gorpcore',
    name: 'Gorpcore',
    description: 'Outdoor functional, layered, rugged.',
    gender: ['MALE', 'FEMALE', 'UNISEX'],
    keywords: ['outdoor', 'fleece', 'cargo', 'functional'],
  },
]