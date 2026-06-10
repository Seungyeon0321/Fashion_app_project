// features/get-recommendation/ui/RecommendationModal.tsx  ← 기존 파일 수정

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
import { ToastProvider } from '@/shared/ui/ToastProvider';  // ← 추가
import { colors, fonts } from '@/shared/lib/tokens';
import { GestureHandlerRootView } from 'react-native-gesture-handler';  // ← 추가

type Props = {
  visible:  boolean;
  onClose:  () => void;
  onRetry:  (sessionId?: string) => void;
  data:     RecommendationResponse | null;
  source:   string | null;  // ← 추가
};

export function RecommendationModal({ visible, onClose, onRetry, data, source }: Props) {
  const { initFromResponse, reset } = useCanvasStore();
  const { visible: bannerVisible, show: showBanner, hide: hideBanner, animatedStyle } =
    useConflictBanner();

  const [proposalIndex, setProposalIndex] = useState(0);
  const { like, dislike } = useFeedback(data, proposalIndex);

  useEffect(() => {
    if (visible && data) {
      initFromResponse(data, source ?? 'external');  // source가 없으면 'external'로 기본값 설정
      showBanner();
      setProposalIndex(0);
    }
  }, [visible, data]);

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  if (!data) return null;

  const conflictWarning = (data.conflict_warning ?? null) as ConflictWarning;

  const handleYes = useCallback(async () => {
    await like();
    hideBanner();
  }, [like, hideBanner]);

  const handleNo = useCallback(async () => {
    await dislike();
    setProposalIndex((prev) => prev + 1);
    onRetry(data.session_id);
  }, [dislike, onRetry, data]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
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

          {/* Modal은 별도 네이티브 레이어라 _layout.tsx의 ToastProvider가 안 보임
              그래서 Modal 안에 직접 ToastProvider를 마운트해야 함
              같은 toastStore를 구독하므로 어디서 toast.error()를 호출해도 여기서 뜸 */}
          <ToastProvider />

        </SafeAreaView>
      </GestureHandlerRootView>
      
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