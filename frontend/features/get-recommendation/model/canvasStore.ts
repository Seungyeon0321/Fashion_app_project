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
    .filter((item) => item.imageUrl != null)
    .map((item, index) => ({
      id:          item.id,
      imageUrl:    item.imageUrl as string,
      category:    item.category,
      is_anchor:   item.is_anchor,
      is_external: item.is_external,
      purchaseUrl: item.purchaseUrl,
      name:        item.name,
      ...getInitialPosition(item.category, index),
    }));

  set((state) => {
    // 새 응답에서 앵커 아이템 추출
    const newAnchorItems = items.filter((i) => i.is_anchor === true);

    // 이전 캔버스에서 앵커 보존 (retry 시)
    const preservedAnchorItems = state.canvasItems.filter(
      (c) => c.is_anchor === true,
    );

    // 병합: 기존 앵커 + 새 앵커 (중복 제거)
    // → 첫 로드든 retry든 앵커는 항상 캔버스에 자동 추가
    const mergedAnchorItems = [
      ...preservedAnchorItems,
      ...newAnchorItems.filter(
        (n) => !preservedAnchorItems.some((p) => p.id === n.id)
      ),
    ];

    console.log('[Canvas] anchor items on canvas:', mergedAnchorItems.map(i => i.id));
    console.log('[Canvas] tray items:', items.length, 'anchor count:', newAnchorItems.length);

    return {
      trayItems:   items,
      canvasItems: mergedAnchorItems,
    };
  });
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