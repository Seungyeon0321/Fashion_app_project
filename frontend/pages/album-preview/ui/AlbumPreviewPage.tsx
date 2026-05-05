import { View, Image, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { spacing } from '@/shared/lib/tokens'
import { useAlbumUpload } from '../model/useAlbumUpload'
import { AlbumUploadingOverlay } from './AlbumUploadingOverlay'
import { AlbumCategorySelector } from './AlbumCategorySelector'
import { AlbumPreviewActions } from './AlbumPreviewActions'

type Props = {
  imageUri: string
}

export const AlbumPreviewPage = ({ imageUri }: Props) => {
  const router = useRouter()
  const {
    selectedCategory,
    setSelectedCategory,
    isUploading,
    handleConfirm,
  } = useAlbumUpload(imageUri)

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      <Image
        source={{ uri: imageUri }}
        style={styles.image}
        resizeMode="cover"
      />

      {isUploading && <AlbumUploadingOverlay />}

      {!isUploading && (
        <View style={styles.bottom}>
          <AlbumCategorySelector
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
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
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 16,
  },
})