// features/style-reference/model/styleStore.ts

import { create } from 'zustand'

type StyleStore = {
  savedStyles: string[]                    // ["minimal", "old_money"]
  setSavedStyles: (keys: string[]) => void
}

export const useStyleStore = create<StyleStore>((set) => ({
  savedStyles: [],
  setSavedStyles: (keys) => set({ savedStyles: keys }),
}))