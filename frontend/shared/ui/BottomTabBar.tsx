// shared/ui/BottomTabBar.tsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/shared/lib/tokens';
import { HomeIcon, StylistIcon, StyleIcon, ProfileIcon } from './icons/BottomTabIcons';

type TabName = 'home' | 'stylist' | 'style' | 'profile';

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
const TABS: { name: TabName; label: string }[] = [
  { name: 'home',    label: 'HOME'    },
  { name: 'stylist',  label: 'STYLIST'  },
  { name: 'style',  label: 'STYLE'  },
  { name: 'profile', label: 'PROFILE' },
];

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 12 }]}>
      <View style={styles.divider} />
      <View style={styles.row}>
        {TABS.map((tab) => {
          const active = tab.name === activeTab;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => onTabPress(tab.name)}
              activeOpacity={0.7}
            >
              {/* 아이콘 */}
              {tab.name === 'home'    && <HomeIcon    active={active} />}
              {tab.name === 'stylist'  && <StylistIcon  active={active} />}
              {tab.name === 'style'  && <StyleIcon  active={active} />}
              {tab.name === 'profile' && <ProfileIcon active={active} />}

              {/* 라벨 */}
              <Text style={[styles.label, active && styles.labelActive]}>
                {tab.label}
              </Text>

              {/* 활성 인디케이터 dot */}
              {active && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.divider,
  },
  row: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    ...fonts.tab,
    color: colors.tabInactive,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.primary,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});
