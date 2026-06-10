// features/get-recommendation/api/useSaveOutfit.ts  ← 기존 파일 수정

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';

export interface OutfitItemPayload {
  // 내부 아이템
  closetItemId?: number;
  // 외부 아이템
  isExternal?:  boolean;
  externalId?:  string;
  name?:        string;
  imageUrl?:    string;
  purchaseUrl?: string;
  category?:    string;
}

interface CreateOutfitPayload {
  items:           OutfitItemPayload[];
  recordedTemp?:   number;
  recordedWeather?: string;
}

export const useSaveOutfit = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, CreateOutfitPayload>({
    mutationFn: (payload: CreateOutfitPayload) =>
      api.post('/outfits', payload),
    // 저장 성공 시 프로필 아웃핏 목록 캐시 무효화
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] });
    },
  });
};