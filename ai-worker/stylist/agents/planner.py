import os
import requests
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from .state import OutfitState

load_dotenv()

llm = ChatAnthropic(model="claude-haiku-4-5", max_tokens=512)

def get_weather() -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    lat     = os.getenv("WEATHER_LAT", "49.2827")
    lon     = os.getenv("WEATHER_LON", "-123.1207")

    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    res = requests.get(url)
    data = res.json()

    print("🌤️ Weather API response:", data)  # ← 추가

    temp      = data["main"]["temp"]
    condition = data["weather"][0]["main"].lower()

    # 기온 기반 시즌 판단
    if temp >= 20:
        season = "summer"
    elif temp >= 10:
        season = "spring"
    elif temp >= 0:
        season = "fall"
    else:
        season = "winter"

    return {
        "temperature": temp,
        "condition":   condition,
        "season":      season,
    }

def get_mock_calendar() -> list[str]:
    return ["2pm team meeting", "5pm client call", "8pm dinner with friends"]

def planner(state: OutfitState) -> dict:
    weather_data  = get_weather()
    calendar_data = get_mock_calendar()
    weather_str   = f"{weather_data['temperature']}deg C, {weather_data['condition']}"

    return {
        "weather":         weather_str,
        "calendar_events": calendar_data,
        "season":          weather_data["season"],
    }