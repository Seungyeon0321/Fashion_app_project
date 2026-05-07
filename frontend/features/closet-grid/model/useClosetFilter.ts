// features/closet-grid/model/useClosetFilter.ts

import { useState } from 'react'
import { useClosetItems } from '@/features/closet/api/useCloset'
import { all } from 'axios'

export const CATEGORIES = ['ALL', 'TOP', 'BOTTOM', 'OUTER', 'DRESS', 'SHOES', 'BAG', 'ACC'] as const
export type CategoryId = typeof CATEGORIES[number]

export const useClosetFilter = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('ALL')
  const { data: allItems = [], isLoading, isError, error } = useClosetItems()

  const filtered = selectedCategory === 'ALL'
    ? allItems
    : allItems.filter(item =>
        item.category.toUpperCase() === selectedCategory
      )

  return {
    allItems,         // ← 전체 아이템 배열도 반환
    filtered,         // ← 배열 하나만 반환
    selectedCategory,
    setSelectedCategory,
    isLoading,
    isError,
    error,
  }
}