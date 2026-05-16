// features/get-recommendation/api/useRecommendation.ts

import { useMutation } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { useStyleStore } from '@/features/style-reference/model/styleStore';
import type { RecommendSource } from '../model/sourcePickerStore';

export type RecommendPayload = {
  intent:           string;
  source:           RecommendSource;
  anchor_item_id?:  number;
  // string[] → number[]
  // SavedStyle.id는 DB PK (number)
  // style_reference_ids는 자동 포함되므로 외부에서 직접 넘길 필요 없음
  // 필요시 오버라이드 가능하도록 optional 유지
  style_reference_ids?: number[];
};

export type RecommendedItem = {
  id:           number | string;  // closet=number, external mock=string
  name:         string | null;
  imageUrl:     string | null;
  category:     string;
  subCategory:  string | null;
  brand:        string | null;
  colors:       string[];
  material:     string | null;
  fit:          string | null;
  similarity:   number | null;
  is_anchor:    boolean;
  is_external:  boolean;
  purchaseUrl:  string | null;    // external 아이템 구매 링크
}

export type RecommendationResponse = {
  intent:           string | null;
  calendar_events:  string[];
  weather:          string | null;
  ranked_items:     RecommendedItem[];
  final_response:   string;
  // conflict_warning: Style Analyzer에서 세팅
  // "anchor_ncp_conflict"이면 프론트에서 안내 표시
  conflict_warning: string | null;
  // relaxation_level: 몇 번째 완화 단계에서 결과가 나왔는지
  // 디버깅/모니터링용, UI 표시는 선택사항
  relaxation_level: number | null;
};

export function useRecommendation() {
  // Zustand store에서 savedStyles 구독
  // Source Picker CONFIRM 시점에 store에 이미 최신 데이터가 있음
  const savedStyles = useStyleStore((s) => s.savedStyles)

  return useMutation<RecommendationResponse, Error, RecommendPayload>({
    mutationFn: async (payload) => {
      // style_reference_ids 자동 포함
      // payload에 명시적으로 넘긴 값이 있으면 그걸 우선 사용
      // 없으면 store의 savedStyles에서 id 추출해서 자동 포함
      //
      // 왜 자동 포함인가?
      //   Source Picker에서 CONFIRM할 때마다 수동으로 ids를 넘기는 건 번거로움.
      //   홈 진입 시 useMyStyles()가 store를 채워두므로
      //   여기서 그냥 읽어서 자동으로 붙여주는 게 깔끔.
      const style_reference_ids =
        payload.style_reference_ids ??
        savedStyles.map((s) => s.id)

      console.log('Requesting recommendation with payload:', {
        ...payload,
        style_reference_ids,
      });

      try {
        const { data } = await api.post<RecommendationResponse>(
        '/style/recommend',
        {
          ...payload,
          style_reference_ids,
        }
      );

      console.log('📥 API 응답:', JSON.stringify(data));
      return data;
      } catch (error) {
          console.log('💥 에러 발생')
    throw error;
      }
    },
  });
}