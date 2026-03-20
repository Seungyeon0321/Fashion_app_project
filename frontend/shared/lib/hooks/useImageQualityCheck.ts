import { useCallback } from 'react'
import { File } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

type CheckResult = { valid: boolean; message?: string }

const BLUR_THRESHOLD = 800
const DARK_THRESHOLD = 50
const BRIGHT_THRESHOLD = 220
const SAMPLE_SIZE = 32

export const useImageQualityCheck = () => {

  const checkFileSize = useCallback(
    async (uri: string, min: number, max: number): Promise<CheckResult> => {

    // check if the image is a base64 image for web
      if (uri.startsWith('data:')) {
        const base64Data = uri.split(',')[1]
        if (!base64Data) return { valid: false, message: 'Invalid image' }
        const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0
        const sizeInBytes = base64Data.length * 0.75 - padding
        if (sizeInBytes < min || sizeInBytes > max)
          return { valid: false, message: 'File size is out of range (100KB~10MB)' }
        return { valid: true }
      }

      const file = new File(uri)
      if (!file.exists) return { valid: false, message: 'File not found' }
      if (file.size < min || file.size > max)
        return { valid: false, message: 'File size is out of range (100KB~10MB)' }
      return { valid: true }
    }, [])

  const extractPixels = useCallback(async (uri: string): Promise<number[]> => {
    // convert the image to PNG to get the pixels
    // edit mode
    const context = await ImageManipulator.manipulate(
      uri)

    // start editing the image
    context.resize({ width: SAMPLE_SIZE, height: SAMPLE_SIZE })

    // apply the changes to the image
    const rendered = await context.renderAsync()

    // save the image
    const result = await rendered.saveAsync({
      format: SaveFormat.PNG,
      compress: 0.85,
    })
   
    // get the base64 of the image
    const base64 = result.base64
    if (!base64) return []

    // decode the base64
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    // PNG 파일 구조: 8바이트 시그니처 + IHDR 청크(25바이트) 이후 IDAT(픽셀 데이터)
    // 직접 파싱이 복잡하므로, 간단한 휴리스틱으로 픽셀 영역 추출
    // PNG IDAT 청크 이후 바이트의 샘플링으로 밝기/분산 근사치 계산
    const pixels: number[] = []
    const start = 33 // PNG 헤더 이후
    for (let i = start; i < bytes.length - 2; i += 4) {
      // R, G, B 3채널 → 그레이스케일
      const r = bytes[i]
      const g = bytes[i + 1]
      const b = bytes[i + 2]
      if (r === undefined || g === undefined || b === undefined) continue
      const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
      if (gray >= 0 && gray <= 255) pixels.push(gray)
    }
    return pixels
  }, [])

  const checkBlur = useCallback(async (uri: string): Promise<CheckResult> => {
    const pixels = await extractPixels(uri)
    if (pixels.length === 0) return { valid: true } // 추출 실패 → 백엔드에서 2차 검사

    const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length
    const variance = pixels.reduce((a, b) => a + (b - mean) ** 2, 0) / pixels.length

    if (variance < BLUR_THRESHOLD) {
      return { valid: false, message: 'The image is blurry. Please take another picture' }
    }
    return { valid: true }
  }, [extractPixels])

  const checkBrightness = useCallback(async (uri: string): Promise<CheckResult> => {
    const pixels = await extractPixels(uri)
    if (pixels.length === 0) return { valid: true }

    const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length

    if (mean < DARK_THRESHOLD)
      return { valid: false, message: 'The image is too dark. Please take the picture in a bright place' }
    if (mean > BRIGHT_THRESHOLD)
      return { valid: false, message: 'The image is too bright. Please reduce the lighting' }
    return { valid: true }
  }, [extractPixels])

  const checkImageQuality = useCallback(
    async (uri: string, max: number, minimum: number): Promise<CheckResult> => {
      const sizeResult = await checkFileSize(uri, minimum, max)
      if (!sizeResult.valid) return sizeResult

      const blurResult = await checkBlur(uri)
      if (!blurResult.valid) return blurResult

      const brightnessResult = await checkBrightness(uri)
      if (!brightnessResult.valid) return brightnessResult

      return { valid: true }
    }, [checkFileSize, checkBlur, checkBrightness])

  return { checkImageQuality }
}