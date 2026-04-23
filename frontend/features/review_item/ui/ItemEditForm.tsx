import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native'
import { Category, SubCategory, SUBCATEGORY_BY_CATEGORY } from '@/shared/types/enums'
import type { ItemState } from '@/features/review_item/modal/useReviewItems'

type Props = {
  state: ItemState
  onCategoryChange: (cat: Category) => void
  onUpdate: (patch: Partial<ItemState>) => void
}

const CATEGORIES = Object.values(Category)

export const ItemEditForm = ({ state, onCategoryChange, onUpdate }: Props) => {
  const subCategories = SUBCATEGORY_BY_CATEGORY[state.category] ?? []

  return (
    <View style={styles.container}>

      {/* Category */}
      <Text style={styles.label}>CATEGORY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.chip, state.category === cat && styles.chipActive]}
              onPress={() => onCategoryChange(cat)}
            >
              <Text style={[styles.chipText, state.category === cat && styles.chipTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* SubCategory */}
      {subCategories.length > 0 && (
        <>
          <Text style={styles.label}>SUB-CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {subCategories.map((sub) => (
                <Pressable
                  key={sub}
                  style={[styles.chip, state.subCategory === sub && styles.chipActive]}
                  onPress={() => onUpdate({ subCategory: sub })}
                >
                  <Text style={[styles.chipText, state.subCategory === sub && styles.chipTextActive]}>
                    {sub.replace(/_/g, ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </>
      )}

      {/* Brand */}
      <Text style={styles.label}>BRAND</Text>
      <TextInput
        style={styles.input}
        value={state.brand}
        onChangeText={(v) => onUpdate({ brand: v })}
        placeholder="Enter brand"
        placeholderTextColor="rgba(250,249,246,0.25)"
      />

      {/* Memo */}
      <Text style={styles.label}>MEMO</Text>
      <TextInput
        style={styles.input}
        value={state.memo}
        onChangeText={(v) => onUpdate({ memo: v })}
        placeholder="Add notes..."
        placeholderTextColor="rgba(250,249,246,0.25)"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(250,249,246,0.4)',
    marginTop: 8,
  },
  input: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: '#faf9f6',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250,249,246,0.15)',
    paddingVertical: 8,
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(250,249,246,0.2)',
  },
  chipActive: { backgroundColor: '#faf9f6', borderColor: '#faf9f6' },
  chipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(250,249,246,0.5)',
  },
  chipTextActive: { color: '#1a1a1a' },
})