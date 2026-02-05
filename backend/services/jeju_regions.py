"""
제주도 지역 정의 및 클러스터링
동선 최적화의 핵심 - 지역별로 묶어서 이동거리 최소화
"""

import math
from typing import TypeVar, Protocol
from dataclasses import dataclass


@dataclass
class RegionInfo:
    center_lat: float
    center_lng: float
    radius: float  # km
    subregions: list[str]
    description: str


class HasCoordinates(Protocol):
    latitude: float
    longitude: float


T = TypeVar("T", bound=HasCoordinates)


# 제주도 5개 주요 지역 정의
JEJU_REGIONS: dict[str, RegionInfo] = {
    "제주시": RegionInfo(
        center_lat=33.5097,
        center_lng=126.5219,
        radius=12,
        subregions=["제주시내", "조천", "구좌", "공항"],
        description="제주 공항, 동문시장, 용두암, 이호테우해변 등",
    ),
    "서귀포": RegionInfo(
        center_lat=33.2541,
        center_lng=126.5601,
        radius=15,
        subregions=["서귀포시내", "중문", "남원", "표선"],
        description="천지연폭포, 정방폭포, 중문관광단지, 서귀포항 등",
    ),
    "동부": RegionInfo(
        center_lat=33.4567,
        center_lng=126.9200,
        radius=15,
        subregions=["성산", "섭지코지", "우도", "김녕", "월정리"],
        description="성산일출봉, 섭지코지, 우도, 월정리해변 등",
    ),
    "서부": RegionInfo(
        center_lat=33.4012,
        center_lng=126.2500,
        radius=15,
        subregions=["애월", "한림", "협재", "한경"],
        description="애월 카페거리, 협재해수욕장, 한림공원, 오설록 등",
    ),
    "중산간": RegionInfo(
        center_lat=33.3617,
        center_lng=126.5292,
        radius=12,
        subregions=["한라산", "1100고지", "비자림", "산굼부리", "에코랜드"],
        description="한라산, 1100고지, 산굼부리, 비자림 등",
    ),
}

# 지역 간 평균 이동 시간 (분) - 렌트카 기준
REGION_TRAVEL_TIME: dict[str, int] = {
    "동부-서귀포": 45,
    "동부-서부": 70,
    "동부-제주시": 40,
    "동부-중산간": 35,
    "서귀포-서부": 40,
    "서귀포-제주시": 50,
    "서귀포-중산간": 25,
    "서부-제주시": 35,
    "서부-중산간": 30,
    "제주시-중산간": 30,
}

# 지역 간 권장 이동 순서 (순환형 - 역주행 방지)
RECOMMENDED_REGION_ORDER: dict[str, list[str]] = {
    "동부_시작": ["동부", "서귀포", "중산간", "서부", "제주시"],
    "서부_시작": ["서부", "제주시", "동부", "서귀포", "중산간"],
    "제주시_동부": ["제주시", "동부", "서귀포", "중산간", "서부"],
    "제주시_서부": ["제주시", "서부", "중산간", "서귀포", "동부"],
}


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine 거리 계산 (km)"""
    R = 6371  # 지구 반지름 (km)
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def classify_place_by_region(latitude: float, longitude: float) -> str:
    """장소의 지역 분류"""
    closest_region = "기타"
    min_distance = float("inf")

    for region_name, region_info in JEJU_REGIONS.items():
        distance = haversine_distance(
            latitude, longitude, region_info.center_lat, region_info.center_lng
        )

        # 반경 내에 있으면 해당 지역
        if distance <= region_info.radius:
            return region_name

        # 가장 가까운 지역 추적
        if distance < min_distance:
            min_distance = distance
            closest_region = region_name

    return closest_region


def group_places_by_region(places: list[dict]) -> dict[str, list[dict]]:
    """장소 배열을 지역별로 그룹핑"""
    groups: dict[str, list[dict]] = {}

    for place in places:
        region = classify_place_by_region(place["latitude"], place["longitude"])
        if region not in groups:
            groups[region] = []
        groups[region].append(place)

    return groups


def get_region_travel_time(region1: str, region2: str) -> int:
    """두 지역 간 이동 시간 가져오기 (분)"""
    if region1 == region2:
        return 0

    # 알파벳 순으로 키 생성
    key = f"{region1}-{region2}" if region1 < region2 else f"{region2}-{region1}"
    return REGION_TRAVEL_TIME.get(key, 45)


def calculate_region_order_score(regions: list[str]) -> int:
    """지역 순서 점수 계산 (높을수록 좋음)"""
    if len(regions) <= 2:
        return 100

    score = 100
    visited_regions: set[str] = set()
    backtrack_count = 0

    for i, region in enumerate(regions):
        if region in visited_regions:
            if i > 0 and regions[i - 1] == region:
                continue
            backtrack_count += 1
        visited_regions.add(region)

    score -= backtrack_count * 15

    # 지역 변경 횟수 체크
    region_changes = sum(1 for i in range(1, len(regions)) if regions[i] != regions[i - 1])
    unique_regions = list(set(regions))
    efficient_changes = len(unique_regions) - 1

    if region_changes > efficient_changes + 2:
        score -= (region_changes - efficient_changes - 2) * 5

    return max(0, min(100, score))


def get_optimal_region_order(start_region: str, target_regions: list[str]) -> list[str]:
    """최적의 지역 방문 순서 추천"""
    if start_region == "제주시":
        east_count = target_regions.count("동부")
        west_count = target_regions.count("서부")
        recommended_order = (
            RECOMMENDED_REGION_ORDER["제주시_동부"]
            if east_count >= west_count
            else RECOMMENDED_REGION_ORDER["제주시_서부"]
        )
    elif start_region == "동부":
        recommended_order = RECOMMENDED_REGION_ORDER["동부_시작"]
    elif start_region == "서부":
        recommended_order = RECOMMENDED_REGION_ORDER["서부_시작"]
    else:
        recommended_order = RECOMMENDED_REGION_ORDER["제주시_동부"]

    unique_targets = list(set(target_regions))
    return [r for r in recommended_order if r in unique_targets]
