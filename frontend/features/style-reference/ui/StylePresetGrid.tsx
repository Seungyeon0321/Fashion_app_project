import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/shared/lib/tokens';
import { ZigzagLayout } from '@/shared/ui/ZigzagLayout';
import { StyleCard } from './StyleCard';
import type { StylePreset, PresetKey } from '../model/types';

type Props = {
  presets: StylePreset[];
  isLoading: boolean;
  selected: PresetKey[];
  onToggle: (key: PresetKey) => void;
};

export function StylePresetGrid({ presets, isLoading, selected, onToggle }: Props) {
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