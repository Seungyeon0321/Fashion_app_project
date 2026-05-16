// features/style-reference/api/useMyStyles.ts

import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'
import { useStyleStore, SavedStyle } from '../model/styleStore'

// GET /style-reference/my-styles 응답 타입
// style-reference.service.ts의 getMyStyles() 반환값과 동일
type MyStyleResponse = {
  id:        number
  type:      'PRESET' | 'CUSTOM'
  presetKey: string | null
  imageUrl:  string | null
}

const fetchMyStyles = async (): Promise<SavedStyle[]> => {
  const res = await api.get<MyStyleResponse[]>('/style-reference/my-styles')

  // 기존: presetKey 배열만 추출
  // 변경: id + type + presetKey + imageUrl 포함한 SavedStyle 배열 반환
  //       id → useRecommendation.ts에서 style_reference_ids로 전달
  return res.data.map((s) => ({
    id:        s.id,
    type:      s.type,
    presetKey: s.presetKey,
    imageUrl:  s.imageUrl,
  }))
}

export const useMyStyles = () => {
  const setSavedStyles = useStyleStore((s) => s.setSavedStyles)

  return useQuery({
    queryKey: ['my-styles'],
    queryFn:  fetchMyStyles,
    staleTime: 1000 * 60 * 5, // 5분

    // 데이터 로드 성공 시 Zustand store에 자동 저장
    // 홈 진입 시 한 번만 fetch → 이후 store에서 바로 읽음
    // useRecommendation.ts에서 store를 구독해서 style_reference_ids 자동 포함
    onSuccess: (data) => setSavedStyles(data),
  })
}