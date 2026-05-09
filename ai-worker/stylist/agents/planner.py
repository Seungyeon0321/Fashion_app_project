import os
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from .state import OutfitState

load_dotenv()

llm = ChatAnthropic(model="claude-haiku-4-5", max_tokens=512)

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

def get_weather() -> dict:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    lat     = os.getenv("WEATHER_LAT", "49.2827")
    lon     = os.getenv("WEATHER_LON", "-123.1207")

    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    res = requests.get(url)
    data = res.json()

    temp      = data["main"]["temp"]
    condition = data["weather"][0]["main"].lower()

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

def get_calendar() -> list[str]:
    token_path = os.path.join(os.path.dirname(__file__), "..", "token.json")
    creds = Credentials.from_authorized_user_file(token_path, SCOPES)

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        with open(token_path, "w") as token_file:
            token_file.write(creds.to_json())

    service = build("calendar", "v3", credentials=creds)

    now = datetime.now(timezone.utc).isoformat()
    events_result = service.events().list(
        calendarId="primary",
        timeMin=now,
        maxResults=5,
        singleEvents=True,
        orderBy="startTime"
    ).execute()

    events = events_result.get("items", [])
    return [event.get("summary", "No title") for event in events]

def planner(state: OutfitState) -> dict:
    weather_data  = get_weather()
    calendar_data = get_calendar()
    weather_str   = f"{weather_data['temperature']}deg C, {weather_data['condition']}"

    return {
        "weather":         weather_str,
        "calendar_events": calendar_data,
        "season":          weather_data["season"],
    }