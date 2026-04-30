import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Button } from '@/shared/ui/Button';
import { RecommendationResponse } from '../api/useRecommendation';
import { useCanvasStore } from '../model/canvasStore';
import { MoodboardCanvas } from './MoodboardCanvas';
import { ItemTray } from './ItemTray';
import { colors, fonts } from '@/shared/lib/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  data: RecommendationResponse | null;
};

export function RecommendationModal({ visible, onClose, data }: Props) {
  const [commentExpanded, setCommentExpanded] = useState(false);
  const animValue = useRef(new Animated.Value(0)).current;
  const { initFromResponse, reset } = useCanvasStore();

  useEffect(() => {
    if (visible && data) {
      initFromResponse(data);
    }
    return () => {
      reset();
    };
  }, [visible, data]);

  const handleExpandComment = () => {
    const toValue = commentExpanded ? 0 : 1;
    Animated.timing(animValue, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setCommentExpanded(!commentExpanded);
  };

  const expandedHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [44, 200], // 접힌 높이 → 펼쳐진 높이
  });

  if (!data) return null;

  const cleanComment = data.final_response
    .replace(/^#+\s/gm, '')
    .replace(/\*\*/g, '');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={styles.container}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>STUDIO CANVAS</Text>
          <Button
            label="✕"
            onPress={onClose}
            variant="text"
            style={styles.closeBtn}
          />
        </View>

        {/* AI 코멘트 — 탭하면 스으륵 펼쳐짐 */}
        <TouchableOpacity
          onPress={handleExpandComment}
          activeOpacity={0.8}
          style={styles.commentWrapper}
        >
          <Animated.View style={{ height: expandedHeight, overflow: 'hidden' }}>
            <Text style={styles.commentText}>
              {cleanComment}
            </Text>
          </Animated.View>
          <Text style={styles.commentMore}>
            {commentExpanded ? '↑ CLOSE' : '↓ TAP TO READ MORE'}
          </Text>
        </TouchableOpacity>

        {/* 캔버스 */}
        <MoodboardCanvas />

        {/* 하단 트레이 + Save 버튼 */}
        <View style={styles.bottom}>
          <ItemTray />
          <Button
            label="SAVE OUTFIT"
            onPress={() => {}}
            variant="primary"
            style={styles.saveBtn}
          />
        </View>

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  title: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 18,
    letterSpacing: 2,
    color: '#1a1a1a',
  },
  closeBtn: {
    width: 'auto',
    paddingVertical: 0,
  },
  commentWrapper: {
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
  },
  commentText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 20,
    color: '#5f5e5e',
  },
  commentMore: {
    ...fonts.tab,
    color: colors.hint,
    letterSpacing: 1,
    marginTop: 6,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
  },
  saveBtn: {
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
});