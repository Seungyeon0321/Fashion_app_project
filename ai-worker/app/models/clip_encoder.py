"""
CLIP 벡터 인코더

역할: SegFormer가 크롭한 옷 이미지를 512차원 벡터로 변환
모델: openai/clip-vit-base-patch32 (HuggingFace)

흐름:
  PIL Image (크롭된 옷 이미지)
      ↓
  CLIP 전처리 (224×224 리사이즈 + 정규화)
      ↓
  CLIP 비전 인코더 → 512차원 벡터
      ↓
  numpy array 반환 → pgvector에 저장 가능한 형태
"""

import numpy as np
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel

from app.core.config import settings


def _clip_image_features_to_tensor(image_features: torch.Tensor | object) -> torch.Tensor:
    """
    Transformers 5.x: get_image_features()가 BaseModelOutputWithPooling을 반환하고,
    투영된 이미지 임베딩은 .pooler_output에 있음.
    이전 버전: torch.Tensor를 그대로 반환.
    """
    if isinstance(image_features, torch.Tensor):
        return image_features
    pooler = getattr(image_features, "pooler_output", None)
    if pooler is not None:
        return pooler
    raise TypeError(
        f"Unexpected get_image_features return type: {type(image_features)}; "
        "expected Tensor or object with pooler_output"
    )


class CLIPEncoder:
    """
    CLIP 모델을 감싼 클래스.

    사용법:
        encoder = CLIPEncoder()
        vector = encoder.encode(cropped_image)
        # vector.shape = (512,)  ← 512차원 numpy 배열
    """

    def __init__(self):
        # SegFormer와 동일한 lazy loading 패턴
        # 처음 encode()가 호출될 때 모델을 로드함
        self._processor = None
        self._model = None
        self._device = None

    def _load_model(self):
        """
        처음 한 번만 실행되는 모델 로드 함수.
        HuggingFace 캐시에 저장됨 (~600MB, 첫 실행만 느림)
        """
        if self._model is not None:
            return

        print(f"[CLIP] 모델 로드 중: {settings.CLIP_MODEL_NAME}")

        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[CLIP] 디바이스: {self._device}")

        # CLIPProcessor: 이미지를 CLIP 입력 형식으로 변환
        # 내부적으로 224×224 리사이즈 + 정규화 처리
        self._processor = CLIPProcessor.from_pretrained(settings.CLIP_MODEL_NAME)

        # CLIPModel: 이미지 → 벡터 변환 모델
        self._model = CLIPModel.from_pretrained(settings.CLIP_MODEL_NAME)
        self._model.to(self._device)
        self._model.eval()

        print(f"[CLIP] 모델 로드 완료")

    def encode(self, image: Image.Image) -> np.ndarray:
        """
        크롭된 옷 이미지를 512차원 벡터로 변환.

        Args:
            image: PIL Image 객체 (SegFormer가 잘라낸 크롭 이미지)

        Returns:
            np.ndarray, shape=(512,), dtype=float32
            → pgvector의 vector(512) 타입으로 바로 저장 가능
        """
        self._load_model()

        if image.mode != "RGB":
            image = image.convert("RGB")

        # 1. 이미지 → 모델 입력 텐서 변환
        # CLIPProcessor가 224×224 리사이즈 + 정규화를 자동 처리
        inputs = self._processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        # 2. 비전 인코더만 실행 (텍스트 인코더는 사용 안 함)
        # get_image_features()는 이미지 → 벡터 변환만 수행
        with torch.no_grad():
            raw = self._model.get_image_features(**inputs)
        image_features = _clip_image_features_to_tensor(raw)

        # 3. 정규화 (L2 normalization)
        # 벡터 크기를 1로 맞춰줌 → 코사인 유사도 계산이 내적(dot product)으로 단순화됨
        # pgvector의 <=> 연산자(코사인 거리)와 짝을 이룸
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        # 4. numpy 배열로 변환
        # PyTorch tensor → numpy: GPU 메모리에서 꺼내고(.cpu()), 계산 그래프 분리(.detach())
        vector = image_features[0].cpu().detach().numpy()  # shape: (512,)

        return vector

    def encode_batch(self, images: list[Image.Image]) -> np.ndarray:
        """
        여러 크롭 이미지를 한 번에 벡터로 변환 (배치 처리).
        단일 encode()를 여러 번 호출하는 것보다 효율적.

        Args:
            images: PIL Image 리스트

        Returns:
            np.ndarray, shape=(N, 512)  ← N개 이미지의 벡터
        """
        self._load_model()

        images = [img.convert("RGB") if img.mode != "RGB" else img for img in images]

        inputs = self._processor(images=images, return_tensors="pt", padding=True)
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            raw = self._model.get_image_features(**inputs)
        image_features = _clip_image_features_to_tensor(raw)

        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        return image_features.cpu().detach().numpy()  # shape: (N, 512)