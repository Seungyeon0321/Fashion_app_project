import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';

export default function StylistPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Stylist Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  text: {
    ...fonts.body,
    color: colors.primary,
  },
});