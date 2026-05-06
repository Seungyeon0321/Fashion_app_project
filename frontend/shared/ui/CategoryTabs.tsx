// shared/ui/CategoryTabs.tsx

import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { colors, fonts, spacing } from '@/shared/lib/tokens'
import { CATEGORIES, type CategoryId } from '../../features/closet-grid/model/useClosetFilter'

interface CategoryTabsProps {
  selected: CategoryId
  onSelect: (cat: CategoryId) => void
}

export const CategoryTabs = ({ selected, onSelect }: CategoryTabsProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      {CATEGORIES.map((cat) => {
        
        const active = cat === selected
        console.log(active,'active?')
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onSelect(cat)}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {cat}
            </Text>
            {active && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    marginTop: 20,
  },
  content: {
    paddingHorizontal: spacing.outerMargin,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    ...fonts.label,
    color: colors.tabInactive,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    height: 1.5,
    backgroundColor: colors.primary,
  },
})