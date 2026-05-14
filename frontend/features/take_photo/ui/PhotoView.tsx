// features/take_photo/ui/PhotoView.tsx
//
// 수정: paddingBottom: 50 하드코딩 → useBottomInset() 으로 교체

import React from 'react'
import { Text, StyleSheet, View, Pressable } from 'react-native'
import { BodyFrameType } from '@/features/camera_controls/model/useSelectLayout';
import { TextBox } from '@/shared/ui/TextBox';
import CameraLayout from '@/features/take_photo/ui/CameraLayout'
import { ToggleFacingButton } from '@/features/camera_controls/ui/ToggleFacingButton';
import { SelectLayoutButton } from '@/features/camera_controls/ui/SelectLayoutButton';
import TakePhotoButton from '@/features/take_photo/ui/TakePhotoButton';
import { useBottomInset } from '@/shared/lib/useBottomInset';

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

export const PhotoView = ({
  message,
  isCountingDown,
  countDown,
  onBack,
  currentLayout,
  changeLayout,
  toggleFacing,
  triggerCountdown,
}: PhotoViewProps) => {
  // 안드로이드 네비게이션 바 높이 동적 반영
  // 카메라는 콘텐츠가 더 많아서 최소 24px 보장
  const bottomPadding = useBottomInset(24);

  return (
    <View style={styles.wrapper}>

      {/* ── 상단 영역 ── */}
      <View style={styles.topSection}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            hitSlop={16}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            <View style={styles.chevron} />
          </Pressable>
          <View style={styles.toggleCenter}>
            <ToggleFacingButton toggleFacing={toggleFacing} />
          </View>
        </View>

        <SelectLayoutButton
          currentLayout={currentLayout}
          changeLayout={changeLayout}
        />
      </View>

      {/* ── 중앙: 카메라 프레임 ── */}
      <View style={styles.frameArea}>
        <CameraLayout>
          {isCountingDown && countDown !== undefined && countDown > 0 && (
            <Text style={styles.countDownText}>{countDown}</Text>
          )}
        </CameraLayout>
      </View>

      {/* ── 하단 ── */}
      <View style={[styles.bottomSection, { paddingBottom: bottomPadding }]}>
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
  topSection: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingBottom: 8,
    gap: 8,
  },
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
  toggleCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  frameArea: {
    flex: 1,
  },
  bottomSection: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    // paddingBottom: 50  ← 하드코딩 제거, 동적 값으로 교체
  },
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


