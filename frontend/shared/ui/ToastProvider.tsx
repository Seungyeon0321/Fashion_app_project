// shared/ui/ToastProvider.tsx  ← 최종 버전

import { useToastStore } from '../store/toastStore'
import { Toast } from './Toast'
import { View, StyleSheet } from 'react-native'

export const ToastProvider = () => {
  const { visible, message, type, hide } = useToastStore()

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Toast
        visible={visible}
        message={message}
        type={type}
        onDismiss={hide}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position:  'absolute',
    top:       0,
    left:      0,
    right:     0,
    bottom:    0,
    zIndex:    9999,
    elevation: 9999,
  },
})