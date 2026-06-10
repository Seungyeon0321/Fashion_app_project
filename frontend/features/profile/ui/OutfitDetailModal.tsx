// features/profile/ui/OutfitDetailModal.tsx  ← 신규 파일

import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@/shared/lib/tokens';
import type { SavedOutfit } from '../api/useGetOutfits';

type Props = {
  visible: boolean;
  outfit:  SavedOutfit | null;
  onClose: () => void;
};

export function OutfitDetailModal({ visible, outfit, onClose }: Props) {
  const insets = useSafeAreaInsets();

  if (!outfit) return null;

  const formattedDate = new Date(outfit.createdAt).toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>OUTFIT DETAIL</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 날짜 + 메타 */}
          <View style={styles.metaRow}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <View style={styles.badgeRow}>
              {outfit.intent && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{outfit.intent.toUpperCase()}</Text>
                </View>
              )}
              <View style={[styles.badge, styles.badgeSource]}>
                <Text style={styles.badgeText}>
                  {outfit.recommendSource === 'closet' ? 'CLOSET' : 'EXTERNAL'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* 아이템 목록 */}
          {outfit.items.map((item) => {
            const isExternal = !!item.externalItem;
            const imageUrl   = item.closetItem?.imageUrl ?? item.externalItem?.imageUrl ?? null;
            const name       = item.externalItem?.name ?? null;
            const category   = item.closetItem?.category ?? item.externalItem?.category ?? '';
            const brand      = item.closetItem?.brand ?? null;
            const purchaseUrl = item.externalItem?.purchaseUrl ?? null;

            return (
              <View key={item.id} style={styles.itemCard}>
                {/* 이미지 */}
                <View style={styles.imageWrap}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.itemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.itemImage, styles.imagePlaceholder]} />
                  )}

                  {/* 외부 아이템 배지 */}
                  {isExternal && (
                    <View style={styles.externalBadge}>
                      <Text style={styles.externalBadgeText}>EXTERNAL</Text>
                    </View>
                  )}
                </View>

                {/* 아이템 정보 */}
                <View style={styles.itemInfo}>
                  <Text style={styles.categoryText}>
                    {category.toUpperCase()}
                  </Text>

                  {name && (
                    <Text style={styles.nameText} numberOfLines={2}>
                      {name}
                    </Text>
                  )}

                  {brand && (
                    <Text style={styles.brandText}>{brand}</Text>
                  )}

                  {/* 내 옷장 아이템 — 색상 */}
                  {item.closetItem?.colors && item.closetItem.colors.length > 0 && (
                    <Text style={styles.colorsText}>
                      {item.closetItem.colors.join(', ')}
                    </Text>
                  )}

                  {/* 외부 아이템 — 구매 링크 */}
                  {purchaseUrl && (
                    <TouchableOpacity
                      style={styles.purchaseBtn}
                      onPress={() => Linking.openURL(purchaseUrl)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.purchaseBtnText}>VIEW ITEM →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: spacing.outerMargin,
    paddingVertical:   16,
  },
  headerTitle: {
    ...fonts.brand,
    letterSpacing: 2,
    color:         colors.primary,
  },
  closeBtn: {
    ...fonts.title,
    color: colors.primary,
  },
  divider: {
    height:          1,
    backgroundColor: colors.divider,
  },
  scroll: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop:        24,
    gap:               16,
  },
  metaRow: {
    gap: 12,
    marginBottom: 16,
  },
  dateText: {
    ...fonts.body,
    color: colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap:           8,
  },
  badge: {
    borderWidth:       1,
    borderColor:       colors.divider,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  badgeSource: {
    borderColor: colors.primary,
  },
  badgeText: {
    ...fonts.tab,
    color:         colors.primaryMuted,
    letterSpacing: 1.5,
  },
  itemCard: {
    flexDirection:   'row',
    gap:             16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  imageWrap: {
    position: 'relative',
  },
  itemImage: {
    width:           100,
    height:          100,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    backgroundColor: colors.divider,
  },
  externalBadge: {
    position:          'absolute',
    bottom:            4,
    left:              4,
    backgroundColor:   colors.primary,
    paddingHorizontal: 4,
    paddingVertical:   2,
  },
  externalBadgeText: {
    ...fonts.tab,
    color:         colors.background,
    fontSize:      8,
    letterSpacing: 1,
  },
  itemInfo: {
    flex: 1,
    gap:  6,
  },
  categoryText: {
    ...fonts.tab,
    color:         colors.primaryMuted,
    letterSpacing: 2,
  },
  nameText: {
    ...fonts.bodyMd,
    color: colors.primary,
  },
  brandText: {
    ...fonts.caption,
    color: colors.primaryMuted,
  },
  colorsText: {
    ...fonts.caption,
    color: colors.hint,
  },
  purchaseBtn: {
    marginTop:       8,
    borderWidth:     1,
    borderColor:     colors.primary,
    paddingVertical: 8,
    alignItems:      'center',
  },
  purchaseBtnText: {
    ...fonts.tab,
    color:         colors.primary,
    letterSpacing: 2,
  },
});