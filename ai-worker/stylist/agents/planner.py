import os
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from .state import OutfitState

load_dotenv()

llm = ChatAnthropic(model="claude-haiku-4-5", max_tokens=512)

def get_mock_weather() -> dict:
    """ 테스트용 날씨 데이터 반환 """

    return {
        "temperature": 15.0,
        "condition": "sunny",
        "season": "spring",
    }

def get_mock_calendar() -> list[str]:
    """ 테스트용 달력 데이터 반환 """
    return ["2pm team meting", "5pm client call", "8pm dinner with friends"]

def planner(state: OutfitState) -> dict:
    weather_data = get_mock_weather()
    calendar_data = get_mock_calendar()
    weather_str = f"{weather_data['temperature']}deg C, {weather_data['condition']}"

    # intent는 UI 버튼으로 이미 받은 상태
    # planner의 역할: 날씨 + 캘린더 정보 수집 후 state에 추가

    # intent랑 calendar 정보를 비교해서 만약 정보가 다를 경우 유저에게 알려줘야 함
    # if state['intent'] != calendar_data:
    #     return {
    #         "error": "The calendar information is different from the intent. Please check the calendar information."
    #     }

    return {
        "weather": weather_str,
        "calendar_events": calendar_data,
        "season": weather_data["season"],
    }