// pages/closet-detail/ui/ClothingDetailPage.tsx
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useClosetItems, useToggleFavorite } from '@/features/closet/api/useCloset';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

interface ClothingDetailPageProps {
  id: number;
}

export function ClothingDetailPage({ id }: ClothingDetailPageProps) {
  const router = useRouter();

  // 기존 목록 캐시에서 해당 아이템 찾기
  const { data: items = [], isLoading } = useClosetItems();
  const item = items.find((i) => i.id === id);

  // 즐겨찾기 토글
  const toggleFavorite = useToggleFavorite(id);

  // ── 로딩 ──
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── 아이템 없음 ──
  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 이미지 ── */}
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </View>

        {/* ── 정보 섹션 ── */}
        <View style={styles.infoSection}>
          {/* 카테고리 */}
          <Text style={styles.categoryLabel}>
            {item.category.toUpperCase()}
          </Text>

          {/* 서브카테고리 (메인 헤딩) */}
          <Text style={styles.subCategoryTitle}>{item.subCategory}</Text>

          {/* 컬러 */}
          {item.colors.length > 0 && (
            <View style={styles.colorRow}>
              {item.colors.map((color, idx) => (
                <View key={idx} style={styles.colorItem}>
                  <View
                    style={[styles.colorDot, { backgroundColor: color.toLowerCase() }]}
                  />
                  <Text style={styles.colorName}>{color}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 브랜드 */}
          {item.brand && (
            <Text style={styles.brandName}>{item.brand}</Text>
          )}

          {/* 착용 횟수 + 세탁 여부 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>WORN</Text>
              <Text style={styles.statValue}>
                {item.wearCount} {item.wearCount === 1 ? 'time' : 'times'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>WASHING</Text>
              <Text style={styles.statValue}>
                {item.isWashing ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 등록일 */}
          <Text style={styles.dateText}>Added on {formattedDate}</Text>

          {/* 메모 */}
          {item.memo && (
            <View style={styles.memoSection}>
              <Text style={styles.memoLabel}>MEMO</Text>
              <Text style={styles.memoText}>{item.memo}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...fonts.title,
    color: colors.primary,
  },
  backLink: {
    ...fonts.bodyMd,
    color: colors.accentRed,
    marginTop: 12,
  },

  // ── Nav ──
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 56,
    paddingBottom: 12,
  },
  navTitle: {
    ...fonts.title,
    color: colors.primary,
    fontSize: 17,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navIcon: {
    marginLeft: 16,
  },

  // ── Image ──
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card1,
  },
  placeholderText: {
    ...fonts.bodyMd,
    color: colors.hint,
  },

  // ── Info ──
  infoSection: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 24,
  },
  categoryLabel: {
    ...fonts.label,
    color: colors.hint,
    letterSpacing: 1.2,
  },
  subCategoryTitle: {
    ...fonts.display,
    color: colors.primary,
    marginTop: 6,
    fontSize: 28,
  },

  // ── Colors ──
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 12,
  },
  colorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorName: {
    ...fonts.bodyMd,
    color: colors.primary,
  },

  // ── Brand ──
  brandName: {
    ...fonts.title,
    color: colors.primary,
    marginTop: 20,
    fontSize: 20,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 40,
  },
  statItem: {},
  statLabel: {
    ...fonts.label,
    color: colors.hint,
    letterSpacing: 1,
  },
  statValue: {
    ...fonts.bodyMd,
    color: colors.primary,
    marginTop: 4,
    fontSize: 15,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginTop: 32,
  },

  // ── Date ──
  dateText: {
    ...fonts.bodyMd,
    color: colors.hint,
    marginTop: 20,
    fontSize: 13,
  },

  // ── Memo ──
  memoSection: {
    marginTop: 20,
  },
  memoLabel: {
    ...fonts.label,
    color: colors.hint,
    letterSpacing: 1,
  },
  memoText: {
    ...fonts.bodyMd,
    color: colors.primary,
    marginTop: 6,
    lineHeight: 22,
  },
});