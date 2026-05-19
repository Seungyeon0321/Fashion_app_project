// features/get-recommendation/model/useOutfitComment.ts
//
// 역할:
//   AI 코멘트 텍스트 정제 + 접기/펼치기 애니메이션 상태 관리.
//
// 왜 분리했나?
//   RecommendationModal이 Animated.Value를 직접 들고 있으면
//   코멘트 관련 리렌더가 모달 전체에 영향을 줌.
//   훅으로 분리하면 OutfitComment 컴포넌트 스코프로 격리됨.

import { useRef, useState, useCallback } from 'react';
import { Animated } from 'react-native';

const COLLAPSED_HEIGHT = 44;
const EXPANDED_HEIGHT  = 200;

export function useOutfitComment(rawText: string) {
  const [expanded, setExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(animValue, {
      toValue,
      duration: 300,
      useNativeDriver: false, // height 애니메이션은 nativeDriver 불가
    }).start();
    setExpanded((prev) => !prev);
  }, [expanded, animValue]);

  const animatedHeight = animValue.interpolate({
    inputRange:  [0, 1],
    outputRange: [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
  });

  // 백엔드 응답의 마크다운 문법 제거
  const cleanText = rawText
    .replace(/^#+\s/gm, '')
    .replace(/\*\*/g, '');

  return {
    expanded,
    toggle,
    animatedHeight,
    cleanText,
  };
}
