import { create } from 'zustand'
import type { ToastType } from '../ui/Toast'

type ToastState = {
  visible: boolean
  message: string
  type: ToastType
  show: (message: string, type?: ToastType) => void
  hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'error',

  show: (message, type = 'error') =>
    set({ visible: true, message, type }),

  hide: () =>
    set({ visible: false }),
}))