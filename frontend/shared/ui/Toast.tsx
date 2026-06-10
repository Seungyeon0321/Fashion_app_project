// shared/ui/Toast.tsx  ← 최종 버전

import { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, StyleSheet, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type ToastType = 'error' | 'warning' | 'success' | 'pending'

type Props = {
  visible: boolean
  message: string
  type?: ToastType
  onDismiss?: () => void
  style?: ViewStyle
}

const COLORS: Record<ToastType, string> = {
  error:   '#e24b4a',
  warning: '#c47c2b',
  success: '#2d6a4f',
  pending: 'rgba(250,249,246,0.15)',
}

const ICONS: Record<ToastType, string> = {
  error:   '✕',
  warning: '⚠',
  success: '✓',
  pending: '↻',
}

export const Toast = ({
  visible,
  message,
  type = 'error',
  onDismiss,
  style,
}: Props) => {
  const insets     = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(-80)).current
  const opacity    = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue:         0,
          useNativeDriver: true,
          tension:         80,
          friction:        12,
        }),
        Animated.timing(opacity, {
          toValue:         1,
          duration:        200,
          useNativeDriver: true,
        }),
      ]).start()

      if (type !== 'pending' && onDismiss) {
        const timer = setTimeout(onDismiss, 3000)
        return () => clearTimeout(timer)
      }
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue:         -80,
          duration:        200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:         0,
          duration:        200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible, type])

  if (!visible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 16 },
        { backgroundColor: COLORS[type] },
        { transform: [{ translateY }], opacity },
        style,
      ]}
    >
      <Text style={styles.icon}>{ICONS[type]}</Text>
      <Text style={styles.message} numberOfLines={1}>{message}</Text>
      {onDismiss && type !== 'pending' && (
        <Pressable onPress={onDismiss} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position:          'absolute',
    left:              24,
    right:             24,
    zIndex:            9999,
    elevation:         9999,
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   16,
    paddingHorizontal: 16,
    gap:               12,
  },
  icon: {
    fontFamily: 'Manrope_500Medium',
    fontSize:   14,
    color:      '#faf9f6',
  },
  message: {
    flex:          1,
    fontFamily:    'Manrope_500Medium',
    fontSize:      12,
    letterSpacing: 1.5,
    color:         '#faf9f6',
  },
  close: {
    fontFamily: 'Manrope_500Medium',
    fontSize:   12,
    color:      'rgba(250,249,246,0.6)',
  },
})