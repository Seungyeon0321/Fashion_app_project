// features/profile/api/useGetOutfits.ts  ← 신규 파일

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

export interface OutfitClosetItem {
  id:       number;
  imageUrl: string | null;
  category: string;
}

export interface OutfitItem {
  id:           number;
  closetItemId: number;
  closetItem:   OutfitClosetItem;
}

export interface SavedOutfit {
  id:              number;
  createdAt:       string;
  recordedTemp:    number | null;
  recordedWeather: string | null;
  items:           OutfitItem[];
}

export function useGetOutfits() {
  return useQuery<SavedOutfit[]>({
    queryKey: ['outfits'],
    queryFn: async () => {
      const res = await api.get('/outfits');
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5분간 캐시 유지
  });
}