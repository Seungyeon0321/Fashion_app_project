// features/get-recommendation/ui/StylingOverlay.tsx  ← 기존 파일 수정

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { spacing } from '@/shared/lib/tokens';

type Props = {
  message?: string | null;
};

// ── 실제 SSE 메시지 기반 진행률 매핑 ──────────────────────────────
// 게이지는 앞으로만 진행 — 절대 뒤로 안 감
const PROGRESS_MAP: { keyword: string; value: number }[] = [
  { keyword: 'analyzing',       value: 0.10 },
  { keyword: 'style',           value: 0.15 },
  { keyword: 'query',           value: 0.20 },
  { keyword: 'Finding',         value: 0.30 }, // Finding X mood items (3번 올 수 있음)
  { keyword: 'outfit complete', value: 0.60 }, // X outfit complete! (3번 올 수 있음)
  { keyword: 'Putting',         value: 0.75 }, // Putting your look together
  { keyword: 'ranking',         value: 0.85 },
  { keyword: 'validat',         value: 0.92 },
  { keyword: 'response',        value: 0.97 },
];

function getProgressValue(message: string | null | undefined): number {
  if (!message) return 0.05;
  const lower = message.toLowerCase();
  for (const { keyword, value } of PROGRESS_MAP) {
    if (lower.includes(keyword.toLowerCase())) return value;
  }
  return 0.05;
}

export function StylingOverlay({ message }: Props) {
  const swingAnim    = useRef(new Animated.Value(0)).current;
  const dot1Anim     = useRef(new Animated.Value(0.2)).current;
  const dot2Anim     = useRef(new Animated.Value(0.2)).current;
  const dot3Anim     = useRef(new Animated.Value(0.2)).current;
  const progressAnim = useRef(new Animated.Value(0.05)).current;

  // 현재 진행값 추적 — 뒤로 가지 않도록
  const currentProgressRef = useRef(0.05);

  // ── 옷걸이 스윙 + 점 애니메이션 ──────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(swingAnim, {
          toValue:         1,
          duration:        650,
          easing:          Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swingAnim, {
          toValue:         0,
          duration:        650,
          easing:          Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(dot1Anim, { toValue: 1,   duration: 200, useNativeDriver: true }),
        Animated.timing(dot1Anim, { toValue: 0.2, duration: 200, useNativeDriver: true }),
        Animated.timing(dot2Anim, { toValue: 1,   duration: 200, useNativeDriver: true }),
        Animated.timing(dot2Anim, { toValue: 0.2, duration: 200, useNativeDriver: true }),
        Animated.timing(dot3Anim, { toValue: 1,   duration: 200, useNativeDriver: true }),
        Animated.timing(dot3Anim, { toValue: 0.2, duration: 200, useNativeDriver: true }),
        Animated.delay(200),
      ])
    ).start();

    return () => {
      swingAnim.stopAnimation();
      dot1Anim.stopAnimation();
      dot2Anim.stopAnimation();
      dot3Anim.stopAnimation();
    };
  }, []);

  // ── 게이지 애니메이션 — 앞으로만 진행 ──────────────────────────────
  useEffect(() => {
    const targetValue = getProgressValue(message);

    // 현재값보다 클 때만 업데이트 → 절대 뒤로 안 감
    if (targetValue > currentProgressRef.current) {
      currentProgressRef.current = targetValue;
      Animated.timing(progressAnim, {
        toValue:         targetValue,
        duration:        600,
        easing:          Easing.out(Easing.cubic),
        useNativeDriver: false, // width는 nativeDriver 미지원
      }).start();
    }
  }, [message]);

  const rotate = swingAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['-15deg', '15deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.center}>

        {/* 옷걸이 아이콘 */}
        <Animated.View
          style={[styles.hangerWrap, {
            transform: [
              { translateY: 6 },
              { rotate },
              { translateY: -6 },
            ],
          }]}
        >
          <Svg width={100} height={80} viewBox="0 0 100 80">
            <Path
              d="M50 4 C50 4 57 4 57 11 C57 16 52 18 50 18"
              fill="none" stroke="#faf9f6" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
            />
            <Path
              d="M50 18 C50 18 36 22 16 38"
              fill="none" stroke="#faf9f6" strokeWidth={2.5}
              strokeLinecap="round"
            />
            <Path
              d="M50 18 C50 18 64 22 84 38"
              fill="none" stroke="#faf9f6" strokeWidth={2.5}
              strokeLinecap="round"
            />
            <Line
              x1={16} y1={38} x2={84} y2={38}
              stroke="#faf9f6" strokeWidth={2.5}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* 메시지 + 점 */}
        <View style={styles.labelWrap}>
          <Text style={styles.label}>
            {message ?? 'STYLING'}
          </Text>
          <View style={styles.dots}>
            {[dot1Anim, dot2Anim, dot3Anim].map((anim, i) => (
              <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
            ))}
          </View>
        </View>

        {/* ── 게이지 바 ──────────────────────────────────────── */}
        <View style={styles.gaugeTrack}>
          <Animated.View
            style={[styles.gaugeFill, { width: progressWidth }]}
          />
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
    zIndex:          100,
    justifyContent:  'center',
    alignItems:      'center',
  },
  center: {
    alignItems:        'center',
    gap:               28,
    width:             '100%',
    paddingHorizontal: spacing.outerMargin,
  },
  hangerWrap: { width: 100, height: 80 },
  labelWrap:  { alignItems: 'center', gap: 10 },
  label: {
    fontFamily:        'Epilogue_700Bold',
    fontSize:          12,
    letterSpacing:     3,
    color:             'rgba(250, 249, 246, 0.85)',
    textAlign:         'center',
    paddingHorizontal: 32,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: 'rgba(250, 249, 246, 0.7)',
  },
  gaugeTrack: {
    width:           240,
    height:          2,
    backgroundColor: 'rgba(250, 249, 246, 0.12)',
    overflow:        'hidden',
  },
  gaugeFill: {
    height:          2,
    backgroundColor: 'rgba(250, 249, 246, 0.75)',
  },
});