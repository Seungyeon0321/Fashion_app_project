import React, { RefObject, useRef, useState } from 'react'
import { View, StyleSheet, LayoutChangeEvent } from 'react-native'
import Svg, { Rect } from 'react-native-svg'
import { useCameraFrame } from '@/features/take_photo/model/useCameraFrame'

interface CameraLayoutProps {
  strokeColor?: string
  opacity?: number
  children?: React.ReactNode
  ref?: RefObject<View>
}
// 이곳에서 카메라 레이아웃의 크기를 저장할 필요가 있을 거 같아

const CameraLayout = ({
  strokeColor,
  opacity,
  children,
  ref,
}: CameraLayoutProps) => {
  const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 })
  const { updateFrame } = useCameraFrame()
  const viewRef = useRef<View>(null)

  

  // 세로로 긴 직사각형: 화면 가로의 70%, 세로의 58% (중앙 정렬)
  const frameW = layoutSize.width * 0.90
  const frameH = layoutSize.height * 0.95
  const left = (layoutSize.width - frameW) / 2
  const top = (layoutSize.height - frameH) / 2

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setLayoutSize({ width, height })

    const fW = width * 0.90
    const fH = height * 0.95

    viewRef.current?.measure((x, y, w, h, pageX, pageY) => {
      console.log(pageX, pageY, 'pageX, pageY')
      updateFrame({
        left: pageX + (width - fW) / 2,
        top: pageY + (height - fH) / 2,
        width: fW,
        height: fH,
      })
    })
  }

  return (
    <>
    <View ref={viewRef} style={{ flex: 1, position: 'relative', width: '100%'}} onLayout={handleLayout}> 
      <View style={[StyleSheet.absoluteFill]} pointerEvents="none">
        <Svg width={layoutSize.width} height={layoutSize.height}>
          {/* 테두리만 있는 직사각형 */}
          <Rect
            x={left}
            y={top}
            width={frameW}
            height={frameH}
            fill="transparent"
            stroke={strokeColor ?? '#FFFFFF'}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={opacity}
          />
          {/* 내부 살짝 채움 (가이드용) */}
          <Rect
            x={left}
            y={top}
            width={frameW}
            height={frameH}
            fill={strokeColor}
            fillOpacity={0.06}
            stroke="none"
          />
        </Svg>
      </View>

      {children ? <View style={[styles.countDownWrap, { top: layoutSize.height * 0.05}]}>
          {children}
        </View> : null}

    </View>
  </>
  )
}

const styles = StyleSheet.create({
  countDownWrap: {
    position: 'absolute',
    width: '100%',
  },
})

export default CameraLayout
