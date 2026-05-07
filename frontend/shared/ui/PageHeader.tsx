// shared/ui/PageHeader.tsx

import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '@/shared/lib/tokens';

type Props = {
  title: string;
  subtitle?: string;
  subtitleLarge?: boolean;  // ← 추가
};

export function PageHeader({ title, subtitle, subtitleLarge = false }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && (
        <Text style={[
          styles.subtitle,
          subtitleLarge && styles.subtitleLarge,  // ← 추가
        ]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.outerMargin,
    paddingTop: 32,
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.title.fontFamily,
    fontSize: fonts.title.fontSize,
    letterSpacing: 3,
    color: 'black',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: fonts.bodyMd.fontFamily,
    fontSize: fonts.bodyMd.fontSize,
    lineHeight: fonts.bodyMd.lineHeight,
    color: colors.primaryMuted,
    marginTop: 6,
  },
  subtitleLarge: {
    fontFamily: fonts.headline.fontFamily,  // Epilogue_700Bold
    fontSize: fonts.headline.fontSize,      // 26
    lineHeight: fonts.headline.lineHeight,  // 30
    color: colors.primaryMuted,
    letterSpacing: -0.3,
    paddingTop: 52,
  },
})