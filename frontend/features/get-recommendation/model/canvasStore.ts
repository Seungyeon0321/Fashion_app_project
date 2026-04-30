import { create } from 'zustand';
import { RecommendationResponse } from '@/features/get-recommendation/api/useRecommendation';

export type CanvasItem = {
  id: number;
  imageUrl: string;
  category: string;
  x: number;
  y: number;
};

type CanvasStore = {
  canvasItems: CanvasItem[];
  trayItems: CanvasItem[];

  // API 응답으로 초기 배치 세팅
  initFromResponse: (data: RecommendationResponse) => void;

  // 트레이 → 캔버스로 추가
  addToCanvas: (item: CanvasItem) => void;

  // 캔버스 → 트레이로 삭제
  removeFromCanvas: (id: number) => void;

  // 캔버스 아이템 위치 업데이트 (드래그)
  updatePosition: (id: number, x: number, y: number) => void;

  // 커스텀 아이템 추가
  addCustomItem: (item: CanvasItem) => void;

  // 스토어 초기화
  reset: () => void;
};

// 카테고리별 초기 위치 결정
function getInitialPosition(category: string, index: number): { x: number; y: number } {
  const cat = category.toUpperCase();

  if (cat === 'OUTER' || cat === 'JACKET') {
    return { x: 180, y: 100 }; // 오른쪽 나란히
  }
  if (cat === 'TOP' || cat === 'TOPS') {
    return { x: 60, y: 80 };   // 상단
  }
  if (cat === 'BOTTOMS' || cat === 'PANTS' || cat === 'SKIRT') {
    return { x: 80, y: 300 };  // 중하단
  }
  if (cat === 'SHOES') {
    return { x: 100, y: 500 }; // 하단
  }

  // 기타는 index 기반으로 분산
  return { x: 60 + index * 30, y: 100 + index * 80 };
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  canvasItems: [],
  trayItems: [],

  initFromResponse: (data) => {
    const items = data.ranked_items
      .filter((item) => item.imageUrl)
      .map((item, index) => ({
        id: item.id,
        imageUrl: item.imageUrl,
        category: item.category,
        ...getInitialPosition(item.category, index),
      }));
  
    set({ canvasItems: items, trayItems: items });
  },

  addToCanvas: (item) =>
    set((state) => {
      const alreadyOnCanvas = state.canvasItems.some((c) => c.id === item.id);
  
      if (alreadyOnCanvas) {
        // 캔버스에 있으면 제거
        return {
          canvasItems: state.canvasItems.filter((c) => c.id !== item.id),
        };
      } else {
        // 캔버스에 없으면 추가
        return {
          canvasItems: [...state.canvasItems, item],
        };
      }
    }),

  removeFromCanvas: (id) =>
      set((state) => ({
        canvasItems: state.canvasItems.filter((item) => item.id !== id),
        // trayItems 건드리지 않음
    })),

  updatePosition: (id, x, y) =>
    set((state) => ({
      canvasItems: state.canvasItems.map((item) =>
        item.id === id ? { ...item, x, y } : item
      ),
    })),
  
  addCustomItem: (item: CanvasItem) =>
    set((state) => {
      const alreadyInTray = state.trayItems.some((t) => t.id === item.id);
  
      if (alreadyInTray) {
        // 이미 있으면 트레이 + 캔버스 둘 다 제거
        return {
          trayItems: state.trayItems.filter((t) => t.id !== item.id),
          canvasItems: state.canvasItems.filter((c) => c.id !== item.id),
        };
      } else {
        // 없으면 트레이 + 캔버스 둘 다 추가
        const positioned = {
          ...item,
          ...getInitialPosition(item.category, state.trayItems.length),
        };
        return {
          trayItems: [...state.trayItems, positioned],
          canvasItems: [...state.canvasItems, positioned],
        };
      }
    }),

  reset: () => set({ canvasItems: [], trayItems: [] }),

  setTrayItems: (items: CanvasItem[]) => set({ trayItems: items }),
}));