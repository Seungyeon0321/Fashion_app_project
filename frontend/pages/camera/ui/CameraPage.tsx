import { RefObject, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import { useTakePhoto } from "@/features/take_photo/model/useTakePhoto";
import { PhotoPreview } from "@/features/take_photo/ui/PhotoPreview";
import { useToggleFacing } from "@/features/camera_controls/model/useToggleFacing";
import { ToggleFacingButton } from "@/features/camera_controls/ui/ToggleFacingButton";
import { BodyFrameEnum, useChangeBodyFrame } from "@/features/camera_controls/model/useSelectLayout";
import { SelectLayoutButton } from "@/features/camera_controls/ui/SelectLayoutButton";
import TakePhotoButton from "@/features/take_photo/ui/TakePhotoButton";
import { useCountdown } from "@/shared/lib/hooks/useCountdown";
import PhotoView from "@/features/take_photo/ui/CameraScreen";

const MESSAGE: Record<BodyFrameEnum, string> = {
    [BodyFrameEnum.TOP_BODY]: 'please put your top on the frame',
    [BodyFrameEnum.BOTTOM_BODY]: 'please put your bottom on the frame',
    [BodyFrameEnum.FULL_BODY]: 'please put your full body on the frame',
  }


export const CameraPage = () => {
    const cameraRef = useRef<CameraView>(null);
    const { facing, toggleFacing } = useToggleFacing();
    const { triggerCountdown, takePhoto, countDown, setTakePhoto } = useCountdown();
    const { photo, takePicture, clearPhoto, confirmPhoto, validationStatus, validationMessage } = useTakePhoto(cameraRef as RefObject<CameraView>);
    const { currentLayout, changeLayout } = useChangeBodyFrame();

    useEffect(() => {
        // if takePhoto is true, take the picture
        if (takePhoto) {
            takePicture();
            setTakePhoto(false);
        }
    }, [takePhoto, setTakePhoto, takePicture]);
    
    // if photo is not taken, show the camera
    return (
       <SafeAreaView edges={['top']} style={styles.container}>
         {photo ? (
            <PhotoPreview
                photo={photo ?? null}
                facing={facing}
                onClear={clearPhoto}
                onConfirm={confirmPhoto}
                validationStatus={validationStatus}
                validationMessage={validationMessage}
            />
         ) : (
            <CameraView ref={cameraRef} facing={facing} responsiveOrientationWhenOrientationLocked style={styles.cameraView}>
                <ToggleFacingButton toggleFacing={toggleFacing} />
                <SelectLayoutButton currentLayout={currentLayout} changeLayout={changeLayout} />
                <PhotoView message={MESSAGE[currentLayout as keyof typeof MESSAGE] ?? ''} isCountingDown={countDown > 0} countDown={countDown} />
                <TakePhotoButton triggerCountdown={triggerCountdown} />
            </CameraView>
         )}
       </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraView: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
})