# ai-worker/stylist/agents/retrieval_utils.py
"""
Retrieval 공통 유틸리티

역할:
  closet_retrieval.py 와 external_retrieval.py 양쪽에서
  공통으로 사용하는 함수들.

  - NCP 필터
  - 앵커 강제 포함
  - 카테고리 목록 결정
  - DB 연결
"""

import os
import psycopg2
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """psycopg2 DB 연결."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))


def get_target_categories(intent: Optional[str], relax: bool) -> list[str]:
    """
    검색할 카테고리 목록 결정.
    relax=True: DRESS 추가 (relaxation_level 2 이상).
    """
    categories = ["TOP", "BOTTOM", "OUTER", "SHOES", "BAG", "ACC"]
    if relax:
        categories.append("DRESS")
    return categories


def filter_ncp(
    items: list[dict],
    excluded_outfits: list[dict],
    anchor_item_id: Optional[int],
) -> list[dict]:
    """
    NCP(싫어요 조합)에 등장하는 아이템을 검색 결과에서 제거.

    조합 단위 필터:
        "이 아이템이 싫어요"가 아니라 "이 조합이 싫어요"이므로
        excluded_outfits에 등장하는 아이템 ID를 개별 제거.

    앵커 예외:
        앵커는 NCP에 있어도 제거하지 않음.
        앵커는 유저가 직접 지정한 아이템이므로 NCP와 무관.
    """
    excluded_ids: set[int] = set()
    for outfit in excluded_outfits:
        for item_id in outfit.get("item_ids", []):
            excluded_ids.add(item_id)

    if anchor_item_id:
        excluded_ids.discard(anchor_item_id)

    filtered = []
    for item in items:
        item_id = item.get("id")
        if isinstance(item_id, int) and item_id in excluded_ids:
            print(f"[Retrieval] NCP 필터: item_id={item_id} 제거")
            continue
        filtered.append(item)

    return filtered


def ensure_anchor_included(
    items: list[dict],
    anchor_item: dict,
    anchor_item_id: int,
) -> list[dict]:
    """
    앵커 아이템이 검색 결과에 포함돼 있는지 확인하고, 없으면 맨 앞에 삽입.

    왜 필요한가?
        유사도 임계값 때문에 앵커가 검색 결과에서 빠질 수 있음.
        앵커는 사용자가 직접 지정한 아이템이므로 무조건 포함.
    """
    existing_ids = {item.get("id") for item in items}

    if anchor_item_id in existing_ids:
        for item in items:
            if item.get("id") == anchor_item_id:
                item["is_anchor"] = True
        return items

    anchor_entry = {
        **anchor_item,
        "source":      "closet",
        "crop_s3_key": None,
        "is_anchor":   True,
        "similarity":  1.0,
        "is_external": False,
    }

    print(f"[Retrieval] 앵커 강제 삽입: item_id={anchor_item_id}")
    return [anchor_entry] + items