import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  rightText?: string;
  onPress: () => void;
  showDivider?: boolean;
};

export function SettingsRow({
  icon,
  label,
  rightText,
  onPress,
  showDivider = true,
}: SettingsRowProps) {
  return (
    <>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
        <View style={styles.left}>
          <Ionicons name={icon} size={20} color="#5c605c" style={styles.icon} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.right}>
          {rightText && <Text style={styles.rightText}>{rightText}</Text>}
          <Ionicons name="chevron-forward" size={16} color="#afb3ae" />
        </View>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  icon: {
    width: 24,
    textAlign: 'center',
  },
  label: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#2f3430',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#5c605c',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(175, 179, 174, 0.15)',
  },
});
