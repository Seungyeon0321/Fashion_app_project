import { useState } from "react";
import { CameraType } from "expo-camera";

export const useToggleFacing = () => {
    const [facing, setFacing] = useState<CameraType>("back");

    const toggleFacing = () => {
        setFacing((prev) => (prev === "back" ? "front" : "back"));
    }

    return { facing, toggleFacing }
}