import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';
import { ItemTray } from './ItemTray';
import { WardrobePickerModal } from './WardrobePickerModal';
import { useSaveOutfit } from '../api/useSaveOutfit';
import { useCanvasStore } from '../model/canvasStore';
import { Toast } from '@/shared/ui/Toast';
import { useTryOn, TryonTargetItem } from '@/features/virtual-tryon/model/useTryOn';
import { TryOnModal } from '@/features/virtual-tryon/ui/TryOnModal';
import { PhotoRegisterSheet } from '@/features/virtual-tryon/ui/PhotoRegisterSheet';

type Props = {
  onSaveSuccess: () => void;
};

export function OutfitActionBar({ onSaveSuccess }: Props) {
  const { canvasItems } = useCanvasStore();
  const { mutate: saveOutfit, isPending } = useSaveOutfit();

  const [wardrobePickerVisible, setWardrobePickerVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  // ── 핵심 수정: useRef로 동기 보장 ────────────────────────────────
  // useState는 배칭 타이밍이 불확실 → useRef는 설정 즉시 동기 반영
  // setIsTryOnModalVisible 트리거로 리렌더 발생 시 ref 값이 반드시 있음
  const uploadedPhotoRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      resetSession();
      uploadedPhotoRef.current = null;
    };
  }, []);

// ── TRY 버튼 탭 ───────────────────────────────────────────────
const handleTryOnPress = useCallback((item: TrayItem) => {
  // TrayItem → TryonTargetItem 변환
  // 내 옷장 아이템: closetItemId 설정 → NestJS가 cropS3Key presigned URL 생성
  // 외부 아이템: garment_url로 Naver 이미지 직접 사용
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

  // ── 사진 선택 → 업로드 → Try-On 실행 ──────────────────────────
  const handlePhotoSelect = useCallback(async () => {
    const localUri = await pickAndUploadPhoto(); // 로컬 URI 또는 null

    if (localUri) {
      // useRef: 동기적으로 즉시 설정 → 다음 렌더링에서 반드시 반영됨
      uploadedPhotoRef.current = localUri;

      setIsPhotoSheetVisible(false);

      if (pendingItem) {
        runTryon(pendingItem);
        setPendingItem(null);
        setIsTryOnModalVisible(true); // 이 리렌더 시 ref 값이 이미 설정되어 있음
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
      { items: canvasItems.map((item) => ({ closetItemId: Number(item.id) })) },
      {
        onSuccess: () => {
          setToast({ message: 'OUTFIT SAVED', type: 'success' });
          setTimeout(() => onSaveSuccess(), 1000);
        },
        onError: (error) => {
          setToast({ message: 'FAILED TO SAVE OUTFIT', type: 'error' });
          console.error(error);
        },
      },
    );
  };

  // ── MY PHOTO 표시 URL 결정 ──────────────────────────────────────
  // 우선순위: 레이어드 결과 > 방금 업로드한 로컬 URI (ref) > 기존 S3 URL
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

      {toast && (
        <Toast
          visible={!!toast}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

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