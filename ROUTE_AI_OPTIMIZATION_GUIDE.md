# 동선 최적화 + AI 고도화 완전 가이드

## 📌 개요

이 문서는 제주도 여행 플래너의 **가장 중요한 두 가지 개선사항**을 다룹니다:

1. **동선 최적화** - 지그재그 제거, 이동거리 최소화
2. **AI 고도화** - 프롬프트 엔지니어링, Few-shot, RAG

**목표:**
- 동선 효율성: 25점 → 95점
- AI 정확도: 60% → 95%
- 사용자 만족도: 70% → 95%

**구현 우선순위:**
1. 동선 최적화 (가장 시급!)
2. 프롬프트 엔지니어링
3. Few-shot Learning
4. RAG

**소요 시간:** 5일

---

## 🎯 Part 1: 동선 최적화 시스템

### 현재 문제

```
Day 1 일정 예시:
09:00 성산일출봉 (동부)
11:00 애월 카페 (서부)     ← 50km 이동 ❌
13:00 섭지코지 (동부)       ← 역주행 60km ❌
15:00 한라산 (중앙)        ← 40km ❌
17:00 성산 맛집 (동부)      ← 또 역주행 45km ❌

문제점:
❌ 총 이동거리: 195km (너무 많음)
❌ 지그재그 패턴
❌ 역주행 2회
❌ 이동만 3시간 소요
❌ 피곤한 여행

→ 사용자: "AI가 이따구로 짜냐??"
```

### 해결 후 목표

```
Day 1 최적화 일정:
09:00 올레국수 (동부)       [시작]
10:00 성산일출봉 (동부)     ← 5km ✅
11:30 섭지코지 (동부)       ← 8km ✅
13:00 제주 맛집 (중앙)      ← 20km ✅
15:00 한라산 (중앙)        ← 10km ✅
17:00 애월 카페 (서부)      ← 25km ✅

개선:
✅ 총 이동거리: 68km (65% 감소!)
✅ 순환형 패턴 (동→중→서)
✅ 역주행: 0회
✅ 이동 시간: 1시간
✅ 효율성: 94점

→ 사용자: "와 이게 AI구나!"
```

---

## 🗺️ Step 1: 제주도 지역 정의

### 지역 클러스터링

```javascript
// src/utils/jejuRegions.js

/**
 * 제주도를 5개 주요 지역으로 구분
 * 각 지역은 중심점과 반경으로 정의
 */
export const JEJU_REGIONS = {
  '제주시': {
    center: { lat: 33.5097, lng: 126.5219 },
    radius: 10, // km
    subregions: ['제주시내', '조천', '구좌'],
    description: '제주 공항, 동문시장, 용두암 등'
  },
  '서귀포': {
    center: { lat: 33.2541, lng: 126.5601 },
    radius: 15,
    subregions: ['서귀포시내', '중문', '남원'],
    description: '천지연폭포, 정방폭포, 서귀포항 등'
  },
  '동부': {
    center: { lat: 33.4567, lng: 126.8765 },
    radius: 12,
    subregions: ['성산', '표선', '섭지코지'],
    description: '성산일출봉, 섭지코지, 우도 등'
  },
  '서부': {
    center: { lat: 33.4012, lng: 126.2401 },
    radius: 12,
    subregions: ['애월', '한림', '협재'],
    description: '애월 카페거리, 협재해수욕장, 한림공원 등'
  },
  '중산간': {
    center: { lat: 33.3617, lng: 126.5292 },
    radius: 8,
    subregions: ['한라산', '1100고지', '비자림'],
    description: '한라산, 1100고지, 산굼부리 등'
  }
};

/**
 * 장소의 지역 분류
 */
export function classifyPlaceByRegion(place) {
  const location = place.location;
  
  for (let [regionName, regionInfo] of Object.entries(JEJU_REGIONS)) {
    const distance = calculateDistance(location, regionInfo.center);
    
    if (distance <= regionInfo.radius) {
      return regionName;
    }
  }
  
  return '기타';
}

/**
 * 장소들을 지역별로 그룹핑
 */
export function groupPlacesByRegion(places) {
  const groups = {};
  
  places.forEach(place => {
    const region = classifyPlaceByRegion(place);
    
    if (!groups[region]) {
      groups[region] = [];
    }
    
    groups[region].push(place);
  });
  
  return groups;
}

/**
 * 지역 간 권장 이동 순서 (순환형)
 */
export const RECOMMENDED_REGION_ORDER = {
  '동부_중심': ['동부', '중산간', '서귀포', '서부', '제주시'],
  '서부_중심': ['서부', '제주시', '동부', '중산간', '서귀포'],
  '제주시_중심': ['제주시', '동부', '중산간', '서귀포', '서부']
};

/**
 * 지역 간 평균 이동 시간 (분)
 */
export const REGION_TRAVEL_TIME = {
  '제주시-동부': 40,
  '제주시-서부': 35,
  '제주시-중산간': 30,
  '제주시-서귀포': 50,
  '동부-중산간': 35,
  '동부-서귀포': 45,
  '동부-서부': 70,
  '서부-중산간': 30,
  '서부-서귀포': 40,
  '중산간-서귀포': 25
};
```

---

## 🧮 Step 2: 거리 계산 유틸리티

```javascript
// src/utils/distance.js

/**
 * Haversine 공식으로 두 지점 간 거리 계산 (km)
 * 
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} 거리 (km)
 */
export function calculateDistance(point1, point2) {
  const R = 6371; // 지구 반지름 (km)
  
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;
  const deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
  const deltaLng = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * 여러 지점의 총 이동 거리 계산
 */
export function calculateTotalDistance(places) {
  if (!places || places.length < 2) return 0;
  
  let total = 0;
  for (let i = 0; i < places.length - 1; i++) {
    total += calculateDistance(places[i].location, places[i + 1].location);
  }
  return total;
}

/**
 * 이동 시간 계산 (분)
 * 제주도 평균 속도: 40km/h (교통, 신호 고려)
 */
export function calculateTravelTime(distance) {
  const AVERAGE_SPEED = 40; // km/h
  const hours = distance / AVERAGE_SPEED;
  return Math.ceil(hours * 60); // 분 단위
}

/**
 * 거리 행렬 생성 (모든 장소 간 거리)
 */
export function buildDistanceMatrix(places) {
  const n = places.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = calculateDistance(
          places[i].location,
          places[j].location
        );
      }
    }
  }
  
  return matrix;
}
```

---

## 🎯 Step 3: TSP 최적화 알고리즘

```javascript
// src/utils/routeOptimizer.js

import { calculateDistance, buildDistanceMatrix } from './distance';

/**
 * TSP (Traveling Salesman Problem) 해결
 * Nearest Neighbor + 2-opt 조합
 */
export class RoutePlanner {
  constructor(places) {
    this.places = places;
    this.distanceMatrix = buildDistanceMatrix(places);
  }
  
  /**
   * Nearest Neighbor 알고리즘
   * 현재 위치에서 가장 가까운 미방문 장소를 선택
   */
  nearestNeighbor(startIndex = 0) {
    const n = this.places.length;
    const visited = new Array(n).fill(false);
    const route = [startIndex];
    visited[startIndex] = true;
    
    let current = startIndex;
    
    for (let i = 1; i < n; i++) {
      let nearest = -1;
      let minDistance = Infinity;
      
      // 가장 가까운 미방문 장소 찾기
      for (let j = 0; j < n; j++) {
        if (!visited[j] && this.distanceMatrix[current][j] < minDistance) {
          nearest = j;
          minDistance = this.distanceMatrix[current][j];
        }
      }
      
      route.push(nearest);
      visited[nearest] = true;
      current = nearest;
    }
    
    return route;
  }
  
  /**
   * 2-opt 최적화
   * 경로의 두 구간을 교환해서 개선
   */
  twoOpt(route) {
    let improved = true;
    let bestRoute = [...route];
    let bestDistance = this.calculateRouteDistance(bestRoute);
    
    let iterations = 0;
    const maxIterations = 100; // 무한루프 방지
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      for (let i = 1; i < route.length - 1; i++) {
        for (let j = i + 1; j < route.length; j++) {
          // 구간 [i, j]를 뒤집기
          const newRoute = [
            ...bestRoute.slice(0, i),
            ...bestRoute.slice(i, j + 1).reverse(),
            ...bestRoute.slice(j + 1)
          ];
          
          const newDistance = this.calculateRouteDistance(newRoute);
          
          if (newDistance < bestDistance) {
            bestRoute = newRoute;
            bestDistance = newDistance;
            improved = true;
          }
        }
      }
    }
    
    return bestRoute;
  }
  
  /**
   * 경로의 총 거리 계산
   */
  calculateRouteDistance(route) {
    let total = 0;
    for (let i = 0; i < route.length - 1; i++) {
      total += this.distanceMatrix[route[i]][route[i + 1]];
    }
    return total;
  }
  
  /**
   * 최적 경로 찾기 (메인 함수)
   */
  findOptimalRoute(startIndex = 0) {
    console.log('🗺️  최적 경로 계산 중...');
    
    // Step 1: Nearest Neighbor로 초기 경로
    let route = this.nearestNeighbor(startIndex);
    const initialDistance = this.calculateRouteDistance(route);
    
    // Step 2: 2-opt로 개선
    route = this.twoOpt(route);
    const optimizedDistance = this.calculateRouteDistance(route);
    
    console.log(`✅ 최적화 완료: ${initialDistance.toFixed(1)}km → ${optimizedDistance.toFixed(1)}km`);
    
    // 인덱스를 실제 장소로 변환
    return route.map(index => this.places[index]);
  }
}
```

---

## 🧠 Step 4: 스마트 동선 플래너 (시간 제약 고려)

```javascript
// src/planners/SmartRoutePlanner.js

import { RoutePlanner } from '../utils/routeOptimizer';
import { classifyPlaceByRegion, groupPlacesByRegion } from '../utils/jejuRegions';
import { calculateDistance } from '../utils/distance';

/**
 * 시간 제약을 고려한 스마트 동선 플래너
 */
export class SmartRoutePlanner extends RoutePlanner {
  constructor(places, constraints = {}) {
    super(places);
    this.constraints = {
      startTime: constraints.startTime || '09:00',
      endTime: constraints.endTime || '20:00',
      mealTimes: constraints.mealTimes || {
        breakfast: '09:00',
        lunch: '12:00',
        dinner: '18:00'
      },
      ...constraints
    };
  }
  
  /**
   * 시간 제약을 고려한 최적 일정 생성
   */
  findOptimalRouteWithConstraints() {
    console.log('🧠 스마트 플래닝 시작...');
    
    // Step 1: 장소를 카테고리별로 분류
    const categorized = this.categorizePlaces();
    
    // Step 2: 시간대별로 일정 구성
    const schedule = this.buildSchedule(categorized);
    
    // Step 3: 지역별로 그룹핑하여 최적화
    const optimizedSchedule = this.optimizeByRegion(schedule);
    
    return optimizedSchedule;
  }
  
  /**
   * 장소를 카테고리별로 분류
   */
  categorizePlaces() {
    return {
      breakfast: this.places.filter(p => 
        p.category === 'restaurant' && 
        (p.mealType === 'breakfast' || p.tags?.includes('breakfast'))
      ),
      lunch: this.places.filter(p => 
        p.category === 'restaurant' && 
        (p.mealType === 'lunch' || p.tags?.includes('lunch'))
      ),
      dinner: this.places.filter(p => 
        p.category === 'restaurant' && 
        (p.mealType === 'dinner' || p.tags?.includes('dinner'))
      ),
      attractions: this.places.filter(p => 
        p.category === 'attraction' || p.category === 'tourist_spot'
      ),
      cafes: this.places.filter(p => 
        p.category === 'cafe'
      ),
      activities: this.places.filter(p =>
        p.category === 'activity'
      )
    };
  }
  
  /**
   * 일정 구성
   */
  buildSchedule(categorized) {
    const schedule = [];
    let currentTime = this.constraints.startTime;
    let currentLocation = null;
    
    // 1. 아침 식사
    if (categorized.breakfast.length > 0) {
      const breakfast = this.selectBestPlace(
        categorized.breakfast,
        currentLocation,
        this.constraints.mealTimes.breakfast
      );
      
      if (breakfast) {
        schedule.push({
          time: this.constraints.mealTimes.breakfast,
          place: breakfast,
          duration: 60,
          type: 'meal',
          mealType: 'breakfast'
        });
        currentLocation = breakfast.location;
        currentTime = this.addMinutes(this.constraints.mealTimes.breakfast, 60);
      }
    }
    
    // 2. 오전 관광 (아침 식사 후 ~ 점심 전)
    const morningTime = this.getMinutesDiff(currentTime, this.constraints.mealTimes.lunch);
    if (morningTime > 60) {
      const morningPlaces = categorized.attractions.filter(p => 
        p.bestTimeOfDay === 'morning' || !p.bestTimeOfDay
      );
      
      const morningSchedule = this.fillTimeSlot(
        morningPlaces,
        currentLocation,
        currentTime,
        this.constraints.mealTimes.lunch
      );
      
      schedule.push(...morningSchedule);
      if (morningSchedule.length > 0) {
        currentLocation = morningSchedule[morningSchedule.length - 1].place.location;
        currentTime = this.addMinutes(
          morningSchedule[morningSchedule.length - 1].time,
          morningSchedule[morningSchedule.length - 1].duration
        );
      }
    }
    
    // 3. 점심 식사
    if (categorized.lunch.length > 0) {
      const lunch = this.selectBestPlace(
        categorized.lunch,
        currentLocation,
        this.constraints.mealTimes.lunch
      );
      
      if (lunch) {
        const waitingRisk = this.assessWaitingRisk(lunch, this.constraints.mealTimes.lunch);
        
        schedule.push({
          time: this.constraints.mealTimes.lunch,
          place: lunch,
          duration: 90,
          type: 'meal',
          mealType: 'lunch',
          warning: waitingRisk === 'high' ? '⚠️ 웨이팅 예상' : null
        });
        currentLocation = lunch.location;
        currentTime = this.addMinutes(this.constraints.mealTimes.lunch, 90);
      }
    }
    
    // 4. 오후 관광 (점심 후 ~ 카페 시간)
    const afternoonTime = this.getMinutesDiff(currentTime, '15:00');
    if (afternoonTime > 60) {
      const afternoonPlaces = categorized.attractions.filter(p => 
        p.bestTimeOfDay === 'afternoon' || !p.bestTimeOfDay
      );
      
      const afternoonSchedule = this.fillTimeSlot(
        afternoonPlaces,
        currentLocation,
        currentTime,
        '15:00'
      );
      
      schedule.push(...afternoonSchedule);
      if (afternoonSchedule.length > 0) {
        currentLocation = afternoonSchedule[afternoonSchedule.length - 1].place.location;
        currentTime = '15:00';
      }
    }
    
    // 5. 카페 시간 (오후 3시경)
    if (categorized.cafes.length > 0) {
      const cafe = this.selectBestPlace(
        categorized.cafes,
        currentLocation,
        '15:00'
      );
      
      if (cafe) {
        schedule.push({
          time: '15:00',
          place: cafe,
          duration: 60,
          type: 'cafe'
        });
        currentLocation = cafe.location;
        currentTime = this.addMinutes('15:00', 60);
      }
    }
    
    // 6. 저녁 전 관광 (카페 후 ~ 저녁 전)
    const eveningTime = this.getMinutesDiff(currentTime, this.constraints.mealTimes.dinner);
    if (eveningTime > 60) {
      const eveningPlaces = categorized.attractions.filter(p => 
        p.bestTimeOfDay === 'evening' || p.bestTimeOfDay === 'sunset' || !p.bestTimeOfDay
      );
      
      const eveningSchedule = this.fillTimeSlot(
        eveningPlaces,
        currentLocation,
        currentTime,
        this.constraints.mealTimes.dinner
      );
      
      schedule.push(...eveningSchedule);
      if (eveningSchedule.length > 0) {
        currentLocation = eveningSchedule[eveningSchedule.length - 1].place.location;
        currentTime = this.constraints.mealTimes.dinner;
      }
    }
    
    // 7. 저녁 식사
    if (categorized.dinner.length > 0) {
      const dinner = this.selectBestPlace(
        categorized.dinner,
        currentLocation,
        this.constraints.mealTimes.dinner
      );
      
      if (dinner) {
        schedule.push({
          time: this.constraints.mealTimes.dinner,
          place: dinner,
          duration: 90,
          type: 'meal',
          mealType: 'dinner'
        });
      }
    }
    
    return schedule;
  }
  
  /**
   * 시간대를 채울 장소들 선택 및 정렬
   */
  fillTimeSlot(places, startLocation, startTime, endTime) {
    if (!places || places.length === 0) return [];
    
    const availableMinutes = this.getMinutesDiff(startTime, endTime);
    const schedule = [];
    
    // 시간 내에 들어갈 수 있는 장소 개수 계산
    const avgDuration = 90; // 평균 90분
    const maxPlaces = Math.floor(availableMinutes / avgDuration);
    
    if (maxPlaces === 0) return [];
    
    // 가까운 장소들 선택
    const selectedPlaces = this.selectNearestPlaces(places, startLocation, maxPlaces);
    
    // TSP로 최적 순서
    if (selectedPlaces.length > 1) {
      const subPlanner = new RoutePlanner(selectedPlaces);
      const optimized = subPlanner.findOptimalRoute();
      
      let currentTime = startTime;
      optimized.forEach(place => {
        const duration = place.recommendedDuration || avgDuration;
        
        schedule.push({
          time: currentTime,
          place: place,
          duration: duration,
          type: place.category
        });
        
        currentTime = this.addMinutes(currentTime, duration);
      });
    } else if (selectedPlaces.length === 1) {
      schedule.push({
        time: startTime,
        place: selectedPlaces[0],
        duration: selectedPlaces[0].recommendedDuration || avgDuration,
        type: selectedPlaces[0].category
      });
    }
    
    return schedule;
  }
  
  /**
   * 가장 가까운 N개 장소 선택
   */
  selectNearestPlaces(places, fromLocation, count) {
    if (!fromLocation) {
      return places.slice(0, count);
    }
    
    const withDistance = places.map(place => ({
      place,
      distance: calculateDistance(fromLocation, place.location)
    }));
    
    withDistance.sort((a, b) => a.distance - b.distance);
    
    return withDistance.slice(0, count).map(item => item.place);
  }
  
  /**
   * 최적 장소 선택 (거리 + 평점 + 웨이팅 고려)
   */
  selectBestPlace(places, currentLocation, time) {
    if (!places || places.length === 0) return null;
    
    const scored = places.map(place => {
      const distance = currentLocation 
        ? calculateDistance(currentLocation, place.location)
        : 0;
      
      const waitingRisk = this.assessWaitingRisk(place, time);
      
      // 점수 계산
      let score = 0;
      
      // 거리 점수 (가까울수록 높음)
      score += (1 / (distance + 1)) * 50;
      
      // 평점 점수
      score += (place.rating || 4.0) * 10;
      
      // 웨이팅 점수
      if (waitingRisk === 'low') score += 20;
      else if (waitingRisk === 'medium') score += 10;
      
      return { place, score, distance, waitingRisk };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0].place;
  }
  
  /**
   * 웨이팅 위험도 평가
   */
  assessWaitingRisk(place, time) {
    if (!place.waitingInfo) return 'low';
    
    const hour = parseInt(time.split(':')[0]);
    const peakHours = place.waitingInfo.peakHours || [];
    
    if (peakHours.includes(hour)) return 'high';
    if (peakHours.some(h => Math.abs(h - hour) <= 1)) return 'medium';
    return 'low';
  }
  
  /**
   * 지역별로 그룹핑하여 최적화
   */
  optimizeByRegion(schedule) {
    // 지역별로 분류
    const grouped = {};
    
    schedule.forEach(item => {
      const region = classifyPlaceByRegion(item.place);
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(item);
    });
    
    // 각 지역 내에서 최적화
    Object.keys(grouped).forEach(region => {
      if (grouped[region].length > 2) {
        const places = grouped[region].map(item => item.place);
        const planner = new RoutePlanner(places);
        const optimized = planner.findOptimalRoute();
        
        // 시간 재할당
        let currentTime = grouped[region][0].time;
        grouped[region] = optimized.map(place => {
          const item = grouped[region].find(i => i.place.id === place.id);
          const newItem = {
            ...item,
            time: currentTime
          };
          currentTime = this.addMinutes(currentTime, item.duration);
          return newItem;
        });
      }
    });
    
    // 다시 평평하게
    return Object.values(grouped).flat().sort((a, b) => {
      return this.timeToMinutes(a.time) - this.timeToMinutes(b.time);
    });
  }
  
  /**
   * 효율성 분석
   */
  analyzeEfficiency(schedule) {
    const totalDistance = this.calculateScheduleDistance(schedule);
    const backtracking = this.detectBacktracking(schedule);
    const regionChanges = this.countRegionChanges(schedule);
    
    let score = 100;
    
    // 역주행 감점
    score -= backtracking * 15;
    
    // 과도한 이동거리 감점
    const avgDistance = totalDistance / (schedule.length - 1);
    if (avgDistance > 10) {
      score -= (avgDistance - 10) * 2;
    }
    
    // 지역 변경 횟수 감점
    if (regionChanges > 3) {
      score -= (regionChanges - 3) * 5;
    }
    
    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      totalDistance: totalDistance.toFixed(1),
      backtracking,
      regionChanges,
      avgDistance: avgDistance.toFixed(1)
    };
  }
  
  /**
   * 일정의 총 이동거리
   */
  calculateScheduleDistance(schedule) {
    let total = 0;
    for (let i = 0; i < schedule.length - 1; i++) {
      total += calculateDistance(
        schedule[i].place.location,
        schedule[i + 1].place.location
      );
    }
    return total;
  }
  
  /**
   * 역주행 감지
   */
  detectBacktracking(schedule) {
    let count = 0;
    
    for (let i = 0; i < schedule.length - 2; i++) {
      const region1 = classifyPlaceByRegion(schedule[i].place);
      const region2 = classifyPlaceByRegion(schedule[i + 1].place);
      const region3 = classifyPlaceByRegion(schedule[i + 2].place);
      
      // 같은 지역 두 번 방문 (역주행)
      if (region1 === region3 && region1 !== region2) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * 지역 변경 횟수
   */
  countRegionChanges(schedule) {
    let changes = 0;
    let prevRegion = null;
    
    schedule.forEach(item => {
      const region = classifyPlaceByRegion(item.place);
      if (prevRegion && prevRegion !== region) {
        changes++;
      }
      prevRegion = region;
    });
    
    return changes;
  }
  
  // 시간 유틸리티
  addMinutes(time, minutes) {
    const [hour, min] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + min + minutes;
    const newHour = Math.floor(totalMinutes / 60) % 24;
    const newMin = totalMinutes % 60;
    return `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
  }
  
  getMinutesDiff(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }
  
  timeToMinutes(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
```

---

## 🎯 Part 2: AI 고도화 (프롬프트 엔지니어링 + Few-shot + RAG)

### 현재 문제

```javascript
// 기본 프롬프트 (현재)
const prompt = "제주도 카페 추천해줘";

문제:
❌ 매번 답변 다름 (일관성 없음)
❌ 환각(hallucination) - 없는 장소 추천
❌ 맥락 이해 부족
❌ 구조화 안 됨 (파싱 어려움)
❌ 정확도 60%
```

### 고도화 목표

```javascript
// 고도화 (목표)
프롬프트 엔지니어링 + Few-shot + RAG

개선:
✅ 일관된 답변 (품질 예측 가능)
✅ 100% 정확 (우리 DB 기반)
✅ 맥락 완벽 이해
✅ 구조화된 JSON
✅ 정확도 95%+
```

---

## 📝 Step 1: 프롬프트 엔지니어링

### 정교한 System Prompt

```javascript
// src/ai/systemPrompts.js

export const TRAVEL_EXPERT_SYSTEM_PROMPT = `
당신은 제주도 여행 전문가입니다.

# 역할 및 전문성
- 제주도 여행 계획 전문가 (10년 경력)
- 5,000명 이상의 여행자 상담
- 제주도 1,500개 이상 장소 직접 방문
- 계절별, 날씨별, 동행별 맞춤 추천 전문

# 핵심 원칙
1. **정확성**: 제공된 데이터베이스 정보만 사용. 환각(hallucination) 절대 금지.
2. **맥락 이해**: 사용자의 여행 날짜, 동행, 취향, 예산을 반드시 고려.
3. **동선 효율**: 지역별 클러스터링, 역주행 방지, 이동거리 최소화.
4. **시간 최적화**: 웨이팅 정보 고려, 적절한 시간대 배치.
5. **구조화**: 항상 정해진 JSON 형식으로만 응답.

# 금지사항
- 데이터베이스에 없는 장소 추천
- 폐업했거나 확인되지 않은 정보 제공
- 비구조화된 자유 형식 답변
- 모호하거나 불확실한 표현 사용
- 사용자 맥락을 무시한 일반적 추천

# 품질 기준
- 모든 추천은 구체적 이유 포함
- 동선 효율성 90점 이상
- 시간대별 웨이팅 정보 반영
- 예산 범위 준수
- 사용자 취향과 80% 이상 매치
`;

export const PLACE_RECOMMENDATION_PROMPT = (query, context, searchResults) => `
# 사용자 요청
"${query}"

# 여행 컨텍스트
${JSON.stringify({
  dates: context.dates,
  companion: context.companion,
  preferences: context.preferences,
  budget: context.budget,
  existingPlaces: context.existingPlaces,
  currentLocation: context.currentLocation
}, null, 2)}

# 데이터베이스 검색 결과 (검증된 정확한 정보)
${JSON.stringify(searchResults, null, 2)}

# 분석 요구사항
다음을 종합적으로 분석하여 추천:
1. **사용자 취향 매칭**: preferences와 얼마나 일치하는가?
2. **동선 효율성**: 기존 일정/현재 위치와의 거리는?
3. **시간대 적절성**: 방문하기 좋은 시간대인가?
4. **웨이팅 리스크**: 대기 시간은 얼마나 예상되는가?
5. **예산 적합성**: 사용자 예산 범위 내인가?
6. **카테고리 밸런스**: 기존 일정과 다양성을 고려했는가?

# 출력 형식 (반드시 준수)
다음 JSON 형식으로만 응답하세요. 다른 텍스트나 마크다운 없이 순수 JSON만:

{
  "analysis": {
    "user_preference_match": "사용자 취향 분석 결과",
    "route_efficiency": "동선 효율성 분석",
    "time_optimization": "시간대 분석",
    "budget_check": "예산 적합성"
  },
  "recommendations": [
    {
      "place": {
        "id": "검색결과의 place id",
        "name": "장소명",
        "category": "카테고리",
        "rating": 4.5,
        "location": { "lat": 33.xxx, "lng": 126.xxx },
        "price_range": "가격대",
        "description": "설명"
      },
      "score": 95,
      "reasoning": "이 장소를 1순위로 추천하는 구체적 이유 (사용자 맥락 기반)",
      "best_day": 1,
      "best_time": "15:00",
      "time_reason": "이 시간을 추천하는 이유",
      "route_info": "기존 일정과의 동선 정보",
      "waiting_info": "예상 웨이팅 정보",
      "tips": ["팁1", "팁2"]
    }
  ],
  "alternatives": [
    // 2, 3순위 추천 (같은 형식)
  ]
}

# 제약사항
- 반드시 검색 결과에 있는 장소만 추천
- 추천은 최대 3곳 (recommendations 1곳 + alternatives 2곳)
- 각 장소는 구체적인 추천 이유 필수
- score는 0-100 사이 정수
- 모든 필드 누락 없이 채우기
`;
```

---

## 🎓 Step 2: Few-Shot Learning

### 고품질 예시 제공

```javascript
// src/ai/fewShotExamples.js

export const FEW_SHOT_EXAMPLES = [
  // 예시 1: 조용한 카페 추천
  {
    role: "user",
    content: `
# 사용자 요청
"조용한 카페 추천해줘"

# 여행 컨텍스트
{
  "dates": "2026-02-20 ~ 02-22",
  "companion": "친구",
  "preferences": ["힐링", "조용함", "사진"],
  "budget": 500000,
  "existingPlaces": ["성산일출봉", "섭지코지"],
  "currentLocation": { "lat": 33.458, "lng": 126.942 }
}

# 검색 결과
[카페 델문도, 스누피가든, 애월카페거리 ...]
    `
  },
  {
    role: "assistant",
    content: JSON.stringify({
      "analysis": {
        "user_preference_match": "힐링+조용함 선호 → 한적한 오션뷰 카페 적합",
        "route_efficiency": "현재 위치(성산)에서 5분 거리, 섭지코지 가는 길목",
        "time_optimization": "15시 추천 (점심 피크 이후 한산)",
        "budget_check": "음료 5,500원, 예산 범위 내"
      },
      "recommendations": [
        {
          "place": {
            "id": "cafe_delmundo",
            "name": "카페 델문도",
            "category": "cafe",
            "rating": 4.7,
            "location": { "lat": 33.423, "lng": 126.927 },
            "price_range": "5,000-8,000원"
          },
          "score": 95,
          "reasoning": "성산에서 5분 거리로 동선 효율적. 오션뷰가 아름답고 조용한 분위기. 사진 찍기 좋은 포토존 있음. 친구와 대화하기 좋은 테이블 배치.",
          "best_day": 1,
          "best_time": "15:00",
          "time_reason": "점심 피크 이후라 한산하고, 자연광이 가장 예쁜 시간",
          "route_info": "성산일출봉 → (5분) → 카페 델문도 → (8분) → 섭지코지",
          "waiting_info": "평일 15시 웨이팅 없음",
          "tips": [
            "창가 자리 추천 (오션뷰)",
            "시그니처 메뉴: 아인슈페너",
            "주차 공간 넉넉함"
          ]
        }
      ],
      "alternatives": []
    })
  },
  
  // 예시 2: 점심 맛집 추천
  {
    role: "user",
    content: `
# 사용자 요청
"Day 2 점심 맛집 추천"

# 여행 컨텍스트
{
  "dates": "2026-02-20 ~ 02-22",
  "companion": "가족 (부모님)",
  "preferences": ["로컬 맛집", "해산물"],
  "budget": 500000,
  "existingPlaces": ["한라산", "1100고지"],
  "currentDay": 2,
  "currentLocation": { "lat": 33.362, "lng": 126.529 }
}

# 검색 결과
[올레국수, 돈사돈, 고집돌우럭 ...]
    `
  },
  {
    role: "assistant",
    content: JSON.stringify({
      "analysis": {
        "user_preference_match": "부모님과 함께 → 편안한 분위기, 해산물 선호 → 제주 로컬 해산물 맛집 적합",
        "route_efficiency": "한라산에서 내려오는 길목, 서귀포 방향 동선상",
        "time_optimization": "11시 오픈 직후 방문 시 웨이팅 없음",
        "budget_check": "1인 12,000원, 4인 가족 기준 예산 내"
      },
      "recommendations": [
        {
          "place": {
            "id": "gojip_dol_urok",
            "name": "고집돌우럭",
            "category": "restaurant",
            "rating": 4.6,
            "location": { "lat": 33.312, "lng": 126.542 }
          },
          "score": 92,
          "reasoning": "제주 로컬 해산물 전문점. 부모님 세대가 좋아하는 정갈한 상차림. 한라산에서 내려오는 동선상 효율적.",
          "best_day": 2,
          "best_time": "11:00",
          "time_reason": "오픈 시간이라 웨이팅 없음. 점심 피크(12-13시) 전 여유롭게 식사 가능",
          "route_info": "한라산 → (20분) → 고집돌우럭 → (15분) → 서귀포 시내",
          "waiting_info": "11시 오픈, 12시부터 웨이팅 30분 예상",
          "tips": [
            "우럭회 + 매운탕 세트 추천",
            "주차장 있음 (무료)",
            "부모님 모시기 좋은 정갈한 분위기"
          ]
        }
      ],
      "alternatives": []
    })
  },
  
  // 예시 3: 사진 찍기 좋은 곳
  {
    role: "user",
    content: `
# 사용자 요청
"인스타 감성 사진 찍기 좋은 곳"

# 여행 컨텍스트
{
  "dates": "2026-02-20 ~ 02-22",
  "companion": "연인",
  "preferences": ["SNS", "사진", "감성"],
  "budget": 500000,
  "existingPlaces": [],
  "currentDay": 1
}

# 검색 결과
[스누피가든, 방주교회, 섭지코지 ...]
    `
  },
  {
    role: "assistant",
    content: JSON.stringify({
      "analysis": {
        "user_preference_match": "SNS+사진 선호 → 포토존 많은 감성 장소 적합",
        "route_efficiency": "첫 일정이므로 접근성 고려, 제주시에서 가까운 곳",
        "time_optimization": "13시 추천 (자연광 최적, 사람 적은 시간)",
        "budget_check": "입장료 15,000원, 예산 범위 내"
      },
      "recommendations": [
        {
          "place": {
            "id": "snoopy_garden",
            "name": "스누피가든",
            "category": "attraction",
            "rating": 4.5,
            "location": { "lat": 33.412, "lng": 126.282 }
          },
          "score": 94,
          "reasoning": "SNS 핫플. 포토존 10개 이상. 감성 카페 있어 데이트 코스로 완벽. 연인 여행객 만족도 높음.",
          "best_day": 1,
          "best_time": "13:00",
          "time_reason": "햇빛이 가장 예쁘게 들어오는 시간. 오전 단체 관광객 지나간 후라 한산함",
          "route_info": "제주 공항 → (30분) → 스누피가든 → (20분) → 애월 카페거리",
          "waiting_info": "입장 대기 없음, 내부 카페는 13시경 한산",
          "tips": [
            "포토존 지도 입구에서 받기",
            "노란 집 앞 포토존이 인생샷",
            "내부 카페 음료 포함 패키지 추천",
            "주차 무료, 2시간 소요"
          ]
        }
      ],
      "alternatives": []
    })
  }
];

/**
 * Few-shot 예시를 메시지 형식으로 변환
 */
export function formatFewShotExamples() {
  return FEW_SHOT_EXAMPLES.flatMap(ex => [
    { role: ex.role, content: ex.content }
  ]);
}
```

---

## 🔍 Step 3: RAG (Retrieval-Augmented Generation)

### Vector Search 구현

```javascript
// src/ai/vectorSearch.js

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY
});

/**
 * 텍스트를 벡터로 변환 (임베딩)
 */
export async function createEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float"
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding 생성 실패:', error);
    throw error;
  }
}

/**
 * 장소 데이터를 검색 가능한 텍스트로 변환
 */
export function placeToSearchText(place) {
  return `
${place.name}
카테고리: ${place.category}
지역: ${place.region || ''}
설명: ${place.description || ''}
특징: ${place.features?.join(', ') || ''}
태그: ${place.tags?.join(', ') || ''}
메뉴: ${place.menu?.join(', ') || ''}
분위기: ${place.atmosphere || ''}
추천 상황: ${place.recommendedFor?.join(', ') || ''}
  `.trim();
}

/**
 * 모든 장소에 대한 임베딩 생성 (초기 1회만 실행)
 */
export async function generateAllEmbeddings(places) {
  console.log('📊 임베딩 생성 중...', places.length, '개 장소');
  
  const embeddings = [];
  
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    const searchText = placeToSearchText(place);
    
    try {
      const embedding = await createEmbedding(searchText);
      
      embeddings.push({
        place_id: place.id,
        embedding: embedding
      });
      
      // 진행상황 로그
      if ((i + 1) % 100 === 0) {
        console.log(`  ${i + 1}/${places.length} 완료`);
      }
      
      // Rate limit 고려 (50 requests/min)
      if (i < places.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    } catch (error) {
      console.error(`임베딩 실패: ${place.name}`, error);
    }
  }
  
  console.log('✅ 임베딩 생성 완료!');
  
  // DB에 저장 (구현 필요)
  // await saveEmbeddingsToDatabase(embeddings);
  
  return embeddings;
}

/**
 * 코사인 유사도 계산
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 벡터 검색으로 유사한 장소 찾기
 */
export async function searchSimilarPlaces(query, allPlaces, allEmbeddings, topK = 10) {
  console.log('🔍 벡터 검색 중...', query);
  
  // 1. 쿼리를 벡터로 변환
  const queryEmbedding = await createEmbedding(query);
  
  // 2. 모든 장소와 유사도 계산
  const similarities = allEmbeddings.map((item, index) => ({
    place: allPlaces[index],
    similarity: cosineSimilarity(queryEmbedding, item.embedding)
  }));
  
  // 3. 유사도 높은 순으로 정렬
  similarities.sort((a, b) => b.similarity - a.similarity);
  
  // 4. 상위 K개 반환
  const results = similarities.slice(0, topK);
  
  console.log('✅ 검색 완료:', results.length, '개 결과');
  
  return results.map(item => ({
    place: item.place,
    score: item.similarity
  }));
}

/**
 * 키워드 기반 필터링 (RAG 보조)
 */
export function filterPlacesByKeywords(places, keywords) {
  if (!keywords || keywords.length === 0) return places;
  
  return places.filter(place => {
    const searchText = placeToSearchText(place).toLowerCase();
    
    return keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
  });
}

/**
 * 하이브리드 검색 (벡터 + 키워드)
 */
export async function hybridSearch(query, places, embeddings, options = {}) {
  const {
    topK = 10,
    keywords = [],
    minScore = 0.7
  } = options;
  
  // 1. 키워드 필터링 (있으면)
  let filteredPlaces = places;
  if (keywords.length > 0) {
    filteredPlaces = filterPlacesByKeywords(places, keywords);
  }
  
  // 2. 벡터 검색
  const vectorResults = await searchSimilarPlaces(
    query,
    filteredPlaces,
    embeddings,
    topK
  );
  
  // 3. 최소 점수 필터링
  const finalResults = vectorResults.filter(item => item.score >= minScore);
  
  return finalResults;
}
```

---

## 🧠 Step 4: AI 추천 엔진 (모든 것 통합)

```javascript
// src/ai/RecommendationEngine.js

import OpenAI from 'openai';
import { 
  TRAVEL_EXPERT_SYSTEM_PROMPT, 
  PLACE_RECOMMENDATION_PROMPT 
} from './systemPrompts';
import { formatFewShotExamples } from './fewShotExamples';
import { hybridSearch } from './vectorSearch';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // 주의: 프로덕션에서는 백엔드 사용
});

/**
 * 프롬프트 엔지니어링 + Few-shot + RAG 통합
 */
export class AIRecommendationEngine {
  constructor(places, embeddings) {
    this.places = places;
    this.embeddings = embeddings;
  }
  
  /**
   * 메인 추천 함수
   */
  async recommend(query, context, options = {}) {
    console.log('🤖 AI 추천 시작...', query);
    
    try {
      // Step 1: RAG - 관련 장소 검색
      const searchResults = await this.searchRelevantPlaces(query, context, options);
      
      if (searchResults.length === 0) {
        return {
          success: false,
          message: '검색 결과가 없습니다.'
        };
      }
      
      // Step 2: 프롬프트 구성
      const prompt = PLACE_RECOMMENDATION_PROMPT(
        query,
        context,
        searchResults.map(r => r.place)
      );
      
      // Step 3: Few-shot 예시 포함
      const fewShotExamples = formatFewShotExamples();
      
      // Step 4: GPT 호출
      const messages = [
        { 
          role: "system", 
          content: TRAVEL_EXPERT_SYSTEM_PROMPT 
        },
        ...fewShotExamples,
        { 
          role: "user", 
          content: prompt 
        }
      ];
      
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages,
        temperature: 0.3, // 일관성 우선
        max_tokens: 2000
      });
      
      // Step 5: 응답 파싱
      const result = this.parseResponse(response);
      
      console.log('✅ AI 추천 완료');
      
      return {
        success: true,
        ...result
      };
      
    } catch (error) {
      console.error('AI 추천 실패:', error);
      return {
        success: false,
        message: '추천 생성 중 오류가 발생했습니다.',
        error: error.message
      };
    }
  }
  
  /**
   * RAG: 관련 장소 검색
   */
  async searchRelevantPlaces(query, context, options) {
    const {
      topK = 10,
      minScore = 0.7
    } = options;
    
    // 검색 쿼리 확장 (맥락 포함)
    const expandedQuery = this.expandQuery(query, context);
    
    // 키워드 추출
    const keywords = this.extractKeywords(query, context);
    
    // 하이브리드 검색
    const results = await hybridSearch(
      expandedQuery,
      this.places,
      this.embeddings,
      { topK, keywords, minScore }
    );
    
    // 맥락 기반 필터링
    const filtered = this.filterByContext(results, context);
    
    return filtered;
  }
  
  /**
   * 검색 쿼리 확장 (맥락 포함)
   */
  expandQuery(query, context) {
    let expanded = query;
    
    if (context.preferences) {
      expanded += ' ' + context.preferences.join(' ');
    }
    
    if (context.companion) {
      expanded += ' ' + context.companion;
    }
    
    return expanded;
  }
  
  /**
   * 키워드 추출
   */
  extractKeywords(query, context) {
    const keywords = [];
    
    // 쿼리에서 추출
    const queryKeywords = ['카페', '맛집', '관광지', '사진', '조용한', '힐링'];
    queryKeywords.forEach(kw => {
      if (query.includes(kw)) keywords.push(kw);
    });
    
    // 맥락에서 추출
    if (context.preferences) {
      keywords.push(...context.preferences);
    }
    
    return keywords;
  }
  
  /**
   * 맥락 기반 필터링
   */
  filterByContext(results, context) {
    let filtered = results;
    
    // 예산 필터링
    if (context.budget) {
      const maxPricePerPlace = context.budget * 0.1; // 전체 예산의 10%
      filtered = filtered.filter(r => 
        !r.place.averagePrice || r.place.averagePrice <= maxPricePerPlace
      );
    }
    
    // 기존 일정과 중복 제거
    if (context.existingPlaces) {
      const existingIds = context.existingPlaces.map(p => p.id || p);
      filtered = filtered.filter(r => 
        !existingIds.includes(r.place.id)
      );
    }
    
    // 영업 시간 체크 (있으면)
    // ...
    
    return filtered;
  }
  
  /**
   * GPT 응답 파싱
   */
  parseResponse(response) {
    const content = response.choices[0].message.content;
    
    // JSON 추출 (```json ``` 제거)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 형식이 아닙니다.');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return parsed;
  }
}

/**
 * 간편 사용 함수
 */
export async function getAIRecommendations(query, context, places, embeddings) {
  const engine = new AIRecommendationEngine(places, embeddings);
  return await engine.recommend(query, context);
}
```

---

## 🎯 Step 5: 동선 최적화 + AI 통합

```javascript
// src/planners/AIRoutePlanner.js

import { SmartRoutePlanner } from './SmartRoutePlanner';
import { AIRecommendationEngine } from '../ai/RecommendationEngine';
import { generateGPTResponse } from '../ai/openaiWrapper';

/**
 * AI 고도화 + 동선 최적화 통합
 */
export class AIRoutePlanner extends SmartRoutePlanner {
  constructor(places, embeddings, constraints) {
    super(places, constraints);
    this.aiEngine = new AIRecommendationEngine(places, embeddings);
  }
  
  /**
   * AI 검증 및 개선
   */
  async optimizeWithAI(schedule) {
    console.log('🧠 AI 검증 중...');
    
    const prompt = `
당신은 제주도 여행 전문가입니다.

# 현재 일정
${JSON.stringify(schedule, null, 2)}

# 종합 분석 요청
다음 관점에서 분석:
1. **동선 효율성**
   - 역주행 여부
   - 지그재그 패턴
   - 지역 클러스터링
   
2. **시간 배분**
   - 각 장소 체류 시간 적절성
   - 이동 시간 합리성
   - 웨이팅 리스크
   
3. **카테고리 밸런스**
   - 관광/식사/휴식 비율
   - 연속된 같은 카테고리
   
4. **체력 배분**
   - 하루 총 이동거리
   - 고강도 활동 분산
   
5. **종합 점수**
   - 0-100점 평가

# 출력 형식
{
  "overall_score": 85,
  "issues": [
    {
      "type": "route/time/balance/stamina",
      "severity": "high/medium/low",
      "description": "문제 설명",
      "location": "Day 1, 11:00-13:00",
      "impact": "30분 시간 낭비",
      "suggestion": "구체적 개선 방법"
    }
  ],
  "improvements": [
    {
      "change": "Day 1 순서 변경",
      "from": ["성산일출봉", "애월카페"],
      "to": ["성산일출봉", "섭지코지", "애월카페"],
      "benefit": "20km 절약, 동선 효율 20% 향상"
    }
  ],
  "summary": "전체 평가 요약"
}
    `;
    
    const response = await generateGPTResponse(prompt, 'gpt-4');
    const analysis = JSON.parse(response);
    
    // 심각한 문제 있으면 개선 적용
    if (analysis.overall_score < 70 || 
        analysis.issues.some(i => i.severity === 'high')) {
      console.log('⚠️  개선 필요 발견, 수정 중...');
      return await this.applyImprovements(schedule, analysis.improvements);
    }
    
    console.log('✅ AI 검증 통과:', analysis.overall_score, '점');
    
    return {
      schedule,
      analysis
    };
  }
  
  /**
   * AI 개선사항 적용
   */
  async applyImprovements(schedule, improvements) {
    let improved = [...schedule];
    
    for (let improvement of improvements) {
      if (improvement.change.includes('순서 변경')) {
        // 순서 재배치 로직
        improved = this.reorderPlaces(improved, improvement.from, improvement.to);
      }
      // 다른 개선사항들...
    }
    
    return improved;
  }
  
  /**
   * 전체 플래닝 프로세스 (AI 고도화 버전)
   */
  async plan(constraints) {
    console.log('🚀 AI 플래닝 시작...');
    
    // Step 1: 기본 일정 생성 (동선 최적화)
    console.log('📍 Step 1: 동선 최적화');
    const baseSchedule = this.findOptimalRouteWithConstraints(constraints);
    
    // Step 2: AI 검증 및 개선
    console.log('🧠 Step 2: AI 검증');
    const aiResult = await this.optimizeWithAI(baseSchedule);
    
    // Step 3: 통계 계산
    console.log('📊 Step 3: 통계 계산');
    const stats = this.calculateStats(aiResult.schedule);
    const efficiency = this.analyzeEfficiency(aiResult.schedule);
    
    console.log('✅ 플래닝 완료!');
    
    return {
      schedule: aiResult.schedule,
      analysis: aiResult.analysis,
      stats: {
        ...stats,
        efficiency: efficiency
      }
    };
  }
}

/**
 * 간편 사용 함수
 */
export async function createOptimalPlan(places, embeddings, constraints) {
  const planner = new AIRoutePlanner(places, embeddings, constraints);
  return await planner.plan(constraints);
}
```

---

## 🎨 Step 6: 사용 예제

```javascript
// 실제 사용 예시

import { createOptimalPlan } from './planners/AIRoutePlanner';
import { generateAllEmbeddings } from './ai/vectorSearch';

// 1. 초기 설정 (1회만)
async function initialize(places) {
  console.log('🚀 초기 설정 시작...');
  
  // 임베딩 생성
  const embeddings = await generateAllEmbeddings(places);
  
  // 로컬스토리지에 저장
  localStorage.setItem('embeddings', JSON.stringify(embeddings));
  
  console.log('✅ 초기 설정 완료!');
  
  return embeddings;
}

// 2. 일정 생성
async function createTripPlan(userInput) {
  // 임베딩 로드
  const embeddings = JSON.parse(localStorage.getItem('embeddings'));
  
  // 장소 데이터 로드
  const places = await loadPlaces(); // 구현 필요
  
  // 제약 조건
  const constraints = {
    startTime: '09:00',
    endTime: '20:00',
    mealTimes: {
      breakfast: '09:00',
      lunch: '12:00',
      dinner: '18:00'
    },
    preferences: userInput.preferences,
    budget: userInput.budget,
    companion: userInput.companion
  };
  
  // AI 플래닝 실행
  const result = await createOptimalPlan(places, embeddings, constraints);
  
  return result;
}

// 3. 결과 표시
function displayResult(result) {
  console.log('📅 최종 일정:');
  result.schedule.forEach(item => {
    console.log(`${item.time} - ${item.place.name} (${item.duration}분)`);
  });
  
  console.log('\n📊 통계:');
  console.log('총 이동거리:', result.stats.totalDistance);
  console.log('효율성:', result.stats.efficiency.score, '점');
  console.log('역주행:', result.stats.efficiency.backtracking, '회');
  
  console.log('\n🧠 AI 분석:');
  console.log('종합 점수:', result.analysis.overall_score, '점');
  console.log('요약:', result.analysis.summary);
}
```

---

## ✅ 구현 체크리스트

### Day 1: 동선 최적화 기초
- [ ] 제주도 지역 정의 (jejuRegions.js)
- [ ] 거리 계산 함수 (distance.js)
- [ ] TSP 알고리즘 (routeOptimizer.js)

### Day 2: 스마트 플래너
- [ ] SmartRoutePlanner 클래스
- [ ] 시간 제약 고려
- [ ] 웨이팅 평가
- [ ] 효율성 분석

### Day 3: AI 고도화 준비
- [ ] System Prompt 작성
- [ ] Few-shot 예시 작성
- [ ] 프롬프트 함수

### Day 4: RAG 구현
- [ ] Vector Search 구현
- [ ] 임베딩 생성
- [ ] 하이브리드 검색

### Day 5: 통합 및 테스트
- [ ] AIRecommendationEngine
- [ ] AIRoutePlanner
- [ ] 실제 데이터 테스트
- [ ] Before/After 비교

---

## 📊 예상 개선 효과

```
동선 최적화:
Before: 195km, 효율성 25점, 역주행 2회
After:  68km, 효율성 94점, 역주행 0회
→ 65% 개선

AI 정확도:
Before: 60%, 일관성 낮음, 환각 30%
After:  95%, 일관성 높음, 환각 1%
→ 58% 개선

사용자 만족도:
Before: 70%
After:  95%
→ 36% 개선
```

---

## 🚀 다음 단계

1. **이 가이드를 Claude Code에게 전달**
2. **단계별로 구현 요청**
3. **실제 데이터로 테스트**
4. **베타 유저 피드백 수집**
5. **VibeLabs 데모 준비**

---

## END

이 가이드는 여행 플래너의 핵심 품질을 10배 향상시킵니다.

**Claude Code에게:**
"이 가이드대로 구현해주세요. 동선 최적화부터 시작합니다."
