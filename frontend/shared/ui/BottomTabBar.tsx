// shared/ui/BottomTabBar.tsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import { colors, fonts } from '@/shared/lib/tokens';

type TabName = 'home' | 'camera' | 'closet' | 'profile';

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

// ── 아이콘 컴포넌트들 ─────────────────────────────────────────
function HomeIcon({ active }: { active: boolean }) {
  const c = active ? colors.primary : colors.tabInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      {/* 지붕 */}
      <Path d="M11 2L2 9v11h6v-6h6v6h6V9L11 2z"
        fill={active ? c : 'none'}
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CameraIcon({ active }: { active: boolean }) {
  const c = active ? colors.primary : colors.tabInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      {/* 범프 */}
      <Rect x={8} y={3} width={6} height={4} rx={2} stroke={c} strokeWidth={1.5} />
      {/* 바디 */}
      <Rect x={2} y={6} width={18} height={13} rx={3} stroke={c} strokeWidth={1.5} />
      {/* 렌즈 */}
      <Circle cx={11} cy={12} r={4} stroke={c} strokeWidth={1.5} />
    </Svg>
  );
}

function ClosetIcon({ active }: { active: boolean }) {
  const c = active ? colors.primary : colors.tabInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      {/* 옷걸이 줄기 */}
      <Line x1={11} y1={3} x2={11} y2={8} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      {/* 후크 */}
      <Path d="M11 3 Q14 3 14 6" stroke={c} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      {/* 왼쪽 팔 */}
      <Line x1={11} y1={8} x2={2} y2={15} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      {/* 오른쪽 팔 */}
      <Line x1={11} y1={8} x2={20} y2={15} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      {/* 하단 바 */}
      <Line x1={2} y1={15} x2={20} y2={15} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? colors.primary : colors.tabInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      {/* 머리 */}
      <Circle cx={11} cy={8} r={4}
        fill={active ? c : 'none'}
        stroke={c}
        strokeWidth={1.5}
      />
      {/* 어깨 */}
      <Path d="M2 20c0-4 4-7 9-7s9 3 9 7"
        stroke={c}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
const TABS: { name: TabName; label: string }[] = [
  { name: 'home',    label: 'HOME'    },
  { name: 'camera',  label: 'CAMERA'  },
  { name: 'closet',  label: 'CLOSET'  },
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
              {tab.name === 'camera'  && <CameraIcon  active={active} />}
              {tab.name === 'closet'  && <ClosetIcon  active={active} />}
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
