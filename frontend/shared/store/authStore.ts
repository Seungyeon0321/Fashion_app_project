import { create } from 'zustand';
import { tokenStorage } from '../lib/token';

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // ← isLoading 대신

  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isInitialized: false, // ← 초기값 false

  login: async (token: string) => {
    await tokenStorage.save(token);
    console.log('✅ login token:', token);
    set({ token, isAuthenticated: true });
  },

  logout: async () => {
    await tokenStorage.remove();
    set({ token: null, isAuthenticated: false });
  },

  initialize: async () => {
    const token = tokenStorage.get();
    set({
      token: token ?? null,
      isAuthenticated: !!token,
      isInitialized: true, // ← 완료 표시
    });
  },
}));