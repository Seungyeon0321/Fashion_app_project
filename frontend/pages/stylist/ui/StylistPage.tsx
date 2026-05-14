// pages/stylist/ui/StylistPage.tsx

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { IntentSelector } from '@/features/select-intent/ui/IntentSelector';
import { type Intent, useIntentStore } from '@/features/select-intent/model/intentStore';
import { useRecommendation, type RecommendationResponse } from '@/features/get-recommendation/api/useRecommendation';
import { RecommendationModal } from '@/features/get-recommendation/ui/RecommendationModal';
import { SourcePickerSheet } from '@/features/get-recommendation/ui/SourcePickerSheet';
import { useSourcePickerStore } from '@/features/get-recommendation/model/sourcePickerStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ScreenLayout } from '@/shared/ui/ScreenLayout';
import { useStylePresets } from '@/features/style-reference/model/useStylePresets';
import type { RecommendSource, AnchorClosetItem } from '@/features/get-recommendation/model/sourcePickerStore';

export function StylistPage() {
  const selectedIntent = useIntentStore((s) => s.selectedIntent);
  const openSheet = useSourcePickerStore((s) => s.openSheet);
  const { mutate, isPending } = useRecommendation();
  const { selectedPresetIds } = useStylePresets();

  const [modalVisible, setModalVisible] = useState(false);
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);

  const handleIntentPress = (_key: Intent) => {
    openSheet();
  };

  const handleSourceConfirm = ({
    source,
    anchorItem,
  }: {
    source: RecommendSource;
    anchorItem: AnchorClosetItem | null;
  }) => {
    mutate(
      {
        intent: selectedIntent!,
        source,
        anchor_item_id: anchorItem?.id,
        style_reference_ids: selectedPresetIds,
      },
      {
        onSuccess: (data) => {
          setRecommendationData(data);
          setModalVisible(true);
        },
        onError: (error) => {
          console.error('❌ recommendation error:', error.message);
        },
      }
    );
  };

  return (
    <ScreenLayout hasFooter>
      <View style={styles.container}>
        <PageHeader
          title="SELECT YOUR INTENT"
          subtitle="Tell me your vibe — I'll match your wardrobe to the moment."
          subtitleLarge
        />
        <IntentSelector onIntentPress={handleIntentPress} />
      </View>

      <SourcePickerSheet onConfirm={handleSourceConfirm} />

      <RecommendationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        data={recommendationData}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 16,
  },
});
