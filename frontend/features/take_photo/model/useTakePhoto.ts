import { useState, useCallback, RefObject } from "react";
import { CameraView } from "expo-camera";
import { Photo } from "@/entities/media/model/types";
import { useImageQualityCheck } from "@/shared/lib/hooks/useImageQualityCheck";
import { SaveFormat, ImageManipulator } from "expo-image-manipulator";
import { useCameraFrame } from "./useCameraFrame";
import { uploadPhoto } from "../api/uploadPhoto";

export type ValidationStatus = "pending" | "valid" | "invalid";

const FILE_SIZE = {
    before : {
        max: 10 * 1024 * 1024, // 10MB
        minimum: 100 * 1024, // 100KB
    }
};

export const useTakePhoto = (ref: RefObject<CameraView>) => {
    const { checkImageQuality } = useImageQualityCheck();
    const [photo, setPhoto] = useState<Photo | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null);
    const [validationMessage, setValidationMessage] = useState<string | null>(null);
    const { getFrameRect } = useCameraFrame();

    const takePicture = useCallback(async () => {
        // trigger countdown
        // if i get the take photo, execute the code below
        const result = await ref.current?.takePictureAsync({
            quality: 1,
            base64: false,
            //exif will be true if we want to get the metadata of the photo
            exif: false,
            //skipProcessing will be true if we want to skip the processing of the photo
            //if we set true, the photo will not be processed and the photo will be saved as is
            skipProcessing: false
        });

        if (!result?.uri) return;
        // check image quality before resizing
        try {
            const isQualityGood = await checkImageQuality(result.uri, FILE_SIZE.before.max, FILE_SIZE.before.minimum);
            if (!isQualityGood.valid) {
                setValidationStatus("invalid");
                setValidationMessage(isQualityGood.message ?? "Image quality is not good");
                return;
            }
            
            // resize image
            const context = ImageManipulator.manipulate(result.uri);
            context.resize({ width: 1280 });
            const rendered = await context.renderAsync();
            const saved = await rendered.saveAsync({
                format: SaveFormat.JPEG,
                compress: 0.85,
            });
            setPhoto({ uri: saved.uri, width: saved.width, height: saved.height });
            setValidationStatus("valid");
        } catch (error) {
            setValidationStatus("invalid");
            setValidationMessage("Failed to take photo");
            return;
        }
    }, [ref]);

    const clearPhoto = useCallback(() => {
        setPhoto(null);
        setValidationStatus(null);
        setValidationMessage(null);
    }, []);

    const confirmPhoto = useCallback(async (screenWidth: number, screenHeight: number) => {
        if (!photo) return;

        const frameRect = getFrameRect();
        if (!frameRect) return;

        const scaleX = photo.width / screenWidth;
        const scaleY = photo.height / screenHeight;

        const cropRegion = {
            oringX : frameRect.left * scaleX,
            oringY : frameRect.top * scaleY,
            width : frameRect.width * scaleX,
            height : frameRect.height * scaleY,
        }
        // send photo to server
        // if success, show success message
        // if error, show error message
        try {
            setValidationStatus("pending");
    
            const context = ImageManipulator.manipulate(photo.uri);
            context.crop({ originX: cropRegion.oringX, originY: cropRegion.oringY, width: cropRegion.width, height: cropRegion.height });
            const rendered = await context.renderAsync();
            const cropped = await rendered.saveAsync({
                format: SaveFormat.JPEG,
                compress: 0.85,
            });
    
            // TODO: 서버 전송
            const result = await uploadPhoto(cropped);
            if (result) {
                setValidationStatus("valid");
                setValidationMessage("Photo uploaded successfully");
            } else {
                setValidationStatus("invalid");
                setValidationMessage("Failed to upload photo");
            }
            clearPhoto();
        } catch (error) {
            setValidationStatus("invalid");
            setValidationMessage("Failed to crop photo");
        }
    }, []);

    return { photo, takePicture, clearPhoto, confirmPhoto, validationStatus, validationMessage };
};
