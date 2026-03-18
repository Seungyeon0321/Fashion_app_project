import { useCallback, useEffect, useState } from "react";

export const useCountdown = () => {
    const [countDown, setCountDown] = useState(0);
    const [isActive, setIsActive] = useState(false); // 카운트다운 실행 여부
    const [takePhoto, setTakePhoto] = useState(false);

    // 1. 외부에서 시작할 때 호출하는 함수
    const triggerCountdown = useCallback((seconds: number) => {
        setCountDown(seconds);
        setTakePhoto(false);
        setIsActive(true); // 이제부터 useEffect가 동작하도록 스위치를 켬
    }, []);

    useEffect(() => {
        if (!isActive || countDown < 0) return;

        if (countDown === 0) {
            setTakePhoto(true);
            setIsActive(false);
            return;
        }

        const timeout = setTimeout(() => {
            setCountDown((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timeout); // 리액트가 확실하게 정리해줌
    }, [countDown, isActive]);

    return { triggerCountdown, takePhoto, countDown, setTakePhoto };
};