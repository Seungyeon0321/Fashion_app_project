// pages/result/ui/ResultPage.tsx  ← 기존 파일 수정

import {
  View, Text, ScrollView, Alert, StyleSheet,
  KeyboardAvoidingView, Platform,  // ← 추가
} from 'react-native'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { ReviewItemCard } from '@/features/review_item/ui/ReviewItemCard'
import { useReviewItems, ClothingItem } from '@/features/review_item/modal/useReviewItems'
import { useRegisterClosetItem } from '@/features/closet/api/useCloset'
import {
  ClothingDetailPopup,
  shouldShowClothingDetailPopup,
} from '@/features/closet/ui/ClothingDetailPopup'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

type Props = {
  items: ClothingItem[]
}

export const ResultPage = ({ items }: Props) => {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { mutateAsync: registerClosetItem } = useRegisterClosetItem()
  const { states, update, setCategory, allActioned, savedItems } = useReviewItems(items)
  const [isConfirming, setIsConfirming] = useState(false)
  const [showPopup,    setShowPopup]    = useState(false)

  useEffect(() => {
    const checkPopup = async () => {
      const shouldShow = await shouldShowClothingDetailPopup()
      if (shouldShow) setShowPopup(true)
    }
    checkPopup()
  }, [])

  const handleConfirm = async () => {
    if (savedItems.length === 0) {
      router.replace('/')
      return
    }

    setIsConfirming(true)
    try {
      await Promise.all(
        savedItems.map((item) => {
          const s = states[item.id]
          return registerClosetItem({
            clothingItemId: item.id,
            category:       s.category,
            subCategory:    s.subCategory,
            brand:          s.brand || undefined,
            memo:           s.memo  || undefined,
          })
        })
      )
      router.replace('/')
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  const footerHeight = 24 + 52 + 16 + insets.bottom

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>

      {/* KeyboardAvoidingView: 키보드가 올라오면 컨텐츠를 위로 밀어올림
          iOS: padding 방식 — 키보드 높이만큼 하단 패딩 추가
          Android: height 방식 — 전체 높이를 줄여서 스크롤 가능하게
          footer가 absolute라 keyboardVerticalOffset으로 footer 높이 보정 */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={footerHeight}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: footerHeight },
          ]}
          // 키보드 열린 상태에서 다른 곳 탭 시 키보드 닫힘
          keyboardShouldPersistTaps="handled"
          // input이 포커스될 때 자동으로 스크롤해서 보이게
          keyboardDismissMode="on-drag"
        >
          <View style={styles.header}>
            <Text style={styles.title}>ANALYSIS RESULT</Text>
            <Text style={styles.subtitle}>{items.length} items detected</Text>
          </View>

          {items.map((item) => (
            <ReviewItemCard
              key={item.id}
              item={item}
              state={states[item.id]}
              onUpdate={(patch) => update(item.id, patch)}
              onCategoryChange={(cat) => setCategory(item.id, cat)}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={savedItems.length > 0 ? `CONFIRM (${savedItems.length} SAVED)` : 'CONFIRM'}
          onPress={handleConfirm}
          variant="primary"
          disabled={!allActioned}
          loading={isConfirming}
        />
      </View>

      <ClothingDetailPopup
        visible={showPopup}
        onClose={() => setShowPopup(false)}
      />

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  flex: {
    flex: 1,  // ← KeyboardAvoidingView가 전체 공간 차지
  },
  scroll: {
    padding:    24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontFamily:    'Epilogue_700Bold',
    fontSize:      28,
    color:         '#faf9f6',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily:    'Manrope_400Regular',
    fontSize:      12,
    color:         'rgba(250,249,246,0.4)',
    letterSpacing: 1,
    marginTop:     4,
  },
  footer: {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    paddingHorizontal: 24,
    paddingTop:        16,
    backgroundColor:   '#1a1a1a',
  },
})