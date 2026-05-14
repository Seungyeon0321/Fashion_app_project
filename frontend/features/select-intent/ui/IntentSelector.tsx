// features/select-intent/ui/IntentSelector.tsx
//
// 변경:
//   - onIntentPress prop 추가 (StylistPage에서 시트 오픈 트리거용)
//   - Intent 선택 시 즉시 onIntentPress 호출 (시트 바로 열림)
//   - 선택된 버튼에 "TAP TO RESTYLE →" 힌트 추가

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { type Intent, useIntentStore } from '@/features/select-intent/model/intentStore';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

const S3 = process.env.EXPO_PUBLIC_S3_BASE_URL;

const INTENTS: { key: Intent; label: string; image: string }[] = [
  { key: 'formal', label: 'FORMAL', image: `${S3}/formal.webp` },
  { key: 'casual', label: 'CASUAL', image: `${S3}/casual.webp` },
  { key: 'sports', label: 'SPORTS', image: `${S3}/sports.webp` },
];

type Props = {
  onIntentPress?: (key: Intent) => void;
};

export function IntentSelector({ onIntentPress }: Props) {
  const selectedIntent = useIntentStore((s) => s.selectedIntent);
  const setIntent = useIntentStore((s) => s.setIntent);

  const handlePress = (key: Intent) => {
    setIntent(key);
    // intent 선택 즉시 시트 오픈 트리거
    onIntentPress?.(key);
  };

  return (
    <View style={styles.container}>
      {INTENTS.map((intent) => {
        const isSelected = selectedIntent === intent.key;
        return (
          <TouchableOpacity
            key={intent.key}
            style={styles.buttonWrapper}
            onPress={() => handlePress(intent.key)}
            activeOpacity={0.85}
          >
            <ImageBackground
              source={{ uri: intent.image }}
              style={styles.button}
              imageStyle={styles.buttonImage}
            >
              <View style={[styles.overlay, isSelected && styles.overlaySelected]} />
              {isSelected && <View style={styles.accentLine} />}
              <Text style={styles.label}>{intent.label}</Text>
              {isSelected && (
                <Text style={styles.tapHint}>TAP TO RESTYLE →</Text>
              )}
            </ImageBackground>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 15,
    paddingHorizontal: spacing.outerMargin,
    paddingTop: spacing.cardOffset,   // 52 — tokens 기준
  },
  buttonWrapper: {
    width: '100%',
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  buttonImage: {
    borderRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  overlaySelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  accentLine: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: 'white',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  label: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 20,
    letterSpacing: 4,
    color: 'white',
    textTransform: 'uppercase',
  },
  tapHint: {
    position: 'absolute',
    right: 20,
    bottom: 14,
    fontFamily: 'Manrope_400Regular',   // fonts.caption 기준
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.55)',
  },
});
