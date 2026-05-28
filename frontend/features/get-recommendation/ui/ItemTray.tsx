// features/get-recommendation/ui/ItemTray.tsx

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useCanvasStore } from '../model/canvasStore';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

const CARD_SIZE = { width: 100, height: 125 };

type Props = {
  onAddPress: () => void;
};

export function ItemTray({ onAddPress }: Props) {
  const { trayItems, canvasItems, addToCanvas } = useCanvasStore();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>QUICK ADD TO STUDIO</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {trayItems.map((item) => {
          const isOnCanvas = canvasItems.some((c) => c.id === item.id);

          return (
            <TouchableOpacity
              key={String(item.id)}   // 변경: id가 string일 수 있으므로 String() 변환
              style={[styles.card, isOnCanvas && styles.cardActive]}
              onPress={() => addToCanvas(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={[
                  styles.cardImage,
                  !isOnCanvas && styles.cardImageDim,
                ]}
                resizeMode="cover"
              />

              {/* 캔버스 추가 체크 배지 */}
              {isOnCanvas && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}

              {/* SHOP 배지 — external 아이템(네이버 쇼핑)에만 표시 */}
              {item.is_external && (
                <View style={styles.shopBadge}>
                  <Text style={styles.shopBadgeText}>SHOP</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* + 버튼 — 항상 마지막 */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    ...fonts.tab,
    color: colors.hint,
    letterSpacing: 2,
  },
  scrollContent: {
    gap: spacing.cardGap,
    paddingRight: spacing.outerMargin,
    alignItems: 'center',
  },
  card: {
    width:           CARD_SIZE.width,
    height:          CARD_SIZE.height,
    backgroundColor: colors.surface,
    borderRadius:    4,
    overflow:        'hidden',
    borderWidth:     2,
    borderColor:     'transparent',
  },
  cardActive: {
    borderColor: colors.primary,
  },
  cardImage: {
    width:  '100%',
    height: '100%',
  },
  cardImageDim: {
    opacity: 0.35,
  },
  checkBadge: {
    position:        'absolute',
    top:             4,
    right:           4,
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  checkText: {
    fontSize:   10,
    color:      colors.background,
    fontWeight: 'bold',
  },

  // external 아이템 SHOP 배지
  // 좌하단 배치 — checkBadge(우상단)와 겹치지 않도록
  shopBadge: {
    position:        'absolute',
    bottom:          4,
    left:            4,
    backgroundColor: colors.accentRed,  // 디자인 시스템 강조 컬러 사용
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  shopBadgeText: {
    ...fonts.caption,
    color:       colors.primary,
    fontSize:    8,
    letterSpacing: 1,
  },

  addButton: {
    width:       CARD_SIZE.width,
    height:      CARD_SIZE.height,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    borderRadius: 4,
    alignItems:  'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    color:    colors.hint,
  },
});