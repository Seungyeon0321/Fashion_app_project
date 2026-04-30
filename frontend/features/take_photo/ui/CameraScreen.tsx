import React from 'react'
import { Text, StyleSheet, View, Pressable } from 'react-native'
import { BodyFrameType } from '@/features/camera_controls/model/useSelectLayout';
import { TextBox } from '@/shared/ui/TextBox';
import CameraLayout from '@/features/take_photo/ui/CameraLayout'
import { ToggleFacingButton } from '@/features/camera_controls/ui/ToggleFacingButton';
import { SelectLayoutButton } from '@/features/camera_controls/ui/SelectLayoutButton';
import TakePhotoButton from '@/features/take_photo/ui/TakePhotoButton';

interface PhotoViewProps {
  mode?: BodyFrameType
  message: string
  isCountingDown?: boolean
  countDown?: number
  onBack?: () => void
  currentLayout: BodyFrameType
  changeLayout: (layout: BodyFrameType) => void
  toggleFacing: () => void
  triggerCountdown: (seconds: number) => void
}

const PhotoView = ({
  message,
  isCountingDown,
  countDown,
  onBack,
  currentLayout,
  changeLayout,
  toggleFacing,
  triggerCountdown,
}: PhotoViewProps) => {
  return (
    <View style={styles.wrapper}>

      {/* ── 상단 영역 ── */}
      <View style={styles.topSection}>

        {/* 1행: 뒤로가기(좌측 고정) + 카메라 전환(중앙 absolute) */}
        <View style={styles.topBar}>

          {/* 좌측: 뒤로가기 */}
          <Pressable
            onPress={onBack}
            hitSlop={16}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <View style={styles.chevron} />
          </Pressable>

          {/* 중앙: 카메라 전환 — absolute로 topBar 정중앙에 고정
              left/right: 0 + alignItems: center 조합으로 수평 중앙 맞춤 */}
          <View style={styles.toggleCenter}>
            <ToggleFacingButton toggleFacing={toggleFacing} />
          </View>

        </View>

        {/* 2행: TOP / BOTTOM / FULL */}
        <SelectLayoutButton
          currentLayout={currentLayout}
          changeLayout={changeLayout}
        />

      </View>

      {/* ── 중앙: 카메라 프레임 + 카운트다운 ── */}
      <View style={styles.frameArea}>
        <CameraLayout>
          {isCountingDown && countDown !== undefined && countDown > 0 && (
            <Text style={styles.countDownText}>{countDown}</Text>
          )}
        </CameraLayout>
      </View>

      {/* ── 하단: 메시지 + TAKE PHOTO ── */}
      <View style={styles.bottomSection}>
        <TextBox text={message} />
        <TakePhotoButton triggerCountdown={triggerCountdown} />
      </View>

    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },

  // ── 상단 영역 ──
  topSection: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingBottom: 8,
    gap: 8,
  },

  // topBar는 relative — absolute 자식(toggleCenter)의 기준점이 됨
  topBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    width: 11,
    height: 11,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#faf9f6',
    transform: [{ rotate: '45deg' }],
    marginLeft: 5,
  },

  // ↺ 버튼을 topBar 정중앙에 absolute로 고정
  // left: 0, right: 0 → 전체 너비 차지
  // alignItems: 'center' → 그 안에서 수평 중앙 정렬
  toggleCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // pointerEvents 없어도 되지만, 뒤로가기 버튼 탭 영역과 겹칠 경우를 대비해
    // ToggleFacingButton 자체 hitSlop으로 충분히 분리됨
  },

  // ── 중앙 프레임 ──
  frameArea: {
    flex: 1,
  },

  // ── 하단 영역 ──
  bottomSection: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingBottom: 50,
  },

  // ── 카운트다운 ──
  countDownText: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 64,
    color: '#faf9f6',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
})

export default PhotoView
