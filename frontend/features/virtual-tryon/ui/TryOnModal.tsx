// features/virtual-tryon/ui/TryOnModal.tsx

import React, { useRef, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useBottomInset } from '@/shared/lib/useBottomInset';
import { colors, spacing } from '@/shared/lib/tokens';
import { Toast, ToastType } from '@/shared/ui/Toast';
import type { TryonTargetItem } from '../model/useTryOn';

const SCREEN_H = Dimensions.get('window').height;

type Props = {
  visible:         boolean;
  status:          'idle' | 'loading' | 'success' | 'error';
  modelPhotoUrl:   string | null;
  isLayeredMode:   boolean;
  resultUrl:       string | null;
  errorMessage:    string | null;
  currentItem:     TryonTargetItem | null;
  useLayered:      boolean;
  onToggleLayered: (value: boolean) => void;
  onRetry:         () => void;
  onDone:          () => void;
  onClose:         () => void;
};

type ToastState = { message: string; type: ToastType } | null;

export function TryOnModal({
  visible,
  status,
  modelPhotoUrl,
  isLayeredMode,
  resultUrl,
  errorMessage,
  useLayered,
  onToggleLayered,
  onRetry,
  onDone,
  onClose,
}: Props) {
  const bottomInset = useBottomInset();
  const [isSaving, setIsSaving]   = useState(false);
  const [toast,    setToast]      = useState<ToastState>(null);

  const pulseAnim = useRef(new Animated.Value(0.35)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (status === 'loading') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [status]);

  // ── Save result to device gallery ───────────────────────────
  const handleSave = async () => {
  if (!resultUrl || isSaving) return;
  setIsSaving(true);
  setToast({ message: 'Saving...', type: 'pending' });

  try {
    // 1. 권한 요청
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      setToast({ message: 'Gallery access permission is required.', type: 'error' });
      return;
    }

    // 2. 임시 파일로 다운로드
    // @ts-ignore - SDK 54에서 타입 정의 누락
    const cacheDir: string = FileSystem.cacheDirectory
      // @ts-ignore
      ?? FileSystem.documentDirectory
      ?? '';

    const localUri = `${cacheDir}tryon_${Date.now()}.jpg`;

    const downloadResult = await FileSystem.downloadAsync(resultUrl, localUri);

    if (downloadResult.status !== 200) {
      throw new Error(`Download failed: ${downloadResult.status}`);
    }

    // 3. 갤러리에 저장
    // saveToLibraryAsync 대신 createAssetAsync 사용 (Android 스코프 스토리지 호환)
    await MediaLibrary.createAssetAsync(downloadResult.uri);

    // 4. 임시 파일 정리
    await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {});

    setToast({ message: 'Saved to your gallery.', type: 'success' });
  } catch (e: any) {
    console.error('[TryOn] Save error:', e);
    setToast({ message: e.message ?? 'Save failed. Please try again.', type: 'error' });
  } finally {
    setIsSaving(false);
  }
};

  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isError   = status === 'error';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>

        {/* Toast — positioned inside modal so it appears above content */}
        <Toast
          visible={!!toast}
          message={toast?.message ?? ''}
          type={toast?.type ?? 'success'}
          onDismiss={() => setToast(null)}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>VIRTUAL TRY-ON</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 0 }}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        {/* Content */}
        <View style={styles.content}>

          {/* Loading: side-by-side */}
          {isLoading && (
            <View style={styles.splitRow}>
              <View style={styles.leftPanel}>
                <VerticalLabel text="MY PHOTO" />
                <View style={styles.photoContainer}>
                  {modelPhotoUrl ? (
                    <Image
                      source={{ uri: modelPhotoUrl }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]} />
                  )}
                </View>
              </View>

              <View style={styles.splitDivider} />

              <View style={styles.rightPanel}>
                <VerticalLabel text="RESULT" />
                <View style={styles.resultLoadingWrap}>
                  <Animated.View
                    style={[styles.resultLoadingBox, { opacity: pulseAnim }]}
                  />
                  <Text style={styles.generatingText}>GENERATING</Text>
                  <Text style={styles.estimatedText}>
                    ESTIMATED TIME: 15–20 SECONDS
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Success: vertical scroll */}
          {isSuccess && (
            <ScrollView
              style={styles.resultScroll}
              contentContainerStyle={styles.resultScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>MY PHOTO</Text>
                <Text style={styles.sectionSubLabel}>
                  {isLayeredMode ? 'Previous Result' : 'Original'}
                </Text>
              </View>
              <View style={styles.resultImageWrap}>
                {modelPhotoUrl ? (
                  <Image
                    source={{ uri: modelPhotoUrl }}
                    style={styles.resultImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.resultImage, styles.photoPlaceholder]} />
                )}
              </View>

              <View style={[styles.sectionLabelRow, { marginTop: 24 }]}>
                <Text style={styles.sectionLabel}>RESULT</Text>
                <Text style={[styles.sectionSubLabel, styles.aiLabel]}>
                  AI ENHANCED
                </Text>
              </View>
              <View style={styles.resultImageWrap}>
                {resultUrl ? (
                  <Image
                    source={{ uri: resultUrl }}
                    style={styles.resultImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.resultImage, styles.photoPlaceholder]} />
                )}
              </View>

              <View style={{ height: 180 }} />
            </ScrollView>
          )}

          {/* Error */}
          {isError && (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>
                {errorMessage ?? 'An error occurred. Please try again.'}
              </Text>
            </View>
          )}

        </View>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
          <View style={styles.divider} />

          {isSuccess && (
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelWrap}>
                <Text style={styles.toggleLabel}>
                  Use this result for next Try-On
                </Text>
                <Text style={styles.toggleSub}>
                  Only applies in this session
                </Text>
              </View>
              <Switch
                value={useLayered}
                onValueChange={onToggleLayered}
                trackColor={{ false: '#e0e4de', true: colors.primary }}
                thumbColor={colors.background}
                style={styles.toggle}
              />
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.retryBtn, isLoading && styles.btnDisabled]}
              onPress={onRetry}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.retryBtnText, isLoading && styles.btnTextDisabled]}>
                TRY AGAIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, (!isSuccess || isSaving) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={!isSuccess || isSaving}
              activeOpacity={0.7}
            >
              <Text style={[styles.saveBtnText, (!isSuccess || isSaving) && styles.btnTextDisabled]}>
                {isSaving ? 'SAVING' : 'SAVE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.doneBtn, !isSuccess && styles.btnDisabled]}
              onPress={onDone}
              disabled={!isSuccess}
              activeOpacity={0.85}
            >
              <Text style={[styles.doneBtnText, !isSuccess && styles.btnTextDisabled]}>
                DONE
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </Modal>
  );
}

function VerticalLabel({ text }: { text: string }) {
  return (
    <View style={vStyles.wrap}>
      <Text style={vStyles.text}>{text}</Text>
    </View>
  );
}

const vStyles = StyleSheet.create({
  wrap: {
    width:           20,
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 16,
  },
  text: {
    fontFamily:    'Manrope',
    fontSize:      9,
    fontWeight:    '700',
    letterSpacing: 4,
    color:         '#afb3ae',
    textTransform: 'uppercase',
    transform:     [{ rotate: '-90deg' }],
    width:         SCREEN_H * 0.3,
    textAlign:     'center',
  },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: spacing.outerMargin,
    paddingVertical:   20,
  },
  headerTitle: {
    fontFamily:    'Epilogue',
    fontSize:      14,
    fontWeight:    '800',
    letterSpacing: 3,
    color:         colors.primary,
    textTransform: 'uppercase',
  },
  closeIcon: { fontSize: 18, color: colors.primary },
  divider:   { height: 1, backgroundColor: '#afb3ae', opacity: 0.15 },
  content:   { flex: 1 },

  splitRow:     { flex: 1, flexDirection: 'row' },
  leftPanel:    { width: '40%', flexDirection: 'row', backgroundColor: '#f4f4f0' },
  rightPanel:   { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  splitDivider: { width: 1, backgroundColor: '#afb3ae', opacity: 0.2 },
  photoContainer: { flex: 1, padding: 12, position: 'relative' },
  photo:          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  photoPlaceholder: { backgroundColor: '#e6e9e4' },

  resultLoadingWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16,
  },
  resultLoadingBox: { width: '75%', aspectRatio: 3/4, backgroundColor: '#2f3430' },
  generatingText: {
    fontFamily: 'Epilogue', fontSize: 11, fontWeight: '900',
    letterSpacing: 4, color: '#5c605c', textTransform: 'uppercase',
  },
  estimatedText: {
    fontFamily: 'Manrope', fontSize: 9, letterSpacing: 2,
    color: '#afb3ae', textTransform: 'uppercase', textAlign: 'center',
  },

  resultScroll:        { flex: 1 },
  resultScrollContent: { paddingHorizontal: spacing.outerMargin, paddingTop: 20 },
  sectionLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: 'Manrope', fontSize: 9, fontWeight: '700',
    letterSpacing: 3, color: '#5c605c', textTransform: 'uppercase',
  },
  sectionSubLabel: { fontFamily: 'Manrope', fontSize: 10, color: '#afb3ae', fontStyle: 'italic' },
  aiLabel:         { fontStyle: 'normal', fontWeight: '700', color: '#5c605c' },
  resultImageWrap: {
    width: '100%', aspectRatio: 3/4, backgroundColor: '#f4f4f0',
    overflow: 'hidden', position: 'relative',
  },
  resultImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  errorWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.outerMargin,
  },
  errorText: {
    fontFamily: 'Manrope', fontSize: 14, color: '#9e422c', textAlign: 'center', lineHeight: 22,
  },

  bottomBar: {
    backgroundColor: colors.background, paddingHorizontal: spacing.outerMargin, paddingTop: 8,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16,
  },
  toggleLabelWrap: { flex: 1, gap: 3 },
  toggleLabel:     { fontFamily: 'Manrope', fontSize: 13, fontWeight: '500', color: colors.primary },
  toggleSub:       { fontFamily: 'Manrope', fontSize: 10, color: '#afb3ae' },
  toggle:          { marginLeft: 12 },

  btnRow:      { flexDirection: 'row', gap: 8, paddingTop: 8, paddingBottom: 8 },
  retryBtn:    { flex: 1, paddingVertical: 16, borderWidth: 1, borderColor: '#afb3ae', alignItems: 'center' },
  retryBtnText:{ fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  saveBtn:     { flex: 1, paddingVertical: 16, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  saveBtnText: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  doneBtn:     { flex: 1, paddingVertical: 16, backgroundColor: colors.primary, alignItems: 'center' },
  doneBtnText: { fontFamily: 'Manrope', fontSize: 10, fontWeight: '700', color: colors.background, letterSpacing: 1.5, textTransform: 'uppercase' },
  btnDisabled:     { opacity: 0.3 },
  btnTextDisabled: { opacity: 0.4 },
});