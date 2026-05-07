import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { type Intent, useIntentStore } from '@/features/select-intent/model/intentStore.ts';
import { colors, spacing } from '@/shared/lib/tokens';

const INTENTS: { key: Intent; label: string; image: string }[] = [
  { key: 'formal', label: 'FORMAL', image: 'https://my-fashion-app-media.s3.ca-central-1.amazonaws.com/formal.png' },
  { key: 'casual', label: 'CASUAL', image: 'https://my-fashion-app-media.s3.ca-central-1.amazonaws.com/casual.png' },
  { key: 'sports', label: 'SPORTS', image: 'https://my-fashion-app-media.s3.ca-central-1.amazonaws.com/sports.png' },
];

export function IntentSelector() {
  const selectedIntent = useIntentStore((s) => s.selectedIntent);
  const setIntent = useIntentStore((s) => s.setIntent);

  return (
    <View style={styles.container}>
      {INTENTS.map((intent) => {
        const isSelected = selectedIntent === intent.key;
        return (
          <TouchableOpacity
            key={intent.key}
            style={styles.buttonWrapper}
            onPress={() => setIntent(intent.key)}
            activeOpacity={0.85}
          >
            <ImageBackground
              source={{ uri: intent.image }}
              style={styles.button}
              imageStyle={styles.buttonImage}
            >
              {/* 오버레이 — 선택 시 더 어둡게 */}
              <View style={[styles.overlay, isSelected && styles.overlaySelected]} />

              {/* 선택 시 왼쪽 액센트 라인 */}
              {isSelected && <View style={styles.accentLine} />}

              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {intent.label}
              </Text>
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
    paddingTop: spacing.cardOffset,
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
    left: 0,
    top: 0,
    bottom: 0,
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
  labelSelected: {
    color: 'white',
  },
});