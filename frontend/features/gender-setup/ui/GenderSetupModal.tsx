// features/gender-setup/ui/GenderSetupModal.tsx

import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '@/shared/lib/tokens';
import { useUpdateGender } from '../api/useUpdateGender';
import type { Gender } from '../model/type';
const GENDER_OPTIONS: { key: Gender; label: string }[] = [
  { key: 'MALE', label: 'MALE' },
  { key: 'FEMALE', label: 'FEMALE' },
  { key: 'UNISEX', label: 'UNISEX' },
];

type Props = {
  visible: boolean;
};

export function GenderSetupModal({ visible }: Props) {
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const { mutate: updateGender, isPending } = useUpdateGender();

  const handleConfirm = () => {
    if (!selectedGender) return;
    updateGender(selectedGender);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>ONE MORE THING</Text>
          <Text style={styles.subtitle}>
            Select your style preference to personalize your experience.
          </Text>

          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setSelectedGender(option.key)}
                style={[
                  styles.genderBtn,
                  selectedGender === option.key && styles.genderBtnSelected,
                ]}
              >
                <Text
                  style={[
                    styles.genderBtnText,
                    selectedGender === option.key && styles.genderBtnTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[
              styles.confirmBtn,
              (!selectedGender || isPending) && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedGender || isPending}
          >
            <Text style={styles.confirmBtnText}>
              {isPending ? 'SAVING...' : 'CONFIRM'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.outerMargin,
  },
  box: {
    backgroundColor: colors.background,
    padding: 32,
    width: '100%',
  },
  title: {
    ...fonts.brand,
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    ...fonts.bodyMd,
    color: colors.primaryMuted,
    marginBottom: 24,
    lineHeight: 20,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  genderBtnSelected: {
    borderColor: colors.accentRed,
    backgroundColor: 'rgba(226,75,74,0.08)',
  },
  genderBtnText: {
    ...fonts.label,
    color: colors.hint,
    letterSpacing: 2,
  },
  genderBtnTextSelected: {
    color: colors.accentRed,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    ...fonts.label,
    color: colors.surfaceHigh,
    letterSpacing: 1.2,
  },
});