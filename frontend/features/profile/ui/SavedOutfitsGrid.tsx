// features/profile/ui/SavedOutfitsGrid.tsx  ← 기존 파일 수정

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { colors, fonts, spacing } from '@/shared/lib/tokens';
import { useGetOutfits, SavedOutfit } from '../api/useGetOutfits';
import { OutfitDetailModal } from './OutfitDetailModal';

export function SavedOutfitsGrid() {
  const { data: outfits, isLoading, isError } = useGetOutfits();
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOutfit | null>(null);

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyText}>FAILED TO LOAD OUTFITS</Text>
      </View>
    );
  }

  if (!outfits || outfits.length === 0) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyText}>NO SAVED OUTFITS YET</Text>
        <Text style={styles.emptySubText}>
          Save a coordinated outfit to see it here
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {outfits.map((outfit) => (
          <TouchableOpacity
            key={outfit.id}
            style={styles.card}
            onPress={() => setSelectedOutfit(outfit)}
            activeOpacity={0.75}
          >
            {/* 이미지 가로 나열 */}
            <View style={styles.imageRow}>
              {outfit.items.map((item) => {
                const imageUrl =
                  item.closetItem?.imageUrl ?? item.externalItem?.imageUrl ?? null;

                return imageUrl ? (
                  <Image
                    key={item.id}
                    source={{ uri: imageUrl }}
                    style={styles.itemImage}
                  />
                ) : (
                  <View
                    key={item.id}
                    style={[styles.itemImage, styles.imagePlaceholder]}
                  />
                );
              })}
            </View>

            {/* 날짜 + 배지 */}
            <View style={styles.metaRow}>
              <Text style={styles.dateText}>
                {new Date(outfit.createdAt).toLocaleDateString('en-US', {
                  year:  'numeric',
                  month: 'short',
                  day:   'numeric',
                })}
              </Text>

              <View style={styles.badgeRow}>
                {/* intent 배지 */}
                {outfit.intent && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {outfit.intent.toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* source 배지 */}
                <View style={[styles.badge, styles.badgeSource]}>
                  <Text style={styles.badgeText}>
                    {outfit.recommendSource === 'closet' ? 'CLOSET' : 'EXTERNAL'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* 상세 모달 */}
      <OutfitDetailModal
        visible={!!selectedOutfit}
        outfit={selectedOutfit}
        onClose={() => setSelectedOutfit(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    borderWidth:  1,
    borderColor:  colors.divider,
    padding:      16,
    gap:          12,
  },
  imageRow: {
    flexDirection: 'row',
    gap:           8,
    flexWrap:      'wrap',
  },
  itemImage: {
    width:           72,
    height:          72,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    backgroundColor: colors.divider,
  },
  metaRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  dateText: {
    ...fonts.caption,
    color:         colors.primaryMuted,
    letterSpacing: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap:           6,
  },
  badge: {
    borderWidth:       1,
    borderColor:       colors.divider,
    paddingHorizontal: 6,
    paddingVertical:   3,
  },
  badgeSource: {
    borderColor: colors.primary,
  },
  badgeText: {
    ...fonts.tab,
    color:         colors.primaryMuted,
    letterSpacing: 1.5,
  },
  centerBox: {
    paddingVertical: 32,
    alignItems:      'center',
    gap:             8,
  },
  emptyText: {
    ...fonts.tab,
    color:         colors.primaryMuted,
    letterSpacing: 2,
  },
  emptySubText: {
    ...fonts.caption,
    color:     colors.primaryMuted,
    textAlign: 'center',
  },
});