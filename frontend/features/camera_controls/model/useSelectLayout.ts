import { useState } from "react";

export enum BodyFrameEnum {
    TOP = 'TOP',
    BOTTOM = 'BOTTOM',
    FULL = 'FULL'
 }
 
 export type BodyFrameType = BodyFrameEnum[keyof BodyFrameEnum];

export const useChangeBodyFrame = () => {
    const [currentLayout, setCurrentLayout] = useState<BodyFrameType>(BodyFrameEnum.TOP);

    const changeLayout = (layout: BodyFrameType) => {
        setCurrentLayout(layout);
    }

    return { currentLayout, changeLayout }
}