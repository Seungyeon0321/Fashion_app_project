import { create } from 'zustand'

/** 프리뷰 대비 0~1 비율로 된 프레임 영역 (크롭/미리보기 좌표 변환용) */
export type NormalizedFrameRect = {
  left: number
  top: number
  width: number
  height: number
}

type CameraFrameStore = {
  /** 현재 카메라 레이아웃 프레임 (정규화). null이면 크롭하지 않음 */
  frameRect: NormalizedFrameRect | null
  setFrameRect: (rect: NormalizedFrameRect | null) => void
}

export const useCameraFrameStore = create<CameraFrameStore>((set) => ({
  frameRect: null,
  setFrameRect: (frameRect) => set({ frameRect }),
}))