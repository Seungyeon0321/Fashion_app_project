import { api } from '@/shared/lib/api';

export type TryonResult      = { result_url: string; cached: boolean };
export type TryonPhotoResult = { tryonPhotoUrl: string };
export type UserMe           = {
  id: number; email: string; nickname: string | null; tryonPhotoUrl: string | null;
};

export async function getUserMe(): Promise<UserMe> {
  const res = await api.get('/auth/me');
  return res.data;
}

export async function getTryonPhotoDisplayUrl(): Promise<string | null> {
  const res = await api.get('/users/me/tryon-photo-url');
  return res.data.presignedUrl ?? null;
}

export async function postTryon(params: {
  garment_url?:    string;        // 외부 아이템 (Naver 이미지 URL)
  closet_item_id?: number;        // 내 옷장 아이템 (NestJS가 cropS3Key 조회)
  category:        string;
  model_image_url?: string | null;
}): Promise<TryonResult> {
  // 최소 하나는 있어야 함
  if (!params.garment_url && !params.closet_item_id) {
    throw new Error('garment_url or closet_item_id is required.');
  }

  const body: Record<string, any> = { category: params.category };

  if (params.garment_url)    body.garment_url    = params.garment_url;
  if (params.closet_item_id) body.closet_item_id = params.closet_item_id;
  if (params.model_image_url) body.model_image_url = params.model_image_url;

  try {
    const res = await api.post('/tryon', body, { timeout: 45_000 });
    return res.data;
  } catch (e: any) {
    if (e.response?.status === 409) {
      throw new Error('Try-On photo is not registered. Please register your photo first.');
    }
    throw e;
  }
}

export async function patchTryonPhoto(
  imageUri: string,
  mimeType: string = 'image/jpeg',
): Promise<TryonPhotoResult> {
  const formData = new FormData();
  formData.append('photo', { uri: imageUri, type: mimeType, name: 'tryon_photo.jpg' } as any);
  const res = await api.patch('/users/me/tryon-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 15_000,
  });
  return res.data;
}