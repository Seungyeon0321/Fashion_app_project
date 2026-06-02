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

export type RecommendationResponse = {
  session_id:       string;
  intent?:          string;
  proposal_mood?:   string;   // ← 추가
  calendar_events?: string[];
  weather?:         string;
  ranked_items:     RecommendItem[];
  final_response:   string;
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

  // EventSource 인스턴스 저장 — abort용
  const esRef = useRef<InstanceType<typeof EventSource> | null>(null);

  const mutate = useCallback(
    (payload: RecommendPayload, options: RecommendOptions) => {
      // 이전 연결 종료
      esRef.current?.close();

      const style_reference_ids =
        payload.style_reference_ids ?? savedStyles.map((s) => s.id);

      // query string 구성
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

      const url = `${ENV.BACKEND_API_URL}/style/recommend/stream?${params.toString()}`;
      console.log('📡 SSE 연결 시작:', url);

      // react-native-sse는 GET SSE를 React Native에서 실시간으로 받을 수 있음
      // XHR onprogress는 RN에서 실시간 청크 수신이 안 되는 알려진 문제가 있어
      // EventSource가 이를 해결해주는 전용 라이브러리
      const es = new EventSource(url, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      esRef.current = es;

      // SSE 기본 메시지 이벤트 수신
      // NestJS @Sse()가 보내는 이벤트는 기본 "message" 타입
      es.addEventListener('message', (event) => {
        if (!event.data) return;

        try {
          const parsed = JSON.parse(event.data);
          console.log('📡 SSE 이벤트:', parsed.type, parsed.message ?? '');

          if (parsed.type === 'progress') {
            options.onProgress(parsed.message);

          } else if (parsed.type === 'result') {
            options.onSuccess(parsed.data);
            es.close();  // 결과 받으면 연결 종료

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