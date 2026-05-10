import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useEffect } from 'react';
import { api } from '@/shared/lib/api';
import { useAuthStore } from '@/shared/store/authStore';
import { useRouter } from 'expo-router';

// 앱 시작 시 한 번만 설정
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export function useGoogleLogin() {
  const { login } = useAuthStore();
  const router = useRouter();

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      // 기존 세션 초기화 — 구글 로그인 시 가끔 이전 세션이 꼬이는 문제 방지
      await GoogleSignin.signOut(); // ← 여기 추가
      const userInfo = await GoogleSignin.signIn();

      // idToken을 백엔드로 전송
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error('idToken이 없어요');

      const result = await api.post('/auth/google/mobile', { idToken });
      await login(result.data.access_token);
      router.replace('/(tabs)');

    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('로그인 취소됨');
      } else if (e.code === statusCodes.IN_PROGRESS) {
        console.log('로그인 진행 중');
      } else {
        console.error('Google 로그인 실패:', e);
      }
    }
  };

  return {
    promptAsync: signIn, // AuthForm.tsx와 인터페이스 동일하게 유지
    disabled: false,
  };
}