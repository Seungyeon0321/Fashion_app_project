// features/get-recommendation/ui/OutfitComment.tsx
//
// 역할:
//   AI가 생성한 코디 코멘트를 접기/펼치기로 표시.
//   기본은 한 줄 요약, 탭하면 전체 내용 표시.

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';
import { useOutfitComment } from '../model/useOutfitComment';

type Props = {
  rawText: string;
};

export function OutfitComment({ rawText }: Props) {
  const { expanded, toggle, animatedHeight, cleanText } = useOutfitComment(rawText);

  return (
    <TouchableOpacity
      onPress={toggle}
      activeOpacity={0.8}
      style={styles.wrapper}
    >
      <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
        <Text style={styles.text}>{cleanText}</Text>
      </Animated.View>
      <Text style={styles.toggle}>
        {expanded ? '↑ CLOSE' : '↓ TAP TO READ MORE'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
  },
  text: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
    color: colors.primaryMuted,
  },
  toggle: {
    ...fonts.tab,
    color: colors.hint,
    letterSpacing: 1,
    marginTop: 6,
  },
});
