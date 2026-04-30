import { RefObject, useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView } from "expo-camera";
import { GestureDetector, Gesture, GestureHandlerRootView } from "react-native-gesture-handler";
import { useTakePhoto } from "@/features/take_photo/model/useTakePhoto";
import { PhotoPreview } from "@/features/take_photo/ui/PhotoPreview";
import { useToggleFacing } from "@/features/camera_controls/model/useToggleFacing";
import { BodyFrameEnum, useChangeBodyFrame } from "@/features/camera_controls/model/useSelectLayout";
import { useCountdown } from "@/shared/lib/hooks/useCountdown";
import PhotoView from "@/features/take_photo/ui/CameraScreen";
import { useRouter } from "expo-router";
import { uploadClothingImage } from "@/shared/lib/api";
import { useToastStore } from "@/shared/store/toastStore";

const MESSAGE: Record<BodyFrameEnum, string> = {
    [BodyFrameEnum.TOP_BODY]: 'please put your top on the frame',
    [BodyFrameEnum.BOTTOM_BODY]: 'please put your bottom on the frame',
    [BodyFrameEnum.FULL_BODY]: 'please put your full body on the frame',
}

const ZOOM_MIN = 0
const ZOOM_MAX = 0.5
const SENSITIVITY = 0.3

export const CameraPage = () => {
    const cameraRef = useRef<CameraView>(null);
    const { facing, toggleFacing } = useToggleFacing();
    const { triggerCountdown, takePhoto, countDown, setTakePhoto } = useCountdown();
    const { photo, takePicture, clearPhoto, validationStatus, validationMessage } = useTakePhoto(cameraRef as RefObject<CameraView>);
    const { currentLayout, changeLayout } = useChangeBodyFrame();
    const router = useRouter();
    const { show } = useToastStore();

    const [isUploading, setIsUploading] = useState(false);

    // ── 줌 ──
    // zoomRef: 항상 최신 zoom 값을 가짐 (클로저 stale 문제 완전 우회)
    // zoom state: CameraView prop 전달용
    // prevScaleRef: 이전 프레임 scale — onBegin 없이 프레임 간 diff 계산
    const [zoom, setZoom] = useState(0);
    const zoomRef = useRef(0);
    const prevScaleRef = useRef<number | null>(null);

    // ── 핀치 제스처 ──
    // onBegin/onStart 사용 안 함 — runOnJS 환경에서 타이밍 보장 안 됨
    //
    // 대신 prevScaleRef를 null로 초기화하고
    // onUpdate 첫 프레임에서 null이면 초기화 프레임으로 처리 (diff 계산 스킵)
    // 이후 프레임부터 이전 scale 대비 diff를 zoomRef에 누적
    //
    // 이전 시도와의 차이:
    //   이전: lastScaleRef → onStart에서 1로 리셋 → 타이밍 문제로 diff=0
    //   이번: prevScaleRef → onUpdate 첫 프레임 감지로 리셋 → 타이밍 무관
    const pinchGesture = Gesture.Pinch()
        .runOnJS(true)
        .onUpdate((e) => {
            // 첫 프레임: 이전 scale 없으므로 저장만 하고 스킵
            if (prevScaleRef.current === null) {
                prevScaleRef.current = e.scale;
                return;
            }

            const diff = (e.scale - prevScaleRef.current) * SENSITIVITY;
            prevScaleRef.current = e.scale;

            const next = zoomRef.current + diff;
            const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next));

            zoomRef.current = clamped;  // 즉시 최신값 반영
            setZoom(clamped);
        })
        .onEnd(() => {
            // 핀치 종료 시 리셋 — 다음 핀치의 첫 프레임 감지를 위해
            prevScaleRef.current = null;
        });

    useEffect(() => {
        if (takePhoto) {
            takePicture();
            setTakePhoto(false);
        }
    }, [takePhoto, setTakePhoto, takePicture]);

    const handleConfirm = async () => {
        if (!photo?.uri) return;
        setIsUploading(true);
        try {
            const { jobId } = await uploadClothingImage(photo.uri);
            router.push(`/processing?jobId=${jobId}`);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Please check your connection and try again.';
            show(message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <SafeAreaView edges={['top']} style={styles.container}>
                {photo ? (
                    <PhotoPreview
                        photo={photo}
                        facing={facing}
                        onClear={clearPhoto}
                        onConfirm={handleConfirm}
                        isUploading={isUploading}
                        validationStatus={validationStatus}
                        validationMessage={validationMessage}
                    />
                ) : (
                    <GestureDetector gesture={pinchGesture}>
                        <CameraView
                            ref={cameraRef}
                            facing={facing}
                            zoom={zoom}
                            responsiveOrientationWhenOrientationLocked
                            style={styles.cameraView}
                        >
                            <PhotoView
                                message={MESSAGE[currentLayout as keyof typeof MESSAGE] ?? ''}
                                isCountingDown={countDown > 0}
                                countDown={countDown}
                                onBack={() => router.back()}
                                currentLayout={currentLayout}
                                changeLayout={changeLayout}
                                toggleFacing={toggleFacing}
                                triggerCountdown={triggerCountdown}
                            />
                        </CameraView>
                    </GestureDetector>
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    cameraView: { flex: 1 },
});
