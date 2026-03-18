import { useState } from "react";

export enum BodyFrameEnum {
    TOP_BODY = 'topBody',
    BOTTOM_BODY = 'bottomBody',
    FULL_BODY = 'fullBody',
 }
 
 export type BodyFrameType = BodyFrameEnum[keyof BodyFrameEnum];

export const useChangeBodyFrame = () => {
    const [currentLayout, setCurrentLayout] = useState<BodyFrameType>(BodyFrameEnum.TOP_BODY);

    const changeLayout = (layout: BodyFrameType) => {
        setCurrentLayout(layout);
    }

    return { currentLayout, changeLayout }
}