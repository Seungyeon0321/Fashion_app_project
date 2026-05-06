import { View, Image, StyleSheet, Text } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { spacing, fonts } from '@/shared/lib/tokens'
import { useAlbumUpload } from '../../../features/album-preview/model/useAlbumUpload'
import { AlbumUploadingOverlay } from '../../../features/album-preview/ui/AlbumUploadingOverlay'
import { AlbumCategorySelector } from '../../../features/album-preview/ui/AlbumCategorySelector'
import { AlbumPreviewActions } from '../../../features/album-preview/ui/AlbumPreviewActions'


type Props = {
  imageUri: string
}

export const AlbumPreviewPage = ({ imageUri }: Props) => {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const {
    selectedCategory,
    setSelectedCategory,
    isUploading,
    handleConfirm,
  } = useAlbumUpload(imageUri)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="cover"
      />

      {isUploading && <AlbumUploadingOverlay />}

      {!isUploading && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom}]}>
          <AlbumCategorySelector
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
          {!selectedCategory && (
            <View style={{ height: 16 }}>
              <Text style={styles.text}>
                Please select a category for your outfit.
              </Text>
            </View>
          )}

          <AlbumPreviewActions
            selectedCategory={selectedCategory}
            onConfirm={handleConfirm}
            onReselect={() => router.back()}
          />
        </View>
      )}

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  image: {
    flex: 1,
    width: '100%',
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 16,
  },
  text : {
    ...fonts.bodyMd,
    color: '#fff',
    textAlign: 'center',
  }
})