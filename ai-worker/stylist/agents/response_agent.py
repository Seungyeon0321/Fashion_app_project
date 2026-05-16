# ai-worker/stylist/nodes/response_agent.py
"""
Response Agent 노드

역할:
  Validator를 통과한 최종 코디 조합을 바탕으로
  사용자에게 전달할 자연어 추천 메시지를 생성한다.

파이프라인에서의 위치:
  Validator (pass) → [Response Agent] → END

기존 코드 대비 추가된 것:
  ① name 필드 활용
     "Navy Wool Zara Slim Jacket" 같은 자동 생성 이름을
     LLM 프롬프트에 포함 → 더 구체적인 코디 설명 생성

  ② presigned URL 생성
     closet 아이템의 crop_s3_key → S3 presigned URL 변환
     external 아이템은 imageUrl 그대로 사용
     보안: S3 직접 URL 대신 1시간짜리 presigned URL 발급

  ③ conflict_warning 처리
     "anchor_ncp_conflict"이면 안내 문구 추가
     "전에 별로였던 조합이지만, 이번엔 다르게 스타일링해봤어요"

LangChain 패턴:
  기존 코드의 ChatAnthropic + SystemMessage/HumanMessage 패턴 유지
"""

import os
import boto3
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from stylist.outfit_state import OutfitState

load_dotenv()


# ──────────────────────────────────────────────────────────────────────────────
# 클라이언트 초기화
# ──────────────────────────────────────────────────────────────────────────────

# LLM: 기존 코드와 동일한 모델/설정 유지
llm = ChatAnthropic(model="claude-haiku-4-5", max_tokens=512)

# S3 클라이언트: presigned URL 생성용
# 기존 retrieval.py에 있던 S3 로직을 여기로 이동
s3_client = boto3.client(
    "s3",
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)
S3_BUCKET = os.getenv("AWS_S3_BUCKET")


# ──────────────────────────────────────────────────────────────────────────────
# 메인 노드 함수
# ──────────────────────────────────────────────────────────────────────────────

def response_agent(state: OutfitState) -> dict:
    """
    Response Agent 노드 메인 함수.

    처리 순서:
      ① ranked_items에 presigned URL 추가
      ② LLM 프롬프트 구성 (name 활용)
      ③ conflict_warning 있으면 안내 문구 추가
      ④ LLM 호출 → final_response 생성
      ⑤ recommended_outfit_ids 추출
    """
    ranked_items    = state.get("ranked_items") or []
    intent          = state.get("intent") or "casual"
    weather         = state.get("weather") or "unknown"
    calendar_events = state.get("calendar_events") or []
    conflict_warning = state.get("conflict_warning")

    try:
        # ──────────────────────────────────────────────────────────────────
        # ① presigned URL 추가
        #
        # closet 아이템: crop_s3_key → presigned URL (1시간 유효)
        # external 아이템: imageUrl 그대로 사용 (S3 저장 없음)
        # crop_s3_key가 없으면 imageUrl = None (프론트에서 placeholder 처리)
        # ──────────────────────────────────────────────────────────────────
        items_with_url = _attach_image_urls(ranked_items)

        # ──────────────────────────────────────────────────────────────────
        # ② LLM 프롬프트 구성
        #
        # 기존: "TOP (casual), BOTTOM (minimal)"
        # 개선: "TOP — Navy Wool Zara Slim Jacket"
        #        name이 없으면 category + style로 fallback
        # ──────────────────────────────────────────────────────────────────
        items_text = _build_items_text(items_with_url)
        calendar_text = ", ".join(calendar_events) if calendar_events else "No events today"

        # ──────────────────────────────────────────────────────────────────
        # ③ conflict_warning 처리
        #
        # "anchor_ncp_conflict": 앵커가 싫어요 조합에 포함됐던 아이템
        # → 프롬프트에 컨텍스트 추가해서 LLM이 다르게 스타일링하도록 유도
        # ──────────────────────────────────────────────────────────────────
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

        # ──────────────────────────────────────────────────────────────────
        # ④ LLM 호출
        # ──────────────────────────────────────────────────────────────────
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt),
        ])

        final_response = response.content.strip()

        # conflict_warning이 있으면 프론트에 표시할 짧은 안내 문구 앞에 추가
        # LLM 응답과 별개로 UI 레벨에서 표시하기 위해 구분
        if conflict_warning == "anchor_ncp_conflict":
            final_response = (
                "💡 이전에 별로였던 조합이지만, 이번엔 다르게 스타일링해봤어요.\n\n"
                + final_response
            )

        # ──────────────────────────────────────────────────────────────────
        # ⑤ recommended_outfit_ids 추출
        #
        # closet 아이템의 id만 추출 (int 타입)
        # external Mock 아이템은 "mock_ext_001" 같은 문자열이므로 제외
        # 나중에 Outfit 테이블에 저장할 때 사용
        # ──────────────────────────────────────────────────────────────────
        recommended_outfit_ids = [
            item["id"]
            for item in items_with_url
            if isinstance(item.get("id"), int)
        ]

        return {
            "final_response":          final_response,
            "recommended_outfit_ids":  recommended_outfit_ids,
            "ranked_items":            items_with_url,  # presigned URL 포함 버전으로 업데이트
        }

    except Exception as e:
        return {
            "final_response":         f"추천을 생성하는 중 오류가 발생했어요. 다시 시도해주세요.",
            "recommended_outfit_ids": [],
            "errors":                 [f"response_agent 예외: {str(e)}"],
        }


# ──────────────────────────────────────────────────────────────────────────────
# 헬퍼 함수들
# ──────────────────────────────────────────────────────────────────────────────

def _attach_image_urls(items: list[dict]) -> list[dict]:
    """
    각 아이템에 imageUrl 추가.

    closet 아이템 (is_external=False):
        crop_s3_key가 있으면 presigned URL 생성
        없으면 imageUrl = None

    external 아이템 (is_external=True):
        imageUrl이 이미 있으므로 그대로 유지
        S3에 저장하지 않으므로 presigned URL 불필요

    presigned URL 만료 시간: 3600초 (1시간)
        사용자가 추천 결과를 받은 후 1시간 내에 확인하는 게 일반적.
        만료되면 프론트에서 재요청 필요 (MVP에서는 허용).
    """
    result = []
    for item in items:
        item = dict(item)  # 원본 dict 변경 방지

        if item.get("is_external"):
            # external 아이템: imageUrl 그대로
            result.append(item)
            continue

        # closet 아이템: crop_s3_key → presigned URL
        crop_s3_key = item.get("crop_s3_key")
        if crop_s3_key:
            try:
                item["imageUrl"] = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": S3_BUCKET, "Key": crop_s3_key},
                    ExpiresIn=3600,
                )
            except Exception as e:
                print(f"[ResponseAgent] presigned URL 생성 실패: {crop_s3_key} - {e}")
                item["imageUrl"] = None
        else:
            item["imageUrl"] = None

        result.append(item)

    return result


def _build_items_text(items: list[dict]) -> str:
    """
    LLM 프롬프트용 아이템 설명 텍스트 생성.

    name 있으면: "TOP (anchor) — Navy Wool Zara Slim Jacket"
    name 없으면: "TOP — casual style" (기존 방식 fallback)

    anchor 표시:
        앵커 아이템임을 LLM에게 알려서
        "이 재킷을 중심으로 코디했어요" 같은 표현을 유도.
    """
    lines = []
    for item in items:
        category    = item.get("category", "")
        name        = item.get("name")
        style       = item.get("style", "")
        is_anchor   = item.get("is_anchor", False)
        is_external = item.get("is_external", False)

        # 앵커 / 외부 아이템 표시
        tags = []
        if is_anchor:
            tags.append("anchor")
        if is_external:
            tags.append("shopping pick")
        tag_str = f" ({', '.join(tags)})" if tags else ""

        # name 있으면 구체적으로, 없으면 category + style fallback
        if name:
            lines.append(f"- {category}{tag_str} — {name}")
        else:
            description = style if style else "no style info"
            lines.append(f"- {category}{tag_str} — {description}")

    return "\n".join(lines)