import { useToastStore } from '../store/toastStore'
import { Toast } from './Toast'

export const ToastProvider = () => {
  const { visible, message, type, hide } = useToastStore()

  return (
    <Toast
      visible={visible}
      message={message}
      type={type}
      onDismiss={hide}
    />
  )
}