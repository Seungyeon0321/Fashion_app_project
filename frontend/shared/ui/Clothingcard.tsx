// shared/ui/ClothingCard.tsx
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, radius } from '@/shared/lib/tokens';

interface ClothingCardProps {
  imageUrl?: string;
  category: string;
  brand: string;
  isFavorite?: boolean;
  onPress?: () => void;
  onFavoritePress?: () => void;
}

export function ClothingCard({
  imageUrl,
  category,
  brand,
  isFavorite = false,
  onPress,
}: ClothingCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.container}>
      {/* 이미지 영역 — 4:5 비율 */}
      <View style={styles.imageWrapper}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          // 이미지 없을 때 placeholder
          <View style={styles.placeholder}>
            <View style={styles.placeholderLine} />
            <View style={[styles.placeholderLine, styles.placeholderLineV]} />
          </View>
        )}
      </View>

      {/* 텍스트 영역 */}
      <View style={styles.textArea}>
        <Text style={styles.category}>{category.toUpperCase()}</Text>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>{brand}</Text>
          {/* 즐겨찾기 → 브랜드명 아래 빨간 밑줄 */}
          {isFavorite && <View style={styles.favoriteUnderline} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const CARD_BG_COLORS = [
  colors.card1,
  colors.card2,
  colors.card3,
  colors.card4,
];

// 카테고리별 배경색 매핑
export function getCardBgColor(index: number): string {
  return CARD_BG_COLORS[index % CARD_BG_COLORS.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 4 / 5,  // 4:5 비율 (editorial)
    backgroundColor: colors.card1,
    borderRadius: radius.none,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLine: {
    position: 'absolute',
    width: 24,
    height: 1.5,
    backgroundColor: '#c5bfb6',
  },
  placeholderLineV: {
    transform: [{ rotate: '90deg' }],
  },
  textArea: {
    paddingTop: 10,
    backgroundColor: colors.background,
  },
  category: {
    ...fonts.caption,
    color: colors.hint,
    letterSpacing: 0.8,
  },
  brandRow: {
    marginTop: 3,
  },
  brand: {
    ...fonts.brand,
    color: colors.primary,
  },
  favoriteUnderline: {
    marginTop: 2,
    height: 1.5,
    width: '60%',         // 브랜드명 길이에 맞게 — 실제로는 텍스트 너비 측정 필요
    backgroundColor: colors.accentRed,
    alignSelf: 'flex-start',
  },
});
