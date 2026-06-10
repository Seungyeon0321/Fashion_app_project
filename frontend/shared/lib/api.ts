// shared/lib/api.ts  ← 기존 파일 수정

import axios from 'axios';
import { ENV } from '@/shared/util/env';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';        // ← 추가
import { getUploadFile } from './fileUtils';
import { Platform } from 'react-native';
import type { PresetKey, StylePreset } from '@/features/style-reference/model/types';

export const api = axios.create({
  baseURL: ENV.BACKEND_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ── 에러 코드 → 사용자 친화적 메시지 맵 ──────────────────────
// 백엔드 기술 메시지를 사용자에게 그대로 보여주지 않기 위한 변환 레이어
// 새로운 에러 케이스 추가 시 여기에만 추가하면 됨
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'INVALID REQUEST. PLEASE TRY AGAIN',
  401: 'PLEASE LOG IN AGAIN',
  403: 'YOU DO NOT HAVE PERMISSION',
  404: 'REQUESTED DATA NOT FOUND',
  408: 'REQUEST TIMED OUT. PLEASE TRY AGAIN',
  500: 'SERVER ERROR. PLEASE TRY AGAIN LATER',
  502: 'SERVER IS UNAVAILABLE. PLEASE TRY AGAIN LATER',
  503: 'SERVER IS UNDER MAINTENANCE',
};

// ── Request Interceptor ────────────────────────────────────
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('🔥 interceptor error.response:', error.response);
    console.log('🔥 interceptor error.message:', error.message);
    console.log('🔥 interceptor error.code:', error.code);

    const showToast = useToastStore.getState().error;       // ← 추가

    // 네트워크 자체가 안 될 때 (서버 꺼져있거나 오프라인)
    if (!error.response) {
      const message = 'NETWORK ERROR. CHECK YOUR CONNECTION';
      showToast(message);                                    // ← 추가
      return Promise.reject(new Error(message));
    }

    const { status } = error.response;

    // 401 — 자동 로그아웃 (Toast 없이 처리)
    // 이유: 401은 로그인 화면으로 리다이렉트되므로 Toast가 의미 없음
    if (status === 401) {
      useAuthStore.getState().logout();
      return Promise.reject(new Error('UNAUTHORIZED'));
    }

    // 그 외 에러 — 맵에서 메시지 찾고 없으면 기본 메시지 사용
    const message = HTTP_ERROR_MESSAGES[status] ?? 'SOMETHING WENT WRONG';
    showToast(message);                                      // ← 추가

    return Promise.reject(new Error(message));
  },
);

// ── Posts API ─────────────────────────────────────────────

export type RegisterStatus = 'processing' | 'completed' | 'not_found' | 'failed'
export type ClothingCategory = 'TOP' | 'BOTTOM' | 'FULL'

export type RegisterStatusResponse = {
  status: RegisterStatus
  items?: { id: number; cropS3Key: string; jobId: string }[]
}

export const uploadClothingImage = async (
  imageUri: string,
  category: ClothingCategory
): Promise<{ jobId: string }> => {
  const formData = new FormData()

  const uploadFile = await getUploadFile(imageUri);

  if (Platform.OS === 'web') {
    formData.append('image', uploadFile, 'clothing_image.jpg');
  } else {
    formData.append('image', uploadFile);
  }

  formData.append('category', category);

  console.log('formData:', formData);

  const res = await api.post('/posts/registerMyClothes', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30000,
  })

  console.log('uploadClothingImage response:', res);

  return res.data.data
}

export const getRegisterStatus = async (
  jobId: string,
): Promise<RegisterStatusResponse> => {
  const res = await api.get(`/posts/registerMyClothes/status/${jobId}`)
  return res.data.data
}

////////////////////// style_reference API //////////////////////

export type MyStyle = {
  id: number;
  presetKey: PresetKey;
  createdAt: string;
  preset: StylePreset;
}

export const getMyStyles = async (): Promise<MyStyle[]> => {
  const res = await api.get('/style-reference/my-styles')
  return res.data
}