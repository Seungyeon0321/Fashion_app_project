"""
CLIP 인코더 테스트 스크립트
실행: python test_clip.py

첫 실행 시 transformers / CLIP 로딩에 1~3분 걸릴 수 있어요.
출력이 안 보이면 멈춘 게 아니라 import 중일 수 있습니다. (-u 옵션 권장)
"""

from __future__ import annotations

import os
import sys


def main() -> None:
    print("=" * 50, flush=True)
    print("[ CLIP 테스트 ]", flush=True)
    print(
        "[0] clip_encoder import 중… (transformers 첫 로딩은 수 분 걸릴 수 있음)",
        flush=True,
    )
    print("=" * 50, flush=True)

    try:
        from PIL import Image

        from app.core.config import settings
        from app.models.clip_encoder import CLIPEncoder
    except Exception as e:
        print(f"❌ import 실패: {e}", flush=True)
        sys.exit(1)

    print("✅ import 완료", flush=True)

    # 스크립트에서 직접 경로를 쓰려면 아래에 문자열 지정 (비우면 .env IMAGE_PATH 사용)
    script_image_path: str | None = None
    _env_path = (settings.IMAGE_PATH or "").strip()
    image_path = script_image_path or (_env_path or None)

    print("\n[1] 테스트 이미지 준비", flush=True)
    if image_path and os.path.exists(image_path):
        image = Image.open(image_path).convert("RGB")
        print(f"✅ 파일 로드: {image_path}", flush=True)
    else:
        image = Image.new("RGB", (224, 224), color=(120, 80, 60))
        print("⚠️  IMAGE_PATH 없음/경로 오류 → 더미 이미지 사용", flush=True)

    print("\n[2] encode() 실행", flush=True)
    encoder = CLIPEncoder()
    vector = encoder.encode(image)
    print(f"✅ 벡터 shape: {vector.shape}, dtype: {vector.dtype}", flush=True)
    n = float((vector * vector).sum()) ** 0.5
    print(f"   L2 norm (정규화 후 ~1.0): {n:.6f}", flush=True)
    print(f"   앞 5개 값: {vector[:5]}", flush=True)

    print("\n" + "=" * 50, flush=True)
    print("완료", flush=True)
    print("=" * 50, flush=True)


if __name__ == "__main__":
    main()
