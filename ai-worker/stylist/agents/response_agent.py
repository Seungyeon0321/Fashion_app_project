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

Step 38-pre 추가:
  proposals를 resolved > partial > failed 순으로 정렬.
  1순위 proposal만 ranked_items로 반환.
  2순위~3순위는 Redis에 저장 (save_proposals).
  LLM 메시지는 1순위에 대해서만 생성 (비용 절감).
"""

import os
import json
import boto3
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from stylist.outfit_state import OutfitState, OutfitProposal
from shared.redis_client import save_proposals

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

    if source == "external":
        return _respond_external(state)

    return _respond_closet(state)


# ──────────────────────────────────────────────────────────────────────────────
# Step 37 + 38-pre: external 흐름 응답
# ──────────────────────────────────────────────────────────────────────────────

def _respond_external(state: OutfitState) -> dict:
    """
    External 흐름 응답 구성.

    Step 38-pre 변경:
      1. proposals를 resolved > partial > failed 순으로 정렬
      2. 각 proposal을 presigned URL 포함 형태로 직렬화
      3. 1순위 LLM 메시지 생성
      4. 2~3순위를 Redis에 저장
      5. 1순위만 ranked_items로 반환
    """
    # ── 디버그: anchor 상태 확인 ──────────────────────────────────
    print(f"[DEBUG] anchor_item in state: {state.get('anchor_item')}", flush=True)
    print(f"[DEBUG] anchor_item_id in state: {state.get('anchor_item_id')}", flush=True)
    # ─────────────────────────────────────────────────────────────
    

    proposals: list[OutfitProposal] = state.get("outfit_proposals") or []
    user_id         = state.get("user_id") or "unknown"
    session_id      = state.get("session_id") or ""
    intent          = state.get("intent") or "casual"
    weather         = state.get("weather") or "unknown"
    calendar_events = state.get("calendar_events") or []

    # ── 1. proposals 정렬: resolved > partial > failed ────────────────────
    # Redis 저장 순서 = 유저에게 보여줄 순서이므로
    # 가장 완성도 높은 코디가 먼저 오도록 정렬
    def _sort_key(p):
        return {"resolved": 0, "partial": 1, "failed": 2}.get(
            p.get("proposal_status", "failed"), 2
        )

    sorted_proposals = sorted(proposals, key=_sort_key)

    valid_proposals = [
        p for p in sorted_proposals
        if p.get("proposal_status") in ("resolved", "partial")
    ]

    if not valid_proposals:
        return {
            "final_response":         "적합한 코디를 찾지 못했어요. 다시 시도해주세요.",
            "ranked_items":           [],
            "recommended_outfit_ids": [],
        }

    # ── 2. 각 proposal presigned URL 변환 ────────────────────────────────
    def _serialize_proposal(prop: dict) -> list[dict]:
        """proposal 1개의 아이템들을 presigned URL 포함 형태로 변환."""
        items_with_url = []
        for category, spec in prop.get("items", {}).items():
            resolved = spec.get("resolved_item")
            if not resolved:
                continue

            resolved    = dict(resolved)
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
            # external + crop_s3_key 없음 → imageUrl 그대로 (네이버 원본)

            items_with_url.append(resolved)
        return items_with_url

    # 모든 valid proposal을 직렬화
    # Redis에 저장할 때 URL 포함된 상태로 저장해야
    # 나중에 꺼낼 때 S3 재호출 없이 바로 사용 가능
    serialized_list = []
    for prop in valid_proposals:
        items = _serialize_proposal(prop)
        if not items:
            continue
        serialized_list.append({
            "mood":             prop.get("mood", "general"),
            "ranked_items":     items,
            "intent":           intent,
            "weather":          weather,
            "calendar_events":  calendar_events,
            "final_response":   None,   # 아래에서 1순위만 채움
            "conflict_warning": state.get("conflict_warning"),
            "relaxation_level": state.get("relaxation_level"),
        })

    if not serialized_list:
        return {
            "final_response":         "코디 아이템 정보를 불러오지 못했어요.",
            "ranked_items":           [],
            "recommended_outfit_ids": [],
        }

    # ── 3. 1순위 LLM 메시지 생성 ──────────────────────────────────────────
    # 2~3순위는 나중에 꺼낼 때 final_response가 None이면
    # main.py에서 fallback 메시지로 대체 (비용 절감)
    first_items   = serialized_list[0]["ranked_items"]
    items_text    = _build_items_text(first_items)
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
        first_message = response.content.strip()
    except Exception:
        first_message = "코디를 준비했어요. 마음에 드는 스타일을 골라보세요!"

    serialized_list[0]["final_response"] = first_message

    # ── 4. 2~3순위 Redis 저장 ──────────────────────────────────────────────
    # 1순위는 지금 바로 반환하므로 Redis에는 2번째부터 저장
    # pop_next_proposal이 cursor 순서대로 꺼냄
    remaining = serialized_list[1:]
    if remaining:
        try:
            save_proposals(user_id, session_id, remaining)
            print(f"[ResponseAgent] Redis 저장 완료: {len(remaining)}개 (session={session_id})")
        except Exception as e:
            # Redis 저장 실패해도 1순위 응답은 정상 반환
            # 다음 요청에서 캐시 miss → 파이프라인 재실행으로 자동 복구
            print(f"[ResponseAgent] Redis 저장 실패 (무시): {e}")

    # ── 5. 1순위만 반환 ────────────────────────────────────────────────────
    first = serialized_list[0]
    recommended_outfit_ids = [
        item["id"] for item in first["ranked_items"]
        if isinstance(item.get("id"), int)
    ]

    print(f"[ResponseAgent] external: 1순위 반환, {len(remaining)}개 Redis 저장")

    return {
        "final_response":         first["final_response"],
        "ranked_items":           first["ranked_items"],
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
        items_with_url = _attach_image_urls(ranked_items)
        items_text     = _build_items_text(items_with_url)
        calendar_text  = ", ".join(calendar_events) if calendar_events else "No events today"

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