import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { ProfileHeader } from '@/features/profile/ui/ProfileHeader';
import { SettingsSection } from '@/features/profile/ui/SettingsSection';
import { LogoutButton } from '@/features/profile/ui/LogoutButton';
import { useProfile } from '@/features/profile/api/useProfile';
import { useLogout } from '@/features/profile/api/useLogout';

export function ProfilePage() {
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
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#5f5e5e" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={profile?.name ?? ''}
          email={profile?.email ?? ''}
          avatarUrl={profile?.avatarUrl}
          onEditPress={() => {}}
        />

        <View style={styles.sections}>
          <SettingsSection items={generalSettings} />
          <View style={styles.sectionGap} />
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
    flex: 1,
    backgroundColor: '#faf9f6',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#faf9f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  sections: {
    gap: 0,
  },
  sectionGap: {
    height: 32,
  },
  version: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: '#afb3ae',
    textAlign: 'center',
    marginTop: 56,
  },
});
