// features/get-recommendation/api/useRecommendation.ts
//
// 변경: RecommendPayload에 source, anchor_item_id 추가

import { useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import type { RecommendSource } from '../model/sourcePickerStore';

export type RecommendPayload = {
  intent: string;
  source: RecommendSource;
  anchor_item_id?: number;
  style_reference_ids?: string[];
};

export type RecommendationResponse = {
  final_response: string;
  recommended_outfit_ids: number[];
  ranked_items: {
    id: number;
    name: string;
    imageUrl: string;
    category: string;
    isExternal?: boolean;
    purchaseUrl?: string;
  }[];
};

export function useRecommendation() {
  return useMutation<RecommendationResponse, Error, RecommendPayload>({
    mutationFn: async (payload) => {
      const { data } = await api.post<RecommendationResponse>(
        '/style/recommend',
        payload
      );
      return data;
    },
  });
}