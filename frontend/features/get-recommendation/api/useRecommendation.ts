// features/get-recommendation/api/useRecommendation.ts

import { useRef, useCallback } from 'react';
import { useStyleStore } from '@/features/style-reference/model/styleStore';
import { useAuthStore } from '@/shared/store/authStore';
import { ENV } from '@/shared/util/env';
import EventSource from 'react-native-sse';
import type { RecommendSource } from '../model/sourcePickerStore';

export type RecommendPayload = {
  intent:               string;
  source:               RecommendSource;
  anchor_item_id?:      number;
  style_reference_ids?: number[];
  session_id?:          string;   // ← 추가: NO 재요청 시 캐시 조회용
};

export type RecommendedItem = {
  id:          number | string;
  name:        string | null;
  imageUrl:    string | null;
  category:    string;
  subCategory: string | null;
  brand:       string | null;
  colors:      string[];
  material:    string | null;
  fit:         string | null;
  similarity:  number | null;
  is_anchor:   boolean;
  is_external: boolean;
  purchaseUrl: string | null;
};

export type RecommendItem = {
  id:          number | string;
  name:        string | null;
  imageUrl:    string | null;
  category:    string;
  subCategory: string | null;
  brand:       string | null;
  colors:      string[];
  material:    string | null;
  fit:         string | null;
  similarity:  number | null;
  is_anchor:   boolean;
  is_external: boolean;
  purchaseUrl: string | null;
};

export type RecommendationResponse = {
  session_id:        string;
  intent?:           string;
  proposal_mood?:    string;
  calendar_events?:  string[];
  weather?:          string;
  ranked_items:      RecommendItem[];
  final_response:    string;
  conflict_warning?: string;
  relaxation_level?: number;
};

type RecommendOptions = {
  onProgress: (message: string) => void;
  onSuccess:  (data: RecommendationResponse) => void;
  onError:    (error: Error) => void;
};

export function useRecommendation() {
  const savedStyles = useStyleStore((s) => s.savedStyles);
  const token       = useAuthStore((s) => s.token);

  const esRef = useRef<InstanceType<typeof EventSource> | null>(null);

  const mutate = useCallback(
    (payload: RecommendPayload, options: RecommendOptions) => {
      esRef.current?.close();

      const style_reference_ids =
        payload.style_reference_ids ?? savedStyles.map((s) => s.id);

      const params = new URLSearchParams({
        intent: payload.intent,
        source: payload.source,
      });

      if (payload.anchor_item_id !== undefined) {
        params.append('anchor_item_id', String(payload.anchor_item_id));
      }
      if (style_reference_ids.length > 0) {
        params.append('style_reference_ids', style_reference_ids.join(','));
      }
      if (payload.session_id) {
        params.append('session_id', payload.session_id);  // ← 추가
      }

      const url = `${ENV.BACKEND_API_URL}/style/recommend/stream?${params.toString()}`;
      console.log('📡 SSE 연결 시작:', url);

      const es = new EventSource(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      esRef.current = es;

      es.addEventListener('message', (event) => {
        if (!event.data) return;
        try {
          const parsed = JSON.parse(event.data);
          console.log('📡 SSE 이벤트:', parsed.type, parsed.message ?? '');

          if (parsed.type === 'progress') {
            options.onProgress(parsed.message);
          } else if (parsed.type === 'result') {
            options.onSuccess(parsed.data);
            es.close();
          } else if (parsed.type === 'error') {
            options.onError(new Error(parsed.message || 'AI pipeline error'));
            es.close();
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      });

      es.addEventListener('error', (event) => {
        console.log('💥 SSE 에러:', event);
        options.onError(new Error('SSE connection error'));
        es.close();
      });
    },
    [savedStyles, token],
  );

  const abort = useCallback(() => {
    esRef.current?.close();
  }, []);

  return { mutate, abort };
}