// features/get-recommendation/ui/OutfitActionBar.tsx  ← 기존 파일 수정

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';
import { ItemTray } from './ItemTray';
import { WardrobePickerModal } from './WardrobePickerModal';
import { useSaveOutfit } from '../api/useSaveOutfit';
import { useCanvasStore } from '../model/canvasStore';
import { useToastStore } from '@/shared/store/toastStore';  // ← 추가
import { useTryOn, TryonTargetItem } from '@/features/virtual-tryon/model/useTryOn';
import { TryOnModal } from '@/features/virtual-tryon/ui/TryOnModal';
import { PhotoRegisterSheet } from '@/features/virtual-tryon/ui/PhotoRegisterSheet';
// Toast import 제거 ← 로컬 Toast 더 이상 불필요

type Props = {
  onSaveSuccess: () => void;
};

export function OutfitActionBar({ onSaveSuccess }: Props) {
  const { canvasItems } = useCanvasStore();
  const { mutate: saveOutfit, isPending } = useSaveOutfit();
  const toast = useToastStore();                            // ← 추가

  const [wardrobePickerVisible, setWardrobePickerVisible] = useState(false);
  // toast state 제거 ← 글로벌 toastStore로 대체

  const {
    status, resultUrl, errorMessage, currentItem,
    useLayered, activeModelUrl, tryonPhotoUrl,
    hasTryonPhoto, isUploadingPhoto,
    runTryon, toggleLayered, pickAndUploadPhoto,
    reset: resetTryon, resetSession,
  } = useTryOn();

  const [isTryOnModalVisible, setIsTryOnModalVisible] = useState(false);
  const [isPhotoSheetVisible, setIsPhotoSheetVisible] = useState(false);
  const [pendingItem, setPendingItem] = useState<TryonTargetItem | null>(null);

  const uploadedPhotoRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      resetSession();
      uploadedPhotoRef.current = null;
    };
  }, []);

  const handleTryOnPress = useCallback((item: TrayItem) => {
    const tryonItem: TryonTargetItem = {
      id:          item.id,
      imageUrl:    item.imageUrl,
      category:    item.category,
      is_external: item.is_external,
      closetItemId: !item.is_external && typeof item.id === 'number'
        ? item.id
        : undefined,
    };

    if (hasTryonPhoto) {
      runTryon(tryonItem);
      setIsTryOnModalVisible(true);
    } else {
      setPendingItem(tryonItem);
      setIsPhotoSheetVisible(true);
    }
  }, [hasTryonPhoto, runTryon]);

  const handlePhotoSelect = useCallback(async () => {
    const localUri = await pickAndUploadPhoto();

    if (localUri) {
      uploadedPhotoRef.current = localUri;
      setIsPhotoSheetVisible(false);

      if (pendingItem) {
        runTryon(pendingItem);
        setPendingItem(null);
        setIsTryOnModalVisible(true);
      }
    }
  }, [pickAndUploadPhoto, pendingItem, runTryon]);

  const handleTryOnClose = useCallback(() => {
    setIsTryOnModalVisible(false);
    resetTryon();
  }, [resetTryon]);

  const handleTryOnDone = useCallback(() => {
    setIsTryOnModalVisible(false);
    resetTryon();
  }, [resetTryon]);

  const handleTryOnRetry = useCallback(() => {
    if (currentItem) runTryon(currentItem);
  }, [currentItem, runTryon]);

  const handleSave = () => {
  if (canvasItems.length === 0) return;

  saveOutfit(
    {
      items: canvasItems.map((item) => {
        // 외부 아이템 — externalId, imageUrl, purchaseUrl 함께 전달
        if (item.is_external) {
          return {
            isExternal:  true,
            externalId:  String(item.id),
            name:        item.name        ?? undefined,
            imageUrl:    item.imageUrl    ?? undefined,
            purchaseUrl: item.purchaseUrl ?? undefined,
            category:    item.category,
          };
        }
        // 내부 아이템 — closetItemId만 전달
        return {
          closetItemId: item.id as number,
        };
      }),
    },
    {
      onSuccess: () => {
        toast.success('OUTFIT SAVED');
        setTimeout(() => onSaveSuccess(), 1000);
      },
      onError: (error) => {
        toast.error('FAILED TO SAVE OUTFIT');
        console.error(error);
      },
    },
  );
};

  const displayPhotoUrl = activeModelUrl ?? uploadedPhotoRef.current ?? tryonPhotoUrl;

  return (
    <View style={styles.container}>
      <ItemTray
        onAddPress={() => setWardrobePickerVisible(true)}
        onTryOnPress={handleTryOnPress}
      />

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

      {/* 로컬 Toast 제거 — 글로벌 ToastProvider가 처리 */}

      <PhotoRegisterSheet
        visible={isPhotoSheetVisible}
        isUploading={isUploadingPhoto}
        onSelectPhoto={handlePhotoSelect}
        onDismiss={() => {
          setIsPhotoSheetVisible(false);
          setPendingItem(null);
        }}
      />

      <TryOnModal
        visible={isTryOnModalVisible}
        status={status}
        modelPhotoUrl={displayPhotoUrl}
        isLayeredMode={!!activeModelUrl}
        resultUrl={resultUrl}
        errorMessage={errorMessage}
        currentItem={currentItem}
        useLayered={useLayered}
        onToggleLayered={toggleLayered}
        onRetry={handleTryOnRetry}
        onDone={handleTryOnDone}
        onClose={handleTryOnClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom:     16,
    gap:               12,
  },
  saveButton: {
    borderWidth:     1,
    borderColor:     colors.primary,
    paddingVertical: 14,
    alignItems:      'center',
  },
  saveButtonDisabled: { borderColor: colors.divider },
  saveButtonText: {
    ...fonts.tab,
    color:         colors.primary,
    letterSpacing: 3,
  },
});