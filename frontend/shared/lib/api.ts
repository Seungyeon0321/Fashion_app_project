// shared/lib/api.ts
import axios from 'axios';
import { ENV } from '@/shared/util/env';
import { useAuthStore } from '../store/authStore';
import { getUploadFile } from './fileUtils';
import { Platform } from 'react-native';

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
  (error) =>Promise.reject(error),
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

    const { status, data } = error.response;

    if (status === 401) {
      useAuthStore.getState().logout();
    }

    if (status === 400) {
      // 백엔드가 보낸 메시지 그대로 꺼내서 전달
      const message = data?.message ?? 'Bad request'
      return Promise.reject(new Error(message))
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

// ── Posts API ─────────────────────────────────────────────

export type RegisterStatus = 'processing' | 'completed' | 'not_found'

export type RegisterStatusResponse = {
  status: RegisterStatus
  items?: { id: number; cropS3Key: string; jobId: string }[]
}

export const uploadClothingImage = async (
  imageUri: string,
): Promise<{ jobId: string }> => {
  const formData = new FormData()

  // React Native에서 파일을 FormData에 담는 방식

  const uploadFile = await getUploadFile(imageUri);

  if (Platform.OS === 'web') {
    formData.append('image', uploadFile, 'clothing_image.jpg');
  } else {
    formData.append('image', uploadFile);
  }

  const res = await api.post('/posts/registerMyClothes', formData, {
    headers: {
      'Content-Type': undefined,
    },
    timeout: 30000, // 이미지 업로드는 30초로 늘림
  })

  return res.data.data // { jobId }
}

export const getRegisterStatus = async (
  jobId: string,
): Promise<RegisterStatusResponse> => {
  const res = await api.get(`/posts/registerMyClothes/status/${jobId}`)
  return res.data.data
}