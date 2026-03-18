import { File } from 'expo-file-system'
import { useCallback } from 'react'

export const useImageQualityCheck = () => {
    const checkImageQuality = useCallback(async (uri: string, max: number, minimum: number): Promise<{ valid: boolean; message?: string }> => {
        
        // for web, we need to check the base64 data
        if(uri.startsWith('data:')) {
            const base64Data = uri.split(',')[1];
            if (!base64Data) {
                return { valid: false, message: "Invalid base64 data" };
            }

            let padding = 0;

            if (base64Data.endsWith('==')) {
                padding = 2;
            } else if (base64Data.endsWith('=')) {
                padding = 1;
            }

            const sizeInBytes = (base64Data.length * 0.75) - padding; // base64 data is 75% of the original size

           
            if (sizeInBytes < minimum || sizeInBytes > max) {
                return { valid: false, message: "File size is not within the range of 100KB - 10MB" };
            }
            return { valid: true };
        }

        const file = new File(uri) 

        if (!file.exists) {
            return { valid: false, message: "File does not exist" };
        }

        const fileSize = file.size;
        if (fileSize < minimum || fileSize > max) {
            return { valid: false, message: "File size is not within the range of 100KB - 10MB" };
        }
        return { valid: true };
    }, [])

    return { checkImageQuality };
}
