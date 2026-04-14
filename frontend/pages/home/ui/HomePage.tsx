// pages/home/ui/HomePage.tsx
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { ClothingCard, getCardBgColor } from '@/shared/ui/Clothingcard';
import { colors, fonts, spacing, radius } from '@/shared/lib/tokens';

// ── 임시 더미 데이터 (나중에 API 연결) ──────────────────────
const DUMMY_ITEMS = [
  { id: 1, category: 'Outerwear',   brand: 'Totême',   isFavorite: true,  imageUrl: undefined },
  { id: 2, category: 'Tops',        brand: 'Everlane', isFavorite: false, imageUrl: undefined },
  { id: 3, category: 'Bottoms',     brand: 'Uniqlo',   isFavorite: false, imageUrl: undefined },
  { id: 4, category: 'Accessories', brand: 'Linjer',   isFavorite: true,  imageUrl: undefined },
  { id: 5, category: 'Shoes',       brand: 'Common Projects', isFavorite: false, imageUrl: undefined },
  { id: 6, category: 'Knitwear',    brand: 'Cuyana',   isFavorite: false, imageUrl: undefined },
];

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

  // 왼쪽/오른쪽 컬럼으로 분리
  const leftItems  = DUMMY_ITEMS.filter((_, i) => i % 2 === 0);
  const rightItems = DUMMY_ITEMS.filter((_, i) => i % 2 === 1);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>GOOD MORNING</Text>
            <Text style={styles.title}>My{'\n'}Wardrobe</Text>
            <Text style={styles.count}>{DUMMY_ITEMS.length} items curated</Text>
          </View>
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

        {/* ── 지그재그 그리드 ── */}
        {/* 왼쪽이 위, 오른쪽이 spacing.cardOffset 만큼 아래 */}
        <View style={styles.grid}>

          {/* 왼쪽 컬럼 */}
          <View style={styles.column}>
            {leftItems.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.cardWrapper,
                  // 첫 번째 카드 이후 간격
                  idx > 0 && { marginTop: spacing.sectionGap },
                  // 배경색 적용
                  { backgroundColor: getCardBgColor(idx * 2) },
                ]}
              >
                <ClothingCard
                  imageUrl={item.imageUrl}
                  category={item.category}
                  brand={item.brand}
                  isFavorite={item.isFavorite}
                  onPress={() => router.push(`/(tabs)/closet/${item.id}`)}
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
                  imageUrl={item.imageUrl}
                  category={item.category}
                  brand={item.brand}
                  isFavorite={item.isFavorite}
                  onPress={() => router.push(`/(tabs)/closet/${item.id}`)}
                />
              </View>
            ))}
          </View>

        </View>

        {/* 스크롤 하단 여백 (FAB가 가리지 않도록) */}
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
    paddingTop: 14, // status bar 여백
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
    gap: 0,
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
    bottom: 100,   // 탭바 위
    right: spacing.outerMargin,
    width: 52,
    height: 52,
    backgroundColor: colors.fab,
    borderRadius: radius.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
