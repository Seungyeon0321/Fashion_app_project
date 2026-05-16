# ai-worker/stylist/main.py
"""
Fashion Stylist FastAPI 엔드포인트

역할:
  NestJS backend에서 /recommend로 POST 요청을 받아
  LangGraph 파이프라인을 실행하고 결과를 반환한다.

NestJS 호출 코드 (backend/src/style/styles.service.ts):
  this.httpService.post(`${fastapiUrl}/recommend`, body)

기존 대비 변경점:
  Request: user_id, source, anchor_item_id, style_reference_ids 추가
  intent 검증: 제거 (Planner 노드가 의도 분석 담당)
  thread_id: LangGraph MemorySaver 세션 메모리용 추가
             같은 user_id면 이전 대화 컨텍스트 유지
  Response: imageUrl 포함 (presigned URL, Response 노드에서 생성)
  excluded_items → excluded_outfits: 조합 단위로 변경
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from .graph import graph

app = FastAPI(title="Fashion Stylist API")


# ──────────────────────────────────────────────────────────────────────────────
# Request / Response 스키마
# ──────────────────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    """
    NestJS StylesService.recommend()에서 전달하는 요청 body.

    user_id:
        JWT에서 추출한 유저 ID. NestJS가 인증 처리 후 전달.
        DB 조회 시 user_id 검증에 사용.

    user_message:
        사용자가 입력한 자연어 메시지.
        예: "오늘 미팅 있는데 뭐 입지?"

    source:
        "closet"   → 내 옷장에서 추천
        "external" → 네이버 쇼핑에서 추천

    anchor_item_id:
        "이 옷 기반으로 추천해줘"에서 지정한 옷장 아이템 ID.
        없으면 전체 옷장 or 스타일 기반 검색.

    style_reference_ids:
        사용자가 저장한 StyleReference ID 목록.
        Style Analyzer에서 평균 벡터 계산에 사용.

    excluded_outfits:
        싫어요를 누른 조합 목록 (조합 단위).
        기존 excluded_items(개별 아이템)에서 변경.
        예: [{"item_ids": [1, 2, 3], "intent": "casual"}]
    """
    user_id:             int
    user_message:        Optional[str] = ""
    intent:              Optional[str] = None
    source:              str = "closet"
    anchor_item_id:      Optional[int] = None
    style_reference_ids: Optional[List[int]] = []
    excluded_outfits:    Optional[List[dict]] = []


class RecommendItemResponse(BaseModel):
    """
    추천 결과의 개별 아이템 스키마.

    imageUrl:
        closet 아이템: S3 presigned URL (1시간 유효)
        external 아이템: 네이버 쇼핑 원본 URL
        없으면 None (프론트에서 placeholder 처리)

    is_anchor:
        앵커 아이템이면 True.
        프론트에서 "기준 아이템" 뱃지 표시에 활용.

    is_external:
        외부(네이버 쇼핑) 아이템이면 True.
        프론트에서 "구매하기" 버튼 표시에 활용.

    purchaseUrl:
        external 아이템의 구매 링크.
        closet 아이템은 None.
    """
    id:          object          # int (closet) or str (external mock)
    category:    str
    subCategory: Optional[str] = None
    name:        Optional[str] = None
    brand:       Optional[str] = None
    colors:      Optional[List[str]] = []
    material:    Optional[str] = None
    fit:         Optional[str] = None
    imageUrl:    Optional[str] = None
    purchaseUrl: Optional[str] = None
    similarity:  Optional[float] = None
    is_anchor:   bool = False
    is_external: bool = False


class RecommendResponse(BaseModel):
    """
    NestJS로 반환하는 응답 스키마.

    conflict_warning:
        "anchor_ncp_conflict"이면 프론트에서
        "이전에 별로였던 조합" 안내 표시.

    relaxation_level:
        최종적으로 몇 번째 완화 단계에서 결과가 나왔는지.
        디버깅/모니터링용.
    """
    intent:           Optional[str] = None
    calendar_events:  Optional[List[str]] = []
    weather:          Optional[str] = None
    ranked_items:     List[RecommendItemResponse] = []
    final_response:   str
    conflict_warning: Optional[str] = None
    relaxation_level: Optional[int] = None


# ──────────────────────────────────────────────────────────────────────────────
# 엔드포인트
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """헬스체크. Docker Compose의 healthcheck에서 사용."""
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    """
    코디 추천 엔드포인트.

    LangGraph thread_id:
        user_id를 thread_id로 사용.
        같은 유저의 요청은 동일한 LangGraph 세션으로 처리.
        → MemorySaver가 이전 추천 컨텍스트(excluded_outfits 등)를 유지.

        왜 user_id를 thread_id로 쓰는가?
        유저별로 대화 맥락이 달라야 하므로.
        user_1의 세션과 user_2의 세션은 완전히 분리.
    """
    # LangGraph initial state
    # OutfitState의 모든 필드를 초기화
    initial_state = {
        # Input
        "user_message":        request.user_message,
        "user_id":             str(request.user_id),
        "source":              request.source,
        "anchor_item_id":      request.anchor_item_id,
        "style_reference_ids": request.style_reference_ids or [],

        # Planner가 채울 필드들 (초기값 None)
        "intent":              request.intent,
        "weather":             None,
        "calendar_events":     None,
        "season":              None,
        "avoid_constraints":   None,
        "conflict_warning":    None,

        # Style Analyzer가 채울 필드들
        "anchor_item":         None,
        "style_vector":        None,
        "style_keywords":      None,
        "has_style_context":   None,

        # Retrieval이 채울 필드들
        "retrieved_items":     None,
        "relaxation_level":    None,

        # Ranker가 채울 필드들
        "ranked_items":        None,
        "guardrail_passed":    None,
        "retry_count":         0,

        # Validator/Response가 채울 필드들
        "failure_reason":      None,
        "final_response":      None,
        "recommended_outfit_ids": None,

        # Memory (Annotated → LangGraph 자동 병합)
        # excluded_outfits: 기존 세션 데이터 + 이번 요청 데이터 합산
        "session_history":     [],
        "excluded_outfits":    request.excluded_outfits or [],
        "errors":              [],
    }

    # LangGraph 실행
    # thread_id: user_id 기반 세션 메모리
    config = {"configurable": {"thread_id": str(request.user_id)}}

    try:
        result = graph.invoke(initial_state, config=config)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"LangGraph 실행 오류: {str(e)}"
        )

    # final_response가 없으면 에러
    if not result.get("final_response"):
        raise HTTPException(
            status_code=500,
            detail="추천 결과를 생성하지 못했습니다."
        )

    # ranked_items → RecommendItemResponse 변환
    ranked_items = [
        RecommendItemResponse(
            id=item.get("id"),
            category=item.get("category", ""),
            subCategory=item.get("subCategory"),
            name=item.get("name"),
            brand=item.get("brand"),
            colors=item.get("colors") or [],
            material=item.get("material"),
            fit=item.get("fit"),
            imageUrl=item.get("imageUrl"),
            purchaseUrl=item.get("purchaseUrl"),
            similarity=item.get("similarity"),
            is_anchor=item.get("is_anchor", False),
            is_external=item.get("is_external", False),
        )
        for item in (result.get("ranked_items") or [])
    ]

    return RecommendResponse(
        intent=result.get("intent"),
        calendar_events=result.get("calendar_events") or [],
        weather=result.get("weather"),
        ranked_items=ranked_items,
        final_response=result["final_response"],
        conflict_warning=result.get("conflict_warning"),
        relaxation_level=result.get("relaxation_level"),
    )
