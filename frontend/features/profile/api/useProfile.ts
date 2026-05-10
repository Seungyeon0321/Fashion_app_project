import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

type ProfileData = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  gender: 'MALE' | 'FEMALE' | 'UNISEX';
};

async function fetchProfile(): Promise<ProfileData> {
  const { data } = await api.get<ProfileData>('/auth/me');
  return data;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지 → 탭 이동해도 재요청 안 함
  });
}