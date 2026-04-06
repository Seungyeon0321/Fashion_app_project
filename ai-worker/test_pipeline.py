"""
파이프라인 통합 테스트

실행:
    cd fashion_app/ai-worker
    .venv\\Scripts\\activate
    python -u test_pipeline.py

test_output/ 폴더의 크롭 이미지 대신 착용샷 원본을 직접 넣으면 더 정확한 테스트 가능.
"""

import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import init_db, get_session, ClothingItem
from app.workers.pipeline import ClothingPipeline


def main():
    print("=" * 50, flush=True)
    print("[Pipeline 통합 테스트]", flush=True)
    print("=" * 50, flush=True)

    # 1. DB 초기화 (테이블 없으면 생성)
    print("\n[1] DB 초기화", flush=True)
    init_db()

    # 2. 테스트 이미지 준비
    print("\n[2] 테스트 이미지 준비", flush=True)
    test_image_path = None

    # test_output/ 에 착용샷 원본이 있으면 사용, 없으면 더미
    for fname in os.listdir("."):
        if fname.lower().endswith((".jpg", ".jpeg", ".png")) and "test" not in fname.lower():
            test_image_path = fname
            break

    if test_image_path and os.path.exists(test_image_path):
        image = Image.open(test_image_path).convert("RGB")
        print(f"이미지 로드: {test_image_path} {image.size}", flush=True)
    else:
        # 더미 이미지 (224×224 단색)
        image = Image.new("RGB", (400, 600), color=(180, 140, 100))
        print("더미 이미지 사용 (400×600)", flush=True)

    # 3. 파이프라인 실행
    print("\n[3] 파이프라인 실행", flush=True)
    pipeline = ClothingPipeline()
    ids = pipeline.run(image=image)

    print(f"\n저장된 아이템 ids: {ids}", flush=True)

    # 4. DB에서 저장된 내용 확인
    if ids:
        print("\n[4] DB 저장 내용 확인", flush=True)
        session = get_session()
        try:
            for item_id in ids:
                item = session.get(ClothingItem, item_id)
                print(
                    f"  id={item.id} | {item.label} | "
                    f"mask_ratio={item.mask_ratio} | "
                    f"vector[:3]={item.embedding[:3]}",
                    flush=True,
                )
        finally:
            session.close()

    print("\n" + "=" * 50, flush=True)
    print("완료", flush=True)
    print("=" * 50, flush=True)


if __name__ == "__main__":
    main()