// features/profile/ui/SavedOutfitsGrid.tsx

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';
import { useGetOutfits } from '../api/useGetOutfits';

export function SavedOutfitsGrid() {
  const { data: outfits, isLoading, isError } = useGetOutfits();

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
    <View style={styles.container}>
      {outfits.map((outfit) => (
        <View key={outfit.id} style={styles.card}>
          {/* 옷 이미지 가로 나열 */}
          <View style={styles.imageRow}>
            {outfit.items.map((item) => {
              // 내부 아이템이면 closetItem.imageUrl, 외부 아이템이면 externalItem.imageUrl
              const imageUrl = item.closetItem?.imageUrl ?? item.externalItem?.imageUrl ?? null;

              return imageUrl ? (
                <Image
                  key={item.id}
                  source={{ uri: imageUrl }}
                  style={styles.itemImage}
                />
              ) : (
                <View key={item.id} style={[styles.itemImage, styles.imagePlaceholder]} />
              );
            })}
          </View>

          {/* 날짜 */}
          <Text style={styles.dateText}>
            {new Date(outfit.createdAt).toLocaleDateString('en-US', {
              year:  'numeric',
              month: 'short',
              day:   'numeric',
            })}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.divider,
    padding:     16,
    gap:         12,
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
  dateText: {
    ...fonts.caption,
    color:         colors.primaryMuted, // ✅ 토큰 수정
    letterSpacing: 1,
  },
  centerBox: {
    paddingVertical: 32,
    alignItems:      'center',
    gap:             8,
  },
  emptyText: {
    ...fonts.tab,
    color:         colors.primaryMuted, // ✅ 토큰 수정
    letterSpacing: 2,
  },
  emptySubText: {
    ...fonts.caption,
    color:     colors.primaryMuted, // ✅ 토큰 수정
    textAlign: 'center',
  },
});