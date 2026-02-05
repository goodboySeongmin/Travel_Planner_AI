// 혼잡도 정보 타입
export interface WaitingInfo {
  peakHours: string[];        // 혼잡 시간대 ["12:00-13:00", "18:00-19:00"]
  recommendedTime: string;    // 추천 방문 시간 "11:00 또는 14:00"
  avgWaitTime: number;        // 평균 대기 시간 (분), 피크타임 기준
  crowdLevel: "low" | "medium" | "high"; // 전반적 혼잡도
  tips: string;               // 팁 "주말은 1시간 대기, 평일 오전 추천"
}

// 장소 타입
export interface Place {
  id: string;
  name: string;
  category: "관광지" | "맛집" | "카페" | "숙소";
  subcategory: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  avg_cost: number;
  avg_time: number;
  style_tags: string[];
  image_url: string;
  naver_link: string;
  rating: number;
  waitingInfo?: WaitingInfo;  // 혼잡도 정보 (선택)
}

// 사용자 입력 타입
export interface TripInput {
  budget: number;
  nights: number;
  days: number;
  people: "혼자" | "커플" | "친구" | "가족";
  styles: string[];
  hasRentcar: boolean;
  customRequest?: string;
}

// 일정 내 장소 타입
export interface SchedulePlace {
  time: string;
  placeId: string;
  name: string;
  category: string;
  description: string;
  cost: number;
  duration: number;
  latitude: number;
  longitude: number;
  image_url?: string;
  naver_link?: string;
  travelTime?: number; // 다음 장소까지 이동 시간(분)
  waitingInfo?: WaitingInfo; // 혼잡도 정보
}

// 하루 일정 타입
export interface DaySchedule {
  day: number;
  date: string;
  places: SchedulePlace[];
}

// 비용 breakdown 타입
export interface CostBreakdown {
  accommodation: number;
  food: number;
  activity: number;
  cafe: number;
  transport: number;
  etc: number;
}

// 동선 효율성 분석 타입
export interface RouteEfficiency {
  totalDistance: number;     // 총 이동거리 (km)
  totalTravelTime: number;   // 총 이동시간 (분)
  regionScore: number;       // 지역 순서 점수 (0-100)
  backtrackCount: number;    // 역주행 횟수
  efficiencyScore: number;   // 종합 효율성 (0-100)
}

// 일정 분석 타입
export interface ScheduleAnalysis {
  waitingRisk: {
    totalWaitTime: number;
    riskPlaces: { name: string; hour: number; waitMinutes: number }[];
  };
  categoryBalance: {
    score: number;
    issues: { category: string; count: number }[];
  };
  timeConstraints: {
    isValid: boolean;
    issueCount: number;
  };
  overallScore: number;
  recommendations: string[];
}

// AI 응답 타입
export interface TripPlan {
  totalCost: number;
  costBreakdown: CostBreakdown;
  schedule: DaySchedule[];
  routeEfficiency?: {
    days: RouteEfficiency[];
    overall: RouteEfficiency;
  };
  scheduleAnalysis?: ScheduleAnalysis[];
}

// 체크리스트 아이템 타입
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  category?: string;
}

// 체크리스트 섹션 타입
export interface ChecklistSection {
  title: string;        // "D-7", "D-1", "Day 1", "여행 후" 등
  emoji: string;        // 섹션 이모지
  items: ChecklistItem[];
}

// 전체 체크리스트 타입
export interface TripChecklist {
  beforeTrip: ChecklistSection[];  // 출발 전 (D-7, D-3, D-1)
  duringTrip: ChecklistSection[];  // 여행 중 (Day 1, Day 2, ...)
  afterTrip: ChecklistSection;     // 여행 후
}

// 날씨 예보 타입
export interface WeatherForecast {
  date: string;           // "2024-01-15"
  dayOfWeek: string;      // "월요일"
  condition: "맑음" | "구름" | "흐림" | "비" | "눈" | "폭우" | "강풍";
  temperature: {
    min: number;
    max: number;
    feel: number;         // 체감 온도
  };
  precipitation: {
    chance: number;       // 강수 확률 (%)
    amount?: number;      // 강수량 (mm)
  };
  wind: {
    speed: number;        // 풍속 (m/s)
    isStrong: boolean;    // 강풍 여부 (10m/s 이상)
  };
  humidity: number;       // 습도 (%)
  recommendation: string; // "야외 활동 적합" | "실내 활동 추천" 등
  icon: string;           // 날씨 아이콘 코드
}

// Agent 알림 타입
export interface AgentAlert {
  type: "weather" | "waiting" | "budget";
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  alternatives?: AgentAlternative[];
  autoApply?: AgentAlternative;
}

// Agent 대안 타입
export interface AgentAlternative {
  type: string;
  title: string;
  description: string;
  changes?: {
    from: string;
    to: string;
    reason: string;
  }[];
  budgetImpact?: string;
  pros?: string[];
  cons?: string[];
}