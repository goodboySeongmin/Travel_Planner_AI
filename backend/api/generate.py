"""
일정 생성 API 엔드포인트
POST /api/generate
"""

import json
from fastapi import APIRouter, HTTPException
from models.schemas import (
    GenerateRequest,
    TripPlan,
    Place,
    DaySchedule,
    SchedulePlace,
    CostBreakdown,
)
from services.openai_client import generate_json_with_openai
from services.prompt_engine import build_system_prompt, build_user_prompt, get_season_context
from services.route_optimizer import optimize_route, analyze_schedule_efficiency
from services.rag_search import rag_search, load_places, SearchFilter

router = APIRouter()


async def rag_filter_places(
    input_data: dict,
    places: list[Place],
    weather: list | None = None,
) -> list[Place]:
    """RAG를 사용하여 관련 장소 필터링"""

    # 인원 유형별 컨텍스트
    people_contexts = {
        "혼자": "조용한 힐링 혼자 여행",
        "커플": "로맨틱 데이트 커플",
        "친구": "즐거운 친구 여행 액티비티",
        "가족": "가족 여행 아이 동반",
    }
    people_context = people_contexts.get(input_data.get("people", "커플"), "")

    # 스타일 컨텍스트
    style_context = " ".join(input_data.get("styles", []))

    # 예산 컨텍스트
    budget = input_data.get("budget", 500000)
    budget_context = "저렴한" if budget < 300000 else "고급" if budget > 800000 else ""

    # 날씨 컨텍스트
    weather_context = ""
    if weather:
        rainy_days = [w for w in weather if w.get("condition") in ["비", "폭우"]]
        if rainy_days:
            weather_context = "실내 비 올 때"

    # 카테고리별 RAG 검색
    category_queries = [
        {
            "category": "관광지",
            "query": f"제주 관광지 {people_context} {style_context} {weather_context}".strip(),
            "count": 12,
        },
        {
            "category": "맛집",
            "query": f"제주 맛집 {people_context} {style_context} {budget_context}".strip(),
            "count": 10,
        },
        {
            "category": "카페",
            "query": f"제주 카페 {people_context} {style_context}".strip(),
            "count": 8,
        },
        {
            "category": "숙소",
            "query": f"제주 숙소 {people_context} {budget_context}".strip(),
            "count": 5,
        },
    ]

    filtered_places: list[Place] = []
    seen_ids: set[str] = set()

    for cq in category_queries:
        try:
            results = await rag_search(
                query=cq["query"],
                top_k=cq["count"],
                filter=SearchFilter(category=cq["category"]),
                enable_query_expansion=True,
            )

            for r in results:
                if r.place.id not in seen_ids:
                    filtered_places.append(r.place)
                    seen_ids.add(r.place.id)

        except Exception as e:
            print(f"RAG 검색 실패 ({cq['category']}): {e}")
            # 폴백: 해당 카테고리에서 랜덤 선택
            category_places = [p for p in places if p.category == cq["category"]]
            for p in category_places[: cq["count"]]:
                if p.id not in seen_ids:
                    filtered_places.append(p)
                    seen_ids.add(p.id)

    print(f"RAG 필터링 완료: {len(filtered_places)}개 장소 선택")
    return filtered_places


def calculate_cost_breakdown(schedule: list[dict]) -> CostBreakdown:
    """비용 breakdown 계산"""
    breakdown = CostBreakdown()

    for day in schedule:
        for place in day.get("places", []):
            cost = place.get("cost", 0)
            category = place.get("category", "")

            if category == "숙소":
                breakdown.accommodation += cost
            elif category == "맛집":
                breakdown.food += cost
            elif category == "관광지":
                breakdown.activity += cost
            elif category == "카페":
                breakdown.cafe += cost
            else:
                breakdown.etc += cost

    return breakdown


@router.post("/generate")
async def generate_trip(request: GenerateRequest) -> TripPlan:
    """여행 일정 생성"""
    try:
        input_data = request.input

        # 장소 데이터 로드
        if request.places:
            places = request.places
        else:
            places = load_places()

        # RAG로 장소 필터링
        filtered_places = await rag_filter_places(
            input_data.model_dump(),
            places,
        )

        # 프롬프트 생성
        season = get_season_context()
        system_prompt = build_system_prompt(input_data, season)
        user_prompt = build_user_prompt(input_data, filtered_places)

        # OpenAI API 호출
        result = await generate_json_with_openai(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=4096,
        )

        # 스케줄 추출
        schedule = result.get("schedule", [])

        # 동선 최적화
        optimized_schedule = optimize_route(schedule, input_data.hasRentcar)

        # 비용 계산
        cost_breakdown = calculate_cost_breakdown(optimized_schedule)
        total_cost = (
            cost_breakdown.accommodation
            + cost_breakdown.food
            + cost_breakdown.activity
            + cost_breakdown.cafe
            + cost_breakdown.transport
            + cost_breakdown.etc
        )

        # 효율성 분석
        efficiency = analyze_schedule_efficiency(
            optimized_schedule, input_data.hasRentcar
        )

        return TripPlan(
            totalCost=total_cost,
            costBreakdown=cost_breakdown,
            schedule=[DaySchedule(**day) for day in optimized_schedule],
            routeEfficiency=efficiency,
        )

    except Exception as e:
        print(f"일정 생성 오류: {e}")
        raise HTTPException(status_code=500, detail=f"일정 생성에 실패했습니다: {str(e)}")
