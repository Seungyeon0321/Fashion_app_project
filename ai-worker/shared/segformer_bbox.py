# ai-worker/shared/segformer_bbox.py
"""
SegFormer 바운딩 박스 추출 (경량 버전)

segformer_trimmer.py에서 카테고리별 크롭 좌표 계산용.
app/models/segformer.py의 전체 기능 중
바운딩 박스 계산 부분만 추출.

픽셀 분리 / RGBA 변환 등 불필요한 작업 제거.
"""

import numpy as np
import torch
from PIL import Image
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation

SEGFORMER_MODEL_NAME = "mattmdjaga/segformer_b2_clothes"

# 카테고리별 SegFormer 레이블
CATEGORY_LABELS = {
    "TOP":    {4, 7, 17},   # Upper-clothes, Dress, Scarf
    "BOTTOM": {5, 6},       # Skirt, Pants
    "OUTER":  {4, 7},       # Upper-clothes, Dress
    "FULL":   {4, 5, 6, 7, 8, 9, 10, 16, 17},
}

_processor = None
_model     = None
_device    = None


def _load_model():
    global _processor, _model, _device

    if _model is not None:
        return

    print(f"[SegformerBBox] 모델 로드 중: {SEGFORMER_MODEL_NAME}")
    _device    = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    _processor = SegformerImageProcessor.from_pretrained(SEGFORMER_MODEL_NAME)
    _model     = SegformerForSemanticSegmentation.from_pretrained(SEGFORMER_MODEL_NAME)
    _model.to(_device)
    _model.eval()
    print(f"[SegformerBBox] 모델 로드 완료 (device={_device})")


def get_bbox(image: Image.Image, category: str) -> tuple[int, int, int, int] | None:
    """
    이미지에서 카테고리 영역의 바운딩 박스 반환.

    Args:
        image:    PIL Image (RGB)
        category: TOP / BOTTOM / OUTER / FULL

    Returns:
        (left, top, right, bottom) 픽셀 좌표
        감지 실패 시 None → 호출자가 전체 이미지 사용

    패딩:
        옷 경계가 잘리지 않도록 10% 여백 추가.
    """
    _load_model()

    if image.mode != "RGB":
        image = image.convert("RGB")

    w, h = image.size
    target_labels = CATEGORY_LABELS.get(category, CATEGORY_LABELS["FULL"])

    # 1. 추론
    inputs = _processor(images=image, return_tensors="pt")
    inputs = {k: v.to(_device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = _model(**inputs)

    # 2. 원본 크기로 업샘플링
    logits    = outputs.logits
    upsampled = torch.nn.functional.interpolate(
        logits,
        size=(h, w),
        mode="bilinear",
        align_corners=False,
    )
    seg_map = upsampled.argmax(dim=1)[0].cpu().numpy()

    # 3. 타겟 레이블 마스크 합산
    combined_mask = np.zeros((h, w), dtype=bool)
    for label_id in target_labels:
        combined_mask |= (seg_map == label_id)

    if not combined_mask.any():
        print(f"[SegformerBBox] {category} 영역 감지 실패 → 전체 이미지 사용")
        return None

    # 마스크 비율이 너무 작으면 노이즈로 판단
    mask_ratio = combined_mask.sum() / combined_mask.size
    if mask_ratio < 0.01:
        print(f"[SegformerBBox] {category} 마스크 너무 작음({mask_ratio:.3f}) → 전체 이미지 사용")
        return None

    # 4. 바운딩 박스 계산
    rows = np.where(combined_mask.any(axis=1))[0]
    cols = np.where(combined_mask.any(axis=0))[0]
    top, bottom = int(rows.min()), int(rows.max())
    left, right = int(cols.min()), int(cols.max())

    # 10% 패딩
    pad_h = int((bottom - top) * 0.1)
    pad_w = int((right - left) * 0.1)
    top    = max(0, top    - pad_h)
    bottom = min(h, bottom + pad_h)
    left   = max(0, left   - pad_w)
    right  = min(w, right  + pad_w)

    print(f"[SegformerBBox] {category} bbox: ({left},{top}) → ({right},{bottom})")
    return (left, top, right, bottom)