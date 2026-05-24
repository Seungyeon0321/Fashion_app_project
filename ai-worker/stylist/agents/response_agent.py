# ai-worker/stylist/nodes/response_agent.py
"""
Response Agent 노드

역할:
  Validator를 통과한 최종 코디 조합을 바탕으로
  사용자에게 전달할 자연어 추천 메시지를 생성한다.

presigned URL 처리:
  closet 아이템:
    crop_s3_key → presigned URL (기존과 동일)

  external 아이템:
    crop_s3_key 있음 → presigned URL  (rembg 트리밍 완료)
    crop_s3_key 없음 → imageUrl 그대로 (CLIP 점수 미달 fallback)

  Step 37 추가:
    external 흐름 시 outfit_proposals 기반 응답 구성.
    proposal별로 mood + items 배열 형태로 직렬화.
    ranked_items도 함께 반환 (기존 RecommendResponse 호환용).
"""

import os
import json
import boto3
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from stylist.outfit_state import OutfitState, OutfitProposal

load_dotenv()

llm = ChatAnthropic(model="claude-haiku-4-5", max_tokens=512)

s3_client = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)
S3_BUCKET = os.getenv("AWS_S3_BUCKET")


def response_agent(state: OutfitState) -> dict:
    source = state.get("source") or "closet"

    # Step 37: external 흐름은 proposals 기반 응답
    if source == "external":
        return _respond_external(state)

    # closet 흐름: 기존 로직 유지
    return _respond_closet(state)


# ──────────────────────────────────────────────────────────────────────────────
# Step 37: external 흐름 응답
# ──────────────────────────────────────────────────────────────────────────────

def _respond_external(state: OutfitState) -> dict:
    """
    External 흐름 응답 구성.

    outfit_proposals → presigned URL 변환 → proposals 배열 직렬화.
    기존 RecommendResponse 호환을 위해 ranked_items도 함께 반환.
    """
    proposals: list[OutfitProposal] = state.get("outfit_proposals") or []
    intent          = state.get("intent") or "casual"
    weather         = state.get("weather") or "unknown"
    calendar_events = state.get("calendar_events") or []

    serialized_proposals = []
    all_items_with_url: list[dict] = []

    for prop in proposals:
        if prop.get("proposal_status") not in ("resolved", "partial"):
            continue

        mood  = prop.get("mood", "general")
        items = []

        for category, spec in prop.get("items", {}).items():
            resolved = spec.get("resolved_item")
            if not resolved:
                continue

            resolved = dict(resolved)
            # crop_s3_key → presigned URL 변환 (기존 _attach_image_urls 동일 규칙)
            crop_s3_key = resolved.get("crop_s3_key")
            is_external = resolved.get("is_external", True)

            if crop_s3_key:
                try:
                    resolved["imageUrl"] = s3_client.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": S3_BUCKET, "Key": crop_s3_key},
                        ExpiresIn=3600,
                    )
                    print(f"[ResponseAgent] presigned URL 생성: {crop_s3_key}")
                except Exception as e:
                    print(f"[ResponseAgent] presigned URL 실패: {crop_s3_key} - {e}")
                    if not is_external:
                        resolved["imageUrl"] = None
            elif not is_external:
                resolved["imageUrl"] = None
            # external + crop_s3_key 없음 → imageUrl 그대로 유지 (네이버 원본)

            items.append(resolved)
            all_items_with_url.append(resolved)

        if items:
            serialized_proposals.append({
                "mood":  mood,
                "items": items,
            })

    # LLM 추천 메시지 생성 (기존과 동일한 방식)
    items_text    = _build_items_text(all_items_with_url)
    calendar_text = ", ".join(calendar_events) if calendar_events else "No events today"

    try:
        response = llm.invoke([
            SystemMessage(content="""You are a friendly personal stylist assistant.
Given a list of recommended clothing items, write a warm and practical outfit suggestion.
Keep it concise (2-3 sentences). Mention the occasion and weather naturally."""),
            HumanMessage(content=f"""Occasion style: {intent}
Weather: {weather}
Today's schedule: {calendar_text}
Recommended items:
{items_text}

Write a friendly outfit recommendation:"""),
        ])
        final_response = response.content.strip()
    except Exception as e:
        final_response = "코디를 준비했어요. 마음에 드는 스타일을 골라보세요!"

    # proposals를 JSON 문자열로 final_response에도 포함 (기존 _build_response 호환)
    # main.py의 _build_response가 ranked_items를 사용하므로 ranked_items도 반환
    recommended_outfit_ids = [
        item["id"] for item in all_items_with_url
        if isinstance(item.get("id"), int)
    ]

    print(f"[ResponseAgent] external: {len(serialized_proposals)}개 proposal 응답")

    return {
        "final_response":         final_response,
        "ranked_items":           all_items_with_url,   # main.py RecommendResponse 호환
        "recommended_outfit_ids": recommended_outfit_ids,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 기존: closet 흐름 응답 (변경 없음)
# ──────────────────────────────────────────────────────────────────────────────

def _respond_closet(state: OutfitState) -> dict:
    """기존 closet 응답 로직 그대로 유지."""
    ranked_items     = state.get("ranked_items") or []
    intent           = state.get("intent") or "casual"
    weather          = state.get("weather") or "unknown"
    calendar_events  = state.get("calendar_events") or []
    conflict_warning = state.get("conflict_warning")

    try:
        # ① presigned URL 추가
        items_with_url = _attach_image_urls(ranked_items)

        # ② LLM 프롬프트 구성
        items_text    = _build_items_text(items_with_url)
        calendar_text = ", ".join(calendar_events) if calendar_events else "No events today"

        conflict_context = ""
        if conflict_warning == "anchor_ncp_conflict":
            conflict_context = (
                "\nNote: The anchor item was previously part of a disliked outfit. "
                "Suggest a fresh styling approach that feels different from before."
            )

        system_prompt = """You are a friendly personal stylist assistant.
Given a list of recommended clothing items, write a warm and practical outfit suggestion.
Keep it concise (2-3 sentences). Mention the occasion and weather naturally.
When item names are provided, reference them specifically to make the suggestion feel personal."""

        human_prompt = f"""Occasion style: {intent}
Weather: {weather}
Today's schedule: {calendar_text}
{conflict_context}
Recommended items:
{items_text}

Write a friendly outfit recommendation:"""

        response       = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt),
        ])
        final_response = response.content.strip()

        if conflict_warning == "anchor_ncp_conflict":
            final_response = (
                "💡 이전에 별로였던 조합이지만, 이번엔 다르게 스타일링해봤어요.\n\n"
                + final_response
            )

        recommended_outfit_ids = [
            item["id"]
            for item in items_with_url
            if isinstance(item.get("id"), int)
        ]

        return {
            "final_response":         final_response,
            "recommended_outfit_ids": recommended_outfit_ids,
            "ranked_items":           items_with_url,
        }

    except Exception as e:
        return {
            "final_response":         "추천을 생성하는 중 오류가 발생했어요. 다시 시도해주세요.",
            "recommended_outfit_ids": [],
            "errors":                 [f"response_agent 예외: {str(e)}"],
        }


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼 함수들 (기존 유지)
# ──────────────────────────────────────────────────────────────────────────────

def _attach_image_urls(items: list[dict]) -> list[dict]:
    """
    각 아이템에 imageUrl 추가.

    처리 규칙:
      crop_s3_key 있음 → S3 presigned URL (closet & external 공통)
      crop_s3_key 없음 + external → imageUrl 그대로 (네이버 원본)
      crop_s3_key 없음 + closet   → imageUrl = None (placeholder)
    """
    result = []
    for item in items:
        item        = dict(item)
        crop_s3_key = item.get("crop_s3_key")
        is_external = item.get("is_external", False)

        if crop_s3_key:
            try:
                item["imageUrl"] = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": S3_BUCKET, "Key": crop_s3_key},
                    ExpiresIn=3600,
                )
                print(f"[ResponseAgent] presigned URL 생성: {crop_s3_key}")
            except Exception as e:
                print(f"[ResponseAgent] presigned URL 생성 실패: {crop_s3_key} - {e}")
                if not is_external:
                    item["imageUrl"] = None

        elif not is_external:
            item["imageUrl"] = None

        result.append(item)
    return result


def _build_items_text(items: list[dict]) -> str:
    lines = []
    for item in items:
        category    = item.get("category", "")
        name        = item.get("name")
        style       = item.get("style", "")
        is_anchor   = item.get("is_anchor", False)
        is_external = item.get("is_external", False)

        tags = []
        if is_anchor:
            tags.append("anchor")
        if is_external:
            tags.append("shopping pick")
        tag_str = f" ({', '.join(tags)})" if tags else ""

        if name:
            lines.append(f"- {category}{tag_str} — {name}")
        else:
            description = style if style else "no style info"
            lines.append(f"- {category}{tag_str} — {description}")

    return "\n".join(lines)