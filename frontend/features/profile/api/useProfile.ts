import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

type ProfileData = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

async function fetchProfile(): Promise<ProfileData> {
  const { data } = await api.get<ProfileData>('/auth/me');
  return data;
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });
}