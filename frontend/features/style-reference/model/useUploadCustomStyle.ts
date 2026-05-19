// features/style-reference/api/useUploadCustomStyle.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { uploadCustomStyle } from '../api/styleReferenceApi'
import { useToastStore } from '@/shared/store/toastStore'

export function useUploadCustomStyle() {
  const queryClient = useQueryClient()
  const showSuccess   = useToastStore((s) => s.success)
  const showError   = useToastStore((s) => s.error)

  // 이미지 선택 + 업로드를 하나의 흐름으로
  // 선택 취소하면 아무것도 안 함
  const pickAndUpload = async () => {
    // 갤러리에서 이미지 선택
    // allowsEditing: false — 전체 이미지 그대로 (crop 없음)
    // CLIP이 전체 무드를 분석해야 하므로 crop 불필요
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    })

    if (result.canceled) return

    const asset    = result.assets[0]
    const mimeType = asset.mimeType ?? 'image/jpeg'

    // 선택 즉시 업로드 뮤테이션 실행
    mutate({ uri: asset.uri, mimeType })
  }

  const { mutate, isPending } = useMutation({
    mutationFn: ({ uri, mimeType }: { uri: string; mimeType: string }) =>
      uploadCustomStyle(uri, mimeType),

    onSuccess: () => {
      // my-styles 쿼리 무효화 → 그리드 자동 갱신
      queryClient.invalidateQueries({ queryKey: ['my-styles'] })
      showSuccess('Reference added!')
    },

    onError: () => {
      showError('Upload failed. Try again.')
    },
  })

  return {
    pickAndUpload,
    isUploading: isPending,
  }
}