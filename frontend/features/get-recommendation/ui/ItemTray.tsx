// features/get-recommendation/ui/ItemTray.tsx

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,                         // ← 추가
} from 'react-native';
import { useCanvasStore } from '../model/canvasStore';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

const CARD_SIZE = { width: 100, height: 125 };

type Props = {
  onAddPress: () => void;
};

// ── purchaseUrl 외부 브라우저 열기 ──────────────────────────────────────────
// http:// → https:// 강제 변환: Android는 http URL을 기본 차단
// purchaseUrl이 null/undefined이면 조용히 무시
const handleShopPress = async (url: string | null | undefined) => {
  if (!url) return;
  const safeUrl = url.replace(/^http:\/\//, 'https://');
  try {
    await Linking.openURL(safeUrl);
  } catch (error) {
    console.error('[ItemTray] 구매 링크 열기 실패:', error);
  }
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

              {isOnCanvas && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
              )}

              {/* SHOP 배지 — TouchableOpacity로 교체, purchaseUrl이 있을 때만 탭 가능 */}
              {item.is_external && (
                <TouchableOpacity
                  style={styles.shopBadge}
                  onPress={() => handleShopPress(item.purchaseUrl)}
                  activeOpacity={item.purchaseUrl ? 0.6 : 1}   // URL 없으면 피드백 없음
                  disabled={!item.purchaseUrl}
                >
                  <Text style={styles.shopBadgeText}>SHOP</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

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
  container:    { gap: 10 },
  label:        { ...fonts.tab, color: colors.hint, letterSpacing: 2 },
  scrollContent: {
    gap:          spacing.cardGap,
    paddingRight: spacing.outerMargin,
    alignItems:   'center',
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
  cardActive:    { borderColor: colors.primary },
  cardImage:     { width: '100%', height: '100%' },
  cardImageDim:  { opacity: 0.35 },
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
  checkText:  { fontSize: 10, color: colors.background, fontWeight: 'bold' },
  shopBadge: {
    position:          'absolute',
    bottom:            4,
    left:              4,
    backgroundColor:   colors.accentRed,
    paddingHorizontal: 5,
    paddingVertical:   2,
  },
  shopBadgeText: { ...fonts.caption, color: colors.primary, fontSize: 8, letterSpacing: 1 },
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