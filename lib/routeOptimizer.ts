import { DaySchedule, SchedulePlace, RouteEfficiency } from "./types";
import {
  classifyPlaceByRegion,
  groupPlacesByRegion,
  getOptimalRegionOrder,
  calculateRegionOrderScore,
} from "./jejuRegions";

/**
 * 동선 최적화 모듈 - TSP with 2-opt + 지역 클러스터링
 *
 * 최적화 전략:
 * 1. 지역별 그룹핑 (제주시, 서귀포, 동부, 서부, 중산간)
 * 2. 최적 지역 순서 결정 (역주행 방지)
 * 3. 지역 내 Nearest Neighbor + 2-opt
 * 4. 효율성 점수 계산
 */

/** Haversine 거리 계산 (km) */
function haversineDistance(
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

/** 이동 시간 추정 (분) */
function estimateTravelTime(distKm: number, hasRentcar: boolean): number {
  const speedKmh = hasRentcar ? 40 : 25;
  const baseMinutes = (distKm / speedKmh) * 60;
  // 대중교통은 대기시간 10분 추가
  return Math.round(hasRentcar ? baseMinutes : baseMinutes + 10);
}

/** Nearest-neighbor로 장소 재배열 (첫 번째 장소 고정) */
function reorderPlaces(places: SchedulePlace[]): SchedulePlace[] {
  if (places.length <= 2) return places;

  const result: SchedulePlace[] = [places[0]];
  const remaining = places.slice(1);

  while (remaining.length > 0) {
    const last = result[result.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(
        last.latitude,
        last.longitude,
        remaining[i].latitude,
        remaining[i].longitude
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    result.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }

  return result;
}

/**
 * 거리 행렬 생성 (TSP용)
 */
function buildDistanceMatrix(places: SchedulePlace[]): number[][] {
  const n = places.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = haversineDistance(
        places[i].latitude,
        places[i].longitude,
        places[j].latitude,
        places[j].longitude
      );
      matrix[i][j] = dist;
      matrix[j][i] = dist;
    }
  }

  return matrix;
}

/**
 * 총 이동거리 계산
 */
function calculateTotalDistance(
  places: SchedulePlace[],
  distMatrix?: number[][]
): number {
  if (places.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < places.length - 1; i++) {
    if (distMatrix) {
      // 원본 인덱스를 알 수 없으므로 직접 계산
      total += haversineDistance(
        places[i].latitude,
        places[i].longitude,
        places[i + 1].latitude,
        places[i + 1].longitude
      );
    } else {
      total += haversineDistance(
        places[i].latitude,
        places[i].longitude,
        places[i + 1].latitude,
        places[i + 1].longitude
      );
    }
  }

  return total;
}

/**
 * 2-opt 알고리즘으로 경로 개선
 * Nearest Neighbor 결과를 더 최적화
 */
function twoOptOptimize(places: SchedulePlace[]): SchedulePlace[] {
  if (places.length <= 3) return places;

  let route = [...places];
  let improved = true;
  let iterations = 0;
  const maxIterations = 100; // 무한루프 방지

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // 첫 번째 장소(시작점)는 고정
    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        const currentDist =
          haversineDistance(
            route[i - 1].latitude,
            route[i - 1].longitude,
            route[i].latitude,
            route[i].longitude
          ) +
          haversineDistance(
            route[j].latitude,
            route[j].longitude,
            route[j + 1].latitude,
            route[j + 1].longitude
          );

        // i와 j 사이를 뒤집었을 때의 거리
        const newDist =
          haversineDistance(
            route[i - 1].latitude,
            route[i - 1].longitude,
            route[j].latitude,
            route[j].longitude
          ) +
          haversineDistance(
            route[i].latitude,
            route[i].longitude,
            route[j + 1].latitude,
            route[j + 1].longitude
          );

        // 개선되면 구간 뒤집기
        if (newDist < currentDist - 0.1) {
          // 0.1km 이상 개선시
          const reversed = route.slice(i, j + 1).reverse();
          route = [...route.slice(0, i), ...reversed, ...route.slice(j + 1)];
          improved = true;
        }
      }
    }
  }

  return route;
}

/**
 * 역주행 감지 (같은 지역을 나갔다가 다시 돌아오는 경우)
 */
export function detectBacktracking(places: SchedulePlace[]): {
  count: number;
  details: { fromIdx: number; toIdx: number; region: string }[];
} {
  const details: { fromIdx: number; toIdx: number; region: string }[] = [];

  if (places.length < 3) return { count: 0, details };

  // 각 장소의 지역 분류
  const regions = places.map((p) =>
    classifyPlaceByRegion(p.latitude, p.longitude)
  );

  // 방문한 지역 추적
  const visitedRegions = new Set<string>();
  let lastRegion = regions[0];
  visitedRegions.add(lastRegion);

  for (let i = 1; i < regions.length; i++) {
    const currentRegion = regions[i];

    if (currentRegion !== lastRegion) {
      // 지역이 바뀜
      if (visitedRegions.has(currentRegion)) {
        // 이미 방문한 지역으로 돌아감 = 역주행
        details.push({
          fromIdx: i - 1,
          toIdx: i,
          region: currentRegion,
        });
      }
      visitedRegions.add(currentRegion);
      lastRegion = currentRegion;
    }
  }

  return { count: details.length, details };
}

/**
 * 동선 효율성 점수 계산
 */
export function calculateEfficiency(
  places: SchedulePlace[],
  hasRentcar: boolean
): RouteEfficiency {
  if (places.length === 0) {
    return {
      totalDistance: 0,
      totalTravelTime: 0,
      regionScore: 100,
      backtrackCount: 0,
      efficiencyScore: 100,
    };
  }

  // 총 이동거리
  const totalDistance = calculateTotalDistance(places);

  // 총 이동시간
  const totalTravelTime = places.reduce(
    (sum, p) => sum + (p.travelTime || 0),
    0
  );

  // 지역 순서 점수
  const regions = places.map((p) =>
    classifyPlaceByRegion(p.latitude, p.longitude)
  );
  const regionScore = calculateRegionOrderScore(regions);

  // 역주행 횟수
  const { count: backtrackCount } = detectBacktracking(places);

  // 종합 효율성 (가중치 적용)
  // - 지역 점수 50%
  // - 역주행 패널티 30%
  // - 거리 효율성 20%
  const backtrackPenalty = Math.min(backtrackCount * 10, 30);

  // 거리 효율성: 직선거리 대비 실제 이동거리
  let distanceEfficiency = 100;
  if (places.length >= 2) {
    const directDistance = haversineDistance(
      places[0].latitude,
      places[0].longitude,
      places[places.length - 1].latitude,
      places[places.length - 1].longitude
    );
    if (directDistance > 0) {
      const ratio = totalDistance / directDistance;
      // ratio가 1에 가까울수록 효율적 (하지만 여러 장소 방문이므로 1.5~2가 적정)
      distanceEfficiency = Math.max(0, 100 - Math.max(0, ratio - 2) * 20);
    }
  }

  const efficiencyScore = Math.round(
    regionScore * 0.5 +
      (100 - backtrackPenalty) * 0.3 +
      distanceEfficiency * 0.2
  );

  return {
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalTravelTime,
    regionScore,
    backtrackCount,
    efficiencyScore: Math.max(0, Math.min(100, efficiencyScore)),
  };
}

/**
 * 지역 기반 최적화
 * 1. 장소를 지역별로 그룹핑
 * 2. 최적 지역 순서 결정
 * 3. 지역 내 Nearest Neighbor + 2-opt
 */
function optimizeWithRegions(places: SchedulePlace[]): SchedulePlace[] {
  if (places.length <= 2) return places;

  // 지역별 그룹핑
  const grouped = groupPlacesByRegion(places);
  const regions = Object.keys(grouped);

  if (regions.length <= 1) {
    // 모든 장소가 한 지역 내 → 일반 최적화
    const nnResult = reorderPlaces(places);
    return twoOptOptimize(nnResult);
  }

  // 첫 번째 장소의 지역 확인
  const startRegion = classifyPlaceByRegion(
    places[0].latitude,
    places[0].longitude
  );

  // 최적 지역 순서 결정
  const optimalOrder = getOptimalRegionOrder(startRegion, regions);

  // 지역 순서대로 장소 배열 (각 지역 내부는 2-opt 최적화)
  const result: SchedulePlace[] = [];

  for (const region of optimalOrder) {
    if (grouped[region] && grouped[region].length > 0) {
      let regionPlaces = grouped[region];

      // 이전 장소가 있으면 가장 가까운 곳부터 시작
      if (result.length > 0) {
        const lastPlace = result[result.length - 1];
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < regionPlaces.length; i++) {
          const dist = haversineDistance(
            lastPlace.latitude,
            lastPlace.longitude,
            regionPlaces[i].latitude,
            regionPlaces[i].longitude
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        // 가장 가까운 곳을 첫 번째로
        const nearest = regionPlaces[nearestIdx];
        regionPlaces = [
          nearest,
          ...regionPlaces.filter((_, i) => i !== nearestIdx),
        ];
      }

      // 지역 내 Nearest Neighbor + 2-opt
      const nnResult = reorderPlaces(regionPlaces);
      const optimized = twoOptOptimize(nnResult);
      result.push(...optimized);
    }
  }

  // 포함되지 않은 지역 추가 (기타 지역)
  for (const region of regions) {
    if (!optimalOrder.includes(region) && grouped[region]) {
      result.push(...grouped[region]);
    }
  }

  return result;
}

/** 시간 문자열 파싱 → 분 */
function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 분 → 시간 문자열 */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** 재배열 후 시간 재계산 + travelTime 설정 */
export function recalculateTimes(
  places: SchedulePlace[],
  hasRentcar: boolean
): SchedulePlace[] {
  if (places.length === 0) return places;

  const result = [...places];
  // 첫 장소는 원래 시간 유지
  let currentEnd = parseTime(result[0].time) + result[0].duration;

  for (let i = 0; i < result.length - 1; i++) {
    const dist = haversineDistance(
      result[i].latitude,
      result[i].longitude,
      result[i + 1].latitude,
      result[i + 1].longitude
    );
    const travel = estimateTravelTime(dist, hasRentcar);
    result[i] = { ...result[i], travelTime: travel };

    const nextStart = currentEnd + travel;
    result[i + 1] = { ...result[i + 1], time: formatTime(nextStart) };
    currentEnd = nextStart + result[i + 1].duration;
  }

  return result;
}

/**
 * 메인 함수: 전체 스케줄 최적화
 * 지역 클러스터링 + Nearest Neighbor + 2-opt
 */
export function optimizeRoute(
  schedule: DaySchedule[],
  hasRentcar: boolean
): DaySchedule[] {
  return schedule.map((day) => {
    // 1. 지역 기반 최적화 (클러스터링 + 2-opt)
    const optimizedOrder = optimizeWithRegions(day.places);

    // 2. 시간 재계산
    const withTimes = recalculateTimes(optimizedOrder, hasRentcar);

    return { ...day, places: withTimes };
  });
}

/**
 * 전체 스케줄의 효율성 분석
 */
export function analyzeScheduleEfficiency(
  schedule: DaySchedule[],
  hasRentcar: boolean
): {
  days: RouteEfficiency[];
  overall: RouteEfficiency;
} {
  const days = schedule.map((day) => calculateEfficiency(day.places, hasRentcar));

  // 전체 평균/합계
  const overall: RouteEfficiency = {
    totalDistance: days.reduce((sum, d) => sum + d.totalDistance, 0),
    totalTravelTime: days.reduce((sum, d) => sum + d.totalTravelTime, 0),
    regionScore: Math.round(
      days.reduce((sum, d) => sum + d.regionScore, 0) / days.length
    ),
    backtrackCount: days.reduce((sum, d) => sum + d.backtrackCount, 0),
    efficiencyScore: Math.round(
      days.reduce((sum, d) => sum + d.efficiencyScore, 0) / days.length
    ),
  };

  return { days, overall };
}

/**
 * 최적화 전후 비교
 */
export function compareRoutes(
  before: SchedulePlace[],
  after: SchedulePlace[],
  hasRentcar: boolean
): {
  before: RouteEfficiency;
  after: RouteEfficiency;
  improvement: {
    distance: number;     // km 감소
    time: number;         // 분 감소
    score: number;        // 점수 증가
  };
} {
  const beforeEff = calculateEfficiency(before, hasRentcar);
  const afterEff = calculateEfficiency(after, hasRentcar);

  return {
    before: beforeEff,
    after: afterEff,
    improvement: {
      distance: Math.round((beforeEff.totalDistance - afterEff.totalDistance) * 10) / 10,
      time: beforeEff.totalTravelTime - afterEff.totalTravelTime,
      score: afterEff.efficiencyScore - beforeEff.efficiencyScore,
    },
  };
}
