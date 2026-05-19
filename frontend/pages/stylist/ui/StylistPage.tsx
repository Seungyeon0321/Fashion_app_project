// pages/stylist/ui/StylistPage.tsx

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { IntentSelector } from '@/features/select-intent/ui/IntentSelector';
import { type Intent, useIntentStore } from '@/features/select-intent/model/intentStore';
import {
  useRecommendation,
  type RecommendationResponse,
  type RecommendPayload,
} from '@/features/get-recommendation/api/useRecommendation';
import { RecommendationModal } from '@/features/get-recommendation/ui/RecommendationModal';
import { SourcePickerSheet } from '@/features/get-recommendation/ui/SourcePickerSheet';
import { StylingOverlay } from '@/features/get-recommendation/ui/StylingOverlay';
import { useSourcePickerStore } from '@/features/get-recommendation/model/sourcePickerStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ScreenLayout } from '@/shared/ui/ScreenLayout';
import type { RecommendSource, AnchorClosetItem } from '@/features/get-recommendation/model/sourcePickerStore';

export function StylistPage() {
  const selectedIntent        = useIntentStore((s) => s.selectedIntent);
  const openSheet             = useSourcePickerStore((s) => s.openSheet);
  const { mutate, isPending } = useRecommendation();

  const [modalVisible,       setModalVisible]       = useState(false);
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);
  const [lastPayload,        setLastPayload]        = useState<RecommendPayload | null>(null);

  const handleIntentPress = (_key: Intent) => {
    openSheet();
  };

  const requestRecommendation = (payload: RecommendPayload) => {
    setLastPayload(payload);
    mutate(payload, {
      onSuccess: (data) => {
        setRecommendationData(data);
        setModalVisible(true);
      },
      onError: (error: any) => {
        console.error('❌ error:', error?.message);
        console.error('❌ response:', error?.response?.data);
        console.error('❌ status:', error?.response?.status);
      },
    });
  };

  const handleSourceConfirm = ({
    source,
    anchorItem,
  }: {
    source:     RecommendSource;
    anchorItem: AnchorClosetItem | null;
  }) => {
    requestRecommendation({
      intent:         selectedIntent!,
      source,
      anchor_item_id: anchorItem?.id,
    });
  };

  const handleRetry = () => {
    if (!lastPayload) return;
    setModalVisible(false);
    setRecommendationData(null);
    requestRecommendation(lastPayload);
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

      {/* API 호출 중 오버레이 — ScreenLayout 위에 덮음 */}
      {isPending && <StylingOverlay />}

      <RecommendationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onRetry={handleRetry}
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
