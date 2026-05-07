// shared/ui/ZigzagLayout.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/shared/lib/tokens';

type Props<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
};

export function ZigzagLayout<T>({ items, renderItem, keyExtractor }: Props<T>) {
  const leftItems  = items.filter((_, i) => i % 2 === 0);
  const rightItems = items.filter((_, i) => i % 2 === 1);

  return (
    <View style={styles.grid}>
      {/* 왼쪽 컬럼 */}
      <View style={styles.leftCol}>
        {leftItems.map((item, idx) => (
          <View
            key={keyExtractor(item)}
            style={idx > 0 && { marginTop: spacing.sectionGap }}
          >
            {renderItem(item, idx * 2)}
          </View>
        ))}
      </View>

      {/* 오른쪽 컬럼 — 52px 아래로 offset */}
      <View style={styles.rightCol}>
        {rightItems.map((item, idx) => (
          <View
            key={keyExtractor(item)}
            style={idx > 0 && { marginTop: spacing.sectionGap }}
          >
            {renderItem(item, idx * 2 + 1)}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.outerMargin,
    gap: spacing.cardGap,
  },
  leftCol: {
    flex: 1,
  },
  rightCol: {
    flex: 1,
    marginTop: spacing.cardOffset,  // 52px
  },
});