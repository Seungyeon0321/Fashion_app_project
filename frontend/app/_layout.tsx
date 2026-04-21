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
import { useAuthStore } from '@/shared/store/authStore'; // ← 추가

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
});

// ← (auth)로 변경 — 앱 시작점을 로그인 화면으로
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

  const initialize = useAuthStore((s) => s.initialize); // ← 추가
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated); // ← 추가

  useEffect(() => {
    initialize(); // ← 앱 시작 시 저장된 토큰 복원
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider value={DefaultTheme}>
          <StatusBar style="dark" />
          <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="closet" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}