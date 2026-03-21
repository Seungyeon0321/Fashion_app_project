import { Photo } from "@/entities/media/model/types"
import { ENV } from "@/shared/util/env"

const API_URL = ENV.BACKEND_API_URL

export const uploadPhoto = async (photo: Photo) => {
    if (!photo) return null;

    // 해당 구조는 react-native에서만 가능한 구조임
    // 원래는 formData.append('image', photo.uri) 이런 식으로 추가함
    const formData = new FormData();
    formData.append('image', {
        uri: photo.uri,
        name: `${Date.now()}.jpg`,
        type: 'image/jpeg',
    } as unknown as Blob);

    try {
        const response = await fetch(API_URL + '/posts', {
            method: 'POST',
            body: formData,
        });

        // return response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}