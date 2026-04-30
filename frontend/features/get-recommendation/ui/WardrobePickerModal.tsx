import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useClosetItems } from '@/features/closet/api/useCloset';
import { useCanvasStore, CanvasItem } from '@/features/get-recommendation/model/canvasStore';
import { colors, fonts, spacing, radius } from '@/shared/lib/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - spacing.outerMargin * 2 - 16) / 3; // 3열

const CATEGORY_TABS = [
  { key: 'ALL',       label: 'ALL' },
  { key: 'TOP',       label: 'TOP' },
  { key: 'BOTTOMS',   label: 'BOTTOM' },
  { key: 'OUTER',     label: 'OUTER' },
  { key: 'SHOES',     label: 'SHOES' },
  { key: 'ACCESSORY', label: 'ACC' },
] as const;

type TabKey = typeof CATEGORY_TABS[number]['key'];

interface WardrobePickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WardrobePickerModal = ({ visible, onClose }: WardrobePickerModalProps) => {
  const [selectedTab, setSelectedTab] = useState<TabKey>('ALL');

  const { data: closetItems = [] } = useClosetItems();
  const { trayItems, addCustomItem } = useCanvasStore();

  const filteredItems = useMemo(() => {
    const validItems = closetItems.filter((item) => item.imageUrl);
    if (selectedTab === 'ALL') return validItems;
    return validItems.filter(
      (item) => item.category.toUpperCase() === selectedTab
    );
  }, [closetItems, selectedTab]);

  const trayItemIds = useMemo(
    () => new Set(trayItems.map((t) => t.id)),
    [trayItems]
  );

  const handleSelectItem = (closetItem: typeof closetItems[0]) => {
    const canvasItem: CanvasItem = {
      id: closetItem.id,
      imageUrl: closetItem.imageUrl!,
      category: closetItem.category,
      x: 0,
      y: 0,
    };
    addCustomItem(canvasItem);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>MY CLOSET</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 카테고리 탭 — 스크린샷처럼 얇은 테두리 박스 */}
        <View style={styles.tabContainer}>
          {CATEGORY_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 아이템 그리드 */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const isSelected = trayItemIds.has(item.id);
            return (
              <TouchableOpacity
                style={styles.itemBox}
                onPress={() => handleSelectItem(item)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: item.imageUrl! }}
                  style={[styles.itemImage, !isSelected && styles.itemDim]}
                  resizeMode="cover"
                />
                {/* 선택 시 — 얇은 테두리 오버레이 */}
                {isSelected && <View style={styles.selectedOverlay} />}
                {/* 체크 뱃지 */}
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,  // #faf9f6
  },

  // ── 헤더 ──────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: fonts.title.fontSize,
    color: colors.primary,
    letterSpacing: 3,
  },
  closeButton: {
    fontSize: fonts.title.fontSize,
    color: colors.hint,
  },

  // ── 탭 ────────────────────────────────────────
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.outerMargin,
    gap: 8,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.divider,           // #e0ddd8 얇은 테두리
    borderRadius: radius.none,             // 각진 형태
  },
  tabActive: {
    borderColor: colors.primary,           // 선택 시 진한 테두리
    backgroundColor: colors.primary,      // #1a1a1a 채움
  },
  tabText: {
    fontSize: fonts.body.fontSize,                          // Manrope 9pt 대문자
    color: colors.hint,
    letterSpacing: 2,
  },
  tabTextActive: {
    color: colors.background,             // 흰색에 가까운 #faf9f6
  },

  // ── 구분선 ────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.outerMargin,
    marginTop: 16,
    marginBottom: 4,
  },

  // ── 그리드 ────────────────────────────────────
  grid: {
    padding: spacing.outerMargin,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  itemBox: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.25,              // 세로로 약간 긴 비율 (옷 카드)
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemDim: {
    opacity: 0.45,                         // 미선택 시 흐리게 (ItemTray와 동일 기준)
  },

  // 선택 시 테두리 오버레이
  selectedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5,
    borderColor: colors.primary,           // #1a1a1a
  },

  // 체크 뱃지
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: colors.background,
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
  },
});