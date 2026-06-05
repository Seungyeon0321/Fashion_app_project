// features/get-recommendation/ui/ItemTray.tsx

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { useCanvasStore } from '../model/canvasStore';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

const CARD_SIZE = { width: 100, height: 125 };

// ── TrayItem 타입 명시 ─────────────────────────────────────────────────────
// canvasStore에서 오는 아이템 — Try-On에 필요한 category 포함
type TrayItem = {
  id:          number | string;
  imageUrl:    string;
  category:    string;
  is_external: boolean;
  purchaseUrl: string | null | undefined;
};

type Props = {
  onAddPress:     () => void;
  onTryOnPress?:  (item: TrayItem) => void;  // ← 추가: 없으면 TRY 뱃지 숨김
};

// ── 외부 링크 열기 ─────────────────────────────────────────────────────────
const handleShopPress = async (url: string | null | undefined) => {
  if (!url) return;
  const safeUrl = url.replace(/^http:\/\//, 'https://');
  try {
    await Linking.openURL(safeUrl);
  } catch (error) {
    console.error('[ItemTray] 구매 링크 열기 실패:', error);
  }
};

export function ItemTray({ onAddPress, onTryOnPress }: Props) {
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
              key={String(item.id)}
              style={[styles.card, isOnCanvas && styles.cardActive]}
              onPress={() => addToCanvas(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={[styles.cardImage, !isOnCanvas && styles.cardImageDim]}
                resizeMode="cover"
              />

              {/* 캔버스 추가 표시 */}
              {isOnCanvas && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}

              {/* SHOP 뱃지 — 외부 아이템만 */}
              {item.is_external && (
                <TouchableOpacity
                  style={styles.shopBadge}
                  onPress={() => handleShopPress(item.purchaseUrl)}
                  activeOpacity={item.purchaseUrl ? 0.6 : 1}
                  disabled={!item.purchaseUrl}
                >
                  <Text style={styles.shopBadgeText}>SHOP</Text>
                </TouchableOpacity>
              )}

              {/* TRY 뱃지 — onTryOnPress가 주입된 경우만 노출 */}
              {/* 우하단 배치: SHOP(좌하단)과 대칭, checkBadge(우상단)와 비충돌 */}
              {onTryOnPress && (
                <TouchableOpacity
                  style={styles.tryBadge}
                  onPress={() => onTryOnPress(item as TrayItem)}
                  activeOpacity={0.7}
                  // RN 중첩 터치: 내부 TouchableOpacity가 이벤트 캡처 → addToCanvas 미호출
                >
                  <Text style={styles.tryBadgeText}>TRY</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        {/* 아이템 추가 버튼 */}
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
  container: { gap: 10 },
  label:     { ...fonts.tab, color: colors.hint, letterSpacing: 2 },
  scrollContent: {
    gap:          spacing.cardGap,
    paddingRight: spacing.outerMargin,
    alignItems:   'center',
  },

  // 카드
  card: {
    width:           CARD_SIZE.width,
    height:          CARD_SIZE.height,
    backgroundColor: colors.surface,
    borderRadius:    4,
    overflow:        'hidden',
    borderWidth:     2,
    borderColor:     'transparent',
  },
  cardActive:   { borderColor: colors.primary },
  cardImage:    { width: '100%', height: '100%' },
  cardImageDim: { opacity: 0.35 },

  // 캔버스 추가 체크
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
  checkText: { fontSize: 10, color: colors.background, fontWeight: 'bold' },

  // SHOP 뱃지 (좌하단)
  shopBadge: {
    position:          'absolute',
    bottom:            4,
    left:              4,
    backgroundColor:   colors.accentRed,
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  shopBadgeText: {
    ...fonts.caption,
    color:       colors.primary,
    fontSize:    8,
    letterSpacing: 1,
  },

  // TRY 뱃지 (우하단) ← 신규
  tryBadge: {
    position:          'absolute',
    bottom:            4,
    right:             4,
    backgroundColor:   colors.primary,
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  tryBadgeText: {
    ...fonts.caption,
    color:         colors.background,
    fontSize:      8,
    letterSpacing: 1,
  },

  // 추가 버튼
  addButton: {
    width:          CARD_SIZE.width,
    height:         CARD_SIZE.height,
    borderWidth:    1.5,
    borderColor:    colors.divider,
    borderStyle:    'dashed',
    borderRadius:   4,
    alignItems:     'center',
    justifyContent: 'center',
  },
  addIcon: { fontSize: 24, color: colors.hint },
});