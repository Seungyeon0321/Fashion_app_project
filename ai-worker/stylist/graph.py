from langgraph.graph import StateGraph, END
from .agents.state import OutfitState
from .agents.planner import planner
from .agents.retrieval import retrieval
from .agents.ranker import ranker
from .agents.response_agent import response_agent


def check_guardrail(state: OutfitState) -> str:
    if state["guardrail_passed"]:
        return "pass"
    if (state.get("retry_count") or 0) >= 3:
        return "pass"
    return "retry"


def build_graph():
    graph_builder = StateGraph(OutfitState)

    graph_builder.add_node("planner",        planner)
    graph_builder.add_node("retrieval",      retrieval)
    graph_builder.add_node("ranker",         ranker)
    graph_builder.add_node("response_agent", response_agent)

    graph_builder.set_entry_point("planner")
    graph_builder.add_edge("planner",   "retrieval")
    graph_builder.add_edge("retrieval", "ranker")

    graph_builder.add_conditional_edges(
        "ranker",
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