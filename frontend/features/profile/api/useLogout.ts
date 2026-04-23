import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { useAuthStore } from '@/shared/store/authStore';

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = () => {
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
                await logout();         // 토큰 삭제 + 상태 초기화 한 번에
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

  return { handleLogout };
}