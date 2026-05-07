// features/select-registration-method/ui/RegistrationMethodCard.tsx

import React from 'react';
import { StyleSheet, Text, View, ImageBackground, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '@/shared/lib/tokens';
import type { RegistrationMethod } from '../model/registrationMethods';

interface RegistrationMethodCardProps {
  method: RegistrationMethod;
  onPress: () => void;
}



export function RegistrationMethodCard({ method, onPress }: RegistrationMethodCardProps) {
  return (
    <Pressable
      onPress={method.enabled ? onPress : undefined}
      style={({ pressed }) => [
        styles.card,
        !method.enabled && styles.cardDisabled,
        pressed && method.enabled && styles.cardPressed,
      ]}
      disabled={!method.enabled}
    >
      <ImageBackground
        source={method.image}
        style={styles.imageBackground}
        imageStyle={styles.imageStyle}
      >
        {/* Dark overlay */}
        <View style={[styles.overlay, !method.enabled && styles.overlayDisabled]} />

        {/* Icon (top right) */}
        <View style={styles.iconContainer}>
          <Feather
            name={method.icon as any}
            size={24}
            color={method.enabled ? colors.primary : colors.hint}
          />
        </View>

        {/* Coming Soon Badge */}
        {method.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{method.badge}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              !method.enabled && styles.titleDisabled,
            ]}
          >
            {method.title}
          </Text>
          <Text
            style={[
              styles.subtitle,
              !method.enabled && styles.subtitleDisabled,
            ]}
          >
            {method.subtitle}
          </Text>
        </View>

        {/* Arrow indicator (right side) */}
        {method.enabled && (
          <View style={styles.arrowContainer}>
            <Feather name="arrow-right" size={20} color={colors.surfaceHigh} />
          </View>
        )}

        {/* Lock icon for disabled */}
        {!method.enabled && (
          <View style={styles.lockContainer}>
            <Feather name="lock" size={16} color={colors.hint} />
          </View>
        )}
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 180,
    borderRadius: radius.fab,
    overflow: 'hidden',
    marginBottom: spacing.cardGap,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.8,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: radius.fab,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  overlayDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  iconContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    ...fonts.label,
    color: colors.primary,
  },
  content: {
    padding: spacing.outerMargin - 4, // 20px
    paddingBottom: spacing.outerMargin,
  },
  title: {
    ...fonts.title,
    color: colors.surfaceHigh,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  titleDisabled: {
    color: colors.tabInactive,
  },
  subtitle: {
    ...fonts.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  subtitleDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  arrowContainer: {
    position: 'absolute',
    right: 20,
    bottom: spacing.outerMargin,
  },
  lockContainer: {
    position: 'absolute',
    right: 20,
    bottom: spacing.outerMargin,
  },
});
