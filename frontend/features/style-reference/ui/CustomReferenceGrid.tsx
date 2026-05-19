// features/style-reference/ui/CustomReferenceGrid.tsx

import React from 'react'
import {
  View, Image, Pressable, Text,
  ActivityIndicator, StyleSheet,
} from 'react-native'
import { colors, fonts, spacing } from '@/shared/lib/tokens'
import { useMyStyles } from '../api/useMyStyles'
import { useUploadCustomStyle } from '../model/useUploadCustomStyle'
import { deleteCustomStyle } from '../api/styleReferenceApi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '@/shared/store/toastStore'

export function CustomReferenceGrid() {
  const { data: styles = [], isLoading } = useMyStyles()
  const { pickAndUpload, isUploading }   = useUploadCustomStyle()

  const queryClient = useQueryClient()
  const showError   = useToastStore((s) => s.error)
  const showSuccess = useToastStore((s) => s.success)

  // CUSTOM 타입만 필터링
  const customStyles = styles.filter((s) => s.type === 'CUSTOM')

  // 삭제 뮤테이션
  const { mutate: deleteStyle } = useMutation({
    mutationFn: (id: number) => deleteCustomStyle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-styles'] })
      showSuccess('Reference removed.')
    },
    onError: () => showError('Failed to remove. Try again.'),
  })

  if (isLoading) {
    return (
      <View style={styles_.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles_.container}>

      {/* 업로드된 이미지 그리드 */}
      {customStyles.length > 0 ? (
        <View style={styles_.grid}>
          {customStyles.map((style) => (
            <View key={style.id} style={styles_.card}>
              <Image
                source={{ uri: style.imageUrl ?? undefined }}
                style={styles_.image}
                resizeMode="cover"
              />

              {/* 삭제 버튼 — 우측 상단 X */}
              <Pressable
                style={styles_.deleteButton}
                onPress={() => deleteStyle(style.id)}
              >
                <Text style={styles_.deleteText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        // 비어있을 때
        <View style={styles_.emptyState}>
          <Text style={styles_.emptyTitle}>No references yet</Text>
          <Text style={styles_.emptySubtitle}>
            Add photos to personalize your style recommendations
          </Text>
        </View>
      )}

      {/* 업로드 버튼 — ADD STYLE */}
      <Pressable
        style={[styles_.addButton, isUploading && styles_.addButtonDisabled]}
        onPress={pickAndUpload}
        disabled={isUploading}
      >
        <Text style={styles_.addButtonText}>
          {isUploading ? 'UPLOADING...' : '+ ADD STYLE'}
        </Text>
      </Pressable>

    </View>
  )
}

const styles_ = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.outerMargin,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },

  // 2열 그리드
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },

  card: {
    // 2열 — gap 12 고려해서 계산
    width: '47.5%',
    aspectRatio: 3 / 4,
    position: 'relative',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteText: {
    ...fonts.caption,
    color: colors.background,
    fontSize: 10,
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },

  emptyTitle: {
    ...fonts.brand,
    color: colors.primary,
    marginBottom: 8,
  },

  emptySubtitle: {
    ...fonts.bodyMd,
    color: colors.hint,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },

  addButtonDisabled: {
    opacity: 0.4,
  },

  addButtonText: {
    ...fonts.label,
    color: colors.surfaceHigh,
    letterSpacing: 1.2,
  },
})
