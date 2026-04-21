import { Pressable, Image, View, Text, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native'
import { Photo } from '@/entities/media/model/types'
import type { ValidationStatus } from '@/features/take_photo/model/useTakePhoto'
import { CameraType } from 'expo-camera'
import { useCameraFrame } from '../model/useCameraFrame'
import Svg, { Path } from 'react-native-svg'

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

  const outerPath = `M0,0 H${width} V${height} H0 V0 Z`
  const innerPath = frameRect
    ? `M${frameRect.left},${frameRect.top} H${frameRect.left + frameRect.width} V${frameRect.top + frameRect.height} H${frameRect.left} Z`
    : ''

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: photo?.uri ?? '' }}
        style={[styles.image, { transform: facing === 'front' ? [{ scaleX: -1 }] : [] }]}
        resizeMode="cover"
      />

      {/* ── 분석 중 ── */}
      {isPending && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="rgba(250,249,246,0.9)" />
          <Text style={styles.overlayText}>ANALYZING</Text>
        </View>
      )}

      {/* ── 유효하지 않은 사진 ── */}
      {isInvalid && (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>{RETRY_MESSAGE}</Text>
          {validationMessage && (
            <Text style={styles.errorSub}>{validationMessage}</Text>
          )}
          <Pressable
            style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onClear}
          >
            <Text style={styles.buttonText}>RETRY</Text>
          </Pressable>
        </View>
      )}

      {/* ── 유효한 사진 ── */}
      {validationStatus === 'valid' && frameRect && (
        <>
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Path
              d={`${outerPath} ${innerPath}`}
              fillRule="evenodd"
              fill="rgba(0,0,0,0.5)"
            />
          </Svg>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.button, styles.buttonPrimary, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => onConfirm(width, height)}
            >
              <Text style={styles.buttonText}>CONFIRM</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, styles.buttonGhost, { opacity: pressed ? 0.7 : 1 }]}
              onPress={onClear}
            >
              <Text style={styles.buttonTextGhost}>RETAKE</Text>
            </Pressable>
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

  // ── 오버레이 ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  overlayText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(250,249,246,0.9)',
    marginTop: 12,
  },
  errorTitle: {
    fontFamily: 'Epilogue_500Medium',
    fontSize: 18,
    color: '#faf9f6',
    textAlign: 'center',
  },
  errorSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: 'rgba(250,249,246,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── 하단 액션 버튼 ──
  actions: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  button: {
    flex: 1,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
  },
  buttonPrimary: {
    backgroundColor: 'rgba(250,249,246,0.9)',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(250,249,246,0.4)',
  },
  buttonText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: '#1a1a1a',
  },
  buttonTextGhost: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(250,249,246,0.9)',
  },
})