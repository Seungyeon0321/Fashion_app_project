// features/style-reference/ui/StylePresetGrid.tsx

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/shared/lib/tokens';
import { ZigzagLayout } from '@/shared/ui/ZigzagLayout';
import { StyleCard } from './StyleCard';
import { useProfile } from '@/features/profile/api/useProfile';  // ← 추가
import type { StylePreset, PresetKey } from '../model/types';

// ── female only 프리셋 ─────────────────────────────────────
const FEMALE_ONLY: PresetKey[] = ['y2k', 'coquette'];

// ── S3 base URL ────────────────────────────────────────────
const S3 = process.env.EXPO_PUBLIC_S3_BASE_URL;

type Props = {
  presets: StylePreset[];
  isLoading: boolean;
  selected: PresetKey[];
  onToggle: (key: PresetKey) => void;
};

export function StylePresetGrid({ presets, isLoading, selected, onToggle }: Props) {
  const { data: profile } = useProfile();
  const gender = profile?.gender === 'FEMALE' ? 'female' : 'male';
  // MALE → male, UNISEX → male, undefined(미설정) → male

  // ── 젠더 기반 이미지 URL 조합 ──────────────────────────────
  const getImageUrl = (key: PresetKey): string => {
    const g = FEMALE_ONLY.includes(key) ? 'female' : gender;
    return `${S3}/${key}_${g}.webp`;
  };

  console.log('profile', profile);
  console.log('gender', gender)
  console.log(process.env.EXPO_PUBLIC_S3_BASE_URL);
  console.log('imageUrl example:', getImageUrl('y2k'));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ZigzagLayout
      items={presets}
      keyExtractor={(preset) => preset.key}
      renderItem={(preset) => (
        <StyleCard
          preset={preset}
          isSelected={selected.includes(preset.key)}
          onPress={() => onToggle(preset.key)}
          imageUrl={getImageUrl(preset.key)}  // ← 추가
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
});