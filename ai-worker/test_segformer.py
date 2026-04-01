"""
SegFormer 테스트 스크립트
실행: python test_segformer.py

테스트할 이미지가 없으면 단색 더미 이미지로 모델 로드만 확인해요.
실제 착용샷이 있으면 IMAGE_PATH에 경로를 넣어서 테스트하세요.
"""

import sys
from PIL import Image, ImageDraw
import os

from app.core.config import settings

# .env의 IMAGE_PATH 사용; 스크립트에서 직접 쓰려면 아래에 문자열을 넣으면 그게 우선함
SCRIPT_IMAGE_PATH: str | None = None
_env_path = (settings.IMAGE_PATH or "").strip()
IMAGE_PATH = SCRIPT_IMAGE_PATH or (_env_path or None)

print("=" * 50)
print("[ SegFormer 테스트 ]")
print("=" * 50)

# ── 1. 모델 import 확인 ──────────────────────────────────────
print("\n[1] 모델 import 확인 중...")
try:
    from app.models.segformer import SegFormerSegmenter, LABEL_MAP, CLOTHING_LABELS
    print("✅ segformer.py import 성공")
except Exception as e:
    print(f"❌ import 실패: {e}")
    sys.exit(1)

# ── 2. 테스트 이미지 준비 ────────────────────────────────────
print("\n[2] 테스트 이미지 준비 중...")
if IMAGE_PATH and os.path.exists(IMAGE_PATH):
    image = Image.open(IMAGE_PATH).convert("RGB")
    print(f"✅ 실제 이미지 로드: {IMAGE_PATH}")
    print(f"   크기: {image.size}")
else:
    # 더미 이미지 생성 (500x700 흰 배경에 파란 사각형)
    # 실제 옷 분리는 안 되지만 모델 로드 + 추론 흐름 확인용
    print("⚠️  IMAGE_PATH 없음 → 더미 이미지로 테스트 (모델 로드 확인용)")
    image = Image.new("RGB", (500, 700), color=(240, 240, 240))
    draw = ImageDraw.Draw(image)
    draw.rectangle([150, 100, 350, 500], fill=(70, 130, 180))  # 파란 사각형
    print(f"✅ 더미 이미지 생성: {image.size}")

# ── 3. 모델 로드 + 추론 ──────────────────────────────────────
print("\n[3] SegFormer 모델 로드 + 추론 중...")
print("   (첫 실행 시 HuggingFace에서 ~400MB 다운로드, 시간이 걸려요)")

try:
    segmenter = SegFormerSegmenter()
    results = segmenter.segment(image)
    print(f"✅ 추론 완료")
except Exception as e:
    print(f"❌ 추론 실패: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ── 4. 결과 출력 ─────────────────────────────────────────────
print("\n[4] 분리 결과:")
if not results:
    print("   감지된 옷 영역 없음 (더미 이미지라면 정상이에요)")
else:
    for i, item in enumerate(results):
        print(f"   [{i+1}] {item['label']} (label_id={item['label_id']})")
        print(f"        bbox      : {item['bbox']}")
        print(f"        mask_ratio: {item['mask_ratio']} ({item['mask_ratio']*100:.1f}%)")
        print(f"        크롭 크기  : {item['image'].size}")

# ── 5. 크롭 이미지 저장 (확인용) ────────────────────────────
if results:
    print("\n[5] 크롭 이미지 저장 중...")
    os.makedirs("test_output", exist_ok=True)
    for i, item in enumerate(results):
        filename = f"test_output/crop_{i}_{item['label'].replace('-', '_')}.jpg"
        item["image"].save(filename)
        print(f"   저장: {filename}")
    print(f"✅ test_output/ 폴더에서 결과 확인하세요")

print("\n" + "=" * 50)
print("모델 로드 + 추론이 ✅ 이면 Step 5 (CLIP)로 넘어가면 돼요.")
print("=" * 50)