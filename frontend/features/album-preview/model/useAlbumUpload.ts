import { useState } from 'react'
import { useRouter } from 'expo-router'
import { uploadClothingImage } from '@/shared/lib/api'
import { useToastStore } from '@/shared/store/toastStore'

export type CategoryId = 'TOP' | 'BOTTOM' | 'FULL'

export const useAlbumUpload = (imageUri: string) => {
  const router = useRouter()
  const { show } = useToastStore()

  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleConfirm = async () => {
    if (!selectedCategory) return

    setIsUploading(true)
    try {
      const { jobId } = await uploadClothingImage(imageUri, selectedCategory)
      router.push(`/processing?jobId=${jobId}`)
    } catch (e) {
      const message = e instanceof Error
        ? e.message
        : 'Please check your connection and try again.'
      show(message, 'error')
    } finally {
      setIsUploading(false)
    }
  }

  return {
    selectedCategory,
    setSelectedCategory,
    isUploading,
    handleConfirm,
  }
}