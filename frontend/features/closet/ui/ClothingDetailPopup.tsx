// features/closet/ui/ClothingDetailPopup.tsx
//
// 옷 등록 완료 후 표시되는 Heads-up 팝업
// 목적: fabric/fit 정보를 각 clothing card에서 입력하도록 안내
// 입력은 여기서 받지 않음 — 옷 카드의 상세 필드에서 처리
//
// 버튼:
//   [Got it]               → 팝업 닫기
//   [Don't show this again] → AsyncStorage 플래그 저장 후 닫기

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useBottomInset } from '@/shared/lib/useBottomInset'

const DONT_SHOW_KEY = 'dontShowClothingDetailPopup'

type Props = {
  visible: boolean
  onClose: () => void
}

export function ClothingDetailPopup({ visible, onClose }: Props) {
  const bottomInset = useBottomInset(24)

  const handleDontShow = async () => {
    await AsyncStorage.setItem(DONT_SHOW_KEY, 'true')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: bottomInset }]}
          onPress={() => {}}
        >
          {/* 드래그 핸들 */}
          <View style={styles.handle} />

          {/* 타이틀 */}
          <Text style={styles.title}>Make your outfit smarter</Text>

          {/* 본문 */}
          <Text style={styles.body}>
            Adding fabric and fit details to each item helps AI recommend outfits that truly match your style.
            {'\n\n'}
            You can find these fields on each clothing card below.
          </Text>

          {/* 힌트 박스 */}
          <View style={styles.hintBox}>
            <Text style={styles.hintItem}>· Fabric type (cotton, wool, linen...)</Text>
            <Text style={styles.hintItem}>· Fit (slim, regular, oversized...)</Text>
          </View>

          {/* Got it 버튼 */}
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Got it</Text>
          </TouchableOpacity>

          {/* Don't show this again */}
          <TouchableOpacity onPress={handleDontShow} activeOpacity={0.6}>
            <Text style={styles.dontShowText}>Don't show this again</Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── 팝업 표시 여부 확인 유틸 ──────────────────────────────────────────
export async function shouldShowClothingDetailPopup(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(DONT_SHOW_KEY)
  return flag !== 'true'
}

// ── 스타일 ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#faf9f6',   // colors.background
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 24,        // spacing.outerMargin
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0ddd8',   // colors.divider
    alignSelf: 'center',
    marginBottom: 24,
  },

  title: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 22,
    color: '#1a1a1a',             // colors.primary
    marginBottom: 10,
  },
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,                 // fonts.body
    color: '#5f5e5e',             // colors.primaryMuted
    lineHeight: 22,
    marginBottom: 16,
  },

  hintBox: {
    backgroundColor: '#f4f4f0',   // colors.surface
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 28,
    gap: 6,
  },
  hintItem: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#5f5e5e',             // colors.primaryMuted
    lineHeight: 20,
  },

  btnPrimary: {
    backgroundColor: '#1a1a1a',   // colors.primary
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnPrimaryText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    color: '#ffffff',
  },

  dontShowText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,                 // fonts.caption
    color: '#aaaaaa',             // colors.hint
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 8,
  },
})
