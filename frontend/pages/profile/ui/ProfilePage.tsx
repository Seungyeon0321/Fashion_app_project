// pages/profile/ui/ProfilePage.tsx  ← 기존 파일 수정

import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileHeader } from '@/features/profile/ui/ProfileHeader';
import { SettingsSection } from '@/features/profile/ui/SettingsSection';
import { LogoutButton } from '@/features/profile/ui/LogoutButton';
import { SavedOutfitsGrid } from '@/features/profile/ui/SavedOutfitsGrid';
import { useProfile } from '@/features/profile/api/useProfile';
import { useLogout } from '@/features/profile/api/useLogout';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

type ProfileTab = 'OVERVIEW' | 'OUTFITS';

export function ProfilePage() {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useProfile();
  const { handleLogout } = useLogout();
  const [activeTab, setActiveTab] = useState<ProfileTab>('OVERVIEW');

  const generalSettings = [
    {
      icon: 'notifications-outline' as const,
      label: 'Notifications',
      onPress: () => {},
    },
    {
      icon: 'language-outline' as const,
      label: 'Language',
      rightText: 'EN',
      onPress: () => {},
    },
  ];

  const legalSettings = [
    {
      icon: 'shield-outline' as const,
      label: 'Privacy Policy',
      onPress: () => {},
    },
    {
      icon: 'document-text-outline' as const,
      label: 'Terms of Service',
      onPress: () => {},
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator color={colors.primaryMuted} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 헤더 */}
        <ProfileHeader
          name={profile?.name ?? ''}
          email={profile?.email ?? ''}
          avatarUrl={profile?.avatarUrl}
          onEditPress={() => {}}
        />

        {/* ── 탭 바 ───────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {(['OVERVIEW', 'OUTFITS'] as ProfileTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                  activeTab !== tab && styles.tabTextInactive, // ← 추가
                ]}
              >
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.divider} />

        {/* ── OVERVIEW 탭 ─────────────────────────────────── */}
        {activeTab === 'OVERVIEW' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>GENERAL</Text>
              <SettingsSection items={generalSettings} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>LEGAL</Text>
              <SettingsSection items={legalSettings} />
            </View>

            <LogoutButton onPress={handleLogout} />

            <Text style={styles.version}>ATELIER NOIR • V1.0.0</Text>
          </>
        )}

        {/* ── OUTFITS 탭 ──────────────────────────────────── */}
        {activeTab === 'OUTFITS' && (
          <View style={styles.section}>
            <SavedOutfitsGrid />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex:            1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex:            1,
    backgroundColor: colors.background,
    alignItems:      'center',
    justifyContent:  'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop:        24,
  },

  // ── 탭 바 ────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    marginTop:     24,
    gap:           24,
  },
  tabItem: {
    paddingBottom: 14,
    position:      'relative',
  },
  tabText: {
    fontFamily:    'Epilogue_500Medium', // ← Manrope tab 대신 Epilogue로 변경
    fontSize:      13,                   // ← 더 크게
    letterSpacing: 2,
    color:         colors.hint,
  },
  tabTextActive: {
    color:      colors.primary,
    fontFamily: 'Epilogue_700Bold',      // ← 활성화 시 Bold
  },
  tabTextInactive: {
    opacity: 0.4,   // ← 비활성 탭 흐릿하게
  },
  tabUnderline: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          2,                  // ← 1px → 2px 더 뚜렷하게
    backgroundColor: colors.primary,
  },
  divider: {
    height:          1,
    backgroundColor: colors.divider,
    marginBottom:    24,
  },

  // ── 섹션 ─────────────────────────────────────────────────
  section: {
    gap:       16,
    marginBottom: 8,
  },
  sectionTitle: {
    ...fonts.tab,
    color:         colors.primaryMuted,
    letterSpacing: 3,
  },
  version: {
    ...fonts.tab,
    color:         colors.hint,
    letterSpacing: 3.5,
    textAlign:     'center',
    marginTop:     56,
  },
});