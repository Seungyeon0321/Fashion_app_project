// features/closet-grid/ui/ClosetEmptyState.tsx

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { colors, fonts, spacing } from '@/shared/lib/tokens'

interface ClosetEmptyStateProps {
  onAddItem: () => void
}

export const ClosetEmptyState = ({ onAddItem }: ClosetEmptyStateProps) => {
  return (
    <View style={styles.container}>
      <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 3 C12 3 10 3 10 5 C10 7 12 7 12 7"
          stroke="#e24b4a"
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M12 7 L3 17 H21 L12 7"
          stroke="#e24b4a"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>

      <Text style={styles.title}>Your closet{'\n'}is empty.</Text>
      <Text style={styles.sub}>— add your first piece —</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={onAddItem}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>+ ADD ITEM</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: spacing.outerMargin,
    paddingBottom: 120,
  },
  title: {
    ...fonts.headline,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 34,
  },
  sub: {
    ...fonts.caption,
    color: colors.hint,
    marginTop: 12,
    letterSpacing: 1.5,
  },
  button: {
    marginTop: 36,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  buttonText: {
    ...fonts.label,
    color: colors.primary,
    letterSpacing: 2,
  },
})