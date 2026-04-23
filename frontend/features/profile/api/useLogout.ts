import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const TOKEN_KEY = 'auth_token';

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const logout = () => {
    console.log('logout');
    Alert.alert(
      'Log Out',
      'Are you sure you want to end your current session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
                await SecureStore.deleteItemAsync(TOKEN_KEY);
                queryClient.clear();
                router.replace('/');
              } catch (error) {
                console.error("Logout failed", error);
                // 사용자에게 에러 알림을 보여줄 수도 있습니다.
              }
          },
        },
      ]
    );
  };

  return { logout };
}