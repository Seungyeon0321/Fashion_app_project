// features/add-clothing/ui/AddClothingFab.tsx

import { TouchableOpacity, StyleSheet } from 'react-native'
import Svg, { Line } from 'react-native-svg'
import { colors, spacing, radius } from '@/shared/lib/tokens'

interface AddClothingFabProps {
  onPress: () => void
}

export const AddClothingFab = ({ onPress }: AddClothingFabProps) => {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Line x1={10} y1={3} x2={10} y2={17} stroke="white" strokeWidth={2} strokeLinecap="round" />
        <Line x1={3} y1={10} x2={17} y2={10} stroke="white" strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.outerMargin,
    width: 52,
    height: 52,
    backgroundColor: colors.fab,
    borderRadius: radius.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
})