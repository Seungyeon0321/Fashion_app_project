// features/auth/components/TabSwitcher.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Tab = 'signup' | 'signin';

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
};

export function TabSwitcher({ active, onChange }: Props) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'signup', label: 'Sign Up' },
    { key: 'signin', label: 'Sign In' },
  ];

  return (
    <View style={styles.row}>
      {tabs.map(({ key, label }) => (
        <TouchableOpacity key={key} onPress={() => onChange(key)}>
          <Text style={[styles.tab, active === key && styles.tabActive]}>
            {label}
          </Text>
          {active === key && <View style={styles.underline} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom: 28,
  },
  tab: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase',
    paddingBottom: 12,
  },
  tabActive: { color: 'rgba(255,255,255,0.9)' },
  underline: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginTop: -1,
  },
});