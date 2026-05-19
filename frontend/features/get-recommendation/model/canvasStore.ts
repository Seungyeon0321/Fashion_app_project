import { create } from 'zustand';
import { RecommendationResponse } from '@/features/get-recommendation/api/useRecommendation';

export type CanvasItem = {
  id: number;
  imageUrl: string;
  category: string;
  x: number;
  y: number;
  is_anchor ?: boolean;
};

type CanvasStore = {
  canvasItems: CanvasItem[];
  trayItems:   CanvasItem[];

  initFromResponse: (data: RecommendationResponse) => void;
  addToCanvas:      (item: CanvasItem) => void;
  removeFromCanvas: (id: number) => void;
  updatePosition:   (id: number, x: number, y: number) => void;
  addCustomItem:    (item: CanvasItem) => void;
  reset:            () => void;
};

// 카테고리별 초기 위치
// 캔버스 높이가 대략 400~500px이므로 y값을 그 안에 맞춤
function getInitialPosition(category: string, index: number): { x: number; y: number } {
  const cat = category.toUpperCase();

  if (cat === 'OUTER' || cat === 'JACKET') return { x: 10,  y: 10  };
  if (cat === 'TOP'   || cat === 'TOPS')   return { x: 10,  y: 10  };
  if (cat === 'BOTTOM' || cat === 'BOTTOMS' || cat === 'PANTS' || cat === 'SKIRT') {
    return { x: 160, y: 10 };   // 오른쪽에 나란히 — y:300이면 overflow:hidden에 잘림
  }
  if (cat === 'SHOES') return { x: 10,  y: 200 };
  if (cat === 'BAG'  || cat === 'ACC') return { x: 160, y: 200 };

  // fallback: 겹치지 않게 격자 배치
  const col = index % 2;
  const row = Math.floor(index / 2);
  return { x: col * 150 + 10, y: row * 180 + 10 };
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  canvasItems: [],
  trayItems:   [],

  initFromResponse: (data) => {
  const items: CanvasItem[] = data.ranked_items
    .filter((item) => item.imageUrl != null && typeof item.id === 'number')
    .map((item, index) => ({
      id:        item.id as number,
      imageUrl:  item.imageUrl as string,
      category:  item.category,
      is_anchor: item.is_anchor,   // ← 추가
      ...getInitialPosition(item.category, index),
    }));

  set({ trayItems: items, canvasItems: [] });
},

  // 트레이에서 캔버스로 토글
  // 이미 캔버스에 있으면 제거, 없으면 추가
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