// features/get-recommendation/ui/WardrobePickerModal.tsx
//
// 변경:
//   - pickerMode: 'multi' | 'single' prop 추가
//   - single: 1개 선택 → onSelectSingle 콜백 → 자동 닫힘
//   - multi: 기존 토글 동작 유지
//   - 헤더에 single 모드 안내 문구 추가

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
import { useCanvasStore, type CanvasItem } from '@/features/get-recommendation/model/canvasStore';
import { colors, fonts, spacing, radius } from '@/shared/lib/tokens';
import type { AnchorClosetItem } from '@/features/get-recommendation/model/sourcePickerStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - spacing.outerMargin * 2 - 16) / 3;

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
  pickerMode?: 'multi' | 'single';
  onSelectSingle?: (item: AnchorClosetItem) => void;
}

export const WardrobePickerModal = ({
  visible,
  onClose,
  pickerMode = 'multi',
  onSelectSingle,
}: WardrobePickerModalProps) => {
  const [selectedTab, setSelectedTab] = useState<TabKey>('ALL');
  const { data: closetItems = [] } = useClosetItems();
  const { trayItems, addCustomItem } = useCanvasStore();

  const filteredItems = useMemo(() => {
    const validItems = closetItems.filter((item) => item.imageUrl);
    if (selectedTab === 'ALL') return validItems;
    return validItems.filter((item) => item.category.toUpperCase() === selectedTab);
  }, [closetItems, selectedTab]);

  const trayItemIds = useMemo(
    () => new Set(trayItems.map((t) => t.id)),
    [trayItems]
  );

  const handleSelectItem = (closetItem: typeof closetItems[0]) => {
    if (pickerMode === 'single') {
      onSelectSingle?.({
        id: closetItem.id,
        imageUrl: closetItem.imageUrl,
        category: closetItem.category,
        name: closetItem.name,
      });
      onClose();
      return;
    }
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
          <View>
            <Text style={styles.title}>MY CLOSET</Text>
            {pickerMode === 'single' && (
              <Text style={styles.subtitle}>PICK ONE ANCHOR ITEM</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* 카테고리 탭 */}
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

        <View style={styles.divider} />

        {/* 그리드 */}
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const isSelected = pickerMode === 'multi' && trayItemIds.has(item.id);
            return (
              <TouchableOpacity
                style={styles.itemBox}
                onPress={() => handleSelectItem(item)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: item.imageUrl! }}
                  style={[
                    styles.itemImage,
                    pickerMode === 'multi' && !isSelected && styles.itemDim,
                  ]}
                  resizeMode="cover"
                />
                {isSelected && <View style={styles.selectedOverlay} />}
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    // fonts.title spread — fontSize만 따로 빼지 않음
    ...fonts.title,
    color: colors.primary,
    letterSpacing: 3,
  },
  subtitle: {
    ...fonts.caption,
    color: colors.hint,
    letterSpacing: 2,
    marginTop: 3,
  },
  closeButton: {
    ...fonts.title,
    color: colors.hint,
  },
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
    borderColor: colors.divider,
    borderRadius: radius.none,  // 0 — editorial 각진 형태
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tabText: {
    ...fonts.tab,
    color: colors.hint,
    letterSpacing: 2,
  },
  tabTextActive: {
    ...fonts.tab,
    color: colors.background,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.outerMargin,
    marginTop: 16,
    marginBottom: 4,
  },
  grid: {
    padding: spacing.outerMargin,
  },
  row: {
    gap: 8,
    marginBottom: 8,
  },
  itemBox: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.25,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemDim: {
    opacity: 0.45,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
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
