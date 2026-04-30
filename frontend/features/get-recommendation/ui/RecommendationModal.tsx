import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { RecommendationResponse } from '../api/useRecommendation';
import { useCanvasStore } from '../model/canvasStore';
import { MoodboardCanvas } from './MoodboardCanvas';
import { ItemTray } from './ItemTray';
import { colors, fonts } from '@/shared/lib/tokens';
import { WardrobePickerModal } from './WardrobePickerModal';
import { useSaveOutfit } from '../api/useSaveOutfit';
import { Toast } from '@/shared/ui/Toast';

type Props = {
  visible: boolean;
  onClose: () => void;
  data: RecommendationResponse | null;
};

export function RecommendationModal({ visible, onClose, data }: Props) {
  const { canvasItems, initFromResponse, reset } = useCanvasStore();
  const { mutate: saveOutfit, isPending } = useSaveOutfit();

  const [wardrobePickerVisible, setWardrobePickerVisible] = useState(false);
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && data) {
      initFromResponse(data);
    }
    return () => {
      reset();
    };
  }, [visible, data]);

  const handleSaveOutfit = () => {
    if (canvasItems.length === 0) return;

    saveOutfit(
      {
        items: canvasItems.map((item) => ({
          closetItemId: item.id,
        })),
      },
      {
        onSuccess: () => {
          setToast({ message: 'OUTFIT SAVED', type: 'success' });
          setTimeout(() => {
            onClose();
          }, 1000);
        },
        onError: (error) => {
          setToast({ message: 'FAILED TO SAVE OUTFIT', type: 'error' });
          console.error(error);
        },
      }
    );
  };

  const handleExpandComment = () => {
    const toValue = commentExpanded ? 0 : 1;
    Animated.timing(animValue, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setCommentExpanded(!commentExpanded);
  };

  const expandedHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [44, 200],
  });

  if (!data) return null;

  const cleanComment = data.final_response
    .replace(/^#+\s/gm, '')
    .replace(/\*\*/g, '');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>STUDIO CANVAS</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* AI 코멘트 */}
        <TouchableOpacity
          onPress={handleExpandComment}
          activeOpacity={0.8}
          style={styles.commentWrapper}
        >
          <Animated.View style={{ height: expandedHeight, overflow: 'hidden' }}>
            <Text style={styles.commentText}>{cleanComment}</Text>
          </Animated.View>
          <Text style={styles.commentMore}>
            {commentExpanded ? '↑ CLOSE' : '↓ TAP TO READ MORE'}
          </Text>
        </TouchableOpacity>

        {/* 캔버스 */}
        <MoodboardCanvas />

        {/* 하단 트레이 + Save 버튼 */}
        <View style={styles.bottom}>
          <ItemTray onAddPress={() => setWardrobePickerVisible(true)} />

          <WardrobePickerModal
            visible={wardrobePickerVisible}
            onClose={() => setWardrobePickerVisible(false)}
          />

          <TouchableOpacity
            onPress={handleSaveOutfit}
            disabled={isPending || canvasItems.length === 0}
            style={[
              styles.saveButton,
              (isPending || canvasItems.length === 0) && styles.saveButtonDisabled,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {isPending ? 'SAVING...' : 'SAVE OUTFIT'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toast */}
        {toast && (
          <Toast
            visible={!!toast}
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}

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
  commentWrapper: {
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
  },
  commentText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
    color: colors.primaryMuted,
  },
  commentMore: {
    ...fonts.tab,
    color: colors.hint,
    letterSpacing: 1,
    marginTop: 6,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  saveButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    borderColor: colors.divider,
  },
  saveButtonText: {
    ...fonts.tab,
    color: colors.primary,
    letterSpacing: 3,
  },
});