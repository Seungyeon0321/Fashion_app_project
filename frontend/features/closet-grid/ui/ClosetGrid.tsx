// features/closet-grid/ui/ClosetGrid.tsx (업데이트)

import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { ClothingCard, getCardBgColor } from '@/shared/ui/Clothingcard'
import { ZigzagLayout } from '@/shared/ui/ZigzagLayout'
import { spacing, radius } from '@/shared/lib/tokens'

type ClosetItem = {
  id: number
  imageUrl: string | null
  category: string
  brand: string | null
  isFavorite: boolean
}

interface ClosetGridProps {
  items: ClosetItem[]   // ← leftItems/rightItems 대신 items 하나로
}

export const ClosetGrid = ({ items }: ClosetGridProps) => {
  const router = useRouter()

  return (
    <ZigzagLayout
      items={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={(item, index) => (
        <View
          style={[
            styles.cardWrapper,
            { backgroundColor: getCardBgColor(index) },
          ]}
        >
          <ClothingCard
            imageUrl={item.imageUrl ?? undefined}
            category={item.category}
            brand={item.brand ?? ''}
            isFavorite={item.isFavorite}
            onPress={() => router.push(`/closet/${item.id}`)}
          />
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: radius.none,
    overflow: 'hidden',
  },
})