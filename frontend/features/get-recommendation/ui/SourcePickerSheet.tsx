// features/get-recommendation/ui/SourcePickerSheet.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { colors, fonts, spacing } from '@/shared/lib/tokens';
import { useBottomInset } from '@/shared/lib/useBottomInset';
import {
  useSourcePickerStore,
  type RecommendSource,
  type AnchorClosetItem,
} from '@/features/get-recommendation/model/sourcePickerStore';
import { useIntentStore } from '@/features/select-intent/model/intentStore';
import { WardrobePickerModal } from '@/features/get-recommendation/ui/WardrobePickerModal';
import { SourceCard } from '@/features/get-recommendation/ui/SourceCard';
import { AnchorCard } from '@/features/get-recommendation/ui/AnchorCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.62;
const CLOSE_DURATION = 260;

const S3 = 'https://my-fashion-app-media.s3.ca-central-1.amazonaws.com';

type Props = {
  onConfirm: (params: {
    source: RecommendSource;
    anchorItem: AnchorClosetItem | null;
  }) => void;
};

export function SourcePickerSheet({ onConfirm }: Props) {
  const {
    isSheetVisible,
    step,
    source,
    anchorItem,
    closeSheet,
    selectSource,
    selectAnchor,
    goBack,
    reset,
  } = useSourcePickerStore();

  const selectedIntent = useIntentStore((s) => s.selectedIntent);
  const bottomPadding = useBottomInset();
  const [wardrobeVisible, setWardrobeVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dimAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSheetVisible) {
      setIsRendered(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(dimAnim, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: CLOSE_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dimAnim, {
          toValue: 0,
          duration: CLOSE_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsRendered(false);
          reset();
        }
      });
    }
  }, [isSheetVisible]);

  const handleClose = () => closeSheet();

  const handleConfirm = () => {
    if (!source || anchorItem === undefined) return;
    onConfirm({ source, anchorItem });
    closeSheet();
  };

  const handleAnchorSelected = (item: AnchorClosetItem) => {
    selectAnchor(item);
    setWardrobeVisible(false);
  };

  const confirmReady = source !== null && anchorItem !== undefined;

  const intentLabel = selectedIntent?.toUpperCase() ?? '—';
  const sourceLabel =
    source === 'closet' ? 'CLOSET' : source === 'external' ? 'OUTSIDE' : null;
  const anchorLabel =
    anchorItem != null
      ? (anchorItem.name ?? anchorItem.category).toUpperCase()
      : null;

  const backdropOpacity = dimAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  const confirmLabel =
    anchorItem != null
      ? `STYLE WITH "${(anchorItem.name ?? anchorItem.category).toUpperCase()}"`
      : step === 'anchor'
      ? 'CONFIRM — NO ANCHOR'
      : 'SELECT A SOURCE';

  if (!isRendered) return null;

  return (
    <>
      <Modal
        transparent
        visible={isRendered}
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {/* 딤 배경 */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* 시트 */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          <View style={styles.handle} />

          {/* 크럼 */}
          <View style={styles.crumbs}>
            <View style={styles.pillFilled}>
              <Text style={styles.pillFilledText}>{intentLabel}</Text>
            </View>
            <Text style={styles.crumbArrow}>›</Text>

            {sourceLabel ? (
              <TouchableOpacity
                style={styles.pillFilled}
                onPress={() => step === 'anchor' && goBack()}
              >
                <Text style={styles.pillFilledText}>{sourceLabel}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.pillOutlined}>
                <Text style={styles.pillOutlinedText}>SOURCE</Text>
              </View>
            )}
            <Text style={styles.crumbArrow}>›</Text>

            {anchorLabel ? (
              <View style={styles.pillFilled}>
                <Text style={styles.pillFilledText}>{anchorLabel}</Text>
              </View>
            ) : (
              <Text style={[styles.pillDimText, step === 'anchor' && styles.pillDimTextActive]}>
                ANCHOR
              </Text>
            )}
          </View>

          {/* ── STEP 1: 소스 선택 ── */}
          {step === 'source' && (
            <View style={styles.cardRow}>
              <SourceCard
                imageUrl={`${S3}/myCloset.webp`}
                label={'MY\nCLOSET'}
                desc="Use items you already own"
                onPress={() => selectSource('closet')}
              />
              <SourceCard
                imageUrl={`${S3}/shopOutside.webp`}
                label={'SHOP\nOUTSIDE'}
                desc="Explore new pieces to buy"
                onPress={() => selectSource('external')}
              />
            </View>
          )}

          {/* ── STEP 2: 앵커 선택 ── */}
          {step === 'anchor' && (
            <View style={styles.anchorCardRow}>
              {/* SET ANCHOR: 아이템 선택 시 해당 이미지가 배경으로 표시 */}
              <AnchorCard
                lines={
                  anchorItem != null
                    ? [(anchorItem.name ?? anchorItem.category).toUpperCase()]
                    : ['SET', 'ANCHOR']
                }
                icon="+"
                desc={
                  anchorItem != null
                    ? 'TAP TO CHANGE'
                    : 'Pin one item — the rest will be styled around it'
                }
                selected={anchorItem != null}
                imageUrl={anchorItem?.imageUrl}
                onPress={() => setWardrobeVisible(true)}
              />
              {/* NO ANCHOR: 항상 흰 배경 */}
              <AnchorCard
                lines={['NO', 'ANCHOR']}
                icon="✦"
                desc={
                  source === 'closet'
                    ? 'Let AI freely pick from your entire wardrobe'
                    : 'Get a full outfit sourced from outside shops'
                }
                selected={anchorItem === null}
                onPress={() => selectAnchor(null)}
              />
            </View>
          )}

          {/* 하단 CTA */}
          <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
            <TouchableOpacity
              style={[styles.ctaButton, !confirmReady && styles.ctaDisabled]}
              onPress={handleConfirm}
              disabled={!confirmReady}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaLabel}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </Modal>

      <WardrobePickerModal
        visible={wardrobeVisible}
        onClose={() => setWardrobeVisible(false)}
        pickerMode="single"
        onSelectSingle={handleAnchorSelected}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 3,
    backgroundColor: colors.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  crumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.outerMargin,
    paddingVertical: 16,
    gap: 8,
  },
  pillFilled: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillFilledText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.background,
  },
  pillOutlined: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillOutlinedText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary,
  },
  pillDimText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.hint,
  },
  pillDimTextActive: {
    color: colors.primaryMuted,
  },
  crumbArrow: {
    ...fonts.body,
    color: colors.hint,
  },
  cardRow: {
    flexDirection: 'column',
    gap: spacing.cardGap,
    paddingHorizontal: spacing.outerMargin,
    flex: 1,
  },
  anchorCardRow: {
    flexDirection: 'row',
    gap: spacing.cardGap,
    paddingHorizontal: spacing.outerMargin,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 16,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: 'rgba(250,249,246,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'black',
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: 'black',
  },
});
