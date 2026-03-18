import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { BodyFrameEnum, BodyFrameType } from '@/features/camera_controls/model/useSelectLayout';
import { TextBox } from '@/shared/ui/TextBox';
import CameraLayout from '@/shared/ui/CameraLayout'

interface CameraLayoutProps {
  mode?: BodyFrameType
  message: string
  isCountingDown?: boolean
  countDown?: number
  strokeColor?: string
  opacity?: number
}



const PhotoView = ({
  message,
  isCountingDown,
  countDown,
}: CameraLayoutProps) => {

  return (
    <>
        <CameraLayout >
                {isCountingDown && <Text style={styles.countDownText}>{countDown}</Text>}
        </CameraLayout>
    <TextBox text={message}  />
    </>
  )
}

const styles = StyleSheet.create({
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
