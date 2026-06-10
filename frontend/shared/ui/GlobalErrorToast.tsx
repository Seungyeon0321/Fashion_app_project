// shared/ui/GlobalErrorToast.tsx  ← 신규 파일

import React from 'react';
import { useErrorStore } from '../store/errorStore';
import { Toast } from './Toast';

export function GlobalErrorToast() {
  const message    = useErrorStore((s) => s.message);
  const clearError = useErrorStore((s) => s.clearError);

  return (
    <Toast
      visible={!!message}
      message={message ?? ''}
      type="error"
      onDismiss={clearError}
    />
  );
}