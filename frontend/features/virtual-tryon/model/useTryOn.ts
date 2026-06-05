import { useState, useCallback, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { postTryon, patchTryonPhoto, getUserMe, getTryonPhotoDisplayUrl } from '../api/tryonApi';

type TryonStatus = 'idle' | 'loading' | 'success' | 'error';

export type TryonTargetItem = {
  id:            number | string;
  imageUrl:      string;
  category:      string;
  is_external?:  boolean;
  closetItemId?: number;   // ← 추가: 내 옷장 아이템만 (DB cropS3Key 조회용)
};

export function useTryOn() {
  const [hasTryonPhotoFlag, setHasTryonPhotoFlag] = useState(false);
  const [displayPhotoUrl,   setDisplayPhotoUrl]   = useState<string | null>(null);
  const [isFetchingUser,    setIsFetchingUser]     = useState(false);

  useEffect(() => {
    setIsFetchingUser(true);
    getUserMe()
      .then(async (me) => {
        if (me.tryonPhotoUrl) {
          setHasTryonPhotoFlag(true);
          const presigned = await getTryonPhotoDisplayUrl();
          setDisplayPhotoUrl(presigned);
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingUser(false));
  }, []);

  const [status,       setStatus]       = useState<TryonStatus>('idle');
  const [resultUrl,    setResultUrl]    = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentItem,  setCurrentItem]  = useState<TryonTargetItem | null>(null);
  const [activeModelUrl, setActiveModelUrl] = useState<string | null>(null);
  const [useLayered,     setUseLayered]     = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const runTryon = useCallback(async (item: TryonTargetItem) => {
    setCurrentItem(item);
    setStatus('loading');
    setResultUrl(null);
    setErrorMessage(null);

    try {
      const result = await postTryon({
        // 내 옷장 아이템: closetItemId 전달 → NestJS가 cropS3Key presigned URL 생성
        // 외부 아이템: garment_url 직접 전달 (Naver 이미지)
        garment_url:    item.is_external ? item.imageUrl : undefined,
        closet_item_id: item.closetItemId,
        category:       item.category,
        model_image_url: useLayered ? activeModelUrl : null,
      });
      setResultUrl(result.result_url);
      setStatus('success');
    } catch (e: any) {
      setErrorMessage(e.message ?? 'Try-On failed. Please try again.');
      setStatus('error');
    }
  }, [useLayered, activeModelUrl]);

  const toggleLayered = useCallback((value: boolean) => {
    setUseLayered(value);
    if (value && resultUrl) setActiveModelUrl(resultUrl);
    else setActiveModelUrl(null);
  }, [resultUrl]);

  const pickAndUploadPhoto = useCallback(async (): Promise<string | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Gallery access permission is required.');
      return null;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect:        [3, 4],
      quality:       0.85,
    });

    if (picked.canceled) return null;

    const asset = picked.assets[0];
    setIsUploadingPhoto(true);

    try {
      await patchTryonPhoto(asset.uri, asset.mimeType ?? 'image/jpeg');
      setHasTryonPhotoFlag(true);
      setDisplayPhotoUrl(asset.uri);
      return asset.uri;
    } catch (e: any) {
      setErrorMessage(e.message ?? 'Photo upload failed. Please try again.');
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResultUrl(null);
    setErrorMessage(null);
    setCurrentItem(null);
  }, []);

  const resetSession = useCallback(() => {
    reset();
    setActiveModelUrl(null);
    setUseLayered(false);
  }, [reset]);

  return {
    status, resultUrl, errorMessage, currentItem,
    useLayered, activeModelUrl, isUploadingPhoto, isFetchingUser,
    hasTryonPhoto:  hasTryonPhotoFlag,
    tryonPhotoUrl:  displayPhotoUrl,
    runTryon, toggleLayered, pickAndUploadPhoto, reset, resetSession,
  };
}