import { useState } from 'react'
import { Category, SubCategory, SUBCATEGORY_BY_CATEGORY } from '@/shared/types/enums'

export type ClothingItem = {
  id: number
  cropS3Key: string | null
  imageUrl: string | null
  label: string
}

export type ItemAction = 'pending' | 'saved' | 'discarded'

export type ItemState = {
  action: ItemAction
  category: Category
  subCategory: SubCategory
  brand: string
  memo: string
}

const LABEL_TO_CATEGORY: Record<string, Category> = {
  top: Category.TOP,
  bottom: Category.BOTTOM,
  outer: Category.OUTER,
  dress: Category.DRESS,
}

const buildInitialState = (items: ClothingItem[]): Record<number, ItemState> =>
  Object.fromEntries(
    items.map((item) => {
      const category = LABEL_TO_CATEGORY[item.label?.toLowerCase()] ?? Category.TOP
      const subCategory = SUBCATEGORY_BY_CATEGORY[category][0] ?? SubCategory.T_SHIRT_SHORT
      return [item.id, { action: 'pending', category, subCategory, brand: '', memo: '' }]
    })
  )

export const useReviewItems = (items: ClothingItem[]) => {
  const [states, setStates] = useState<Record<number, ItemState>>(
    () => buildInitialState(items)
  )

  const update = (id: number, patch: Partial<ItemState>) => {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const setCategory = (id: number, category: Category) => {
    const subCategory = SUBCATEGORY_BY_CATEGORY[category][0] ?? SubCategory.T_SHIRT_SHORT
    update(id, { category, subCategory })
  }

  const allActioned = items.every((item) => states[item.id]?.action !== 'pending')
  const savedItems = items.filter((item) => states[item.id]?.action === 'saved')

  return { states, update, setCategory, allActioned, savedItems }
}