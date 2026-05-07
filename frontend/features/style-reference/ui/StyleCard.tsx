// features/style-reference/ui/StyleCard.tsx

import React from 'react';
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';
import type { StylePreset } from '../model/types';

type Props = {
  preset: StylePreset;
  isSelected: boolean;
  onPress: () => void;
  imageUrl: string; // 이미지 URL 추가
};

export function StyleCard({ preset, isSelected, onPress, imageUrl }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* 이미지 영역 */}
      <View
        style={[
          styles.imageWrapper,
          isSelected && styles.selectedBorder,
        ]}
      >
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, !isSelected && styles.grayscale]}
          resizeMode="cover"
        />

      </View>

      {/* 텍스트 영역 — 이미지 아래 */}
      <View style={styles.textArea}>
        <Text style={styles.name}>{preset.name}</Text>
        <Text style={styles.description}>{preset.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  imageWrapper: {
    height: 260, overflow: 'hidden', position: 'relative',
  },

  selectedBorder: {
    borderWidth: 2,
    borderColor: colors.accentRed,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  grayscale: {
    // React Native 기본 grayscale 필터 없음 → tintColor로 근사
    // 실제 흑백은 Expo ImageManipulator 필요하지만 MVP에선
    // opacity로 "선택 안 된" 느낌을 표현
    opacity: 0.45,
  },

  textArea: {
    paddingTop: 8,
  },

  name: {
    ...fonts.brand,
    color: colors.primary,
  },

  description: {
    ...fonts.caption,
    color: colors.primaryMuted,
    marginTop: 2,
  },
});