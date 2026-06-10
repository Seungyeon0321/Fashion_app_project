// features/profile/api/useGetOutfits.ts  ← 신규 파일

import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

export interface OutfitClosetItem {
  id:          number;
  imageUrl:    string | null;
  category:    string;
  subCategory: string;
  brand:       string | null;
  colors:      string[];
}

export interface OutfitExternalItem {  // ← 추가
  id:          number;
  name:        string;
  imageUrl:    string;
  purchaseUrl: string;
  category:    string;
}

export interface OutfitItem {
  id:            number;
  closetItemId:  number | null;
  externalItemId: number | null;
  closetItem:    OutfitClosetItem | null;
  externalItem:  OutfitExternalItem | null;  // ← 추가
}

export interface SavedOutfit {
  id:              number;
  createdAt:       string;
  recordedTemp:    number | null;
  recordedWeather: string | null;
  intent:          string | null;           // ← 추가
  recommendSource: string | null;           // ← 추가
  items:           OutfitItem[];
}

export function useGetOutfits() {
  return useQuery<SavedOutfit[]>({
    queryKey: ['outfits'],
    queryFn: async () => {
      const res = await api.get('/outfits');
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}