// shared/store/useErrorStore.ts  ← 신규 파일

import { create } from 'zustand';

type ErrorState = {
  message: string | null;
  // 에러 표시
  showError: (message: string) => void;
  // 에러 초기화
  clearError: () => void;
};

export const useErrorStore = create<ErrorState>((set) => ({
  message: null,

  showError: (message: string) => set({ message }),

  clearError: () => set({ message: null }),
}));