// pages/stylist/ui/StylistPage.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '@/shared/lib/tokens';
import { IntentSelector } from '@/features/select-intent/ui/IntentSelector';
import { useIntentStore } from '@/features/select-intent/model/intentStore';
import { useRecommendation, RecommendationResponse } from '@/features/get-recommendation/api/useRecommendation';
import { RecommendationModal } from '@/features/get-recommendation/ui/RecommendationModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ScreenLayout } from '@/shared/ui/ScreenLayout';

export function StylistPage() {
  const selectedIntent = useIntentStore((s) => s.selectedIntent);
  const { mutate, isPending } = useRecommendation();

  const [modalVisible, setModalVisible] = useState(false);
  const [recommendationData, setRecommendationData] = useState<RecommendationResponse | null>(null);

  const handleRecommend = () => {
    if (!selectedIntent) return;
    mutate(selectedIntent, {
      onSuccess: (data) => {
        setRecommendationData(data);
        setModalVisible(true);
      },
      onError: (error) => {
        console.error('❌ recommendation error:', error.message);
      },
    });
  };

  return (
    <ScreenLayout hasFooter>
      <View style={styles.container}>

        <PageHeader
          title="SELECT YOUR INTENT"
          subtitle="Tell me your vibe — I'll match your wardrobe to the moment."
          subtitleLarge
        />

        <IntentSelector />

        {/* 하단 CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={[styles.ctaButton, (!selectedIntent || isPending) && styles.ctaDisabled]}
            onPress={handleRecommend}
            disabled={!selectedIntent || isPending}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaLabel}>
              {isPending ? 'FINDING YOUR STYLE...' : selectedIntent ? 'GET RECOMMENDED STYLES' : 'SELECT YOUR INTENT'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.ctaCaption}>AI-POWERED PERSONALIZED STYLING</Text>
        </View>

      </View>

      <RecommendationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        data={recommendationData}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },

  cta: {
    paddingHorizontal: spacing.outerMargin,
    gap: 12,
  },

  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: 'rgba(250,249,246,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'black',
  },

  ctaDisabled: {
    opacity: 0.4,
  },

  ctaLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: 'black',
  },

  ctaCaption: {
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    letterSpacing: 2,
    color: colors.primaryMuted,
    textTransform: 'uppercase',
  },
});