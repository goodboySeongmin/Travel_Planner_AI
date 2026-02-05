/**
 * 제주도 지역 정의 및 클러스터링
 * 동선 최적화의 핵심 - 지역별로 묶어서 이동거리 최소화
 */

export interface RegionInfo {
  center: { lat: number; lng: number };
  radius: number; // km
  subregions: string[];
  description: string;
}

export interface RegionTravelTime {
  [key: string]: number; // 분 단위
}

/**
 * 제주도 5개 주요 지역 정의
 */
export const JEJU_REGIONS: Record<string, RegionInfo> = {
  "제주시": {
    center: { lat: 33.5097, lng: 126.5219 },
    radius: 12,
    subregions: ["제주시내", "조천", "구좌", "공항"],
    description: "제주 공항, 동문시장, 용두암, 이호테우해변 등",
  },
  "서귀포": {
    center: { lat: 33.2541, lng: 126.5601 },
    radius: 15,
    subregions: ["서귀포시내", "중문", "남원", "표선"],
    description: "천지연폭포, 정방폭포, 중문관광단지, 서귀포항 등",
  },
  "동부": {
    center: { lat: 33.4567, lng: 126.9200 },
    radius: 15,
    subregions: ["성산", "섭지코지", "우도", "김녕", "월정리"],
    description: "성산일출봉, 섭지코지, 우도, 월정리해변 등",
  },
  "서부": {
    center: { lat: 33.4012, lng: 126.2500 },
    radius: 15,
    subregions: ["애월", "한림", "협재", "한경"],
    description: "애월 카페거리, 협재해수욕장, 한림공원, 오설록 등",
  },
  "중산간": {
    center: { lat: 33.3617, lng: 126.5292 },
    radius: 12,
    subregions: ["한라산", "1100고지", "비자림", "산굼부리", "에코랜드"],
    description: "한라산, 1100고지, 산굼부리, 비자림 등",
  },
};

/**
 * 지역 간 평균 이동 시간 (분) - 렌트카 기준
 * 키 형식: "지역1-지역2" (알파벳 순)
 */
export const REGION_TRAVEL_TIME: RegionTravelTime = {
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
};

/**
 * 지역 간 권장 이동 순서 (순환형 - 역주행 방지)
 */
export const RECOMMENDED_REGION_ORDER: Record<string, string[]> = {
  // 동부에서 시작 → 시계방향
  동부_시작: ["동부", "서귀포", "중산간", "서부", "제주시"],
  // 서부에서 시작 → 반시계방향
  서부_시작: ["서부", "제주시", "동부", "서귀포", "중산간"],
  // 제주시에서 시작 (공항) → 동부 우선
  제주시_동부: ["제주시", "동부", "서귀포", "중산간", "서부"],
  // 제주시에서 시작 (공항) → 서부 우선
  제주시_서부: ["제주시", "서부", "중산간", "서귀포", "동부"],
};

/**
 * Haversine 거리 계산 (km)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 장소의 지역 분류
 */
export function classifyPlaceByRegion(
  latitude: number,
  longitude: number
): string {
  let closestRegion = "기타";
  let minDistance = Infinity;

  for (const [regionName, regionInfo] of Object.entries(JEJU_REGIONS)) {
    const distance = calculateDistance(
      latitude,
      longitude,
      regionInfo.center.lat,
      regionInfo.center.lng
    );

    // 반경 내에 있으면 해당 지역
    if (distance <= regionInfo.radius) {
      return regionName;
    }

    // 가장 가까운 지역 추적
    if (distance < minDistance) {
      minDistance = distance;
      closestRegion = regionName;
    }
  }

  // 어느 반경에도 없으면 가장 가까운 지역 반환
  return closestRegion;
}

/**
 * 장소 배열을 지역별로 그룹핑
 */
export function groupPlacesByRegion<T extends { latitude: number; longitude: number }>(
  places: T[]
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  for (const place of places) {
    const region = classifyPlaceByRegion(place.latitude, place.longitude);

    if (!groups[region]) {
      groups[region] = [];
    }
    groups[region].push(place);
  }

  return groups;
}

/**
 * 두 지역 간 이동 시간 가져오기 (분)
 */
export function getRegionTravelTime(region1: string, region2: string): number {
  if (region1 === region2) return 0;

  // 알파벳 순으로 키 생성
  const key =
    region1 < region2 ? `${region1}-${region2}` : `${region2}-${region1}`;

  return REGION_TRAVEL_TIME[key] || 45; // 기본값 45분
}

/**
 * 지역 순서 점수 계산 (순환형에 맞는지)
 * 높을수록 좋음 (역주행 없음)
 */
export function calculateRegionOrderScore(regions: string[]): number {
  if (regions.length <= 2) return 100;

  let score = 100;
  const uniqueRegions = [...new Set(regions)];

  // 같은 지역 재방문 체크 (역주행)
  const visitedRegions = new Set<string>();
  let backtrackCount = 0;

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];

    if (visitedRegions.has(region)) {
      // 바로 이전 지역과 같으면 OK (같은 지역 내 이동)
      if (i > 0 && regions[i - 1] === region) {
        continue;
      }
      // 다른 지역 갔다가 다시 돌아오면 역주행
      backtrackCount++;
    }

    visitedRegions.add(region);
  }

  // 역주행당 15점 감점
  score -= backtrackCount * 15;

  // 지역 변경 횟수 체크 (너무 많으면 감점)
  let regionChanges = 0;
  for (let i = 1; i < regions.length; i++) {
    if (regions[i] !== regions[i - 1]) {
      regionChanges++;
    }
  }

  // 효율적인 지역 변경 횟수 = (고유 지역 수 - 1)
  const efficientChanges = uniqueRegions.length - 1;
  if (regionChanges > efficientChanges + 2) {
    score -= (regionChanges - efficientChanges - 2) * 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 최적의 지역 방문 순서 추천
 */
export function getOptimalRegionOrder(
  startRegion: string,
  targetRegions: string[]
): string[] {
  // 시작 지역에 따른 추천 순서
  let recommendedOrder: string[];

  if (startRegion === "제주시") {
    // 동부에 갈 장소가 더 많으면 동부 우선
    const eastCount = targetRegions.filter((r) => r === "동부").length;
    const westCount = targetRegions.filter((r) => r === "서부").length;
    recommendedOrder =
      eastCount >= westCount
        ? RECOMMENDED_REGION_ORDER["제주시_동부"]
        : RECOMMENDED_REGION_ORDER["제주시_서부"];
  } else if (startRegion === "동부") {
    recommendedOrder = RECOMMENDED_REGION_ORDER["동부_시작"];
  } else if (startRegion === "서부") {
    recommendedOrder = RECOMMENDED_REGION_ORDER["서부_시작"];
  } else {
    // 기본: 제주시 → 동부 순서
    recommendedOrder = RECOMMENDED_REGION_ORDER["제주시_동부"];
  }

  // 타겟 지역만 필터링
  const uniqueTargets = [...new Set(targetRegions)];
  return recommendedOrder.filter((r) => uniqueTargets.includes(r));
}

/**
 * 장소들을 최적 지역 순서로 정렬
 */
export function sortPlacesByOptimalRegionOrder<
  T extends { latitude: number; longitude: number }
>(places: T[], startRegion?: string): T[] {
  if (places.length <= 1) return places;

  // 지역별 그룹핑
  const grouped = groupPlacesByRegion(places);
  const regions = Object.keys(grouped);

  if (regions.length <= 1) return places;

  // 시작 지역 결정
  const actualStartRegion =
    startRegion || classifyPlaceByRegion(places[0].latitude, places[0].longitude);

  // 최적 지역 순서
  const optimalOrder = getOptimalRegionOrder(actualStartRegion, regions);

  // 지역 순서대로 장소 배열
  const result: T[] = [];
  for (const region of optimalOrder) {
    if (grouped[region]) {
      result.push(...grouped[region]);
    }
  }

  // 포함되지 않은 지역의 장소 추가
  for (const region of regions) {
    if (!optimalOrder.includes(region) && grouped[region]) {
      result.push(...grouped[region]);
    }
  }

  return result;
}
