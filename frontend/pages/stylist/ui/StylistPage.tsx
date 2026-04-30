import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IntentSelector } from '@/features/select-intent/ui/IntentSelector';
import { useIntentStore } from '@/features/select-intent/model/intentStore';
import { colors, fonts } from '@/shared/lib/tokens';
import { useRecommendation, RecommendationResponse } from '@/features/get-recommendation/api/useRecommendation';
import { RecommendationModal } from '@/features/get-recommendation/ui/RecommendationModal';

export function StylistPage() {
  const router = useRouter();
  const selectedIntent = useIntentStore((s) => s.selectedIntent);
  const { mutate, isPending, isError, error } = useRecommendation();

  // 모달 상태
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <View style={styles.container}>

        {/* 상단 설명 */}
        <View style={styles.header}>
          <Text style={styles.tagline}>SELECT YOUR INTENT</Text>
          <Text style={styles.description}>
            Tell me your vibe — I&apos;ll match your wardrobe to the moment.
          </Text>
        </View>

        {/* Intent 선택 버튼들 */}
        <IntentSelector />

        {/* 하단 CTA */}
        <View style={styles.cta}>
          <TouchableOpacity
            style={[styles.ctaButton, (!selectedIntent || isPending) && styles.ctaDisabled]}
            onPress={handleRecommend}
            disabled={!selectedIntent}
            activeOpacity={0.9}
          >
            <Text style={styles.ctaLabel}>
              {isPending ? 'FINDING YOUR STYLE...' : selectedIntent ? 'GET RECOMMENDED STYLES' : 'SELECT YOUR INTENT'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.ctaCaption}>AI-POWERED PERSONALIZED STYLING</Text>
        </View>

      </View>

      {/* 모달 */}
      <RecommendationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        data={recommendationData}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  header: {
    flex: 0.3,
    justifyContent: 'space-between',
  },
  tagline: {
    fontFamily: fonts.title.fontFamily,
    fontSize: fonts.title.fontSize,
    letterSpacing: 3,
    color: colors.primaryMuted,
    textTransform: 'uppercase',
  },
  description: {
    fontFamily: fonts.headline.fontFamily,
    fontSize: fonts.headline.fontSize,
    lineHeight: fonts.headline.lineHeight,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  cta: {
    gap: 12,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: 'rgba(250,249,246,0.9)', // #faf9f6 with slight transparency
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
