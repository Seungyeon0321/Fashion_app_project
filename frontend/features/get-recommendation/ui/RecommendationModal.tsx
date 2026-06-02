import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RecommendationResponse } from '../api/useRecommendation';
import { useCanvasStore } from '../model/canvasStore';
import { useConflictBanner, ConflictWarning } from '../model/useConflictBanner';
import { useFeedback } from '../api/useFeedback';
import { MoodboardCanvas } from './MoodboardCanvas';
import { ConflictBanner } from './ConflictBanner';
import { OutfitComment } from './OutfitComment';
import { OutfitActionBar } from './OutfitActionBar';
import { colors, fonts } from '@/shared/lib/tokens';

type Props = {
  visible:  boolean;
  onClose:  () => void;
  onRetry:  (sessionId?: string) => void;   // ← 시그니처 변경
  data:     RecommendationResponse | null;
};

export function RecommendationModal({ visible, onClose, onRetry, data }: Props) {
  const { initFromResponse, reset } = useCanvasStore();
  const { visible: bannerVisible, show: showBanner, hide: hideBanner, animatedStyle } =
    useConflictBanner();

  const [proposalIndex, setProposalIndex] = useState(0);
  const { like, dislike } = useFeedback(data, proposalIndex);

  useEffect(() => {
    if (visible && data) {
      console.log('🔍 ranked_items:', JSON.stringify(data.ranked_items, null, 2));
      initFromResponse(data);
      showBanner();
      setProposalIndex(0);
    }
    return () => { reset(); };
  }, [visible, data]);

  if (!data) return null;

  const conflictWarning = (data.conflict_warning ?? null) as ConflictWarning;

  const handleYes = useCallback(async () => {
    await like();
    hideBanner();
  }, [like, hideBanner]);

  const handleNo = useCallback(async () => {
    await dislike();
    setProposalIndex((prev) => prev + 1);
    onRetry(data.session_id);   // ← session_id 전달
  }, [dislike, onRetry, data]);

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
            onYes={handleYes}
            onNo={handleNo}
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
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: 24,
    paddingVertical:   12,
  },
  title: {
    fontFamily:    'Epilogue_700Bold',
    fontSize:      18,
    letterSpacing: 2,
    color:         colors.primary,
  },
  closeBtn: {
    color:      colors.primary,
    fontWeight: 'bold',
    fontSize:   fonts.title.fontSize,
  },
});