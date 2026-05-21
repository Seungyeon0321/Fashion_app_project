# ai-worker/stylist/graph.py

from langgraph.graph import StateGraph, END

from .outfit_state import OutfitState
from .agents.planner import planner
from .agents.style_analyzer import style_analyzer
from .agents.query_builder import query_builder
from .agents.retrieval import retrieval
from .agents.ranker import ranker
from .agents.validator import validator
from .agents.response_agent import response_agent


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


def build_graph():
    graph_builder = StateGraph(OutfitState)

    # ── 노드 등록 ────────────────────────────────────────────────
    graph_builder.add_node("planner",        planner)
    graph_builder.add_node("style_analyzer", style_analyzer)
    graph_builder.add_node("query_builder",  query_builder)
    graph_builder.add_node("retrieval",      retrieval)
    graph_builder.add_node("ranker",         ranker)
    graph_builder.add_node("validator",      validator)
    graph_builder.add_node("response_agent", response_agent)

    # ── 엣지 연결 ────────────────────────────────────────────────
    graph_builder.set_entry_point("planner")
    graph_builder.add_edge("planner",        "style_analyzer")
    graph_builder.add_edge("style_analyzer", "query_builder")
    graph_builder.add_edge("query_builder",  "retrieval")
    graph_builder.add_edge("retrieval",      "ranker")
    graph_builder.add_edge("ranker",         "validator")

    # validator 결과에 따라 분기
    graph_builder.add_conditional_edges(
        "validator",
        check_guardrail,
        {
            "pass":  "response_agent",
            "retry": "retrieval",       # relaxation_level 올라가서 재검색
        }
    )

    graph_builder.add_edge("response_agent", END)

    return graph_builder.compile()


# 앱 시작 시 한 번만 컴파일
graph = build_graph()