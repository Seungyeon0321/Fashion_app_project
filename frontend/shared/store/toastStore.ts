import { create } from 'zustand'
import type { ToastType } from '../ui/Toast'

type ToastState = {
  visible: boolean
  message: string
  type: ToastType
  success: (message: string) => void
  error: (message: string, type?: ToastType) => void
  hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'error',

  success: (message) =>
    set({ visible: true, message, type: 'success' }),

  error: (message, type = 'error') =>
    set({ visible: true, message, type }),

  hide: () =>
    set({ visible: false }),
}))