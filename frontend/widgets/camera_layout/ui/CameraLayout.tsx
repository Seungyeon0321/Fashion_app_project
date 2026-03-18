import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Rect } from 'react-native-svg'

interface CameraLayoutProps {
  children: React.ReactNode
  strokeColor?: string
  opacity?: number
}

const CameraLayout = ({
  children,
  strokeColor,
  opacity,
}: CameraLayoutProps) => {
  const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 })
  // 세로로 긴 직사각형: 화면 가로의 70%, 세로의 58% (중앙 정렬)
  const frameW = layoutSize.width * 0.90
  const frameH = layoutSize.height * 0.95
  const left = (layoutSize.width - frameW) / 2
  const top = (layoutSize.height - frameH) / 2

  return (
    <>
    <View style={{ flex: 1, position: 'relative', width: '100%'}} onLayout={(e) => {
      const { width, height } = e.nativeEvent.layout
      setLayoutSize({ width, height })
    }}> 
      <View style={[StyleSheet.absoluteFill]} pointerEvents="none">
        <Svg width={layoutSize.width} height={layoutSize.height}>
          {/* 테두리만 있는 직사각형 */}
          <Rect
            x={left}
            y={top}
            width={frameW}
            height={frameH}
            fill="transparent"
            stroke={strokeColor}
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
            fillOpacity={opacity}
            stroke="none"
          />
        </Svg>

        {children}
      </View>
    </View>
  </>
  )
}

export default CameraLayout
