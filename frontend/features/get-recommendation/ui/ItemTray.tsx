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
                    style={[styles.cardImage, !isOnCanvas && styles.cardImageDim]}
                    resizeMode="cover"
                />
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
  },
  cardImage: {
    width: '100%',
    height: '100%',
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
  cardActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  cardImageDim: {
    opacity: 0.4,  // 캔버스에 없으면 흐리게
  },
});