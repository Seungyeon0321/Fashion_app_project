// features/auth/components/AuthModal.tsx
import { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { TabSwitcher } from './TabSwitcher';
import { AuthForm } from './AuthForm';

type Tab = 'signup' | 'signin';

type Props = {
  visible: boolean;
  initialTab: Tab;
  onClose: () => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AuthModal({ visible, initialTab, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const slideAnim = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;

  // visible 바뀔 때마다 열기/닫기 애니메이션
  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SCREEN_HEIGHT,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, initialTab]);

  if (!visible) return null;

  return (
    <>
      {/* 반투명 배경 */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* 슬라이드 시트 */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {activeTab === 'signup' ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 탭 */}
          <TabSwitcher active={activeTab} onChange={setActiveTab} />

          {/* 폼 */}
          <AuthForm activeTab={activeTab} />
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  sheet: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: '#0d0d0b',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 28,
    paddingBottom: 36,
    zIndex: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 28,
  },
  title: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.5)',
  },
  closeBtn: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '300',
  },
});