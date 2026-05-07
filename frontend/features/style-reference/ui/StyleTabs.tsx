// features/style-reference/ui/StyleTabs.tsx

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

type TabId = 'PRESET' | 'CUSTOM';

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  selectedKeys: string[];  // 선택된 스타일 키 목록 ex) ['minimal', 'streetwear']
};

export function StyleTabs({ activeTab, onTabChange, selectedKeys }: Props) {
  return (
    <View style={styles.container}>

      {/* 탭 버튼 행 */}
      <View style={styles.tabRow}>
        {(['PRESET', 'CUSTOM'] as TabId[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => onTabChange(tab)}
            style={styles.tabButton}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab && styles.tabTextActive,
            ]}>
              {tab}
            </Text>
            {/* 선택된 탭 언더라인 */}
            {activeTab === tab && <View style={styles.underline} />}
          </Pressable>
        ))}
      </View>

      {/* 선택된 스타일 태그 — PRESET 탭일 때만 표시 */}
      {activeTab === 'PRESET' && selectedKeys.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagRow}
          contentContainerStyle={styles.tagContent}
        >
          {selectedKeys.map((key) => (
            <View key={key} style={styles.tag}>
              <View style={styles.tagDot} />
              <Text style={styles.tagText}>
                {key.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.outerMargin,
    marginBottom: 24,
  },

  tabRow: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  tabButton: {
    paddingBottom: 10,
    position: 'relative',
  },

  tabText: {
    ...fonts.label,
    letterSpacing: 0.8,
    color: colors.hint,
  },

  tabTextActive: {
    color: colors.primary,
  },

  underline: {
    position: 'absolute',
    bottom: -1,          // borderBottom 위에 덮어씌움
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accentRed,
  },

  tagRow: {
    marginTop: 12,
  },

  tagContent: {
    gap: 8,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentRed,
  },

  tagText: {
    ...fonts.label,
    letterSpacing: 0.5,
    color: colors.primary,
  },
});