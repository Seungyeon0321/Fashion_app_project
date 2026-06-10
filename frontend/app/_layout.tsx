// app/_layout.tsx  ← 기존 파일 수정

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
import { View, StyleSheet, Text } from 'react-native';             // ← 추가

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
  const segments        = useSegments();

  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const protectedRoutes = ['(tabs)', 'closet', 'camera'];
    const inProtectedRoute = protectedRoutes.includes(segments[0] as string);
    if (!isAuthenticated && inProtectedRoute) {
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
    // GestureHandlerRootView를 상대 위치 컨테이너로 사용
    <GestureHandlerRootView style={styles.root}>

      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider value={DefaultTheme}>
            <StatusBar style="dark" />
            <Stack>
              <Stack.Screen name="index"       options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)"      options={{ headerShown: false }} />
              <Stack.Screen name="closet/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="camera"      options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>

      {/* ── ToastProvider ──────────────────────────────────────────
          GestureHandlerRootView 바로 안, 모든 Provider 밖에 위치
          이유: Stack/ThemeProvider/SafeAreaProvider 레이어를
                전부 벗어나야 absolute position이 최상단에서 작동함
          폰트는 이미 로딩 완료 후 렌더링되므로 안전                */}
      <ToastProvider />

    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});