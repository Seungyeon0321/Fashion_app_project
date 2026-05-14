// shared/lib/useBottomInset.ts
//
// 안드로이드 네비게이션 바 높이를 동적으로 반환하는 커스텀 훅
//
// 왜 필요한가?
//   - 안드로이드는 하단 네비게이션 바(뒤로가기/홈/앱전환 버튼)가
//     화면 콘텐츠를 가릴 수 있음
//   - useSafeAreaInsets().bottom이 그 높이를 동적으로 줌
//   - 제스처 네비게이션 모드면 0이 나오므로 minPadding으로 최소값 보장
//
// 사용 예시:
//   const bottomPadding = useBottomInset();
//   <View style={{ paddingBottom: bottomPadding }} />
//
//   // 최소값 커스텀 (기본 16)
//   const bottomPadding = useBottomInset(24);

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useBottomInset(minPadding = 16): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, minPadding);
}