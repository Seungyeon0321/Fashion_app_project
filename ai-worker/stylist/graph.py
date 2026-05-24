# ai-worker/stylist/graph.py

from langgraph.graph import StateGraph, END

from .outfit_state import OutfitState
from .agents.planner         import planner
from .agents.style_analyzer  import style_analyzer
from .agents.outfit_composer import outfit_composer   # Step 37 신규
from .agents.query_builder   import query_builder
from .agents.retrieval       import retrieval
from .agents.ranker          import ranker
from .agents.validator       import validator
from .agents.response_agent  import response_agent


def check_guardrail(state: OutfitState) -> str:
    """
    Validator 결과에 따라 분기.
      pass  → Response로 진행
      retry → Retrieval로 돌아가 조건 완화 후 재검색
    retry_count >= 3이면 강제 pass (무한루프 방지)
    """
    if state.get("guardrail_passed"):
        return "pass"
    if (state.get("retry_count") or 0) >= 3:
        return "pass"
    return "retry"


def _route_after_style_analyzer(state: OutfitState) -> str:
    """
    Step 37 신규 분기.
    style_analyzer 이후 source에 따라 다음 노드 결정.
      external → outfit_composer (LLM 코디 비전 생성)
      closet   → query_builder   (pgvector 검색 쿼리 생성)
    """
    source = state.get("source") or "closet"
    if source == "external":
        return "outfit_composer"
    return "query_builder"


def build_graph():
    graph_builder = StateGraph(OutfitState)

    # ── 노드 등록 ────────────────────────────────────────────────
    graph_builder.add_node("planner",         planner)
    graph_builder.add_node("style_analyzer",  style_analyzer)
    graph_builder.add_node("outfit_composer", outfit_composer)  # Step 37 신규
    graph_builder.add_node("query_builder",   query_builder)
    graph_builder.add_node("retrieval",       retrieval)
    graph_builder.add_node("ranker",          ranker)
    graph_builder.add_node("validator",       validator)
    graph_builder.add_node("response_agent",  response_agent)

    # ── 엣지 연결 ────────────────────────────────────────────────
    graph_builder.set_entry_point("planner")
    graph_builder.add_edge("planner", "style_analyzer")

    # Step 37: style_analyzer 이후 source 기준 분기
    # (기존: style_analyzer → query_builder 직결)
    graph_builder.add_conditional_edges(
        "style_analyzer",
        _route_after_style_analyzer,
        {
            "outfit_composer": "outfit_composer",
            "query_builder":   "query_builder",
        },
    )

    # outfit_composer, query_builder 이후 retrieval로 합류
    graph_builder.add_edge("outfit_composer", "retrieval")
    graph_builder.add_edge("query_builder",   "retrieval")

    graph_builder.add_edge("retrieval", "ranker")
    graph_builder.add_edge("ranker",    "validator")

    # validator 결과에 따라 분기 (기존 동일)
    graph_builder.add_conditional_edges(
        "validator",
        check_guardrail,
        {
            "pass":  "response_agent",
            "retry": "retrieval",
        }
    )

    graph_builder.add_edge("response_agent", END)

    return graph_builder.compile()


# 앱 시작 시 한 번만 컴파일
graph = build_graph()