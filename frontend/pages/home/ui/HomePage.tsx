// pages/home/ui/HomePage.tsx
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useClosetItems, closetKeys, useUpdateClosetItem } from '@/features/closet/api/useCloset';
import { ClothingCard, getCardBgColor } from '@/shared/ui/Clothingcard';
import { colors, fonts, spacing, radius } from '@/shared/lib/tokens';
import { useQueryClient } from '@tanstack/react-query';
import { RegistrationMethodModal } from '@/features/select-registration-method/ui/RegistrationMethodModal';
import type { RegistrationMethodId } from '@/features/select-registration-method/model/registrationMethods';

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
  const [isMethodModalVisible, setIsMethodModalVisible] = useState(false);

  // ── 서버 데이터 ──────────────────────────────────────────
  const { data: allItems = [], isLoading, isError, error } = useClosetItems();

  // 카테고리 필터링
  const filtered = selectedCategory === 'ALL'
    ? allItems
    : allItems.filter(item =>
        item.category.toUpperCase() === selectedCategory
      );

  // 왼쪽/오른쪽 컬럼으로 분리
  const leftItems  = filtered.filter((_, i) => i % 2 === 0);
  const rightItems = filtered.filter((_, i) => i % 2 === 1);

  // ── 등록 방법 선택 핸들러 ────────────────────────────────
  const handleSelectMethod = async (methodId: RegistrationMethodId) => {
    switch (methodId) {
      case 'camera':
        // 기존 카메라 플로우
        router.push('/camera');
        break;

      case 'library':
        // 앨범에서 선택
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        });

        if (!result.canceled) {
          // TODO: 등록 플로우로 이동 (이미지와 함께)
          // router.push({ pathname: '/register', params: { imageUri: result.assets[0].uri } });
          console.log('Library image selected:', result.assets[0].uri);
        }
        break;

      case 'purchase':
        // Coming Soon
        console.log('Import from purchase - coming soon');
        break;
    }
  };

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
          <Text style={styles.title}>My Wardrobe</Text>
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
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            {/* 걸이 고리 */}
            <Path
              d="M12 3 C12 3 10 3 10 5 C10 7 12 7 12 7"
              stroke="#e24b4a"
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"

            />
            {/* 어깨 라인 */}
            <Path
              d="M12 7 L3 17 H21 L12 7"
              stroke="#e24b4a"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>

            <Text style={styles.emptyTitle}>Your closet{'\n'}is empty.</Text>
            <Text style={styles.emptySub}>— add your first piece —</Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setIsMethodModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>+ ADD ITEM</Text>
            </TouchableOpacity>
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
      {allItems.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsMethodModalVisible(true)}
          activeOpacity={0.85}
        >
          <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <Line x1={10} y1={3} x2={10} y2={17} stroke="white" strokeWidth={2} strokeLinecap="round" />
            <Line x1={3}  y1={10} x2={17} y2={10} stroke="white" strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
)}

      {/* ── Registration Method Modal ── */}
      <RegistrationMethodModal
        visible={isMethodModalVisible}
        onClose={() => setIsMethodModalVisible(false)}
        onSelectMethod={handleSelectMethod}
      />
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
    paddingTop: 10,
  },
  greeting: {
    ...fonts.label,
    color: colors.hint,
    letterSpacing: 1,
  },
  title: {
    ...fonts.display,
    color: colors.primary,
    marginTop: 8,
  },
  count: {
    ...fonts.bodyMd,
    color: colors.hint,
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
    marginTop: 100,
    paddingHorizontal: spacing.outerMargin,
    paddingBottom: 120, // ← 추가
  },
  emptyTitle: {
    ...fonts.headline,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 34,
  },
  emptySub: {
    ...fonts.caption,
    color: colors.hint,
    marginTop: 12,
    letterSpacing: 1.5,
  },
  emptyButton: {
    marginTop: 36,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  emptyButtonText: {
    ...fonts.label,
    color: colors.primary,
    letterSpacing: 2,
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
