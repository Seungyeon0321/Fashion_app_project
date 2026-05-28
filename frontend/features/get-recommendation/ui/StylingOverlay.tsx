// features/get-recommendation/ui/StylingOverlay.tsx

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';

type Props = {
  message?: string | null;  // 추가: SSE progress 메시지
};

export function StylingOverlay({ message }: Props) {
  const swingAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim  = useRef(new Animated.Value(0.2)).current;
  const dot2Anim  = useRef(new Animated.Value(0.2)).current;
  const dot3Anim  = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(swingAnim, {
          toValue: 1, duration: 650,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(swingAnim, {
          toValue: 0, duration: 650,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
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

  const rotate = swingAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.center}>

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
            <Path d="M50 4 C50 4 57 4 57 11 C57 16 52 18 50 18"
              fill="none" stroke="#faf9f6" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M50 18 C50 18 36 22 16 38"
              fill="none" stroke="#faf9f6" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M50 18 C50 18 64 22 84 38"
              fill="none" stroke="#faf9f6" strokeWidth={2.5} strokeLinecap="round" />
            <Line x1={16} y1={38} x2={84} y2={38}
              stroke="#faf9f6" strokeWidth={2.5} strokeLinecap="round" />
          </Svg>
        </Animated.View>

        <View style={styles.labelWrap}>
          {/* message가 있으면 progress 텍스트, 없으면 기본 STYLING */}
          <Text style={styles.label}>
            {message ?? 'STYLING'}
          </Text>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { alignItems: 'center', gap: 28 },
  hangerWrap: { width: 100, height: 80 },
  labelWrap: { alignItems: 'center', gap: 10 },
  label: {
    fontFamily:  'Epilogue_700Bold',
    fontSize:    12,
    letterSpacing: 3,
    color:       'rgba(250, 249, 246, 0.85)',
    textAlign:   'center',    // 긴 메시지도 중앙 정렬
    paddingHorizontal: 32,    // 긴 텍스트 줄바꿈 방지용 여백
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(250, 249, 246, 0.7)',
  },
});