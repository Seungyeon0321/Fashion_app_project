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
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';                    // 추가
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

  // 앱 시작 시 저장된 토큰 복원
  useEffect(() => {
    initialize();
  }, []);

  // ── 핵심 추가 부분 ──────────────────────────────────────
  // isAuthenticated가 false로 바뀌는 순간 감지 → 로그인 화면으로
  //
  // 왜 _layout에서 처리하는가?
  //   api.ts interceptor는 Zustand store만 건드릴 수 있고
  //   React Navigation에 직접 접근이 불가능함.
  //   _layout은 앱 전체를 감싸는 루트 컴포넌트라
  //   어느 화면에 있든 상태 변화를 감지할 수 있는 유일한 위치.
  //
  // 왜 isInitialized 체크가 필요한가?
  //   앱 시작 직후 initialize() 실행 전에는 token=null, isAuthenticated=false 상태.
  //   이 시점에 바로 router.replace('/')를 부르면
  //   토큰이 있는 유저도 로그인 화면으로 튕겨나감.
  //   isInitialized=true가 된 후에만 실행해야 안전함.
  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isInitialized, isAuthenticated]);
  // ────────────────────────────────────────────────────────

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