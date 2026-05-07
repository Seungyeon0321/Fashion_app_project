import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getStylePresets, savePresetStyles } from '../api/styleReferenceApi';
import { useToastStore } from '@/shared/store/toastStore';
import { PresetKey } from './types';

export function useStylePresets() {
  const [selected, setSelected] = useState<PresetKey[]>([]);
  const showToast = useToastStore((s) => s.show);

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['stylePresets'],
    queryFn: getStylePresets,
  });

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => savePresetStyles(selected),
    onSuccess: () => showToast('Style saved!'),
    onError: () => showToast('Failed to save. Try again.'),
  });

  const toggle = (key: PresetKey) => {
    setSelected((prev) => {
      const isSelected = prev.includes(key);
      if (isSelected) return prev.filter((k) => k !== key);
      if (prev.length >= 3) {
        showToast('Up to 3 styles only');
        return prev;
      }
      return [...prev, key];
    });
  };

  return { presets, isLoading, selected, toggle, save, isSaving };
}