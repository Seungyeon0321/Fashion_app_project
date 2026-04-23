import { View, Image, StyleSheet } from 'react-native'
import type { ClothingItem, ItemState } from '@/features/review_item/modal/useReviewItems'
import { Category } from '@/shared/types/enums'
import { ItemEditForm } from './ItemEditForm'
import { ItemActionButtons } from './ItemActionButtons'

type Props = {
  item: ClothingItem
  state: ItemState
  onUpdate: (patch: Partial<ItemState>) => void
  onCategoryChange: (cat: Category) => void
}

export const ReviewItemCard = ({ item, state, onUpdate, onCategoryChange }: Props) => {
  const isDone = state.action !== 'pending'

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>

      {/* 이미지 */}
      <Image
        source={{ uri: item.imageUrl ?? undefined }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.body}>
        {/* pending일 때만 폼 표시 */}
        {!isDone && (
          <ItemEditForm
            state={state}
            onCategoryChange={onCategoryChange}
            onUpdate={onUpdate}
          />
        )}

        {/* 항상 표시 — 상태에 따라 버튼 모양 바뀜 */}
        <ItemActionButtons
          action={state.action}
          onSave={() => onUpdate({ action: 'saved' })}
          onDiscard={() => onUpdate({ action: 'discarded' })}
          onUndo={() => onUpdate({ action: 'pending' })}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#242424', marginBottom: 24 },
  cardDone: { opacity: 0.5 },
  image: { width: '100%', aspectRatio: 1 },
  body: { padding: 20, gap: 16 },
})