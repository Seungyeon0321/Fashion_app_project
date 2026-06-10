// features/virtual-tryon/ui/PhotoRegisterSheet.tsx  ← 기존 파일 수정

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
  const bottomInset = useBottomInset(24);

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

        <View style={[styles.sheet, { paddingBottom: bottomInset }]}>
          <View style={styles.handle} />

          {/* Person 아이콘 */}
          <View style={styles.iconWrap}>
            <View style={styles.iconHead} />
            <View style={styles.iconBody} />
          </View>

          <Text style={styles.headline}>
            YOUR PHOTO IS NEEDED{'\n'}TO START TRY-ON
          </Text>
          <Text style={styles.subtext}>
            Register a full-body photo and{'\n'}try on any outfit you like
          </Text>

          {/* Fashn.ai 공식 권장사항 기반 포토 팁 */}
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>TIPS FOR BEST RESULTS</Text>
            <Text style={styles.tipItem}>✓  Full body visible from head to toe</Text>
            <Text style={styles.tipItem}>✓  Arms slightly away, facing forward</Text>
            <Text style={styles.tipItem}>✓  Bright and simple background</Text>
            <Text style={styles.tipItem}>✗  Avoid thick outerwear like coats or hoodies</Text>
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
              <Text style={styles.primaryBtnText}>SELECT FROM GALLERY</Text>
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
  },

  handle: {
    width:           36,
    height:          3,
    backgroundColor: '#afb3ae',
    opacity:         0.35,
    borderRadius:    2,
    marginTop:       14,
    marginBottom:    44,
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
    fontFamily:    'Epilogue_700Bold',
    fontSize:      20,
    color:         colors.primary,
    textAlign:     'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight:    28,
    marginBottom:  12,
  },
  subtext: {
    fontFamily:   'Manrope_400Regular',
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
    fontFamily:    'Manrope_700Bold',
    fontSize:      10,
    color:         '#5c605c',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom:  4,
  },
  tipItem: {
    fontFamily: 'Manrope_400Regular',
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
    fontFamily:    'Manrope_700Bold',
    fontSize:      11,
    color:         colors.background,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  ghostBtn: {
    paddingVertical: 16,
    alignItems:      'center',
  },
  ghostBtnText: {
    fontFamily:    'Manrope_500Medium',
    fontSize:      10,
    color:         '#afb3ae',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});