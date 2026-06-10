// pages/profile/ui/ProfilePage.tsx  ← 기존 파일 수정

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileHeader } from '@/features/profile/ui/ProfileHeader';
import { SettingsSection } from '@/features/profile/ui/SettingsSection';
import { LogoutButton } from '@/features/profile/ui/LogoutButton';
import { SavedOutfitsGrid } from '@/features/profile/ui/SavedOutfitsGrid';
import { useProfile } from '@/features/profile/api/useProfile';
import { useLogout } from '@/features/profile/api/useLogout';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

export function ProfilePage() {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useProfile();
  const { handleLogout } = useLogout();

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
    // edges={['top']} : 상단 노치/상태바만 SafeArea 처리
    // 하단은 insets.bottom으로 직접 계산 → 더 정밀한 컨트롤 가능
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          // 하단 제스처 바 높이 + 여유 여백 확보
          { paddingBottom: insets.bottom + 48 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={profile?.name ?? ''}
          email={profile?.email ?? ''}
          avatarUrl={profile?.avatarUrl}
          onEditPress={() => {}}
        />

        {/* ── 저장된 아웃핏 섹션 ─────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SAVED OUTFITS</Text>
          <SavedOutfitsGrid />
        </View>

        {/* ── 설정 섹션 ──────────────────────────────── */}
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
    paddingHorizontal: spacing.outerMargin, // 24 — 전역 토큰 사용
    paddingTop:        24,
  },
  section: {
    marginTop: 36,
    gap:       16,
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