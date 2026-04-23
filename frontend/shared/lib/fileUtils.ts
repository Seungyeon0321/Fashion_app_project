import { Platform } from 'react-native';

export const getUploadFile = async (uri: string) => {
  if (Platform.OS === 'web') {
    // 웹은 메모리 상의 Blob이 필요함
    const res = await fetch(uri);
    return await res.blob();
  }

  // 네이티브는 경로(uri), 이름, 타입을 담은 객체만 있으면 FormData가 알아서 처리함
  return {
    uri: uri.startsWith('file://') ? uri : `file://${uri}`,
    name: 'upload.jpg',
    type: 'image/jpeg',
  } as any; 
};