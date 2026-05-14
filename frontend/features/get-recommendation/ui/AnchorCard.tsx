// features/get-recommendation/ui/AnchorCard.tsx
//
// imageUrl이 사라질 때 (NO ANCHOR 선택 시):
//   이미지가 서서히 fade out (300ms)
// imageUrl이 생길 때 (아이템 선택 시):
//   이미지가 서서히 fade in (300ms)

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Animated,
} from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';

type Props = {
  lines: string[];
  icon: string;
  desc: string;
  selected: boolean;
  imageUrl?: string | null;
  onPress: () => void;
};

export function AnchorCard({ lines, icon, desc, selected, imageUrl, onPress }: Props) {
  const hasImage = selected && !!imageUrl;

  // 이미지 opacity 애니메이션
  const imageOpacity = useRef(new Animated.Value(hasImage ? 1 : 0)).current;
  // 이전 imageUrl을 저장해서 실제로 이미지가 있었던 경우에만 렌더링 유지
  const prevImageUrl = useRef<string | null | undefined>(imageUrl);

  useEffect(() => {
    if (hasImage) {
      // 이미지 생김 → fade in
      prevImageUrl.current = imageUrl;
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // 이미지 사라짐 → fade out → 완료 후 prevImageUrl 초기화
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          prevImageUrl.current = null;
        }
      });
    }
  }, [hasImage, imageUrl]);

  // fade out 중에도 이미지를 유지하기 위해 prevImageUrl 사용
  const displayImageUrl = imageUrl ?? prevImageUrl.current;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* 배경 이미지 — fade in/out */}
      {displayImageUrl && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]}>
          <ImageBackground
            source={{ uri: displayImageUrl }}
            style={StyleSheet.absoluteFill}
            imageStyle={styles.imageStyle}
          >
            <View style={styles.overlay} />
          </ImageBackground>
        </Animated.View>
      )}

      {selected && <View style={styles.accentBar} />}

      <View style={styles.bottom}>
        {lines.slice(0, -1).map((line, i) => (
          <Text key={i} style={[styles.label, hasImage && styles.labelOnImage]}>
            {line}
          </Text>
        ))}

        <View style={styles.lastLine}>
          <Text style={[styles.label, hasImage && styles.labelOnImage]}>
            {lines[lines.length - 1]}
          </Text>
          <Text style={[styles.icon, hasImage && styles.labelOnImage]}>
            {icon}
          </Text>
        </View>

        <Text style={[styles.desc, hasImage && styles.descOnImage]}>
          {desc}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: 4,
    padding: 16,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  imageStyle: {
    borderRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  accentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: 'white',
  },
  bottom: {
    gap: 4,
    paddingLeft: 4,
  },
  lastLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  icon: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: colors.primary,
    includeFontPadding: false,
  },
  desc: {
    ...fonts.caption,
    color: colors.primaryMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  labelOnImage: {
    color: colors.surfaceHigh,
  },
  descOnImage: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
