import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { ReviewItemCard } from '@/features/review_item/ui/ReviewItemCard'
import { useReviewItems, ClothingItem } from '@/features/review_item/modal/useReviewItems'
import { registerClosetItem } from '@/shared/lib/api'

type Props = {
  items: ClothingItem[]
}

export const ResultPage = ({ items }: Props) => {
  const router = useRouter()
  const { states, update, setCategory, allActioned, savedItems } = useReviewItems(items)
  const [isConfirming, setIsConfirming] = useState(false)

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
            category: s.category,
            subCategory: s.subCategory,
            brand: s.brand || undefined,
            memo: s.memo || undefined,
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