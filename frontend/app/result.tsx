import { useMemo } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { ResultPage } from '@/pages/result/ui/ResultPage'

export default function ResultScreen() {
  const { items: itemsParam } = useLocalSearchParams<{ items: string }>()

  const items = useMemo(() => {
    try {
      return JSON.parse(decodeURIComponent(itemsParam ?? '[]'))
    } catch {
      return []
    }
  }, [itemsParam])

  return <ResultPage items={items} />
}