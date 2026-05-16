// features/style-reference/model/styleStore.ts

import { create } from 'zustand'

// StyleReference DB 레코드의 핵심 필드
// GET /style-reference/my-styles 응답과 동일한 구조
export type SavedStyle = {
  id:        number          // StyleReference.id (DB PK) → style_reference_ids로 전달
  type:      'PRESET' | 'CUSTOM'
  presetKey: string | null   // PRESET이면 "minimal" 등, CUSTOM이면 null
  imageUrl:  string | null   // PRESET이면 프리셋 이미지, CUSTOM이면 원본 이미지
}

type StyleStore = {
  savedStyles:    SavedStyle[]
  setSavedStyles: (styles: SavedStyle[]) => void
}

export const useStyleStore = create<StyleStore>((set) => ({
  savedStyles:    [],
  setSavedStyles: (styles) => set({ savedStyles: styles }),
}))
