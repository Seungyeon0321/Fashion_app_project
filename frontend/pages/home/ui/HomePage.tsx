// pages/home/ui/HomePage.tsx
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useClosetItems, closetKeys, useUpdateClosetItem } from '@/features/closet/api/useCloset';
import { ClothingCard, getCardBgColor } from '@/shared/ui/Clothingcard';
import { colors, fonts, spacing, radius } from '@/shared/lib/tokens';
import { useQueryClient } from '@tanstack/react-query';

const CATEGORIES = ['ALL', 'TOPS', 'BOTTOMS', 'OUTER', 'SHOES'];

interface HomePageProps {
  selectedCategory?: string;
  onCategoryChange?: (cat: string) => void;
}

export function HomePage({
  selectedCategory = 'ALL',
  onCategoryChange,
}: HomePageProps) {
  const router = useRouter();

  // ── 서버 데이터 ──────────────────────────────────────────
  const { data: allItems = [], isLoading, isError } = useClosetItems();

  // 카테고리 필터링
  const filtered = selectedCategory === 'ALL'
    ? allItems
    : allItems.filter(item =>
        item.category.toUpperCase() === selectedCategory
      );

  // 왼쪽/오른쪽 컬럼으로 분리
  const leftItems  = filtered.filter((_, i) => i % 2 === 0);
  const rightItems = filtered.filter((_, i) => i % 2 === 1);

  // ── 로딩 상태 ────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── 에러 상태 ────────────────────────────────────────────
  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error occurred while fetching closet items</Text>
        <Text style={styles.errorSub}>Please try again later</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>GOOD MORNING</Text>
          <Text style={styles.title}>My{'\n'}Wardrobe</Text>
          <Text style={styles.count}>{allItems.length} items curated</Text>
        </View>

        {/* ── 카테고리 탭 ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContent}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === selectedCategory;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => onCategoryChange?.(cat)}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {cat}
                </Text>
                {active && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── 빈 상태 ── */}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 등록된 옷이 없어요</Text>
            <Text style={styles.emptySub}>+ 버튼으로 첫 번째 옷을 추가해보세요</Text>
          </View>
        )}

        {/* ── 지그재그 그리드 ── */}
        {filtered.length > 0 && (
          <View style={styles.grid}>

            {/* 왼쪽 컬럼 */}
            <View style={styles.column}>
              {leftItems.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.cardWrapper,
                    idx > 0 && { marginTop: spacing.sectionGap },
                    { backgroundColor: getCardBgColor(idx * 2) },
                  ]}
                >
                  <ClothingCard
                    imageUrl={item.imageUrl ?? undefined}
                    category={item.category}
                    brand={item.brand ?? ''}
                    isFavorite={item.isFavorite}
                    onPress={() => router.push(`/closet/${item.id}`)}
/>
                </View>
              ))}
            </View>

            {/* 오른쪽 컬럼 — cardOffset만큼 아래로 */}
            <View style={[styles.column, { marginTop: spacing.cardOffset }]}>
              {rightItems.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.cardWrapper,
                    idx > 0 && { marginTop: spacing.sectionGap },
                    { backgroundColor: getCardBgColor(idx * 2 + 1) },
                  ]}
                >
                 <ClothingCard
                  imageUrl={item.imageUrl ?? undefined}
                  category={item.category}
                  brand={item.brand ?? ''}
                  isFavorite={item.isFavorite}
                  onPress={() => router.push(`/closet/${item.id}`)}
                  />
                </View>
              ))}
            </View>

          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB 버튼 ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/camera')}
        activeOpacity={0.85}
      >
        <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
          <Line x1={10} y1={3} x2={10} y2={17} stroke="white" strokeWidth={2} strokeLinecap="round" />
          <Line x1={3}  y1={10} x2={17} y2={10} stroke="white" strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>
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
    paddingTop: 14,
  },

  // ── 로딩 / 에러 ──
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
  errorSub: {
    ...fonts.bodyMd,
    color: colors.hint,
    marginTop: 8,
  },

  // ── Header ──
  header: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 20,
  },
  greeting: {
    ...fonts.label,
    color: colors.hint,
    letterSpacing: 1,
  },
  title: {
    ...fonts.display,
    color: colors.primary,
    marginTop: 4,
  },
  count: {
    ...fonts.bodyMd,
    color: colors.hint,
    marginTop: 10,
  },

  // ── Category tabs ──
  tabsScroll: {
    marginTop: 20,
  },
  tabsContent: {
    paddingHorizontal: spacing.outerMargin,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    ...fonts.label,
    color: colors.tabInactive,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    height: 1.5,
    backgroundColor: colors.primary,
  },

  // ── 빈 상태 ──
  empty: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    ...fonts.title,
    color: colors.primary,
  },
  emptySub: {
    ...fonts.bodyMd,
    color: colors.hint,
    marginTop: 8,
  },

  // ── Grid ──
  grid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.outerMargin,
    gap: spacing.cardGap,
    marginTop: 24,
  },
  column: {
    flex: 1,
  },
  cardWrapper: {
    borderRadius: radius.none,
    overflow: 'hidden',
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.outerMargin,
    width: 52,
    height: 52,
    backgroundColor: colors.fab,
    borderRadius: radius.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
