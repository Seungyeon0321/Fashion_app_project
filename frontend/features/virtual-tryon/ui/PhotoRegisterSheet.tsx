// features/virtual-tryon/ui/PhotoRegisterSheet.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useBottomInset } from '@/shared/lib/useBottomInset';
import { colors, spacing } from '@/shared/lib/tokens';

type Props = {
  visible: boolean;
  isUploading: boolean;
  onSelectPhoto: () => void;
  onDismiss: () => void;
};

export function PhotoRegisterSheet({
  visible,
  isUploading,
  onSelectPhoto,
  onDismiss,
}: Props) {
  const bottomInset = useBottomInset(24); // 최소 24px (다른 바텀시트 컴포넌트와 통일)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onDismiss}
          activeOpacity={1}
        />

        {/* bottomInset을 paddingBottom으로 직접 주입 */}
        <View style={[styles.sheet, { paddingBottom: bottomInset }]}>
          <View style={styles.handle} />

          {/* Person 아이콘 */}
          <View style={styles.iconWrap}>
            <View style={styles.iconHead} />
            <View style={styles.iconBody} />
          </View>

          <Text style={styles.headline}>
            TRY-ON을 시작하려면{'\n'}내 사진이 필요해요
          </Text>
          <Text style={styles.subtext}>
            전신이 잘 보이는 사진을 등록하면{'\n'}어떤 옷이든 입혀볼 수 있어요
          </Text>

          {/* Fashn.ai 공식 권장사항 기반 포토 팁 */}
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>사진 잘 찍는 법</Text>
            <Text style={styles.tipItem}>✓  머리부터 발끝까지 전신이 나오게</Text>
            <Text style={styles.tipItem}>✓  팔을 몸에서 살짝 떼고 정면 포즈</Text>
            <Text style={styles.tipItem}>✓  밝고 단순한 배경</Text>
            <Text style={styles.tipItem}>✗  코트·후드 등 두꺼운 겉옷 피하기</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, isUploading && styles.primaryBtnDisabled]}
            onPress={onSelectPhoto}
            disabled={isUploading}
            activeOpacity={0.85}
          >
            {isUploading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>갤러리에서 사진 선택</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={onDismiss}
            disabled={isUploading}
            activeOpacity={0.6}
          >
            <Text style={styles.ghostBtnText}>LATER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(15, 15, 15, 0.5)',
    justifyContent:  'flex-end',
  },
  backdrop: { flex: 1 },

  sheet: {
    backgroundColor:   colors.background,
    paddingHorizontal: spacing.outerMargin,
    alignItems:        'center',
    // paddingBottom: bottomInset (동적 주입)
  },

  handle: {
    width:        36,
    height:       3,
    backgroundColor: '#afb3ae',
    opacity:      0.35,
    borderRadius: 2,
    marginTop:    14,
    marginBottom: 44,
  },

  iconWrap: {
    alignItems:   'center',
    marginBottom: 32,
    gap:          4,
  },
  iconHead: {
    width:        44,
    height:       44,
    borderRadius: 22,
    borderWidth:  1.5,
    borderColor:  colors.primary,
  },
  iconBody: {
    width:                72,
    height:               38,
    borderTopLeftRadius:  36,
    borderTopRightRadius: 36,
    borderWidth:          1.5,
    borderColor:          colors.primary,
    borderBottomWidth:    0,
  },

  headline: {
    fontFamily:    'Epilogue',
    fontSize:      20,
    fontWeight:    '800',
    color:         colors.primary,
    textAlign:     'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight:    28,
    marginBottom:  12,
  },
  subtext: {
    fontFamily:   'Manrope',
    fontSize:     13,
    color:        '#777c77',
    textAlign:    'center',
    lineHeight:   20,
    marginBottom: 20,
  },

  tipsBox: {
    width:           '100%',
    backgroundColor: '#f4f4f0',
    padding:         16,
    marginBottom:    36,
    gap:             6,
  },
  tipsTitle: {
    fontFamily:    'Manrope',
    fontSize:      10,
    fontWeight:    '700',
    color:         '#5c605c',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom:  4,
  },
  tipItem: {
    fontFamily: 'Manrope',
    fontSize:   12,
    color:      '#5c605c',
    lineHeight: 18,
  },

  primaryBtn: {
    width:           '100%',
    backgroundColor: colors.primary,
    paddingVertical: 18,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    8,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: {
    fontFamily:    'Manrope',
    fontSize:      11,
    fontWeight:    '700',
    color:         colors.background,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  ghostBtn: {
    paddingVertical: 16,
    alignItems:      'center',
  },
  ghostBtnText: {
    fontFamily:    'Manrope',
    fontSize:      10,
    color:         '#afb3ae',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});