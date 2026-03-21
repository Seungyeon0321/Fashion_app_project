import { Button, Image, View, Text, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native'
import { Photo } from '@/entities/media/model/types'
import type { ValidationStatus } from '@/features/take_photo/model/useTakePhoto'
import { CameraType } from 'expo-camera'
import { useCameraFrame } from '../model/useCameraFrame'
import Svg, { Path, Rect } from 'react-native-svg'

type PhotoPreviewProps = {
  photo: Photo | null
  onClear: () => void
  onConfirm: (width: number, height: number) => void
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
  const { getFrameRect } = useCameraFrame()
  const { width, height } = useWindowDimensions()
  const frameRect = getFrameRect()
  const isInvalid = validationStatus === 'invalid'
  const isPending = validationStatus === 'pending'

  const outerPath = `M0,0 H${width} V${height} H0 V0 Z`;
  const innerPath = frameRect
  ? `M${frameRect.left},${frameRect.top} H${frameRect.left + frameRect.width} V${frameRect.top + frameRect.height} H${frameRect.left} Z`
  : ''

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

      {validationStatus === 'valid' && frameRect && (
        <>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Path d={`${outerPath} ${innerPath}`} fillRule="evenodd" fill="rgba(0, 0, 0, 0.5)" />
        </Svg>
        <View style={styles.actions}>
          <Button title="Confirm Photo" onPress={() => onConfirm(width, height)} />
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
