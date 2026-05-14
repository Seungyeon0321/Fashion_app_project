// features/get-recommendation/ui/SourceCard.tsx

import React from 'react';
import { ImageBackground, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';

type Props = {
  imageUrl: string;
  label: string;
  desc: string;
  onPress: () => void;
};

export function SourceCard({ imageUrl, label, desc, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>

      {/* 배경 이미지 — 카드 전체를 덮음 */}
      <ImageBackground
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.imageStyle}
      >
        {/* 텍스트 가독성을 위한 어두운 오버레이 */}
        <View style={styles.overlay} />
      </ImageBackground>

      {/* 왼쪽 액센트 바 — 이미지 위에 떠있음 */}
      <View style={styles.cardAccentBar} />

      {/* 텍스트 — 이미지 위에 떠있음 */}
      <View style={styles.cardBottom}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,   // 이미지 로딩 전 fallback 색상
    borderRadius: 4,
    padding: 16,
    justifyContent: 'flex-end',         // 텍스트를 카드 하단에 배치
    overflow: 'hidden',
  },
  imageStyle: {
    borderRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: 'white',          // 이미지 위라 흰색으로 변경
  },
  cardBottom: {
    gap: 6,
    paddingLeft: 8,
  },
  cardLabel: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: colors.surfaceHigh,          // #ffffff — 이미지 위 흰색
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',  // 살짝 투명한 흰색
    lineHeight: 16,
  },
});
