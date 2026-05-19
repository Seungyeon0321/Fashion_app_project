// features/get-recommendation/ui/StylingOverlay.tsx
//
// 역할:
//   추천 API 호출 중 (isPending) 화면 위에 띄우는 로딩 오버레이.
//   옷걸이가 좌우로 흔들리고 점 3개가 순서대로 깜빡임.
//
// 사용법:
//   {isPending && <StylingOverlay />}

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

export function StylingOverlay() {
  const swingAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim  = useRef(new Animated.Value(0.2)).current;
  const dot2Anim  = useRef(new Animated.Value(0.2)).current;
  const dot3Anim  = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // 옷걸이 좌우 스윙 — loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(swingAnim, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(swingAnim, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 점 3개 순차 깜빡임 — loop
    const dotLoop = Animated.loop(
      Animated.sequence([
        // dot1 on
        Animated.timing(dot1Anim, { toValue: 1,   duration: 200, useNativeDriver: true }),
        Animated.timing(dot1Anim, { toValue: 0.2, duration: 200, useNativeDriver: true }),
        // dot2 on
        Animated.timing(dot2Anim, { toValue: 1,   duration: 200, useNativeDriver: true }),
        Animated.timing(dot2Anim, { toValue: 0.2, duration: 200, useNativeDriver: true }),
        // dot3 on
        Animated.timing(dot3Anim, { toValue: 1,   duration: 200, useNativeDriver: true }),
        Animated.timing(dot3Anim, { toValue: 0.2, duration: 200, useNativeDriver: true }),
        // 잠깐 쉬기
        Animated.delay(200),
      ])
    );
    dotLoop.start();

    return () => {
      swingAnim.stopAnimation();
      dot1Anim.stopAnimation();
      dot2Anim.stopAnimation();
      dot3Anim.stopAnimation();
    };
  }, []);

  // -15deg ~ +15deg 스윙
  const rotate = swingAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.center}>

        {/* 옷걸이 SVG — transform-origin을 고리 상단(50%, 12%)으로 */}
        <Animated.View
          style={[
            styles.hangerWrap,
            {
              transform: [
                { translateY: 6 },       // pivot 보정: 고리 위치로 이동
                { rotate },
                { translateY: -6 },
              ],
            },
          ]}
        >
          <Svg width={100} height={80} viewBox="0 0 100 80">
            {/* 고리 (hook) */}
            <Path
              d="M50 4 C50 4 57 4 57 11 C57 16 52 18 50 18"
              fill="none"
              stroke="#faf9f6"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 왼쪽 어깨 곡선 */}
            <Path
              d="M50 18 C50 18 36 22 16 38"
              fill="none"
              stroke="#faf9f6"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {/* 오른쪽 어깨 곡선 */}
            <Path
              d="M50 18 C50 18 64 22 84 38"
              fill="none"
              stroke="#faf9f6"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {/* 아랫 가로바 */}
            <Line
              x1={16} y1={38}
              x2={84} y2={38}
              stroke="#faf9f6"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* 텍스트 + 점 */}
        <View style={styles.labelWrap}>
          <Text style={styles.label}>STYLING</Text>
          <View style={styles.dots}>
            {[dot1Anim, dot2Anim, dot3Anim].map((anim, i) => (
              <Animated.View key={i} style={[styles.dot, { opacity: anim }]} />
            ))}
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,  // 부모 전체를 덮음
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 28,
  },
  hangerWrap: {
    width: 100,
    height: 80,
  },
  labelWrap: {
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 12,
    letterSpacing: 3,
    color: 'rgba(250, 249, 246, 0.85)',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(250, 249, 246, 0.7)',
  },
});
