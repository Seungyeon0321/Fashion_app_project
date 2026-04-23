import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

type LogoutButtonProps = {
  onPress: () => void;
};

export function LogoutButton({ onPress }: LogoutButtonProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={styles.button}>
        <Text style={styles.label}>LOG OUT</Text>
        <Text style={styles.subtext}>END CURRENT SESSION</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 8,
  },
  button: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: 'Epilogue_800ExtraBold',
    fontSize: 13,
    letterSpacing: 2,
    color: '#9e422c',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    paddingBottom: 2,
  },
  subtext: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#afb3ae',
    textTransform: 'uppercase',
  },
});
