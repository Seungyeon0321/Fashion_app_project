import { Button, Image, View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { Photo } from '@/entities/media/model/types'
import type { ValidationStatus } from '@/features/take_photo/model/useTakePhoto'
import { CameraType } from 'expo-camera'

type PhotoPreviewProps = {
  photo: Photo | null
  onClear: () => void
  onConfirm: () => void
  facing: CameraType
  validationStatus?: ValidationStatus | null
  validationMessage?: string | null
}

const RETRY_MESSAGE = 'Please try again'

export const PhotoPreview = ({
  photo,
  onClear,
  onConfirm,
  facing,
  validationStatus = null,
  validationMessage = null,
}: PhotoPreviewProps) => {
  const isInvalid = validationStatus === 'invalid'
  const isPending = validationStatus === 'pending'

  return (
    <View style={styles.container}>
      <Image source={{ uri: photo?.uri ?? '' }} style={[styles.image, { transform: facing === 'front' ? [{ scaleX: -1 }] : [] }]} resizeMode="cover" />

      {isPending && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Analyzing...</Text>
        </View>
      )}

      {isInvalid && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>{RETRY_MESSAGE}</Text>
          {validationMessage ? <Text style={styles.errorSub}>{validationMessage}</Text> : null}
          <Button title="Retry" onPress={onClear} />
        </View>
      )}

      {validationStatus === 'valid' && (
        <>
        <View style={styles.actions}>
          <Button title="Confirm Photo" onPress={onConfirm} />
          <Button title="Take another picture" onPress={onClear} />
        </View>
        </>
      )}
    </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
})
