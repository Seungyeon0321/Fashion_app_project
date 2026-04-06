"""
SegFormer-B2 래퍼 클래스

역할: 착용 사진에서 옷 영역을 픽셀 단위로 분리 (Segmentation)
모델: mattmdjaga/segformer_b2_clothes (HuggingFace)

흐름:
  PIL Image 입력 (Python Image Library, 파이썬에서 이미지를 다루는 기본 도구, 지금은 Pillow라는 이름으로 유지보수 되고 있음)
      ↓
  SegFormer 추론 → 픽셀별 카테고리 분류
      ↓
  카테고리별 마스크 생성
      ↓
  옷 영역만 크롭한 PIL Image 반환
"""

from PIL import Image
import numpy as np
import torch #PyTourch라는 오픈소스 머신러닝 라이브러리를 호출하는 이름, 텐서 연산을 위한 파이썬 패키지#
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation

from app.core.config import settings


# SegFormer가 인식하는 17개 카테고리
# 인덱스 번호 = 픽셀에 할당되는 값
LABEL_MAP = {
    0: "Background",
    1: "Hat",
    2: "Hair",
    3: "Sunglasses",
    4: "Upper-clothes",   # 상의
    5: "Skirt",           # 스커트
    6: "Pants",           # 바지
    7: "Dress",           # 원피스
    8: "Belt",
    9: "Left-shoe",
    10: "Right-shoe",
    11: "Face",
    12: "Left-leg",
    13: "Right-leg",
    14: "Left-arm",
    15: "Right-arm",
    16: "Bag",
    17: "Scarf",
}

# 우리가 "옷"으로 취급할 카테고리 인덱스
# 신발, 가방, 모자도 패션 아이템이므로 포함
CLOTHING_LABELS = {4, 5, 6, 7, 8, 9, 10, 16, 17}


class SegFormerSegmenter:
    """
    SegFormer-B2 모델을 감싼 클래스.

    사용법:
        segmenter = SegFormerSegmenter()
        crops = segmenter.segment(image)
        # crops = [{"label": "Upper-clothes", "image": <PIL Image>}, ...]
    """

    def __init__(self):
        # 모델을 아직 로드하지 않음 (lazy loading)
        # segment()가 처음 호출될 때 로드함
        # 이유: Worker 시작 시 모델 로드에 수십 초 걸리므로
        #       필요할 때만 로드해서 초기화 시간을 줄임
        self._processor = None
        self._model = None
        self._device = None

    def _load_model(self):
        """
        처음 한 번만 실행되는 모델 로드 함수. __init__에서 모델을 로드하게 되면, 인스턴스 생성시 계속 400MB 모델을 로드하게 되므로, 필요할 때만 로드하도록 함.
        HuggingFace에서 다운로드 후 캐시에 저장됨 (~400MB, 첫 실행만 느림)
        """
        if self._model is not None:
            return  # 이미 로드됐으면 스킵

        print(f"[SegFormer] 모델 로드 중: {settings.SEGFORMER_MODEL_NAME}")

        # CPU / GPU 자동 선택
        # 지금은 로컬(CPU), EC2 t4g.xlarge도 CPU
        # GPU가 있으면 자동으로 cuda 선택
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[SegFormer] 디바이스: {self._device}")

        # SegformerImageProcessor: 이미지를 모델 입력 형식으로 변환
        # 내부적으로 리사이즈 + 정규화를 처리함
        self._processor = SegformerImageProcessor.from_pretrained(
            settings.SEGFORMER_MODEL_NAME
        )

        # SegformerForSemanticSegmentation: 실제 추론 모델
        self._model = SegformerForSemanticSegmentation.from_pretrained(
            settings.SEGFORMER_MODEL_NAME
        )
        self._model.to(self._device)
        self._model.eval()  # 추론 모드 (학습 모드 OFF)

        print(f"[SegFormer] 모델 로드 완료")

    def segment(self, image: Image.Image) -> list[dict]:
        """
        이미지에서 옷 영역을 분리해 크롭 이미지 목록을 반환.

        Args:
            image: PIL Image 객체 (RGB)

        Returns:
            [
                {
                    "label": "Upper-clothes",   # 카테고리 이름
                    "label_id": 4,              # 카테고리 인덱스
                    "image": <PIL Image>,        # 크롭된 옷 이미지
                    "bbox": [x, y, w, h],        # 원본 이미지 기준 좌표
                    "mask_ratio": 0.12,          # 전체 이미지 대비 옷 영역 비율
                },
                ...
            ]
        """
        self._load_model()

        # RGB 확인 (RGBA나 다른 형식이면 변환)
        if image.mode != "RGB":
            image = image.convert("RGB")

        original_size = image.size  # (width, height)

        # 1. 이미지 → 모델 입력 텐서 변환 - 모델은 이미지 파일을 그대로 읽지 못하기 때문에, 이미지를 모델이 이해할 수 있는 형식으로 변환해야 함.
        # return_tensors="pt"는 텐서 형식으로 변환하는 옵션, pt는 PyTorch 텐서 형식을 의미함. 이때 inputs는 평범한 파이썬 딕셔너리 형태가 된다
        # 즉 단순히 숫자 배열만 있는 게 아니라, 모델이 요구하는 '키(kye)'와 함께 텐서가 저장됩니다.
        inputs = self._processor(images=image, return_tensors="pt")
        # 파이썬의 dictionary comprehension문법이다. 딕셔너리 안에 있는 텐서들을 하나씩 꺼내서 GPU로 보내는 작업이다.
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        # 2. 추론 실행 (gradient 계산 불필요 → no_grad로 메모리 절약) 지금 하는 게산은 학습용이 아니니, 나중에 미분하려고 계산 과정(Gradient)하지마! 라고 선언하는 것
        with torch.no_grad():
            outputs = self._model(**inputs)

        # 3. 출력 텐서 → 원본 이미지 크기로 업샘플링
        # SegFormer 출력은 입력보다 작은 크기(1/4)로 나옴
        # interpolate로 원본 크기로 복원
        logits = outputs.logits  # shape: (1, num_classes, H/4, W/4)
        upsampled = torch.nn.functional.interpolate(
            logits,
            size=(original_size[1], original_size[0]),  # (height, width)
            mode="bilinear",
            align_corners=False,
        )

        #여기서 logics는 17개의 카테고리에 대한 점수, argmax는 그 중 제일 높은 거 하나 고르기, mask는 특정 카테고리에 해당하는 픽셀 위치 지도

        # 4. 픽셀별로 가장 높은 확률의 카테고리 선택
        # argmax: 각 픽셀에서 17개 카테고리 중 점수가 가장 높은 인덱스
        seg_map = upsampled.argmax(dim=1)[0].cpu().numpy()
        # seg_map shape: (height, width), 각 값은 0~17 사이의 카테고리 인덱스

        # 5. 카테고리별로 크롭 이미지 생성
        results = []
        image_np = np.array(image)
        total_pixels = seg_map.size

        for label_id in CLOTHING_LABELS:
            # 해당 카테고리에 속하는 픽셀 위치 찾기
            mask = seg_map == label_id  # True/False 배열

            # 해당 카테고리가 이미지에 없으면 스킵
            if not mask.any():
                continue

            # 마스크 비율 계산 (너무 작은 영역은 노이즈일 수 있음), 불확실성과 이미지 품질의 문제를 해결하기 위한 안전장치
            mask_ratio = mask.sum() / total_pixels
            if mask_ratio < 0.01:  # 전체의 1% 미만이면 스킵
                continue

            # 마스크 영역의 bounding box 계산, np.where은 벡터연산을 통해 행과 열의 인덱스를 찾는 함수, 시간이 그렇게 걸리지 않음
            rows = np.where(mask.any(axis=1))[0]
            cols = np.where(mask.any(axis=0))[0]
            top, bottom = int(rows.min()), int(rows.max())
            left, right = int(cols.min()), int(cols.max())

            # 10% 패딩 추가 (옷 경계가 잘리지 않도록)
            h, w = bottom - top, right - left
            pad_h, pad_w = int(h * 0.1), int(w * 0.1)
            top = max(0, top - pad_h)
            bottom = min(original_size[1], bottom + pad_h)
            left = max(0, left - pad_w)
            right = min(original_size[0], right + pad_w)

            # 크롭
            cropped = image.crop((left, top, right, bottom))

            results.append({
                "label": LABEL_MAP[label_id],
                "label_id": label_id,
                "image": cropped,
                "bbox": [left, top, right - left, bottom - top],  # [x, y, w, h]
                "mask_ratio": round(float(mask_ratio), 4),
            })

        return results