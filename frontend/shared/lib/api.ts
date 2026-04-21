// shared/lib/api.ts
import axios from 'axios';
import { ENV } from '@/shared/util/env';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: ENV.BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 10초 안에 응답 없으면 에러 (모바일 네트워크 고려)
  timeout: 10000,
});

// ── Request Interceptor ────────────────────────────────────
// 모든 요청 전에 실행 — 나중에 JWT 토큰 여기서 주입
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    console.log('✅ token:', token);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor ───────────────────────────────────
// 모든 응답 후에 실행 — 공통 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 네트워크 자체가 안 될 때 (서버 꺼져있거나 오프라인)
    if (!error.response) {
      console.error('[API] error of network:', error.message);
      return Promise.reject(new Error('check your network connection'));
    }

    const { status } = error.response;

    // 토큰이 만료됐을 때 서버가 401을 돌려줘요. 이걸 잡아서 자동으로 logout()을 호출하면, ㅏ용자가 모르게 만료된 토큰을 들고 다니는
    // 상황을 방지 할 수 있다.
    if (status === 401) {
      useAuthStore.getState().logout();
    }

    if (status === 404) {
      return Promise.reject(new Error('requested data not found'));
    }

    if (status >= 500) {
      return Promise.reject(new Error('server error occurred. please try again later'));
    }

    return Promise.reject(error);
  },
);