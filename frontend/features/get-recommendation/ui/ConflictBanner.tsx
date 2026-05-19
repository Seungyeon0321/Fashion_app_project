// features/get-recommendation/ui/ConflictBanner.tsx
//
// 역할:
//   conflict_warning 유무에 따라 배너 문구와 색상을 결정해서 표시.
//   애니메이션 상태는 useConflictBanner 훅에서 받아옴.
//
// Props:
//   conflictWarning  — 백엔드 응답값 ('sporty_rain' | 'casual_meeting' | null)
//   animatedStyle    — useConflictBanner에서 내려주는 Animated 스타일
//   onYes            — "네, 이대로" 버튼 핸들러
//   onNo             — "아니요" 버튼 핸들러

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '@/shared/lib/tokens';
import {
  ConflictWarning,
  CONFLICT_CONFIG,
  DEFAULT_BANNER_CONFIG,
} from '../model/useConflictBanner';

type Props = {
  conflictWarning: ConflictWarning;
  animatedStyle: object;
  onYes: () => void;
  onNo:  () => void;
};

export function ConflictBanner({ conflictWarning, animatedStyle, onYes, onNo }: Props) {
  const config = conflictWarning
    ? CONFLICT_CONFIG[conflictWarning]
    : DEFAULT_BANNER_CONFIG;

  const isConflict = conflictWarning !== null;

  return (
    <Animated.View
      style={[
        styles.banner,
        isConflict ? styles.bannerConflict : styles.bannerDefault,
        animatedStyle,
      ]}
    >
      <Text style={[styles.message, isConflict ? styles.messageConflict : styles.messageDefault]}>
        {config.message}
      </Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          onPress={onNo}
          style={[styles.btn, styles.btnNo]}
          activeOpacity={0.7}
        >
          <Text style={styles.btnNoText}>{config.noLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onYes}
          style={[styles.btn, styles.btnYes]}
          activeOpacity={0.7}
        >
          <Text style={styles.btnYesText}>Yes, keep it</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  bannerConflict: {
    backgroundColor: 'rgba(250, 238, 218, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(186, 117, 23, 0.3)',
  },
  bannerDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  message: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  messageConflict: {
    color: '#854F0B',
  },
  messageDefault: {
    color: colors.primary,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnNo: {
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: 'transparent',
  },
  btnYes: {
    backgroundColor: colors.primary,
  },
  btnNoText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: colors.primaryMuted,
  },
  btnYesText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    fontWeight: '600',
    color: colors.background,
  },
});
