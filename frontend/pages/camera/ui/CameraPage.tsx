import { RefObject, useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import { useTakePhoto } from "@/features/take_photo/model/useTakePhoto";
import { PhotoPreview } from "@/features/take_photo/ui/PhotoPreview";
import { useToggleFacing } from "@/features/camera_controls/model/useToggleFacing";
import { ToggleFacingButton } from "@/features/camera_controls/ui/ToggleFacingButton";
import { useChangeBodyFrame } from "@/features/camera_controls/model/useSelectLayout";
import { SelectLayoutButton } from "@/features/camera_controls/ui/SelectLayoutButton";
import TakePhotoButton from "@/features/take_photo/ui/TakePhotoButton";
import { useCountdown } from "@/shared/lib/hooks/useCountdown";
import CameraLayout from "@/widgets/camera_layout/ui/CameraLayout";



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
                <CameraLayout mode={currentLayout} isCountingDown={countDown > 0} countDown={countDown} />
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