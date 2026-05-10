import { create } from 'zustand';
import { tokenStorage } from '../lib/token';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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

  // 구글 세션도 같이 초기화
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    // 구글로 로그인 안 한 유저일 수도 있으니 에러 무시
  }

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