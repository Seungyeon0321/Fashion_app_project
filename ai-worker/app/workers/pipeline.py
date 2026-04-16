"""
AI 분석 파이프라인

역할: SegFormer + CLIP + DB 저장을 하나로 연결
위치: app/workers/pipeline.py

흐름:
  이미지 (PIL Image 또는 S3 key)
      ↓
  SegFormer → 크롭 이미지 리스트
      ↓
  크롭마다 CLIP → 512차원 벡터
      ↓
  PostgreSQL 저장 → id 리스트 반환
"""

import io

import boto3
from PIL import Image

from app.core.config import settings
from app.db.database import ClothingItem, get_session, init_db
from app.models.clip_encoder import CLIPEncoder
from app.models.segformer import SegFormerSegmenter


class ClothingPipeline:
    """
    착용샷 분석 파이프라인.

    사용법:
        pipeline = ClothingPipeline()
        ids = pipeline.run(s3_key="uploads/photo.jpg")
    """

    def __init__(self):
        # 모델은 lazy loading — 처음 run() 호출 시 로드됨
        self.segmenter = SegFormerSegmenter()
        self.encoder = CLIPEncoder()
        self._s3 = None

    def _get_s3(self):
        """S3 클라이언트 lazy 초기화."""
        if self._s3 is None:
            self._s3 = boto3.client(
                "s3",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        return self._s3

    def _download_from_s3(self, s3_key: str) -> Image.Image:
        """S3에서 이미지 다운로드 → PIL Image 변환."""
        s3 = self._get_s3()
        # 이때 받는 response는 이미지 그 자체가 아니라, 이미지에 대한 정보와 데이터를 담고 있는 통로(Stream)같은 상태이다.
        response = s3.get_object(Bucket=settings.S3_BUCKET, Key=s3_key)
        image_bytes = response["Body"].read()
        # 보통 이미지 파일을 열 때 Image.open("photo.jpg") 처럼 파일 경로를 넣어주지만 우리의 경우는 하드디스크에 파일이 있는게 아니라 메모리에 데이터가 있다.
        # io.BytesIO는 메모리에 있는 데이터를 파일처럼 다룰 수 있게 해주는 파이썬 표준 라이브러리이다.
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")

    def _upload_crop_to_s3(
        self,
        crop_image: Image.Image,
        user_id: int,
        job_id: str,
        label: str,
        index: int,
    ) -> str:
        s3 = self._get_s3()

        # PIL Image → bytes 변환
        buffer = io.BytesIO()
        crop_image.save(buffer, format="PNG")  # 투명도 지원
        buffer.seek(0)

        crop_key = f"crops/{user_id}/{job_id}/{label}_{index}.png"

        s3.put_object(
            Bucket=settings.S3_BUCKET,
            Key=crop_key,
            Body=buffer,
            ContentType="image/png",
        )

        return crop_key

    def run(
        self,
        image: Image.Image | None = None,
        s3_key: str | None = None,
        user_id: int | None = None,
        job_id: str | None = None,
    ) -> list[int]:
        """
        파이프라인 실행.

        Args:
            image:  PIL Image 직접 전달 (테스트용)
            s3_key: S3 키 전달 (실제 운영용)
            둘 중 하나만 전달하면 됨.

        Returns:
            저장된 ClothingItem id 리스트
            예) [1, 2, 3]  ← 착용샷 1장에서 옷 3개 검출
        """
        if image is None and s3_key is None:
            raise ValueError("image 또는 s3_key 중 하나는 필수입니다.")

        # 1. 이미지 준비
        if image is None:
            print(f"[Pipeline] S3 다운로드: {s3_key}", flush=True)
            image = self._download_from_s3(s3_key)

        print(f"[Pipeline] 이미지 크기: {image.size}", flush=True)

        # 2. SegFormer 분석
        print("[Pipeline] SegFormer 실행 중...", flush=True)
        crops = self.segmenter.segment(image)
        print(f"[Pipeline] 검출된 옷: {len(crops)}개", flush=True)

        if not crops:
            print("[Pipeline] 검출된 옷이 없습니다.", flush=True)
            return []

        # 3. CLIP 벡터 추출 + DB 저장
        saved_ids = []
        session = get_session()

        try:
            for index, crop in enumerate(crops):
                print(
                    f"[Pipeline] CLIP 인코딩: {crop['label']} "
                    f"(mask_ratio={crop['mask_ratio']})",
                    flush=True,
                )

                # 크롭 이미지 → 512차원 벡터
                vector = self.encoder.encode(crop["image"])

                crop_s3_key = None
                if user_id is not None and job_id is not None:
                    crop_s3_key = self._upload_crop_to_s3(
                        crop_image=crop["image"],
                        user_id=user_id,
                        job_id=job_id,
                        label=crop["label"],
                        index=index,
                    )
                    print(f"[Pipeline] 크롭 S3 업로드: {crop_s3_key}", flush=True)

                # DB 저장
                item = ClothingItem(
                    user_id=user_id,
                    job_id=job_id,
                    label=crop["label"],
                    label_id=crop["label_id"],
                    source_s3_key=s3_key,
                    crop_s3_key=crop_s3_key,
                    bbox=crop["bbox"],
                    mask_ratio=crop["mask_ratio"],
                    embedding=vector.tolist(),  # numpy → list (pgvector 호환)
                )
                session.add(item)
                session.flush()   # id 채번을 위해 flush (commit 전)
                saved_ids.append(item.id)

            session.commit()
            print(f"[Pipeline] DB 저장 완료: ids={saved_ids}", flush=True)

        except Exception as e:
            session.rollback()
            print(f"[Pipeline] DB 저장 실패: {e}", flush=True)
            raise
        finally:
            session.close()

        return saved_ids