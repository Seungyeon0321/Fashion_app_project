import { colors } from '@/shared/lib/tokens';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';


// ── 아이콘 컴포넌트들 ─────────────────────────────────────────
function HomeIcon({ active }: { active: boolean }) {
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

function StylistIcon({ active }: { active: boolean }) {
  const c = active ? colors.primary : colors.tabInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      {/* 별 — AI/마법 느낌 */}
      <Path
        d="M11 2l2.5 6.5H20l-5.5 4 2 6.5L11 15l-5.5 4 2-6.5L2 8.5h6.5L11 2z"
        fill={active ? c : 'none'}
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StyleIcon({ active }: { active: boolean }) {
  const c = active ? colors.primary : colors.tabInactive;
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
    {/* 사진 프레임 — 무드보드 느낌 */}
    <Rect x={2} y={2} width={8} height={8} rx={1.5} stroke={c} strokeWidth={1.5} />
    <Rect x={12} y={2} width={8} height={8} rx={1.5} stroke={c} strokeWidth={1.5} />
    <Rect x={2} y={12} width={8} height={8} rx={1.5} stroke={c} strokeWidth={1.5} />
    <Rect x={12} y={12} width={8} height={8} rx={1.5} stroke={c} strokeWidth={1.5} />
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

export { HomeIcon, StylistIcon, StyleIcon, ProfileIcon };