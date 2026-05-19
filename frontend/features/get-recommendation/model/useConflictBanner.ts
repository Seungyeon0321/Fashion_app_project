// features/get-recommendation/model/useConflictBanner.ts
//
// 역할:
//   conflict_warning 배너의 표시 상태와 슬라이드 애니메이션을 관리.
//   ConflictBanner.tsx가 UI만 담당할 수 있도록 로직을 여기서 처리.
//
// 왜 커스텀 훅으로 분리했나?
//   Animated.Value는 컴포넌트 리렌더링과 무관하게 살아있어야 함.
//   상태 + 애니메이션을 훅으로 빼면 ConflictBanner는 순수 UI가 됨.
//   나중에 배너 동작 바꿀 때 훅만 수정하면 됨.

import { useRef, useState, useCallback } from 'react';
import { Animated } from 'react-native';

export type ConflictWarning = 'sporty_rain' | 'casual_meeting' | null;

// conflict 종류별 문구 설정
// 케이스 추가 시 여기만 수정
export const CONFLICT_CONFIG: Record<
  NonNullable<ConflictWarning>,
  { message: string; noLabel: string }
> = {
  sporty_rain: {
    message: "Rain expected today. You're going sporty — does this outfit still work?",
    noLabel: 'No, change it',
  },
  casual_meeting: {
    message: "You have a meeting on your calendar. Going casual — is this outfit okay?",
    noLabel: 'No, go formal',
  },
};

// conflict 없을 때 기본 문구
export const DEFAULT_BANNER_CONFIG = {
  message: "Here's your outfit for today. Do you like it?",
  noLabel: 'No, try again',
};

export function useConflictBanner() {
  const [visible, setVisible] = useState(true);
  const animValue = useRef(new Animated.Value(0)).current;

  // 모달이 열릴 때 호출 — 배너 리셋 후 슬라이드 인
  const show = useCallback(() => {
    setVisible(true);
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [animValue]);

  // 슬라이드 아웃 후 완전히 숨김. callback은 애니메이션 완료 후 실행
  const hide = useCallback(
    (callback?: () => void) => {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        callback?.();
      });
    },
    [animValue]
  );

  // translateY: 위에서 슬라이드 인
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 0],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return {
    visible,
    show,
    hide,
    animatedStyle: { transform: [{ translateY }], opacity },
  };
}