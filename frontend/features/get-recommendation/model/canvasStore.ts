// features/get-recommendation/model/canvasStore.ts

import { create } from 'zustand';
import { RecommendationResponse } from '@/features/get-recommendation/api/useRecommendation';

export type CanvasItem = {
  id:          number | string;   // closet=number, external="naver_XXXXX"
  imageUrl:    string;
  category:    string;
  x:           number;
  y:           number;
  is_anchor?:  boolean;
  is_external?: boolean;          // 추가: external 아이템 구분용
  purchaseUrl?: string | null;    // 추가: 구매 링크 (external만 존재)
  name?:       string | null;     // 추가: 상품명 (툴팁/라벨용)
};

type CanvasStore = {
  canvasItems: CanvasItem[];
  trayItems:   CanvasItem[];

  initFromResponse: (data: RecommendationResponse) => void;
  addToCanvas:      (item: CanvasItem) => void;
  removeFromCanvas: (id: number | string) => void;
  updatePosition:   (id: number | string, x: number, y: number) => void;
  addCustomItem:    (item: CanvasItem) => void;
  reset:            () => void;
};

function getInitialPosition(category: string, index: number): { x: number; y: number } {
  const cat = category.toUpperCase();

  if (cat === 'OUTER' || cat === 'JACKET') return { x: 10,  y: 10  };
  if (cat === 'TOP'   || cat === 'TOPS')   return { x: 10,  y: 10  };
  if (cat === 'BOTTOM' || cat === 'BOTTOMS' || cat === 'PANTS' || cat === 'SKIRT') {
    return { x: 160, y: 10 };
  }
  if (cat === 'SHOES') return { x: 10,  y: 200 };
  if (cat === 'BAG'  || cat === 'ACC') return { x: 160, y: 200 };

  const col = index % 2;
  const row = Math.floor(index / 2);
  return { x: col * 150 + 10, y: row * 180 + 10 };
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  canvasItems: [],
  trayItems:   [],

  initFromResponse: (data) => {
    const items: CanvasItem[] = data.ranked_items
      // 변경: id 타입 체크 제거 → imageUrl만 체크
      // 이유: external 아이템은 id가 string("naver_XXXXX")이라
      //       typeof id === 'number' 조건에 걸려 전부 누락됐었음
      .filter((item) => item.imageUrl != null)
      .map((item, index) => ({
        id:          item.id,
        imageUrl:    item.imageUrl as string,
        category:    item.category,
        is_anchor:   item.is_anchor,
        is_external: item.is_external,    // 추가
        purchaseUrl: item.purchaseUrl,    // 추가
        name:        item.name,           // 추가
        ...getInitialPosition(item.category, index),
      }));

    set({ trayItems: items, canvasItems: [] });
  },

  addToCanvas: (item) =>
    set((state) => {
      const alreadyOnCanvas = state.canvasItems.some((c) => c.id === item.id);
      if (alreadyOnCanvas) {
        return { canvasItems: state.canvasItems.filter((c) => c.id !== item.id) };
      }
      return { canvasItems: [...state.canvasItems, item] };
    }),

  removeFromCanvas: (id) =>
    set((state) => ({
      canvasItems: state.canvasItems.filter((item) => item.id !== id),
    })),

  updatePosition: (id, x, y) =>
    set((state) => ({
      canvasItems: state.canvasItems.map((item) =>
        item.id === id ? { ...item, x, y } : item
      ),
    })),

  addCustomItem: (item) =>
    set((state) => {
      const alreadyInTray = state.trayItems.some((t) => t.id === item.id);
      if (alreadyInTray) {
        return {
          trayItems:   state.trayItems.filter((t) => t.id !== item.id),
          canvasItems: state.canvasItems.filter((c) => c.id !== item.id),
        };
      }
      const positioned = {
        ...item,
        is_anchor: item.is_anchor ?? false,
        ...getInitialPosition(item.category, state.trayItems.length),
      };
      return {
        trayItems:   [...state.trayItems, positioned],
        canvasItems: [...state.canvasItems, positioned],
      };
    }),

  reset: () => set({ canvasItems: [], trayItems: [] }),
}));