// app/index.tsx
import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/shared/store/authStore';
import { AuthModal } from '@/features/auth/ui/AuthModal';
import { Button } from '@/shared/ui/Button';
import { Text } from 'react-native';

const APP_NAME = 'CURATE';
type Tab = 'signup' | 'signin';

export default function Index() {
  const [modalVisible, setModalVisible] = useState(false);
  const [initialTab, setInitialTab] = useState<Tab>('signup');

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  // 초기화 완료 + 로그인 됐으면 홈으로
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/(tabs)/home');
    }
  }, [isInitialized, isAuthenticated]);

  // 초기화 전엔 아무것도 안 보여줌
  if (!isInitialized) return null;

  const openModal = (tab: Tab) => {
    setInitialTab(tab);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* 영상 배경 자리 */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#080808' }]} />
      <View style={styles.overlay} />

      {/* 워드마크 */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>{APP_NAME}</Text>
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.content}>
        <Text style={styles.headline}>Wear your{'\n'}intent.</Text>
        <Button
          label="BEGIN"
          onPress={() => openModal('signup')}
          variant="ghost"
          style={styles.btnBegin}
        />
        <Button
          label="SIGN IN"
          onPress={() => openModal('signin')}
          variant="text"
        />
      </View>

      {/* 푸터 */}
      <Text style={styles.footer}>DIGITAL EDITORIAL EXPERIENCE</Text>

      {/* 모달 */}
      <AuthModal
        visible={modalVisible}
        initialTab={initialTab}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  header: {
    paddingTop: 56,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 11,
    letterSpacing: 6,
    color: 'rgba(255,255,255,0.88)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  headline: {
    fontFamily: 'Manrope_200ExtraLight',
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: -0.5,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 48,
  },
  btnBegin: { marginBottom: 24 },
  footer: {
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
    fontSize: 8,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.15)',
    marginBottom: 24,
  },
});