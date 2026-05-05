import { View, Text, Pressable, StyleSheet } from 'react-native'
import { fonts, spacing } from '@/shared/lib/tokens'
import type { CategoryId } from '../model/useAlbumUpload'

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'TOP',    label: 'TOP'    },
  { id: 'BOTTOM', label: 'BOTTOM' },
  { id: 'FULL',   label: 'FULL'   },
]

type Props = {
  selected: CategoryId | null
  onSelect: (id: CategoryId) => void
}

export const AlbumCategorySelector = ({ selected, onSelect }: Props) => (
  <View style={styles.row}>
    {CATEGORIES.map((cat) => (
      <Pressable
        key={cat.id}
        style={({ pressed }) => [
          styles.button,
          selected === cat.id && styles.buttonActive,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => onSelect(cat.id)}
      >
        <Text style={[
          styles.text,
          selected === cat.id && styles.textActive,
        ]}>
          {cat.label}
        </Text>
      </Pressable>
    ))}
  </View>
)

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250,249,246,0.3)',
  },
  buttonActive: {
    backgroundColor: 'rgba(250,249,246,0.9)',
    borderColor: 'rgba(250,249,246,0.9)',
  },
  text: {
    ...fonts.label,
    letterSpacing: 2,
    color: 'rgba(250,249,246,0.7)',
  },
  textActive: {
    color: '#1a1a1a',
  },
})