import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SettingsRow, SettingsRowProps } from '@/shared/ui/SettingsRow';

type SettingsSectionProps = {
  items: Omit<SettingsRowProps, 'showDivider'>[];
};

export function SettingsSection({ items }: SettingsSectionProps) {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <SettingsRow
          key={item.label}
          {...item}
          showDivider={index < items.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(175, 179, 174, 0.2)',
    paddingHorizontal: 4,
  },
});
