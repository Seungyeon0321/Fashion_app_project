"""
CLIP 벡터 인코더

역할: SegFormer가 크롭한 옷 이미지를 512차원 벡터로 변환
      + presetKey 텍스트를 512차원 벡터로 변환 (StyleReference PRESET용)
모델: openai/clip-vit-base-patch32 (HuggingFace)

흐름 (이미지):
  PIL Image (크롭된 옷 이미지)
      ↓
  CLIP 전처리 (224×224 리사이즈 + 정규화)
      ↓
  CLIP 비전 인코더 → 512차원 벡터
      ↓
  numpy array 반환 → pgvector에 저장 가능한 형태

흐름 (텍스트):
  presetKey 문자열 ("minimal", "street" 등)
      ↓
  PRESET_TEXT_MAP으로 의미 확장
      ↓
  CLIP 텍스트 인코더 → 512차원 벡터
      ↓
  numpy array 반환 → pgvector에 저장 가능한 형태
"""

import numpy as np
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel

from app.core.config import settings


# ──────────────────────────────────────────────────────────────────────────────
# PRESET 텍스트 확장 맵
#
# 왜 확장하는가?
#   CLIP은 문장 수준의 텍스트를 잘 이해함.
#   "minimal" 한 단어보다 "minimal clean simple style fashion outfit" 처럼
#   패션 도메인 키워드를 붙여줘야 더 정확한 벡터가 생성됨.
#
# 키: StyleReference.presetKey (DB에 저장된 값)
# 값: CLIP 텍스트 인코더에 넘길 확장 문장
# ──────────────────────────────────────────────────────────────────────────────
PRESET_TEXT_MAP: dict[str, str] = {
    # key: StyleReference.presetKey (style-presets.ts의 key 값과 1:1 매핑)
    # value: presetKey + keywords → CLIP이 잘 이해하는 패션 도메인 문장으로 확장
    #        구성: "{key} {keywords joined} style fashion outfit"

    "minimal":       "minimal monochrome clean simple neutral style fashion outfit",
    "old_money":     "old money classic preppy tailored luxury style fashion outfit",
    "streetwear":    "streetwear oversized graphic urban sneakers style fashion outfit",
    "y2k":           "y2k crop lowrise colorful bold nostalgic style fashion outfit",
    "coquette":      "coquette feminine ribbon satin romantic delicate style fashion outfit",
    "dark_academia": "dark academia tweed vintage dark scholarly moody style fashion outfit",
    "athleisure":    "athleisure sporty comfortable activewear casual style fashion outfit",
    "vintage":       "vintage retro thrift secondhand classic timeless style fashion outfit",
    "quiet_luxury":  "quiet luxury logoless cashmere beige elegant subtle style fashion outfit",
    "gorpcore":      "gorpcore outdoor fleece cargo functional layered rugged style fashion outfit",
}


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

    사용법 (이미지):
        encoder = CLIPEncoder()
        vector = encoder.encode(cropped_image)
        # vector.shape = (512,)

    사용법 (텍스트 - PRESET):
        vector = encoder.encode_text("minimal")
        # vector.shape = (512,)
        # 이미지 벡터와 동일한 공간 → pgvector 비교 가능
    """

    def __init__(self):
        self._processor = None
        self._model = None
        self._device = None

    def _load_model(self):
        """
        처음 한 번만 실행되는 모델 로드 함수.
        이미지/텍스트 인코더 둘 다 같은 CLIPModel 안에 있으므로 한 번만 로드하면 됨.
        """
        if self._model is not None:
            return

        print(f"[CLIP] 모델 로드 중: {settings.CLIP_MODEL_NAME}")

        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[CLIP] 디바이스: {self._device}")

        self._processor = CLIPProcessor.from_pretrained(settings.CLIP_MODEL_NAME)
        self._model = CLIPModel.from_pretrained(settings.CLIP_MODEL_NAME)
        self._model.to(self._device)
        self._model.eval()

        print(f"[CLIP] 모델 로드 완료")

    # ──────────────────────────────────────────────────────────────────────────
    # 이미지 인코딩 (기존 코드 그대로)
    # ──────────────────────────────────────────────────────────────────────────

    def encode(self, image: Image.Image) -> np.ndarray:
        """
        크롭된 옷 이미지를 512차원 벡터로 변환.

        Args:
            image: PIL Image 객체 (SegFormer가 잘라낸 크롭 이미지)

        Returns:
            np.ndarray, shape=(512,), dtype=float32
        """
        self._load_model()

        if image.mode != "RGB":
            image = image.convert("RGB")

        inputs = self._processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            raw = self._model.get_image_features(**inputs)
        image_features = _clip_image_features_to_tensor(raw)

        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        vector = image_features[0].cpu().detach().numpy()

        return vector

    def encode_batch(self, images: list[Image.Image]) -> np.ndarray:
        """
        여러 크롭 이미지를 한 번에 벡터로 변환 (배치 처리).

        Args:
            images: PIL Image 리스트

        Returns:
            np.ndarray, shape=(N, 512)
        """
        self._load_model()

        images = [img.convert("RGB") if img.mode != "RGB" else img for img in images]

        inputs = self._processor(images=images, return_tensors="pt", padding=True)
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            raw = self._model.get_image_features(**inputs)
        image_features = _clip_image_features_to_tensor(raw)

        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        return image_features.cpu().detach().numpy()

    # ──────────────────────────────────────────────────────────────────────────
    # 텍스트 인코딩 (신규 추가 - PRESET StyleReference용)
    # ──────────────────────────────────────────────────────────────────────────

    def encode_text(self, preset_key: str) -> np.ndarray:
        """
        presetKey를 512차원 벡터로 변환.

        왜 이미지 벡터와 비교 가능한가?
            CLIP은 이미지와 텍스트를 같은 512차원 공간에 투영하도록 학습됨.
            "minimal style fashion" 텍스트 벡터는
            미니멀한 옷 이미지 벡터와 코사인 유사도가 높게 나옴.

        Args:
            preset_key: StyleReference.presetKey 값
                        예: "minimal", "street", "formal"

        Returns:
            np.ndarray, shape=(512,), dtype=float32
            → ClosetItem.embedding, StyleReference.embedding과 직접 비교 가능

        Raises:
            ValueError: PRESET_TEXT_MAP에 없는 presetKey가 들어온 경우
        """
        self._load_model()

        # presetKey → 확장 텍스트
        # 맵에 없는 키가 들어오면 그대로 사용하되 경고 로그 출력
        text = PRESET_TEXT_MAP.get(preset_key)
        if text is None:
            print(f"[CLIP] 경고: '{preset_key}'가 PRESET_TEXT_MAP에 없음 → 원본 키 그대로 사용")
            text = f"{preset_key} style fashion outfit"

        # CLIPProcessor로 텍스트 토크나이징
        # return_tensors="pt" → PyTorch 텐서로 반환
        # padding=True, truncation=True → CLIP 최대 토큰 77개 제한 처리
        inputs = self._processor(
            text=[text],
            return_tensors="pt",
            padding=True,
            truncation=True,
        )
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        # get_text_features(): 텍스트 인코더만 실행
        # 이미지의 get_image_features()와 동일한 512차원 공간으로 투영됨
        with torch.no_grad():
            text_features = self._model.get_text_features(**inputs)

        # L2 정규화 → encode()와 동일한 정규화 적용
        # 이래야 이미지 벡터와 코사인 유사도 비교가 의미있음
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

        vector = text_features[0].cpu().detach().numpy()

        return vector