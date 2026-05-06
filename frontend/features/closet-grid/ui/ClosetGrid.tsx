// features/closet-grid/ui/ClosetGrid.tsx

import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { ClothingCard, getCardBgColor } from '@/shared/ui/Clothingcard'
import { spacing, radius } from '@/shared/lib/tokens'

type ClosetItem = {
  id: number
  imageUrl: string | null
  category: string
  brand: string | null
  isFavorite: boolean
}

interface ClosetGridProps {
  leftItems: ClosetItem[]
  rightItems: ClosetItem[]
}

export const ClosetGrid = ({ leftItems, rightItems }: ClosetGridProps) => {
  const router = useRouter()

  return (
    <View style={styles.grid}>
      {/* 왼쪽 컬럼 */}
      <View style={styles.column}>
        {leftItems.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.cardWrapper,
              idx > 0 && { marginTop: spacing.sectionGap },
              { backgroundColor: getCardBgColor(idx * 2) },
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
        ))}
      </View>

      {/* 오른쪽 컬럼 */}
      <View style={[styles.column, { marginTop: spacing.cardOffset }]}>
        {rightItems.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.cardWrapper,
              idx > 0 && { marginTop: spacing.sectionGap },
              { backgroundColor: getCardBgColor(idx * 2 + 1) },
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
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.outerMargin,
    gap: spacing.cardGap,
    marginTop: 24,
  },
  column: {
    flex: 1,
  },
  cardWrapper: {
    borderRadius: radius.none,
    overflow: 'hidden',
  },
})