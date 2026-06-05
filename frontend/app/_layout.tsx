// app/_layout.tsx

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Epilogue_400Regular,
  Epilogue_500Medium,
  Epilogue_700Bold,
} from '@expo-google-fonts/epilogue';
import {
  Manrope_200ExtraLight,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '@/shared/store/authStore';
import { ToastProvider } from '@/shared/ui/ToastProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

export const unstable_settings = {
  anchor: '(auth)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_200ExtraLight,
    Epilogue_400Regular,
    Epilogue_500Medium,
    Epilogue_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
  });

  const initialize      = useAuthStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized   = useAuthStore((s) => s.isInitialized);

  // 현재 라우트 세그먼트 — 어느 화면에 있는지 알 수 있음
  const segments = useSegments();

  // 앱 시작 시 저장된 토큰 복원
  useEffect(() => {
    initialize();
  }, []);

  // ── 인증 가드 ────────────────────────────────────────────────
  // 핵심: 이미 index(/)에 있으면 리다이렉트 안 함 → 루프 차단
  //
  // 기존 문제:
  //   router.replace('/') → 리마운트 → isAuthenticated false 재평가
  //   → 또 replace → 무한루프
  //
  // 해결:
  //   segments로 현재 위치를 확인하고
  //   보호된 라우트(tabs, closet, camera)에 있을 때만 리다이렉트
  //   이미 '/'에 있으면 아무것도 안 함
  useEffect(() => {
    if (!isInitialized) return;

    // 보호된 라우트 목록
    const protectedRoutes = ['(tabs)', 'closet', 'camera'];
    const inProtectedRoute = protectedRoutes.includes(segments[0] as string);

    if (!isAuthenticated && inProtectedRoute) {
      // 보호된 화면에 있는데 미인증 → 로그인으로
      router.replace('/');
    }
  }, [isInitialized, isAuthenticated, segments]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider value={DefaultTheme}>
            <StatusBar style="dark" />
            <Stack>
              <Stack.Screen name="index"  options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="closet" options={{ headerShown: false }} />
              <Stack.Screen name="camera" options={{ headerShown: false }} />
            </Stack>
            <ToastProvider />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}