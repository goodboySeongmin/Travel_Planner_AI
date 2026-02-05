"""
Pydantic 모델 정의
TypeScript types.ts를 Python으로 변환
"""

from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date


# 혼잡도 정보
class WaitingInfo(BaseModel):
    peakHours: list[str] = []  # ["12:00-13:00", "18:00-19:00"]
    recommendedTime: str = ""  # "11:00 또는 14:00"
    avgWaitTime: int = 0  # 평균 대기 시간 (분)
    crowdLevel: str = "low"  # low, medium, high, very high, closed 등
    tips: str = ""


# 장소 데이터
class Place(BaseModel):
    id: str
    name: str
    category: Literal["관광지", "맛집", "카페", "숙소"]
    subcategory: str = ""
    description: str = ""
    address: str = ""
    latitude: float
    longitude: float
    avg_cost: int = 0
    avg_time: int = 60  # 분
    style_tags: list[str] = []
    image_url: str = ""
    naver_link: str = ""
    rating: float = 0.0
    waitingInfo: Optional[WaitingInfo] = None


# 일정 내 장소
class SchedulePlace(BaseModel):
    time: str  # "09:00"
    placeId: str
    name: str
    category: str
    description: str = ""
    cost: int = 0
    duration: int = 60  # 분
    latitude: float
    longitude: float
    image_url: Optional[str] = None
    naver_link: Optional[str] = None
    travelTime: Optional[int] = None  # 다음 장소까지 이동 시간
    waitingInfo: Optional[WaitingInfo] = None


# 하루 일정
class DaySchedule(BaseModel):
    day: int
    date: str  # "1월 15일 (월)"
    places: list[SchedulePlace]


# 비용 breakdown
class CostBreakdown(BaseModel):
    accommodation: int = 0
    food: int = 0
    activity: int = 0
    cafe: int = 0
    transport: int = 0
    etc: int = 0


# 동선 효율성
class RouteEfficiency(BaseModel):
    totalDistance: float = 0.0  # km
    totalTravelTime: int = 0  # 분
    regionScore: int = 100  # 0-100
    backtrackCount: int = 0
    efficiencyScore: int = 100  # 0-100


# 여행 계획 결과
class TripPlan(BaseModel):
    totalCost: int
    costBreakdown: CostBreakdown
    schedule: list[DaySchedule]
    routeEfficiency: Optional[dict] = None


# 사용자 입력
class TripInput(BaseModel):
    budget: int = 500000
    nights: int = 2
    days: int = 3
    people: Literal["혼자", "커플", "친구", "가족"] = "커플"
    styles: list[str] = ["맛집", "자연"]
    hasRentcar: bool = True
    customRequest: str = ""


# 일정 생성 요청
class GenerateRequest(BaseModel):
    input: TripInput
    places: Optional[list[Place]] = None


# 채팅 요청
class ChatRequest(BaseModel):
    message: str
    schedule: Optional[list[DaySchedule]] = None
    hasRentcar: bool = True


# 채팅 응답
class ChatResponse(BaseModel):
    reply: str
    places: Optional[list[Place]] = None


# 체크리스트 아이템
class ChecklistItem(BaseModel):
    id: str
    text: str
    checked: bool = False
    category: Optional[str] = None


# 체크리스트 섹션
class ChecklistSection(BaseModel):
    title: str
    emoji: str
    items: list[ChecklistItem]


# 전체 체크리스트
class TripChecklist(BaseModel):
    beforeTrip: list[ChecklistSection]
    duringTrip: list[ChecklistSection]
    afterTrip: ChecklistSection


# 체크리스트 생성 요청
class ChecklistRequest(BaseModel):
    input: TripInput
    schedule: list[DaySchedule]


# 날씨 예보
class WeatherForecast(BaseModel):
    date: str
    dayOfWeek: str
    condition: Literal["맑음", "구름", "흐림", "비", "눈", "폭우", "강풍"]
    temperature: dict  # min, max, feel
    precipitation: dict  # chance, amount
    wind: dict  # speed, isStrong
    humidity: int
    recommendation: str
    icon: str


# RAG 검색 필터
class SearchFilter(BaseModel):
    category: Optional[str] = None
    categories: Optional[list[str]] = None
    region: Optional[str] = None
    regions: Optional[list[str]] = None
    maxCost: Optional[int] = None
    minRating: Optional[float] = None
    styles: Optional[list[str]] = None


# RAG 검색 결과
class RAGSearchResult(BaseModel):
    place: Place
    score: float
    vectorScore: float
    keywordScore: float
    matchedVectorType: str = ""
