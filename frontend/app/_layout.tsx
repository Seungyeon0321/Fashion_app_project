import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Epilogue_400Regular,
  Epilogue_500Medium,
  Epilogue_700Bold,
} from '@expo-google-fonts/epilogue';
import {
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

// 폰트 로딩 완료 전까지 스플래시 화면 유지
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5분
    },
  },
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
    const [fontsLoaded, fontError] = useFonts({
      Epilogue_400Regular,
      Epilogue_500Medium,
      Epilogue_700Bold,
      Manrope_400Regular,
      Manrope_500Medium,
      Manrope_700Bold,
    });
  
    useEffect(() => {
      // 폰트 로딩 완료 or 에러 시 스플래시 숨김
      if (fontsLoaded || fontError) {
        SplashScreen.hideAsync();
      }
    }, [fontsLoaded, fontError]);
  
    // 폰트 로딩 전엔 아무것도 렌더링 안 함
    if (!fontsLoaded && !fontError) {
      return null;
    }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
         <ThemeProvider value={DefaultTheme}>
         <StatusBar style="dark" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
    </SafeAreaProvider>
    </QueryClientProvider>
  );
}
