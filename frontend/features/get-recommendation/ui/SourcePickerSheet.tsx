// features/get-recommendation/ui/SourcePickerSheet.tsx
//
// 디자인 기준: Stitch 생성 디자인
//   - 크럼: 둥근 pill (filled black / outlined / dimmed text)
//   - 카드: 컴팩트, 왼쪽 세로 액센트 바, 아이콘 상단 / 라벨 하단
//   - 하단: Button(primary) — disabled → 조건 충족 시 활성화
//   - SESSION / CANCEL 하단 행 (스티치 디자인 참고)
//
// 닫힘 애니메이션: isRendered 패턴으로 스르륵 내려감

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
import { Button } from '@/shared/ui/Button';
import {
  useSourcePickerStore,
  type RecommendSource,
  type AnchorClosetItem,
} from '@/features/get-recommendation/model/sourcePickerStore';
import { useIntentStore } from '@/features/select-intent/model/intentStore';
import { WardrobePickerModal } from '@/features/get-recommendation/ui/WardrobePickerModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.52;
const CLOSE_DURATION = 260;

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

  // 하단 버튼 라벨
  const confirmLabel = anchorItem != null
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
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
        </Animated.View>

        {/* 시트 */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* 드래그 핸들 */}
          <View style={styles.handle} />

          {/* 크럼 — pill 스타일 */}
          <View style={styles.crumbs}>
            {/* INTENT — filled black pill */}
            <View style={styles.pillFilled}>
              <Text style={styles.pillFilledText}>{intentLabel}</Text>
            </View>
            <Text style={styles.crumbArrow}>›</Text>

            {/* SOURCE */}
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

            {/* ANCHOR */}
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
                label={'MY\nCLOSET'}
                desc="Use items you already own"
                onPress={() => selectSource('closet')}
              />
              <SourceCard
                label={'SHOP\nOUTSIDE'}
                desc="Explore new pieces to buy"
                onPress={() => selectSource('external')}
              />
            </View>
          )}

          {/* ── STEP 2: 앵커 선택 ── */}
          {step === 'anchor' && (
            <View style={styles.AnchorCardRow}>
              <AnchorCard
                icon="＋"
                label={anchorItem != null
                  ? (anchorItem.name ?? anchorItem.category).toUpperCase()
                  : 'SET\nANCHOR'}
                desc={anchorItem != null ? 'TAP TO CHANGE' : '특정 아이템 기준 코디'}
                selected={anchorItem != null}
                onPress={() => setWardrobeVisible(true)}
              />
              <AnchorCard
                icon="✦"
                label={'NO\nANCHOR'}
                desc={source === 'closet' ? '옷장 전체 랜덤' : '전부 외부 아이템'}
                selected={anchorItem === null}
                onPress={() => selectAnchor(null)}
              />
            </View>
          )}

          {/* 하단 영역 — SESSION 정보 + 버튼 */}
          <View style={styles.footer}>
            <Button
              label={confirmLabel}
              onPress={handleConfirm}
              disabled={!confirmReady}
              variant="primary"
            />
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

// ── 소스 카드 ──
function SourceCard({
  label, desc, onPress,
}: {
  label: string; desc: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.cardAccentBar} />
      <View style={styles.cardBottom}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── 앵커 카드 ──
function AnchorCard({
  icon, label, desc, selected, onPress,
}: {
  icon: string; label: string; desc: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {selected && <View style={styles.cardAccentBar} />}
      <Text style={styles.cardIcon}>{icon}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
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
    backgroundColor: colors.background,  // #faf9f6
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 0,
    borderWidth: 1,
    borderColor: 'red'
  },

  // 핸들
  handle: {
    width: 40,
    height: 3,
    backgroundColor: colors.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  // 크럼 — 스티치 디자인 pill 스타일
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

  // 카드 영역
  cardRow: {
    flexDirection: 'column',
    gap: spacing.cardGap,         // 12
    paddingHorizontal: spacing.outerMargin,
    flex: 1,
    marginBottom: 0,
  },
  AnchorCardRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.cardGap,
    paddingHorizontal: spacing.outerMargin,
  },         // 12
  card: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,  // #ffffff
    borderRadius: 4,
    padding: 16,
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  cardIcon: {
    fontSize: 20,
    color: colors.primary,
    marginLeft: 4,
  },
  cardBottom: {
    gap: 6,
    paddingLeft: 4,
  },
  cardLabel: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  cardDesc: {
    ...fonts.caption,
    color: colors.primaryMuted,
    lineHeight: 16,
  },

  // 하단 푸터
  footer: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  footerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerMetaLabel: {
    ...fonts.caption,
    color: colors.hint,
    letterSpacing: 2,
  },
  footerMetaValue: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    letterSpacing: 1,
    color: colors.primaryMuted,
  },
});
