// shared/lib/api.ts
import axios from 'axios';
import { ENV } from '@/shared/util/env';

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
    // TODO: Auth 구현 후 아래 주석 해제
    // const token = useAuthStore.getState().token;
    // if (token) config.headers.Authorization = `Bearer ${token}`;
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
      console.error('[API] 네트워크 오류:', error.message);
      return Promise.reject(new Error('네트워크 연결을 확인해주세요'));
    }

    const { status } = error.response;

    // TODO: Auth 구현 후 401 처리 추가
    // if (status === 401) {
    //   useAuthStore.getState().logout();
    // }

    if (status === 404) {
      return Promise.reject(new Error('요청한 데이터를 찾을 수 없어요'));
    }

    if (status >= 500) {
      return Promise.reject(new Error('서버 오류가 발생했어요. 잠시 후 다시 시도해주세요'));
    }

    return Promise.reject(error);
  },
);