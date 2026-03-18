import React, { useState } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import Svg, { Rect } from 'react-native-svg'
import { BodyFrameEnum, BodyFrameType } from '@/features/camera_controls/model/useSelectLayout';
import { TextBox } from '@/shared/ui/TextBox';
import CameraLayout from '@/widgets/camera_layout/ui/CameraLayout'

interface CameraLayoutProps {
  mode?: BodyFrameType
  isCountingDown?: boolean
  countDown?: number
  strokeColor?: string
  opacity?: number
}

const MESSAGE: Record<BodyFrameEnum, string> = {
  [BodyFrameEnum.TOP_BODY]: 'please put your top on the frame',
  [BodyFrameEnum.BOTTOM_BODY]: 'please put your bottom on the frame',
  [BodyFrameEnum.FULL_BODY]: 'please put your full body on the frame',
}

const PhotoView = ({
  mode,
  isCountingDown,
  countDown,
  strokeColor = '#FFFFFF',
  opacity = 0.9,
}: CameraLayoutProps) => {
  const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 })

  const message = MESSAGE[mode as BodyFrameEnum]


  return (
    <>
        <CameraLayout strokeColor={strokeColor} opacity={opacity} >
            <View style={[styles.countDownWrap, { top: layoutSize.height * 0.05}]}>
                {isCountingDown && <Text style={styles.countDownText}>{countDown}</Text>}
            </View>
        </CameraLayout>
    <TextBox text={message}  />
    </>
  )
}

const styles = StyleSheet.create({
  countDownWrap: {
    position: 'absolute',
    width: '100%',
  },
  countDownText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})

export default PhotoView
