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

// CUSTOM 레퍼런스 업로드
// multipart/form-data로 이미지 전송
// 서버에서 S3 업로드 + DB 저장 + CLIP 인코딩 (비동기) 처리
export const uploadCustomStyle = async (
  imageUri: string,
  mimeType: string = 'image/jpeg',
): Promise<{ id: number; imageUrl: string }> => {
  const formData = new FormData()
 
  // React Native FormData는 파일을 { uri, type, name } 객체로 전달
  // uri: 로컬 파일 경로 (ImagePicker가 반환한 값)
  // type: MIME 타입
  // name: 서버에서 파일명으로 인식 (아무 이름이나 가능)
  formData.append('image', {
    uri:  imageUri,
    type: mimeType,
    name: 'reference.jpg',
  } as any)
 
   
  console.log('Uploading custom style with formData:', formData)
  const res = await api.post('/style-reference/custom', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
 
  return res.data
}
 
// CUSTOM 레퍼런스 삭제
export const deleteCustomStyle = async (
  referenceId: number,
): Promise<{ deleted: number }> => {
  const res = await api.delete(`/style-reference/custom/${referenceId}`)
  return res.data
}