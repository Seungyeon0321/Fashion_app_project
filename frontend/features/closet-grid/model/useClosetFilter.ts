// features/closet-grid/model/useClosetFilter.ts

import { useState } from 'react'
import { useClosetItems } from '@/features/closet/api/useCloset'

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

  const leftItems  = filtered.filter((_, i) => i % 2 === 0)
  const rightItems = filtered.filter((_, i) => i % 2 === 1)

  return {
    allItems,
    filtered,
    leftItems,
    rightItems,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    isError,
    error,
  }
}