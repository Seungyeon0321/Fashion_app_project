// features/style-reference/api/useMyStyles.ts

import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/lib/api'

type MyStyleResponse = {
  id: number
  presetKey: string
  createdAt: string
  preset: {
    key: string
    name: string
    description: string
    gender: string[]
  }
}

const fetchMyStyles = async (): Promise<string[]> => {
  const res = await api.get<MyStyleResponse[]>('/style-reference/my-styles')
  // presetKey 배열만 추출해서 반환
  return res.data.map((s) => s.presetKey)
}

export const useMyStyles = () => {
  return useQuery({
    queryKey: ['my-styles'],
    queryFn: fetchMyStyles,
    staleTime: 1000 * 60 * 5, // 5분
  })
}