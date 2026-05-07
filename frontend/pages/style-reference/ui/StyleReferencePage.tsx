// pages/style-reference/ui/StyleReferencePage.tsx

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/shared/lib/tokens';
import { useStylePresets } from '@/features/style-reference/model/useStylePresets';
import { StyleTabs } from '@/features/style-reference/ui/StyleTabs';
import { StylePresetGrid } from '@/features/style-reference/ui/StylePresetGrid';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ScreenLayout } from '@/shared/ui/ScreenLayout';
import { useProfile } from '@/features/profile/api/useProfile';  // ← 추가
import { GenderSetupModal } from '@/features/gender-setup/ui/GenderSetupModal';
import { G } from 'react-native-svg';

type TabId = 'PRESET' | 'CUSTOM';

export function StyleReferencePage() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>('PRESET');
  const { presets, isLoading, selected, toggle, save, isSaving } = useStylePresets();

  const { data: profile } = useProfile();

  return (
    <ScreenLayout hasFooter>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="MY STYLE"
          subtitle="Select up to 3 aesthetics"
        />

        <StyleTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedKeys={selected}
        />

        {activeTab === 'PRESET' ? (
          <StylePresetGrid
            presets={presets}
            isLoading={isLoading}
            selected={selected}
            onToggle={toggle}
          />
        ) : (
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>Coming soon</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 하단 고정 버튼 — SafeArea 밖 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.saveButton, (isSaving || selected.length === 0) && styles.saveButtonDisabled]}
          onPress={() => save()}
          disabled={isSaving || selected.length === 0}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'SAVING...' : 'SAVE STYLE'}
          </Text>
        </Pressable>
      </View>
      <GenderSetupModal visible={!profile?.gender} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },

  comingSoon: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },

  comingSoonText: {
    ...fonts.bodyMd,
    color: colors.hint,
  },

  footer: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },

  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.4,
  },

  saveButtonText: {
    ...fonts.label,
    color: colors.surfaceHigh,
    letterSpacing: 1.2,
  },
});