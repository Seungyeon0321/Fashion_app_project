// pages/stylist/ui/StylistPage.tsx  ← 기존 파일 수정

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
import { useToastStore } from '@/shared/store/toastStore';          // ← 추가
// Toast import 제거 ← 글로벌 ToastProvider가 처리
import type { RecommendSource, AnchorClosetItem } from '@/features/get-recommendation/model/sourcePickerStore';

export function StylistPage() {
  const selectedIntent    = useIntentStore((s) => s.selectedIntent);
  const openSheet         = useSourcePickerStore((s) => s.openSheet);
  const { mutate, abort } = useRecommendation();
  const toast             = useToastStore();                        // ← 추가

  const [isPending,          setIsPending]          = useState(false);
  const [progressMessage,    setProgressMessage]    = useState<string | null>(null);
  const [modalVisible,       setModalVisible]       = useState(false);
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);
  const [lastPayload,        setLastPayload]        = useState<RecommendPayload | null>(null);
  const [currentSource,      setCurrentSource]      = useState<string | null>(null);  // ← 추가

  useEffect(() => {
    return () => abort();
  }, []);

  const handleIntentPress = (_key: Intent) => openSheet();

  const requestRecommendation = (payload: RecommendPayload) => {
    setLastPayload(payload);
    setCurrentSource(payload.source);
    setIsPending(true);
    setProgressMessage(null);

    mutate(payload, {
      onProgress: (message) => setProgressMessage(message),
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
        toast.error('FAILED TO GET RECOMMENDATION');               // ← 글로벌 Toast
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
    console.log('🎯 [Anchor] anchorItem:', anchorItem);
    console.log('🎯 [Anchor] anchor_item_id:', anchorItem?.id);
    requestRecommendation({
      intent:         selectedIntent!,
      source,
      anchor_item_id: anchorItem?.id,
    });
  };

  const handleRetry = (sessionId?: string) => {
    if (!lastPayload) return;
    setModalVisible(false);
    setRecommendationData(null);
    requestRecommendation({
      ...lastPayload,
      session_id: sessionId,
    });
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

      {isPending && <StylingOverlay message={progressMessage} />}

      <RecommendationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onRetry={handleRetry}
        data={recommendationData}
        source={currentSource}  // ← source 전달
      />
      {/* 로컬 Toast 제거 — 글로벌 ToastProvider가 처리 */}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 16 },
});