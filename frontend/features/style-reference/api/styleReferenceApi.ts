import { api } from '@/shared/lib/api'
import type { PresetKey, StylePreset } from '../model/types'

export const getStylePresets = async (): Promise<StylePreset[]> => {
  const res = await api.get('/style-reference/presets')
  return res.data
}

export const savePresetStyles = async (
  presetKeys: PresetKey[],
): Promise<{ saved: number }> => {
  const res = await api.post('/style-reference/preset', { presetKeys })
  return res.data
}