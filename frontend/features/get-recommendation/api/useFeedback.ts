// features/get-recommendation/api/useFeedback.ts

import { useCallback, useRef } from 'react';
import { api } from '@/shared/lib/api';
import { RecommendationResponse } from './useRecommendation';
import { useCanvasStore } from '../model/canvasStore';

export function useFeedback(
  data: RecommendationResponse | null,
  proposalIndex: number,
) {
  const { canvasItems } = useCanvasStore();
  const isPendingRef = useRef(false);

  const buildPayload = useCallback(() => {
    if (!data) return null;

    const outfitSnapshot = {
      items: canvasItems.map((item) => ({
        category:    item.category,
        productName: item.name       ?? undefined,
        imageUrl:    item.imageUrl,
        purchaseUrl: item.purchaseUrl ?? undefined,
      })),
      anchor_item_id: (() => {
        const anchor = canvasItems.find((i) => i.is_anchor);
        return typeof anchor?.id === 'number' ? anchor.id : undefined;
      })(),
    };

    const extractedBrands = [
      ...new Set(data.ranked_items.map((i) => i.brand).filter(Boolean) as string[]),
    ];
    const extractedColors = [
      ...new Set(data.ranked_items.flatMap((i) => i.colors ?? [])),
    ];

    const recommendSource = data.ranked_items.some((i) => i.is_external)
      ? 'external'
      : 'closet';

    return {
      session_id:       data.session_id,
      proposal_index:   proposalIndex,
      proposal_mood:    data.proposal_mood ?? data.intent ?? 'unknown',
      outfit_snapshot:  outfitSnapshot,
      extracted_brands: extractedBrands,
      extracted_colors: extractedColors,
      recommend_source: recommendSource,
      intent:           data.intent ?? undefined,
    };
  }, [data, canvasItems, proposalIndex]);

  const like = useCallback(async () => {
    const payload = buildPayload();
    if (!payload || isPendingRef.current) return;
    isPendingRef.current = true;
    try {
      await api.post('/feedback/like', payload);
    } finally {
      isPendingRef.current = false;
    }
  }, [buildPayload]);

  const dislike = useCallback(async () => {
    const payload = buildPayload();
    if (!payload || isPendingRef.current) return;
    isPendingRef.current = true;
    try {
      await api.post('/feedback/dislike', payload);
    } finally {
      isPendingRef.current = false;
    }
  }, [buildPayload]);

  return { like, dislike };
}