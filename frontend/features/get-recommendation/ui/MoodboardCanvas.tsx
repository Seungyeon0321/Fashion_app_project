// features/get-recommendation/ui/MoodboardCanvas.tsx

import React from 'react';
import { StyleSheet, View, Image, Text } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { useCanvasStore, CanvasItem } from '../model/canvasStore';
import { colors, fonts } from '@/shared/lib/tokens';

function DraggableItem({
  item,
  onPositionChange,
  onLongPress,
}: {
  item: CanvasItem;
  onPositionChange: (id: number | string, x: number, y: number) => void;
  onLongPress: (id: number | string) => void;
}) {
  const translateX = useSharedValue(item.x);
  const translateY = useSharedValue(item.y);
  const scale      = useSharedValue(1);

  const startX = useSharedValue(item.x);
  const startY = useSharedValue(item.y);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(onPositionChange)(item.id, translateX.value, translateY.value);
    });

  const pinchGesture = Gesture.Pinch().onUpdate((e) => {
    scale.value = Math.max(0.5, Math.min(e.scale, 2.5));
  });

  const longPressGesture = Gesture.LongPress()
    .minDuration(600)
    .onStart(() => {
      runOnJS(onLongPress)(item.id);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.draggableItem, animatedStyle]}>
        <Image
          source={{ uri: item.imageUrl }}
          style={[
            styles.itemImage,
            // external 아이템은 테두리로 구분
            // 이유: 유저 옷장 아이템과 쇼핑 아이템이 섞여있을 때
            //      "이건 구매해야 하는 아이템"이라는 시각적 단서 제공
            item.is_external && styles.itemImageExternal,
          ]}
          resizeMode="contain"
        />

        {/* ANCHOR 배지 — AI가 코디 기준으로 삼은 아이템 */}
        {item.is_anchor && (
          <View style={styles.anchorBadge}>
            <Text style={styles.anchorBadgeText}>ANCHOR</Text>
          </View>
        )}

        {/* SHOP 배지 — 네이버 쇼핑 external 아이템 */}
        {item.is_external && (
          <View style={styles.shopBadge}>
            <Text style={styles.shopBadgeText}>SHOP</Text>
          </View>
        )}

        <Text style={styles.itemCategory}>{item.category.toUpperCase()}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

export function MoodboardCanvas() {
  const { canvasItems, updatePosition, removeFromCanvas } = useCanvasStore();

  const handleLongPress = (id: number | string) => {
    removeFromCanvas(id);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.canvas}>
        {canvasItems.map((item) => (
          <DraggableItem
            key={String(item.id)}   // 변경: id가 string일 수 있으므로 String() 변환
            item={item}
            onPositionChange={updatePosition}
            onLongPress={handleLongPress}
          />
        ))}

        {canvasItems.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>add items to your moodboard</Text>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex:            1,
    backgroundColor: '#f0ede8',
    position:        'relative',
    overflow:        'hidden',
    marginHorizontal: 24,
    borderRadius:    4,
  },
  draggableItem: {
    position:   'absolute',
    alignItems: 'center',
  },
  itemImage: {
    width:  140,
    height: 175,
  },
  // external 아이템 — 점선 테두리로 구분
  // "내 옷장에 없는 아이템"이라는 시각적 단서
  itemImageExternal: {
    borderWidth: 1.5,
    borderColor: colors.accentRed,
    borderStyle: 'dashed',
  },

  // ANCHOR 배지
  anchorBadge: {
    position:        'absolute',
    top:             6,
    left:            6,
    backgroundColor: colors.accentRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  anchorBadgeText: {
    ...fonts.caption,
    color:       colors.primary,
    fontSize:    9,
    letterSpacing: 1.2,
  },

  // SHOP 배지 — ANCHOR와 겹치지 않게 우상단 배치
  shopBadge: {
    position:        'absolute',
    top:             6,
    right:           6,
    backgroundColor: '#1a1a18cc',   // 반투명 다크 — 배경이 어떻든 읽히도록
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  shopBadgeText: {
    ...fonts.caption,
    color:       '#faf9f6',
    fontSize:    8,
    letterSpacing: 1,
  },

  itemCategory: {
    ...fonts.caption,
    color:       colors.hint,
    letterSpacing: 1,
    marginTop:   4,
  },
  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...fonts.caption,
    color: colors.hint,
  },
});