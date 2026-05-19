import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native'
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

  // footer 높이 = 버튼 padding(24) + 버튼 높이(대략 52) + 하단 여백(16) + 제스처 바
  const footerHeight = 24 + 52 + 16 + insets.bottom

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          // footer가 absolute라서 마지막 아이템이 가려지지 않도록 하단 여백 확보
          { paddingBottom: footerHeight },
        ]}
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

      {/* footer: absolute로 하단 고정. 제스처 바 높이는 insets.bottom으로 처리 */}
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
  scroll: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
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
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#1a1a1a',
  },
})
