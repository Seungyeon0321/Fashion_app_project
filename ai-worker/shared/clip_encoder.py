# ai-worker/shared/clip_encoder.py
"""
CLIP 벡터 인코더 (공통 모듈)

두 컨테이너에서 공유:
  - clothing_worker (app/)
  - fastapi-stylist (stylist/)

메서드:
  encode(image)           → 이미지 → 512차원 벡터 (파이프라인 기존 호환)
  encode_image(image)     → encode() 별칭 (외부에서 명시적 호출용)
  encode_batch(images)    → 여러 이미지 → (N, 512) 벡터
  encode_text(preset_key) → PRESET 키 → 512차원 벡터 (PRESET_TEXT_MAP 거침)
  encode_free_text(text)  → 자유 텍스트 → 512차원 벡터 (이미지 선별용)
"""

import os
import numpy as np
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel


# ──────────────────────────────────────────────────────────────────────────────
# PRESET 텍스트 확장 맵
# ──────────────────────────────────────────────────────────────────────────────
PRESET_TEXT_MAP: dict[str, str] = {
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
    def __init__(self):
        self._processor = None
        self._model     = None
        self._device    = None
        self._model_name = os.getenv(
            "CLIP_MODEL_NAME",
            "openai/clip-vit-base-patch32",
        )

    def _load_model(self):
        if self._model is not None:
            return
        print(f"[CLIP] 모델 로드 중: {self._model_name}")
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"[CLIP] 디바이스: {self._device}")
        self._processor = CLIPProcessor.from_pretrained(self._model_name)
        self._model     = CLIPModel.from_pretrained(self._model_name)
        self._model.to(self._device)
        self._model.eval()
        print("[CLIP] 모델 로드 완료")

    # ── 이미지 인코딩 ────────────────────────────────────────────────

    def encode(self, image: Image.Image) -> np.ndarray:
        """이미지 → 512차원 벡터 (파이프라인 기존 호환용)"""
        self._load_model()

        if image.mode != "RGB":
            image = image.convert("RGB")

        inputs = self._processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            raw = self._model.get_image_features(**inputs)
        image_features = _clip_image_features_to_tensor(raw)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        return image_features[0].cpu().detach().numpy()

    def encode_image(self, image: Image.Image) -> np.ndarray:
        """
        encode()의 명시적 별칭.
        external_retrieval.py 등 외부에서 의미 명확하게 호출할 때 사용.
        """
        return self.encode(image)

    def encode_batch(self, images: list[Image.Image]) -> np.ndarray:
        """여러 이미지 → (N, 512) 벡터"""
        self._load_model()

        images = [img.convert("RGB") if img.mode != "RGB" else img for img in images]
        inputs = self._processor(images=images, return_tensors="pt", padding=True)
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            raw = self._model.get_image_features(**inputs)
        image_features = _clip_image_features_to_tensor(raw)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        return image_features.cpu().detach().numpy()

    # ── 텍스트 인코딩 ────────────────────────────────────────────────

    def encode_text(self, preset_key: str) -> np.ndarray:
        """
        PRESET 키 → 512차원 벡터.
        PRESET_TEXT_MAP에서 확장 텍스트 조회 후 인코딩.
        없으면 원본 키를 "{key} style fashion outfit"으로 확장.

        Style Analyzer의 lazy 임베딩에 사용.
        """
        self._load_model()

        text = PRESET_TEXT_MAP.get(preset_key)
        if text is None:
            print(f"[CLIP] 경고: '{preset_key}'가 PRESET_TEXT_MAP에 없음 → 원본 키 사용")
            text = f"{preset_key} style fashion outfit"

        return self._encode_text_raw(text)

    def encode_free_text(self, text: str) -> np.ndarray:
        """
        자유 텍스트 → 512차원 벡터.
        PRESET_TEXT_MAP을 거치지 않고 텍스트 그대로 인코딩.

        이미지 선별용 기준 텍스트에 사용:
          예: "clothes on hanger white background"
              "flat lay clothing top view"
              "clothing product shot no person"
        """
        self._load_model()
        return self._encode_text_raw(text)

    def _encode_text_raw(self, text: str) -> np.ndarray:
        """
        텍스트 인코딩 내부 공통 함수.
        encode_text(), encode_free_text() 둘 다 여기로 수렴.
        """
        inputs = self._processor(
            text=[text],
            return_tensors="pt",
            padding=True,
            truncation=True,
        )
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.no_grad():
            text_features = self._model.get_text_features(**inputs)

        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        return text_features[0].cpu().detach().numpy()