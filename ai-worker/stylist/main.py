from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from .graph import graph

app = FastAPI(title="Fashion Stylist API")

class RecommendRequest(BaseModel):
    user_message: str
    intent: str
    excluded_items: Optional[List[int]] = [] # 교체 시 제외할 아이템 ID 목록

class RecommendResponse(BaseModel):
    intent: str
    calendar_events: Optional[List[str]] = []
    weather: Optional[str] = None
    ranked_items: List[dict] = []
    final_response: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    if request.intent not in ["formal", "casual", "sporty"]:
        raise HTTPException(status_code=400, detail="Invalid intent")

    initial_state = {
        "user_message":    request.user_message,
        "intent":          request.intent,
        "excluded_items":  request.excluded_items,
        "weather":         None,
        "calendar_events": None,
        "season":          None,
        "retrieved_items": None,
        "ranked_items":    None,
        "guardrail_passed": None,
        "retry_count":     0,
        "final_response":  None,
    }

    result = graph.invoke(initial_state)

    return RecommendResponse(
        intent=result["intent"],
        calendar_events=result["calendar_events"],
        weather=result["weather"],
        ranked_items=result["ranked_items"],
        final_response=result["final_response"],
    )