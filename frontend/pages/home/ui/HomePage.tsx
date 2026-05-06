// pages/home/ui/HomePage.tsx

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, spacing } from '@/shared/lib/tokens'
import { useClosetFilter } from '@/features/closet-grid/model/useClosetFilter'
import { useAddClothing } from '@/features/add-clothing/model/useAddClothing'
import { HomeHeader } from '@/shared/ui/HomeHeader'
import { CategoryTabs } from '@/shared/ui/CategoryTabs'
import { ClosetGrid } from '@/features/closet-grid/ui/ClosetGrid'
import { ClosetEmptyState } from '@/features/closet-grid/ui/ClosetEmptyState'
import { AddClothingFab } from '@/features/add-clothing/ui/AddClothingFab'
import { RegistrationMethodModal } from '@/features/select-registration-method/ui/RegistrationMethodModal'

export function HomePage() {
  const {
    allItems,
    filtered,
    leftItems,
    rightItems,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    isError,
  } = useClosetFilter()

  const {
    isModalVisible,
    openModal,
    closeModal,
    handleSelectMethod,
  } = useAddClothing()

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error occurred while fetching closet items</Text>
        <Text style={styles.errorSub}>Please try again later</Text>
      </View>
    )
  }

  console.log(selectedCategory)

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader itemCount={allItems.length} />

        <CategoryTabs
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {filtered.length === 0 ? (
          <ClosetEmptyState onAddItem={openModal} />
        ) : (
          <ClosetGrid
            leftItems={leftItems}
            rightItems={rightItems}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {allItems.length > 0 && (
        <AddClothingFab onPress={openModal} />
      )}

      <RegistrationMethodModal
        visible={isModalVisible}
        onClose={closeModal}
        onSelectMethod={handleSelectMethod}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...fonts.title,
    color: colors.primary,
  },
  errorSub: {
    ...fonts.bodyMd,
    color: colors.hint,
    marginTop: 8,
  },
})