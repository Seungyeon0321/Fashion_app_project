import { Photo } from "@/entities/media/model/types"
import { ENV } from "@/shared/util/env"

const API_URL = ENV.BACKEND_API_URL

export const uploadPhoto = async (photo: Photo) => {
    try {
        const result = await fetch(API_URL + '/api/media/upload', {
            method: 'POST',
            body: JSON.stringify(photo),
        })
        return result.json()
    } catch (error) {
        console.error(error)
        return null
    }
}