import os
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from .state import OutfitState

load_dotenv()

llm = ChatAnthropic(model="claude-haiku-4-5", max_tokens=512)

def response_agent(state: OutfitState) -> dict:
    ranked_items = state["ranked_items"]
    intent = state["intent"]
    weather = state["weather"]
    calendar_events = state["calendar_events"] or []

    items_text = "\n".join([f"{item['category']} ({item['style']})" for item in ranked_items])
    calendar_text = ", ".join(calendar_events) if calendar_events else "No events today"

    system_prompt = """You are a friendly personal stylist assistant.
                        Given a list of recommended clothing items, write a warm and practical outfit suggestion.
                        Keep it concise (2-3 sentences). Mention the occasion and weather naturally."""

    human_prompt = f"""Occasion style: {intent}
                    Weather: {weather}
                    Today's schedule: {calendar_text}

                    Recommended items: {items_text}

                    Write a friendly outfit recommendation:"""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ])

    return {"final_response": response.content.strip()}