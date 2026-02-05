"""
AI 프롬프트 엔진
여행 일정 생성을 위한 프롬프트 구성
"""

from datetime import datetime, timedelta
from models.schemas import TripInput, Place, WeatherForecast


def get_season_context() -> dict:
    """현재 계절 정보 반환"""
    month = datetime.now().month

    seasons = {
        (3, 4, 5): {
            "season": "봄",
            "description": "유채꽃과 벚꽃이 만발하는 계절",
            "recommendations": ["유채꽃 명소", "벚꽃 명소", "오름 트래킹"],
            "warnings": ["황사 주의", "일교차 큼"],
        },
        (6, 7, 8): {
            "season": "여름",
            "description": "해수욕과 물놀이의 계절",
            "recommendations": ["해수욕장", "계곡", "수박빙수", "시원한 음료"],
            "warnings": ["태풍 시즌", "자외선 주의", "장마철"],
        },
        (9, 10, 11): {
            "season": "가을",
            "description": "억새와 단풍의 계절",
            "recommendations": ["억새 명소", "오름", "감귤 체험"],
            "warnings": ["일몰 시간 빨라짐"],
        },
        (12, 1, 2): {
            "season": "겨울",
            "description": "한라산 눈꽃과 동백꽃의 계절",
            "recommendations": ["한라산 눈꽃", "동백꽃", "따뜻한 국물요리"],
            "warnings": ["강풍 주의", "해안도로 결빙"],
        },
    }

    for months, info in seasons.items():
        if month in months:
            return info

    return seasons[(3, 4, 5)]


def get_people_context(people: str) -> str:
    """인원 유형별 추천 키워드"""
    contexts = {
        "혼자": "조용한, 힐링, 사진 명소, 1인 맛집",
        "커플": "로맨틱, 분위기 좋은, 데이트 코스, 야경",
        "친구": "액티비티, 술집, 사진 명소, 재미있는",
        "가족": "아이 동반 가능, 넓은 공간, 가족 식당, 안전한",
    }
    return contexts.get(people, "")


def build_system_prompt(input: TripInput, season: dict) -> str:
    """시스템 프롬프트 생성"""
    return f"""당신은 제주도 여행 전문 AI 플래너입니다.

## 역할
사용자의 조건에 맞는 최적의 제주 여행 일정을 생성합니다.

## 현재 계절
- {season['season']}: {season['description']}
- 추천: {', '.join(season['recommendations'])}
- 주의사항: {', '.join(season['warnings'])}

## 규칙
1. 반드시 JSON 형식으로만 응답하세요
2. 예산 범위 내에서 일정을 구성하세요
3. 동선을 고려하여 가까운 장소끼리 배치하세요
4. 각 장소의 소요 시간과 이동 시간을 고려하세요
5. 아침/점심/저녁 식사 시간을 적절히 배치하세요
6. 마지막 날은 공항 이동 시간을 고려하세요

## 카테고리별 배치 가이드
- 관광지: 오전/오후에 배치 (체력 소모 고려)
- 맛집: 점심 12:00-13:30, 저녁 18:00-20:00
- 카페: 식후 휴식 또는 오후 티타임
- 숙소: 하루 일정 마무리 (첫째 날과 마지막 날 제외)

## 응답 형식
```json
{{
  "schedule": [
    {{
      "day": 1,
      "date": "1월 15일 (월)",
      "places": [
        {{
          "time": "09:00",
          "placeId": "spot-1",
          "name": "장소명",
          "category": "관광지|맛집|카페|숙소",
          "description": "설명",
          "cost": 10000,
          "duration": 60,
          "latitude": 33.xxxx,
          "longitude": 126.xxxx
        }}
      ]
    }}
  ]
}}
```"""


def build_user_prompt(
    input: TripInput,
    places: list[Place],
    weather: list[WeatherForecast] | None = None,
) -> str:
    """사용자 프롬프트 생성"""
    people_context = get_people_context(input.people)

    # 장소 목록 포맷
    places_text = ""
    for p in places[:50]:  # 최대 50개
        places_text += f"""
- ID: {p.id}
  이름: {p.name}
  카테고리: {p.category} ({p.subcategory})
  비용: {p.avg_cost:,}원
  소요시간: {p.avg_time}분
  평점: {p.rating}
  위치: ({p.latitude}, {p.longitude})
  태그: {', '.join(p.style_tags)}
"""

    # 날씨 정보
    weather_text = ""
    if weather:
        weather_text = "\n## 날씨 예보\n"
        for w in weather:
            weather_text += f"- {w.date} ({w.dayOfWeek}): {w.condition}, {w.temperature['min']}~{w.temperature['max']}°C, 강수확률 {w.precipitation['chance']}%\n"

    # 날짜 계산
    start_date = datetime.now()
    dates = []
    weekdays = ["월", "화", "수", "목", "금", "토", "일"]
    for i in range(input.days):
        d = start_date + timedelta(days=i)
        dates.append(f"{d.month}월 {d.day}일 ({weekdays[d.weekday()]})")

    return f"""## 여행 조건
- 예산: {input.budget:,}원
- 기간: {input.nights}박 {input.days}일
- 인원: {input.people} ({people_context})
- 스타일: {', '.join(input.styles)}
- 이동수단: {'렌트카' if input.hasRentcar else '대중교통'}
{f'- 특별 요청: {input.customRequest}' if input.customRequest else ''}
{weather_text}
## 여행 날짜
{chr(10).join([f'Day {i+1}: {d}' for i, d in enumerate(dates)])}

## 사용 가능한 장소 목록
{places_text}

위 조건과 장소 목록을 바탕으로 최적의 여행 일정을 JSON 형식으로 생성해주세요.
각 장소의 placeId, latitude, longitude를 정확히 포함해주세요."""


def build_chat_prompt(
    message: str,
    schedule: list | None = None,
    search_results: list[Place] | None = None,
) -> tuple[str, str]:
    """챗봇 대화 프롬프트 생성"""
    system = """당신은 제주도 여행 도우미 AI입니다.

## 역할
1. 사용자의 질문에 친절하게 답변합니다
2. 장소 추천 시 검색 결과를 활용합니다
3. 일정에 장소를 추가하는 것을 도와줍니다

## 응답 규칙
1. 한국어로 친근하게 응답하세요
2. 장소 추천 시 구체적인 정보를 제공하세요
3. 이모지를 적절히 사용하세요
4. 검색 결과가 있으면 그 중에서 추천하세요"""

    user = message

    if search_results:
        user += "\n\n## 검색된 장소\n"
        for p in search_results[:5]:
            user += f"- {p.name} ({p.category}): {p.description}\n"

    if schedule:
        user += "\n\n## 현재 일정\n"
        for day in schedule:
            user += f"Day {day.get('day', 1)}:\n"
            for place in day.get("places", [])[:3]:
                user += f"  - {place.get('time', '')} {place.get('name', '')}\n"

    return system, user


def build_checklist_prompt(input: TripInput, schedule: list) -> tuple[str, str]:
    """체크리스트 생성 프롬프트"""
    system = """당신은 여행 준비 전문가입니다.
여행 일정을 분석하여 맞춤형 체크리스트를 생성합니다.

## 응답 형식 (JSON)
```json
{
  "beforeTrip": [
    {
      "title": "D-7",
      "emoji": "📅",
      "items": [
        {"id": "b1", "text": "항공권 예약 확인", "checked": false}
      ]
    }
  ],
  "duringTrip": [
    {
      "title": "Day 1",
      "emoji": "🌅",
      "items": [
        {"id": "d1", "text": "공항 도착 2시간 전", "checked": false}
      ]
    }
  ],
  "afterTrip": {
    "title": "여행 후",
    "emoji": "✨",
    "items": [
      {"id": "a1", "text": "사진 정리", "checked": false}
    ]
  }
}
```"""

    # 일정 요약
    schedule_summary = ""
    for day in schedule:
        schedule_summary += f"Day {day.get('day', 1)}:\n"
        for place in day.get("places", []):
            schedule_summary += f"  - {place.get('name', '')} ({place.get('category', '')})\n"

    user = f"""## 여행 정보
- 기간: {input.nights}박 {input.days}일
- 인원: {input.people}
- 스타일: {', '.join(input.styles)}
- 이동수단: {'렌트카' if input.hasRentcar else '대중교통'}

## 일정 요약
{schedule_summary}

위 여행에 맞는 체크리스트를 생성해주세요."""

    return system, user
