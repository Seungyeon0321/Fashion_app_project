import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { ReviewItemCard } from '@/features/review_item/ui/ReviewItemCard'
import { useReviewItems, ClothingItem } from '@/features/review_item/modal/useReviewItems'
import { useRegisterClosetItem } from '@/features/closet/api/useCloset'
import {
  ClothingDetailPopup,
  shouldShowClothingDetailPopup,
} from '@/features/closet/ui/ClothingDetailPopup'

type Props = {
  items: ClothingItem[]
}

export const ResultPage = ({ items }: Props) => {
  const router = useRouter()
  const { mutateAsync: registerClosetItem } = useRegisterClosetItem()
  const { states, update, setCategory, allActioned, savedItems } = useReviewItems(items)
  const [isConfirming,   setIsConfirming]   = useState(false)
  const [showPopup,      setShowPopup]      = useState(false)

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

      // 등록 성공 후 팝업 표시 여부 확인
      // "다시 보지 않기"를 누른 적 없으면 팝업 표시
      // 팝업 닫히면 홈으로 이동 (handlePopupClose에서 처리)
      const shouldShow = await shouldShowClothingDetailPopup()
      if (shouldShow) {
        setShowPopup(true)
      } else {
        router.replace('/')
      }

    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  const handlePopupClose = () => {
    setShowPopup(false)
    router.replace('/')
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>

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

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={savedItems.length > 0 ? `CONFIRM (${savedItems.length} SAVED)` : 'CONFIRM'}
          onPress={handleConfirm}
          variant="primary"
          disabled={!allActioned}
          loading={isConfirming}
        />
      </View>

      {/* ClothingDetailPopup: 옷 등록 완료 후 heads-up 표시 */}
      <ClothingDetailPopup
        visible={showPopup}
        onClose={handlePopupClose}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1a1a' },
  scroll: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 32 },
  title: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 28,
    color: '#faf9f6',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    color: 'rgba(250,249,246,0.4)',
    letterSpacing: 1,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#1a1a1a',
  },
})
