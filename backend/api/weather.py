"""
날씨 정보 API 엔드포인트
GET /api/weather
OpenWeatherMap 5-day/3-hour forecast API 연동
"""

import os
from datetime import datetime
from collections import defaultdict

import httpx
from fastapi import APIRouter, Query, HTTPException
from models.schemas import WeatherForecast

router = APIRouter()

# 제주시 좌표
JEJU_LAT = 33.4996
JEJU_LON = 126.5312

WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"]

# OpenWeatherMap condition → 한글 매핑
CONDITION_MAP = {
    "Clear": "맑음",
    "Clouds": "구름",
    "Overcast": "흐림",
    "Rain": "비",
    "Drizzle": "비",
    "Thunderstorm": "폭우",
    "Snow": "눈",
    "Mist": "흐림",
    "Fog": "흐림",
    "Haze": "흐림",
    "Dust": "흐림",
    "Squall": "강풍",
    "Tornado": "강풍",
}

ICON_MAP = {
    "맑음": "☀️",
    "구름": "⛅",
    "흐림": "☁️",
    "비": "🌧️",
    "눈": "❄️",
    "폭우": "⛈️",
    "강풍": "💨",
}


def _map_condition(main: str, description: str) -> str:
    """OpenWeatherMap main/description → 한글 condition"""
    if "overcast" in description.lower():
        return "흐림"
    return CONDITION_MAP.get(main, "흐림")


def _make_recommendation(condition: str, wind_speed: float) -> str:
    if condition in ("비", "폭우"):
        return "실내 활동 추천"
    if condition == "눈":
        return "노면 결빙 주의, 실내 활동 추천"
    if condition == "강풍" or wind_speed >= 10:
        return "강풍 주의, 해안가 주의"
    if condition == "맑음":
        return "야외 활동 적합"
    return "일반 활동 가능"


def _aggregate_daily(items: list[dict]) -> dict:
    """3시간 단위 데이터를 하루 단위로 집계"""
    temps = [it["main"]["temp"] for it in items]
    feels = [it["main"]["feels_like"] for it in items]
    humidities = [it["main"]["humidity"] for it in items]
    winds = [it["wind"]["speed"] for it in items]
    pops = [it.get("pop", 0) * 100 for it in items]
    rains = [it.get("rain", {}).get("3h", 0) for it in items]

    # 가장 빈번한 날씨 condition 선택
    conditions = [_map_condition(it["weather"][0]["main"], it["weather"][0].get("description", "")) for it in items]
    most_common = max(set(conditions), key=conditions.count)

    avg_wind = sum(winds) / len(winds)

    return {
        "temp_min": round(min(temps)),
        "temp_max": round(max(temps)),
        "temp_feel": round(sum(feels) / len(feels)),
        "humidity": round(sum(humidities) / len(humidities)),
        "wind_speed": round(avg_wind),
        "precip_chance": round(max(pops)),
        "precip_amount": round(sum(rains), 1),
        "condition": most_common,
    }


@router.get("/weather")
async def get_weather(days: int = Query(default=5, ge=1, le=5)) -> list[WeatherForecast]:
    """제주 날씨 예보 조회 (OpenWeatherMap 5-day forecast)"""
    api_key = os.getenv("OPENWEATHERMAP_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENWEATHERMAP_API_KEY가 설정되지 않았습니다.")

    url = (
        f"https://api.openweathermap.org/data/2.5/forecast"
        f"?lat={JEJU_LAT}&lon={JEJU_LON}"
        f"&appid={api_key}&units=metric&lang=kr"
    )

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"OpenWeatherMap API 오류: {resp.status_code}")

    data = resp.json()

    # 날짜별 그룹핑
    daily: dict[str, list[dict]] = defaultdict(list)
    for item in data.get("list", []):
        date_str = item["dt_txt"].split(" ")[0]  # "2025-01-15"
        daily[date_str].append(item)

    forecasts: list[WeatherForecast] = []
    for date_str in sorted(daily.keys())[:days]:
        agg = _aggregate_daily(daily[date_str])
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        condition = agg["condition"]

        forecasts.append(
            WeatherForecast(
                date=date_str,
                dayOfWeek=f"{WEEKDAYS[dt.weekday()]}요일",
                condition=condition,
                temperature={
                    "min": agg["temp_min"],
                    "max": agg["temp_max"],
                    "feel": agg["temp_feel"],
                },
                precipitation={
                    "chance": agg["precip_chance"],
                    "amount": agg["precip_amount"],
                },
                wind={
                    "speed": agg["wind_speed"],
                    "isStrong": agg["wind_speed"] >= 10,
                },
                humidity=agg["humidity"],
                recommendation=_make_recommendation(condition, agg["wind_speed"]),
                icon=ICON_MAP.get(condition, "🌤️"),
            )
        )

    return forecasts
