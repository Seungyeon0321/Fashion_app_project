// features/get-recommendation/api/useRecommendation.ts

import { useRef, useCallback } from 'react';
import { useStyleStore } from '@/features/style-reference/model/styleStore';
import { ENV } from '@/shared/util/env';
import { api } from '@/shared/lib/api';
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
  intent:           string | null;
  calendar_events:  string[];
  weather:          string | null;
  ranked_items:     RecommendedItem[];
  final_response:   string;
  conflict_warning: string | null;
  relaxation_level: number | null;
};

type RecommendOptions = {
  onProgress: (message: string) => void;
  onSuccess:  (data: RecommendationResponse) => void;
  onError:    (error: Error) => void;
};

export function useRecommendation() {
  const savedStyles = useStyleStore((s) => s.savedStyles);
  const xhrRef      = useRef<XMLHttpRequest | null>(null);

  const mutate = useCallback(
    async (payload: RecommendPayload, options: RecommendOptions) => {
      // 이전 요청 중단
      xhrRef.current?.abort();

      const style_reference_ids =
        payload.style_reference_ids ?? savedStyles.map((s) => s.id);

      try {
        // Step 1: NestJS에서 user_id 받기
        const { data: context } = await api.get<{
          user_id:     number;
          fastapi_url: string;
        }>('/style/context');

        // Step 2: XMLHttpRequest로 SSE 스트리밍
        // 이유: React Native의 fetch는 response.body(ReadableStream) 미지원
        //       XHR의 onprogress는 청크 단위로 데이터를 받을 수 있어서
        //       SSE 파싱에 적합함
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;

          xhr.open('POST', `${ENV.FASTAPI_URL}/recommend`);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.responseType = 'text';

          let processedLength = 0;  // 이미 처리한 위치 추적

          xhr.onprogress = () => {
            // XHR은 청크가 올 때마다 onprogress 호출
            // xhr.responseText는 지금까지 받은 전체 텍스트 (누적)
            // processedLength 이후 새로 온 부분만 파싱
            const newChunk = xhr.responseText.slice(processedLength);
            processedLength = xhr.responseText.length;

            // SSE 이벤트는 "\n\n"으로 구분
            const parts = newChunk.split('\n\n');

            for (const part of parts) {
              const line = part.trim();
              if (!line.startsWith('data:')) continue;

              const jsonStr = line.slice(5).trim();
              try {
                const event = JSON.parse(jsonStr);

                if (event.type === 'progress') {
                  options.onProgress(event.message);
                } else if (event.type === 'result') {
                  options.onSuccess(event.data);
                  resolve();
                }
              } catch {
                // heartbeat 등 무시
              }
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 400) {
              reject(new Error(`HTTP ${xhr.status}`));
            } else {
              resolve();
            }
          };

          xhr.onerror = () => reject(new Error('Network error'));
          xhr.onabort = () => resolve();  // 의도적 중단은 에러 아님

          xhr.send(JSON.stringify({
            ...payload,
            style_reference_ids,
            user_id: context.user_id,
          }));
        });

      } catch (error: any) {
        options.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },
    [savedStyles]
  );

  const abort = useCallback(() => {
    xhrRef.current?.abort();
  }, []);

  return { mutate, abort };
}