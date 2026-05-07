// shared/ui/ScreenLayout.tsx

import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/shared/lib/tokens';

type Props = {
  children: React.ReactNode;
  // 하단 고정 버튼 있는 페이지 (StylePage)는 footer가 SafeArea 밖에 있어야 함
  // 그래서 스크롤 영역만 SafeArea 적용하는 옵션 필요
  hasFooter?: boolean;
};

export function ScreenLayout({ children, hasFooter = false }: Props) {
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={hasFooter ? ['top', 'left', 'right'] : ['top', 'left', 'right', 'bottom']}
    >
      <View style={styles.container}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
});