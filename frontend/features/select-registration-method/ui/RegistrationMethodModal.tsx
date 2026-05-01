// features/select-registration-method/ui/RegistrationMethodModal.tsx

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Pressable,
  Modal,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing } from '@/shared/lib/tokens';
import { RegistrationMethodCard } from './RegistrationMethodCard';
import { REGISTRATION_METHODS, type RegistrationMethodId } from '../model/registrationMethods';

interface RegistrationMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMethod: (methodId: RegistrationMethodId) => void;
}

export function RegistrationMethodModal({
  visible,
  onClose,
  onSelectMethod,
}: RegistrationMethodModalProps) {
  const handleMethodPress = (methodId: RegistrationMethodId) => {
    onSelectMethod(methodId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>NEW ADDITION</Text>
          <View style={{ width: 40 }} /> {/* Spacer for center alignment */}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>Add to Wardrobe</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Curate your digital collection with{'\n'}high-fidelity item entries.
          </Text>

          {/* Method Cards */}
          <View style={styles.cardsContainer}>
            {REGISTRATION_METHODS.map((method) => (
              <RegistrationMethodCard
                key={method.id}
                method={method}
                onPress={() => handleMethodPress(method.id)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.outerMargin,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fonts.title.fontSize,
    color: colors.primary,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.outerMargin,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.outerMargin,
    paddingTop: 32,
  },
  title: {
    ...fonts.display,
    fontSize: 48,
    color: colors.primary,
    lineHeight: 56,
  },
  subtitle: {
    ...fonts.body,
    fontSize: 16,
    color: colors.hint,
    marginBottom: 10,
    lineHeight: 24,
  },
  cardsContainer: {
    marginTop: 8,
  },
});
