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
              key={item.id}
              style={[styles.card, isOnCanvas && styles.cardActive]}
              onPress={() => addToCanvas(item)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={[
                  styles.cardImage,
                  // 캔버스에 있으면 선명, 없으면 흐리게
                  !isOnCanvas && styles.cardImageDim,
                ]}
                resizeMode="cover"
              />
              {/* 캔버스에 추가된 아이템엔 체크 표시 */}
              {isOnCanvas && (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkText}>✓</Text>
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
    width: CARD_SIZE.width,
    height: CARD_SIZE.height,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: colors.primary,  // 캔버스에 있으면 테두리
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageDim: {
    opacity: 0.35,   // 캔버스에 없으면 흐리게 — 탭해서 추가 유도
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 10,
    color: colors.background,
    fontWeight: 'bold',
  },
  addButton: {
    width: CARD_SIZE.width,
    height: CARD_SIZE.height,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: colors.hint,
  },
});
