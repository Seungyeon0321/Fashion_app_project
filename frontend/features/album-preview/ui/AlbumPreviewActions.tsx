import { View, Text, Pressable, StyleSheet } from 'react-native'
import { fonts, spacing } from '@/shared/lib/tokens'
import type { CategoryId } from '../model/useAlbumUpload'

type Props = {
  selectedCategory: CategoryId | null
  onConfirm: () => void
  onReselect: () => void
}

export const AlbumPreviewActions = ({
  selectedCategory,
  onConfirm,
  onReselect,
}: Props) => (
  <View style={styles.actions}>
    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles.buttonPrimary,
        !selectedCategory && styles.buttonDisabled,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onConfirm}
      disabled={!selectedCategory}
    >
      <Text style={styles.buttonText}>CONFIRM</Text>
    </Pressable>

    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles.buttonGhost,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={onReselect}
    >
      <Text style={styles.buttonTextGhost}>RESELECT</Text>
    </Pressable>
  </View>
)

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: 'rgba(250,249,246,0.9)',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(250,249,246,0.3)',
  },
  buttonGhost: {
    borderWidth: 1,
    borderColor: 'rgba(250,249,246,0.4)',
  },
  buttonText: {
    ...fonts.label,
    letterSpacing: 2,
    color: '#1a1a1a',
  },
  buttonTextGhost: {
    ...fonts.label,
    letterSpacing: 2,
    color: 'rgba(250,249,246,0.9)',
  },
})