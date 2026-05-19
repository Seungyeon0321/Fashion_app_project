// features/get-recommendation/ui/OutfitActionBar.tsx
//
// 역할:
//   하단 ItemTray + WardrobePicker 모달 트리거 + SAVE OUTFIT 버튼.
//   저장 로직(useSaveOutfit)을 여기서 직접 호출해서
//   RecommendationModal이 저장 상태를 들고 있지 않아도 됨.
//
// 왜 분리했나?
//   저장 성공/실패 toast, isPending 상태가 모두 저장 동작과 묶여 있음.
//   이 컴포넌트 스코프로 격리하면 모달이 훨씬 단순해짐.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';
import { ItemTray } from './ItemTray';
import { WardrobePickerModal } from './WardrobePickerModal';
import { useSaveOutfit } from '../api/useSaveOutfit';
import { useCanvasStore } from '../model/canvasStore';
import { Toast } from '@/shared/ui/Toast';

type Props = {
  onSaveSuccess: () => void;
};

export function OutfitActionBar({ onSaveSuccess }: Props) {
  const { canvasItems } = useCanvasStore();
  const { mutate: saveOutfit, isPending } = useSaveOutfit();

  const [wardrobePickerVisible, setWardrobePickerVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSave = () => {
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
          setTimeout(() => onSaveSuccess(), 1000);
        },
        onError: (error) => {
          setToast({ message: 'FAILED TO SAVE OUTFIT', type: 'error' });
          console.error(error);
        },
      }
    );
  };

  return (
    <View style={styles.container}>
      <ItemTray onAddPress={() => setWardrobePickerVisible(true)} />

      <WardrobePickerModal
        visible={wardrobePickerVisible}
        onClose={() => setWardrobePickerVisible(false)}
      />

      <TouchableOpacity
        onPress={handleSave}
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

      {toast && (
        <Toast
          visible={!!toast}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
