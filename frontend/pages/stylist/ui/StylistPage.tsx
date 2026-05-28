// pages/stylist/ui/StylistPage.tsx

import React, { useState, useEffect } from 'react';
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
  const selectedIntent = useIntentStore((s) => s.selectedIntent);
  const openSheet      = useSourcePickerStore((s) => s.openSheet);
  const { mutate, abort } = useRecommendation();

  const [isPending,          setIsPending]          = useState(false);
  const [progressMessage,    setProgressMessage]    = useState<string | null>(null);
  const [modalVisible,       setModalVisible]       = useState(false);
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);
  const [lastPayload,        setLastPayload]        = useState<RecommendPayload | null>(null);

  // 언마운트 시 SSE 정리
  useEffect(() => {
    return () => abort();
  }, []);

  const handleIntentPress = (_key: Intent) => openSheet();

  const requestRecommendation = (payload: RecommendPayload) => {
    setLastPayload(payload);
    setIsPending(true);
    setProgressMessage(null);

    mutate(payload, {
      onProgress: (message) => {
        // "classic 무드의 아이템을 찾는 중..." → 오버레이에 표시
        setProgressMessage(message);
      },
      onSuccess: (data) => {
        setIsPending(false);
        setProgressMessage(null);
        setRecommendationData(data);
        setModalVisible(true);
      },
      onError: (error) => {
        setIsPending(false);
        setProgressMessage(null);
        console.error('❌ error:', error.message);
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

      {/* SSE 진행 중 오버레이 — progress 메시지 실시간 표시 */}
      {isPending && <StylingOverlay message={progressMessage} />}

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
  container: { flex: 1, paddingBottom: 16 },
});