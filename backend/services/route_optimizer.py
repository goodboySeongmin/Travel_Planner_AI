"""
동선 최적화 모듈 - TSP with 2-opt + 지역 클러스터링

최적화 전략:
1. 지역별 그룹핑 (제주시, 서귀포, 동부, 서부, 중산간)
2. 최적 지역 순서 결정 (역주행 방지)
3. 지역 내 Nearest Neighbor + 2-opt
4. 효율성 점수 계산
"""

from typing import Any
from .jeju_regions import (
    haversine_distance,
    classify_place_by_region,
    group_places_by_region,
    get_optimal_region_order,
    calculate_region_order_score,
)
from models.schemas import SchedulePlace, DaySchedule, RouteEfficiency


def estimate_travel_time(dist_km: float, has_rentcar: bool) -> int:
    """이동 시간 추정 (분)"""
    speed_kmh = 40 if has_rentcar else 25
    base_minutes = (dist_km / speed_kmh) * 60
    # 대중교통은 대기시간 10분 추가
    return round(base_minutes if has_rentcar else base_minutes + 10)


def reorder_places_nearest_neighbor(places: list[dict]) -> list[dict]:
    """Nearest-neighbor로 장소 재배열 (첫 번째 장소 고정)"""
    if len(places) <= 2:
        return places

    result = [places[0]]
    remaining = places[1:]

    while remaining:
        last = result[-1]
        nearest_idx = 0
        nearest_dist = float("inf")

        for i, place in enumerate(remaining):
            dist = haversine_distance(
                last["latitude"],
                last["longitude"],
                place["latitude"],
                place["longitude"],
            )
            if dist < nearest_dist:
                nearest_dist = dist
                nearest_idx = i

        result.append(remaining.pop(nearest_idx))

    return result


def two_opt_optimize(places: list[dict]) -> list[dict]:
    """2-opt 알고리즘으로 경로 개선"""
    if len(places) <= 3:
        return places

    route = places.copy()
    improved = True
    iterations = 0
    max_iterations = 100

    while improved and iterations < max_iterations:
        improved = False
        iterations += 1

        for i in range(1, len(route) - 2):
            for j in range(i + 1, len(route) - 1):
                # 현재 거리
                current_dist = haversine_distance(
                    route[i - 1]["latitude"],
                    route[i - 1]["longitude"],
                    route[i]["latitude"],
                    route[i]["longitude"],
                ) + haversine_distance(
                    route[j]["latitude"],
                    route[j]["longitude"],
                    route[j + 1]["latitude"],
                    route[j + 1]["longitude"],
                )

                # 뒤집었을 때 거리
                new_dist = haversine_distance(
                    route[i - 1]["latitude"],
                    route[i - 1]["longitude"],
                    route[j]["latitude"],
                    route[j]["longitude"],
                ) + haversine_distance(
                    route[i]["latitude"],
                    route[i]["longitude"],
                    route[j + 1]["latitude"],
                    route[j + 1]["longitude"],
                )

                # 개선되면 구간 뒤집기
                if new_dist < current_dist - 0.1:
                    route[i : j + 1] = reversed(route[i : j + 1])
                    improved = True

    return route


def calculate_total_distance(places: list[dict]) -> float:
    """총 이동거리 계산 (km)"""
    if len(places) < 2:
        return 0

    total = 0
    for i in range(len(places) - 1):
        total += haversine_distance(
            places[i]["latitude"],
            places[i]["longitude"],
            places[i + 1]["latitude"],
            places[i + 1]["longitude"],
        )
    return total


def detect_backtracking(places: list[dict]) -> dict:
    """역주행 감지"""
    details = []

    if len(places) < 3:
        return {"count": 0, "details": details}

    regions = [classify_place_by_region(p["latitude"], p["longitude"]) for p in places]
    visited_regions: set[str] = set()
    last_region = regions[0]
    visited_regions.add(last_region)

    for i in range(1, len(regions)):
        current_region = regions[i]
        if current_region != last_region:
            if current_region in visited_regions:
                details.append({
                    "fromIdx": i - 1,
                    "toIdx": i,
                    "region": current_region,
                })
            visited_regions.add(current_region)
            last_region = current_region

    return {"count": len(details), "details": details}


def calculate_efficiency(places: list[dict], has_rentcar: bool) -> RouteEfficiency:
    """동선 효율성 점수 계산"""
    if not places:
        return RouteEfficiency(
            totalDistance=0,
            totalTravelTime=0,
            regionScore=100,
            backtrackCount=0,
            efficiencyScore=100,
        )

    total_distance = calculate_total_distance(places)
    total_travel_time = sum(p.get("travelTime", 0) for p in places)

    regions = [classify_place_by_region(p["latitude"], p["longitude"]) for p in places]
    region_score = calculate_region_order_score(regions)

    backtrack_info = detect_backtracking(places)
    backtrack_count = backtrack_info["count"]
    backtrack_penalty = min(backtrack_count * 10, 30)

    # 거리 효율성
    distance_efficiency = 100
    if len(places) >= 2:
        direct_distance = haversine_distance(
            places[0]["latitude"],
            places[0]["longitude"],
            places[-1]["latitude"],
            places[-1]["longitude"],
        )
        if direct_distance > 0:
            ratio = total_distance / direct_distance
            distance_efficiency = max(0, 100 - max(0, ratio - 2) * 20)

    efficiency_score = round(
        region_score * 0.5 + (100 - backtrack_penalty) * 0.3 + distance_efficiency * 0.2
    )

    return RouteEfficiency(
        totalDistance=round(total_distance, 1),
        totalTravelTime=total_travel_time,
        regionScore=region_score,
        backtrackCount=backtrack_count,
        efficiencyScore=max(0, min(100, efficiency_score)),
    )


def optimize_with_regions(places: list[dict]) -> list[dict]:
    """지역 기반 최적화"""
    if len(places) <= 2:
        return places

    grouped = group_places_by_region(places)
    regions = list(grouped.keys())

    if len(regions) <= 1:
        nn_result = reorder_places_nearest_neighbor(places)
        return two_opt_optimize(nn_result)

    start_region = classify_place_by_region(places[0]["latitude"], places[0]["longitude"])
    optimal_order = get_optimal_region_order(start_region, regions)

    result: list[dict] = []

    for region in optimal_order:
        if region in grouped and grouped[region]:
            region_places = grouped[region]

            if result:
                last_place = result[-1]
                nearest_idx = 0
                nearest_dist = float("inf")

                for i, place in enumerate(region_places):
                    dist = haversine_distance(
                        last_place["latitude"],
                        last_place["longitude"],
                        place["latitude"],
                        place["longitude"],
                    )
                    if dist < nearest_dist:
                        nearest_dist = dist
                        nearest_idx = i

                nearest = region_places[nearest_idx]
                region_places = [nearest] + [
                    p for i, p in enumerate(region_places) if i != nearest_idx
                ]

            nn_result = reorder_places_nearest_neighbor(region_places)
            optimized = two_opt_optimize(nn_result)
            result.extend(optimized)

    # 포함되지 않은 지역 추가
    for region in regions:
        if region not in optimal_order and region in grouped:
            result.extend(grouped[region])

    return result


def parse_time(time_str: str) -> int:
    """시간 문자열 파싱 → 분"""
    parts = time_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def format_time(minutes: int) -> str:
    """분 → 시간 문자열"""
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def recalculate_times(places: list[dict], has_rentcar: bool) -> list[dict]:
    """재배열 후 시간 재계산 + travelTime 설정"""
    if not places:
        return places

    result = [p.copy() for p in places]
    current_end = parse_time(result[0]["time"]) + result[0].get("duration", 60)

    for i in range(len(result) - 1):
        dist = haversine_distance(
            result[i]["latitude"],
            result[i]["longitude"],
            result[i + 1]["latitude"],
            result[i + 1]["longitude"],
        )
        travel = estimate_travel_time(dist, has_rentcar)
        result[i]["travelTime"] = travel

        next_start = current_end + travel
        result[i + 1]["time"] = format_time(next_start)
        current_end = next_start + result[i + 1].get("duration", 60)

    return result


def optimize_route(schedule: list[dict], has_rentcar: bool) -> list[dict]:
    """메인 함수: 전체 스케줄 최적화"""
    optimized_schedule = []

    for day in schedule:
        places = day.get("places", [])

        # dict로 변환 (Pydantic 모델인 경우)
        places_dicts = []
        for p in places:
            if hasattr(p, "model_dump"):
                places_dicts.append(p.model_dump())
            elif isinstance(p, dict):
                places_dicts.append(p)
            else:
                places_dicts.append(dict(p))

        # 지역 기반 최적화
        optimized_order = optimize_with_regions(places_dicts)

        # 시간 재계산
        with_times = recalculate_times(optimized_order, has_rentcar)

        optimized_schedule.append({
            "day": day.get("day"),
            "date": day.get("date"),
            "places": with_times,
        })

    return optimized_schedule


def analyze_schedule_efficiency(
    schedule: list[dict], has_rentcar: bool
) -> dict:
    """전체 스케줄의 효율성 분석"""
    days = []

    for day in schedule:
        places = day.get("places", [])
        places_dicts = []
        for p in places:
            if hasattr(p, "model_dump"):
                places_dicts.append(p.model_dump())
            elif isinstance(p, dict):
                places_dicts.append(p)
            else:
                places_dicts.append(dict(p))

        efficiency = calculate_efficiency(places_dicts, has_rentcar)
        days.append(efficiency.model_dump())

    if not days:
        return {"days": [], "overall": RouteEfficiency().model_dump()}

    overall = RouteEfficiency(
        totalDistance=sum(d["totalDistance"] for d in days),
        totalTravelTime=sum(d["totalTravelTime"] for d in days),
        regionScore=round(sum(d["regionScore"] for d in days) / len(days)),
        backtrackCount=sum(d["backtrackCount"] for d in days),
        efficiencyScore=round(sum(d["efficiencyScore"] for d in days) / len(days)),
    )

    return {"days": days, "overall": overall.model_dump()}
