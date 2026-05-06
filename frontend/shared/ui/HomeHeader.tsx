// shared/ui/HomeHeader.tsx

import { View, Text, StyleSheet } from 'react-native'
import { colors, fonts, spacing } from '@/shared/lib/tokens'

interface HomeHeaderProps {
  itemCount: number
}

export const HomeHeader = ({ itemCount }: HomeHeaderProps) => {
  return (
    <View style={styles.header}>
      <Text style={styles.greeting}>GOOD MORNING</Text>
      <Text style={styles.title}>My Wardrobe</Text>
      <Text style={styles.count}>{itemCount} items curated</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 10,
  },
  greeting: {
    ...fonts.label,
    color: colors.hint,
    letterSpacing: 1,
  },
  title: {
    ...fonts.display,
    color: colors.primary,
    marginTop: 8,
  },
  count: {
    ...fonts.bodyMd,
    color: colors.hint,
  },
})