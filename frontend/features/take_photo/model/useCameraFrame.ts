import { NormalizedFrameRect, useCameraFrameStore } from "@/features/take_photo/model/cameraFrameStore";

export const useCameraFrame = () => {
    const setFrameRect = useCameraFrameStore((state) => state.setFrameRect);

    const updateFrame = (size: NormalizedFrameRect | null) => {
        if (size && (size.left < 0 || size.top < 0 || size.width <= 0 || size.height <= 0)) {
            return;
        }

        setFrameRect(size);
    }

    const getFrameRect = () => {
        return useCameraFrameStore.getState().frameRect ?? null;
    }

    return { updateFrame, getFrameRect };
}