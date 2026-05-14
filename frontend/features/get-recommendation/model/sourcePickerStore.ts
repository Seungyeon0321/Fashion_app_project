// features/get-recommendation/model/sourcePickerStore.ts
//
// anchorItem 상태 3가지:
//   undefined → 아직 선택 안 함 (CONFIRM 비활성)
//   null      → "NO ANCHOR" 명시 선택
//   ClosetItem → 특정 아이템 선택

import { create } from 'zustand';

export type RecommendSource = 'closet' | 'external';

export type AnchorClosetItem = {
  id: number;
  imageUrl?: string | null;
  category: string;
  name?: string;
};

type SourcePickerState = {
  isSheetVisible: boolean;
  step: 'source' | 'anchor';
  source: RecommendSource | null;
  anchorItem: AnchorClosetItem | null | undefined;

  openSheet: () => void;
  closeSheet: () => void;
  selectSource: (source: RecommendSource) => void;
  selectAnchor: (item: AnchorClosetItem | null) => void;
  goBack: () => void;
  reset: () => void;
};

export const useSourcePickerStore = create<SourcePickerState>((set) => ({
  isSheetVisible: false,
  step: 'source',
  source: null,
  anchorItem: undefined,

  openSheet: () =>
    set({ isSheetVisible: true, step: 'source', source: null, anchorItem: undefined }),

  closeSheet: () => set({ isSheetVisible: false }),

  selectSource: (source) => set({ source, step: 'anchor' }),

  selectAnchor: (item) => set({ anchorItem: item }),

  goBack: () =>
    set((state) => {
      if (state.step === 'anchor') {
        return { step: 'source', source: null, anchorItem: undefined };
      }
      return {};
    }),

  reset: () =>
    set({ isSheetVisible: false, step: 'source', source: null, anchorItem: undefined }),
}));