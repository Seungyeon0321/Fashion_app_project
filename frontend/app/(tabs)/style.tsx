import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/shared/lib/tokens';

export default function StyleTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Style</Text>
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