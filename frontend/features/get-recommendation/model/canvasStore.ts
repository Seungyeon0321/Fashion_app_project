import { create } from 'zustand';
import { RecommendationResponse } from '@/features/get-recommendation/api/useRecommendation';

export type CanvasItem = {
  id: number;
  imageUrl: string;  // null 불가 (initFromResponse에서 filter로 걸러냄)
  category: string;
  x: number;
  y: number;
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

// 카테고리별 초기 위치 결정
function getInitialPosition(category: string, index: number): { x: number; y: number } {
  const cat = category.toUpperCase();

  if (cat === 'OUTER' || cat === 'JACKET') return { x: 180, y: 100 };
  if (cat === 'TOP'   || cat === 'TOPS')   return { x: 60,  y: 80  };
  if (cat === 'BOTTOM' || cat === 'BOTTOMS' || cat === 'PANTS' || cat === 'SKIRT') {
    return { x: 80, y: 300 };
  }
  if (cat === 'SHOES') return { x: 100, y: 500 };

  return { x: 60 + index * 30, y: 100 + index * 80 };
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  canvasItems: [],
  trayItems:   [],

  initFromResponse: (data) => {
    console.log(data, 'data in canvas store');
    const items: CanvasItem[] = data.ranked_items
      // imageUrl이 있고 id가 number인 것만 (external mock 제외)
      .filter((item) => item.imageUrl != null && typeof item.id === 'number')
      .map((item, index) => ({
        id:       item.id as number,
        imageUrl: item.imageUrl as string,
        category: item.category,
        ...getInitialPosition(item.category, index),
      }));

    set({ canvasItems: items, trayItems: items });
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
        ...getInitialPosition(item.category, state.trayItems.length),
      };
      return {
        trayItems:   [...state.trayItems, positioned],
        canvasItems: [...state.canvasItems, positioned],
      };
    }),

  reset: () => set({ canvasItems: [], trayItems: [] }),
}));