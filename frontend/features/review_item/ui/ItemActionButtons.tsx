import { View, StyleSheet } from 'react-native'
import { Button } from '@/shared/ui/Button'
import type { ItemAction } from '@/features/review_item/modal/useReviewItems'

type Props = {
  action: ItemAction
  onSave: () => void
  onDiscard: () => void
  onUndo: () => void
}

export const ItemActionButtons = ({ action, onSave, onDiscard, onUndo }: Props) => {
  if (action === 'saved') {
    return (
      <View style={styles.doneRow}>
        <Button label="SAVED ✓" onPress={onUndo} variant="text" style={styles.half} />
        <Button label="UNDO" onPress={onUndo} variant="ghost" style={styles.half} />
      </View>
    )
  }

  if (action === 'discarded') {
    return (
      <View style={styles.doneRow}>
        <Button label="DISCARDED" onPress={onUndo} variant="text" style={styles.half} />
        <Button label="UNDO" onPress={onUndo} variant="ghost" style={styles.half} />
      </View>
    )
  }

  return (
    <View style={styles.row}>
      <Button label="SAVE" onPress={onSave} variant="primary" style={styles.half} />
      <Button label="DISCARD" onPress={onDiscard} variant="ghost" style={styles.half} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  doneRow: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
})