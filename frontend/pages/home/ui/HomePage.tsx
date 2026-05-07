import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '@/shared/lib/tokens'
import { useClosetFilter } from '@/features/closet-grid/model/useClosetFilter'
import { useAddClothing } from '@/features/add-clothing/model/useAddClothing'
import { CategoryTabs } from '@/shared/ui/CategoryTabs'
import { ClosetGrid } from '@/features/closet-grid/ui/ClosetGrid'
import { ClosetEmptyState } from '@/features/closet-grid/ui/ClosetEmptyState'
import { AddClothingFab } from '@/features/add-clothing/ui/AddClothingFab'
import { RegistrationMethodModal } from '@/features/select-registration-method/ui/RegistrationMethodModal'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ScreenLayout } from '@/shared/ui/ScreenLayout'
import { useEffect } from 'react'
import { useMyStyles } from '@/features/style-reference/api/useMyStyles'
import { useStyleStore } from '@/features/style-reference/model/styleStore'

export function HomePage() {
  const {
    allItems,
    filtered,
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

  const setSavedStyles = useStyleStore((s) => s.setSavedStyles)
  const { data: myStyles } = useMyStyles()

  useEffect(() => {
    if (myStyles) setSavedStyles(myStyles)
}, [myStyles])

  if (isLoading) {
    return (
      <ScreenLayout>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    )
  }

  if (isError) {
    return (
      <ScreenLayout>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error occurred while fetching closet items</Text>
          <Text style={styles.errorSub}>Please try again later</Text>
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="MY CLOSET"
          subtitle={`${allItems.length} items curated`}
        />

        <CategoryTabs
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {filtered.length === 0 ? (
          <ClosetEmptyState onAddItem={openModal} />
        ) : (
          <ClosetGrid items={filtered} />
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
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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