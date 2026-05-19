// features/get-recommendation/ui/RecommendationModal.tsx

import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RecommendationResponse } from '../api/useRecommendation';
import { useCanvasStore } from '../model/canvasStore';
import { useConflictBanner, ConflictWarning } from '../model/useConflictBanner';
import { MoodboardCanvas } from './MoodboardCanvas';
import { ConflictBanner } from './ConflictBanner';
import { OutfitComment } from './OutfitComment';
import { OutfitActionBar } from './OutfitActionBar';
import { colors, fonts } from '@/shared/lib/tokens';

type Props = {
  visible:  boolean;
  onClose:  () => void;
  onRetry:  () => void;
  data:     RecommendationResponse | null;
};

export function RecommendationModal({ visible, onClose, onRetry, data }: Props) {
  const { initFromResponse, reset } = useCanvasStore();
  const { visible: bannerVisible, show: showBanner, hide: hideBanner, animatedStyle } =
    useConflictBanner();

  useEffect(() => {
    if (visible && data) {
      console.log('🔍 ranked_items:', JSON.stringify(data.ranked_items, null, 2));
      initFromResponse(data);
      showBanner();
    }
    return () => {
      reset();
    };
  }, [visible, data]);

  if (!data) return null;

  const conflictWarning = (data.conflict_warning ?? null) as ConflictWarning;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

        <View style={styles.header}>
          <Text style={styles.title}>STUDIO CANVAS</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {bannerVisible && (
          <ConflictBanner
            conflictWarning={conflictWarning}
            animatedStyle={animatedStyle}
            onYes={() => hideBanner()}
            onNo={onRetry}
          />
        )}

        <OutfitComment rawText={data.final_response} />

        <MoodboardCanvas />

        <OutfitActionBar onSaveSuccess={onClose} />

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  title: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 18,
    letterSpacing: 2,
    color: colors.primary,
  },
  closeBtn: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: fonts.title.fontSize,
  },
});
