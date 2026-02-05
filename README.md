# 제주메이트 (Jeju Mate)

> AI 기반 제주 여행 일정 자동 생성 플랫폼

예산, 여행 스타일, 인원 정보만 입력하면 AI가 최적의 제주 여행 일정을 만들어 드립니다.
RAG 검색 → 동선 최적화 → 실시간 모니터링까지 한 번에.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)
![Firebase](https://img.shields.io/badge/Firebase-Database-FFCA28?logo=firebase)
![Pinecone](https://img.shields.io/badge/Pinecone-VectorDB-6C3483)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)

---

## 목차

- [시스템 아키텍처](#시스템-아키텍처)
- [핵심 기능 상세](#핵심-기능-상세)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [알고리즘 심층 분석](#알고리즘-심층-분석)
- [데이터 설계](#데이터-설계)
- [API 명세](#api-명세)
- [설치 및 실행](#설치-및-실행)
- [외부 서비스 설정](#외부-서비스-설정)
- [향후 로드맵](#향후-로드맵)
- [라이선스](#라이선스)

---

## 시스템 아키텍처

```
                          ┌──────────────────────────────────────────────────┐
                          │              Frontend (Next.js 15)              │
                          │     React 19 · TypeScript · TailwindCSS 4      │
                          │                                                │
                          │  ┌───────────┐ ┌────────────┐ ┌────────────┐  │
                          │  │ TripForm  │ │ Draggable  │ │  ChatBot   │  │
                          │  │ (입력)     │ │ Schedule   │ │  (RAG 대화) │  │
                          │  └───────────┘ └────────────┘ └────────────┘  │
                          │  ┌───────────┐ ┌────────────┐ ┌────────────┐  │
                          │  │ KakaoMap  │ │ Cost       │ │ Agent      │  │
                          │  │ (지도)     │ │ Breakdown  │ │ Status     │  │
                          │  └───────────┘ └────────────┘ └────────────┘  │
                          │                                                │
                          │  ┌─────────────────────────────────────────┐   │
                          │  │     MonitoringAgent (Client-Side)       │   │
                          │  │  날씨 · 혼잡도 · 예산 실시간 감시        │   │
                          │  └─────────────────────────────────────────┘   │
                          └───────────────────┬────────────────────────────┘
                                              │ HTTP/REST (API Proxy)
                                              ▼
                          ┌──────────────────────────────────────────────────┐
                          │             Backend (FastAPI + Python)           │
                          │                                                  │
                          │  ┌────────────┐ ┌──────────────┐ ┌───────────┐  │
                          │  │ RAG Search │ │ Route        │ │ Prompt    │  │
                          │  │ (Hybrid)   │ │ Optimizer    │ │ Engine    │  │
                          │  │            │ │ (TSP+2-opt)  │ │           │  │
                          │  └─────┬──────┘ └──────────────┘ └─────┬─────┘  │
                          │        │                               │        │
                          └────────┼───────────────────────────────┼────────┘
                                   │                               │
                     ┌─────────────┼───────────────┬───────────────┼──────┐
                     │             │               │               │      │
                     ▼             ▼               ▼               ▼      ▼
               ┌──────────┐ ┌──────────┐    ┌──────────┐   ┌────────┐ ┌────────┐
               │ Pinecone │ │  OpenAI  │    │  Kakao   │   │Supabase│ │Firebase│
               │ VectorDB │ │ GPT-4o + │    │  Maps    │   │  Auth  │ │ RT DB  │
               │          │ │ Embedding│    │   API    │   │        │ │        │
               └──────────┘ └──────────┘    └──────────┘   └────────┘ └────────┘
```

### 데이터 흐름

```
사용자 입력 → TripForm
    │
    ▼
[1] RAG 검색 (Pinecone + Keyword Hybrid)
    │  쿼리 확장 → 벡터 검색 → 키워드 매칭 → 하이브리드 점수
    ▼
[2] AI 일정 생성 (GPT-4o)
    │  계절 · 인원 · 스타일 맞춤 프롬프트
    ▼
[3] 동선 최적화 (TSP + 2-opt + 지역 클러스터링)
    │  Nearest Neighbor → 2-opt 개선 → 시간 재계산
    ▼
[4] 결과 렌더링
    │  지도 · 일정표 · 비용 차트 · 체크리스트
    ▼
[5] MonitoringAgent (실시간 감시)
    │  날씨/혼잡도/예산 알림 → 대안 제시
    ▼
[6] 저장/공유 (Firebase · PDF · 카카오톡)
```

---

## 핵심 기능 상세

### 1. AI 일정 생성 파이프라인

| 단계 | 엔진 | 설명 |
|------|------|------|
| 쿼리 확장 | GPT-4o-mini | 사용자 스타일 → 5개 유사 검색어로 확장 |
| RAG 검색 | Pinecone + OpenAI Embedding | 1,974개 장소 DB에서 하이브리드 검색 |
| 일정 생성 | GPT-4o | 예산/인원/계절 맞춤 JSON 일정 생성 |
| 동선 최적화 | TSP + 2-opt | 지역 클러스터링 기반 경로 최적화 |
| 효율성 분석 | Custom Scoring | 역주행 감지, 지역 점수, 거리 효율성 |

### 2. RAG 검색 (Hybrid Search)

```
사용자 쿼리: "조용한 오션뷰 카페"
    │
    ├── [Query Expansion] GPT-4o-mini
    │   → ["조용한 오션뷰 카페", "한적한 바다 카페", "여유로운 해안 카페", ...]
    │
    ├── [Vector Search] Pinecone (text-embedding-3-small, 512D)
    │   → 멀티벡터 임베딩 (base, vibe, practical, recommend)
    │   → 장소별 최고 점수 집계
    │
    ├── [Keyword Search] 로컬 매칭
    │   → 이름(10) > 카테고리(5) > 서브카테고리(4) > 태그(3) > 설명(2)
    │
    └── [Hybrid Score] = Vector × 0.7 + Keyword × 0.3
        → 상위 N개 반환 + 메타데이터 필터링 (카테고리, 지역, 예산, 평점)
```

### 3. 동선 최적화 엔진 (Dual Implementation)

**백엔드 (Python) + 프론트엔드 (TypeScript) 양쪽 구현**

```
일정 내 장소들
    │
    ├── [1단계] 지역 클러스터링
    │   └── 5개 지역: 제주시, 서귀포, 동부, 서부, 중산간
    │
    ├── [2단계] 최적 지역 순서 결정
    │   └── 시작 지역 기준 인접 지역 순환 (역주행 방지)
    │
    ├── [3단계] Nearest Neighbor
    │   └── 각 지역 내에서 가장 가까운 장소부터 순회
    │
    ├── [4단계] 2-opt 개선 (≤100 iterations)
    │   └── 교차 경로 해소 (0.1km 이상 개선 시)
    │
    └── [5단계] 효율성 점수 산출
        └── 지역 점수(50%) + 역주행 패널티(30%) + 거리 효율성(20%)
```

**효율성 점수 수식:**

```
efficiencyScore = regionScore × 0.5
                + (100 - backtrackPenalty) × 0.3
                + distanceEfficiency × 0.2

backtrackPenalty = min(backtrackCount × 10, 30)
distanceEfficiency = max(0, 100 - max(0, ratio - 2) × 20)
    where ratio = totalDistance / directDistance
```

### 4. MonitoringAgent (실시간 감시 시스템)

클라이언트 사이드 에이전트로, 30분 주기로 3가지 축을 감시합니다.

| 감시 채널 | 트리거 조건 | 대응 |
|-----------|------------|------|
| **날씨** | 비/폭우(강수확률 ≥50%), 강풍(≥10m/s) | 실내 코스 변경 / 일정 교환 / 우산 챙기기 |
| **혼잡도** | 방문 시간이 피크타임 + crowdLevel: high | 방문 시간 조정 / 그냥 대기 |
| **예산** | 총비용 > 예산의 110% | 비용 절감 추천 (severity ≥ 120%이면 high) |

```
MonitoringAgent
    │
    ├── start() → 즉시 1회 실행 + 30분 setInterval
    ├── runChecks() → Promise.all([checkWeather, checkWaiting, checkBudget])
    ├── notifyUser() → CustomEvent("agent-alert") 발생
    └── AgentAlertModal에서 수신 → 대안 옵션 선택 (적용/나중에)
```

### 5. 대화형 장소 검색 (ChatBot)

- RAG 기반 자연어 검색으로 장소 추천
- 검색 결과를 카드 형태로 표시
- "일정에 추가" 버튼으로 즉시 스케줄 반영
- 현재 일정 컨텍스트를 포함하여 맥락 있는 추천

### 6. 드래그 앤 드롭 일정 편집

| 기능 | 라이브러리 | 설명 |
|------|-----------|------|
| 순서 변경 | @dnd-kit/sortable | 장소 카드 드래그로 순서 변경 |
| 시간 재계산 | routeOptimizer.ts | 순서 변경 시 시간/이동시간 자동 재계산 |
| 장소 삭제 | 자체 구현 | 개별 장소 삭제 + 시간 재계산 |
| 장소 교체 | PlaceReplacementModal | RAG 기반 대안 장소 검색 후 교체 |

### 7. 회원 관리 (Supabase Auth)

| 방식 | 제공 기능 |
|------|----------|
| 이메일 가입 | 이름, 전화번호, 이메일, 비밀번호 |
| 이메일 로그인 | 이메일/비밀번호 |
| Google OAuth | 소셜 로그인 |
| 카카오 OAuth | 소셜 로그인 |
| 세션 관리 | 브라우저 종료 시 자동 로그아웃 (no localStorage) |

### 8. 저장/공유 시스템

| 기능 | 기술 | 설명 |
|------|------|------|
| 일정 저장 | Firebase Realtime DB | 로그인 사용자별 일정 저장 |
| 보관함 | Firebase Query | userId 기반 저장 일정 목록 조회/삭제 |
| 공유 링크 | Firebase + Dynamic Route | `/shared/[tripId]` 공유 페이지 (읽기 전용) |
| PDF 내보내기 | html2canvas + jsPDF | 일정표 PDF 다운로드 |
| 카카오톡 공유 | Kakao SDK | 카카오톡 메시지로 일정 공유 |

### 9. 체크리스트 자동 생성

GPT-4o 기반으로 여행 조건에 맞는 체크리스트 자동 생성:

- **D-7, D-3, D-1**: 출발 전 준비 (항공권, 짐 싸기, 충전기 등)
- **Day 1~N**: 여행 중 일별 체크 (장소별 준비물, 이동 수단 등)
- **여행 후**: 정리 (사진, 리뷰, 기념품 등)
- 인원 유형(혼자/커플/친구/가족)별 맞춤 항목

### 10. 비용 분석 차트

SVG 도넛 차트로 6개 카테고리별 비용 시각화:

| 카테고리 | 포함 항목 |
|---------|----------|
| 숙박 | 호텔, 펜션, 게스트하우스 |
| 식비 | 맛집, 로컬 식당 |
| 관광 | 입장료, 체험비 |
| 카페 | 카페, 디저트 |
| 교통 | 렌트카 또는 대중교통 |
| 기타 | 기념품, 잡비 |

### 11. 지도 시각화 (Kakao Maps)

- 일별 색상 코딩 마커
- 장소 간 폴리라인 경로 표시
- 마커 클릭 시 인포 윈도우 (장소 상세)
- 전체화면 모드
- 선택 일자별 필터링

### 12. 날씨 연동

- OpenWeatherMap API 기반 5일간 예보
- 한국어 날씨 상태 매핑 (맑음/구름/흐림/비/눈/폭우/강풍)
- 체감온도, 강수확률, 풍속, 습도 제공
- MonitoringAgent와 연동하여 알림 트리거

---

## 기술 스택

| 영역 | 기술 | 역할 |
|------|------|------|
| **Frontend** | Next.js 15, React 19, TypeScript 5, TailwindCSS 4 | SPA + SSR 하이브리드 |
| **Backend** | FastAPI, Python 3.11+, Pydantic | AI/ML 마이크로서비스 |
| **AI 엔진** | OpenAI GPT-4o / GPT-4o-mini | 일정 생성, 쿼리 확장, 챗봇 |
| **임베딩** | OpenAI text-embedding-3-small (512D) | 장소 벡터 임베딩 |
| **Vector DB** | Pinecone | 멀티벡터 시맨틱 검색 |
| **인증** | Supabase Authentication | Email + Google + Kakao OAuth |
| **데이터베이스** | Firebase Realtime Database | 일정 저장/공유/실시간 동기화 |
| **지도** | Kakao Maps API | 경로 시각화, 마커, 폴리라인 |
| **날씨** | OpenWeatherMap API | 5일 예보, MonitoringAgent 연동 |
| **DnD** | @dnd-kit/core, @dnd-kit/sortable | 일정 드래그 앤 드롭 |
| **PDF** | html2canvas + jsPDF | 일정표 PDF 내보내기 |
| **공유** | Kakao SDK | 카카오톡 공유 |

---

## 프로젝트 구조

```
jeju-travel-planner/
│
├── app/                              # Next.js App Router
│   ├── page.tsx                      # 메인 페이지 (히어로 + 입력 폼)
│   ├── result/page.tsx               # 결과 페이지 (일정 + 지도 + 에이전트)
│   ├── storage/page.tsx              # 보관함 (저장된 일정 목록)
│   ├── shared/[tripId]/page.tsx      # 공유 페이지 (읽기 전용)
│   ├── auth/callback/route.ts        # OAuth 콜백 핸들러
│   ├── layout.tsx                    # 루트 레이아웃 (AuthProvider)
│   └── api/                          # API Proxy → Python Backend
│       ├── generate/route.ts         #   일정 생성 프록시
│       ├── chat/route.ts             #   챗봇 프록시
│       ├── checklist/route.ts        #   체크리스트 프록시
│       └── weather/route.ts          #   날씨 프록시
│
├── components/                       # React UI 컴포넌트
│   ├── TripForm.tsx                  # 여행 정보 입력 폼
│   ├── DraggableSchedule.tsx         # 드래그 앤 드롭 일정표
│   ├── ScheduleCard.tsx              # 일별 일정 카드
│   ├── KakaoMap.tsx                  # 카카오 지도
│   ├── ChatBot.tsx                   # 대화형 장소 검색
│   ├── CostBreakdown.tsx             # 비용 도넛 차트
│   ├── Checklist.tsx                 # 체크리스트 (진행률 바)
│   ├── AgentStatus.tsx               # MonitoringAgent 상태 표시
│   ├── AgentAlertModal.tsx           # 에이전트 알림 모달
│   ├── PlaceReplacementModal.tsx     # 장소 교체 모달
│   ├── ShareButtons.tsx              # 공유/PDF/저장 버튼
│   └── AuthModal.tsx                 # 로그인/회원가입 모달
│
├── lib/                              # 프론트엔드 핵심 로직
│   ├── types.ts                      # TypeScript 타입 정의 (18개 인터페이스)
│   ├── routeOptimizer.ts             # 동선 최적화 (TSP + 2-opt + 지역 클러스터링)
│   ├── jejuRegions.ts                # 제주 5개 지역 분류 + 순서 최적화
│   ├── season.ts                     # 계절 정보 유틸
│   ├── supabase.ts                   # Supabase 클라이언트
│   ├── firebase.ts                   # Firebase 클라이언트
│   └── agents/
│       └── MonitoringAgent.ts        # 실시간 감시 에이전트 (날씨/혼잡도/예산)
│
├── contexts/
│   └── AuthContext.tsx               # 인증 상태 관리 (React Context)
│
├── backend/                          # Python Backend (FastAPI)
│   ├── main.py                       # FastAPI 앱 + CORS + 라우터 등록
│   ├── requirements.txt              # Python 의존성
│   ├── .env                          # 백엔드 환경변수
│   ├── api/                          # API 엔드포인트
│   │   ├── generate.py               #   POST /api/generate
│   │   ├── chat.py                   #   POST /api/chat
│   │   ├── checklist.py              #   POST /api/checklist
│   │   └── weather.py                #   GET  /api/weather
│   ├── services/                     # 비즈니스 로직
│   │   ├── rag_search.py             #   RAG 하이브리드 검색
│   │   ├── route_optimizer.py        #   동선 최적화 (TSP + 2-opt)
│   │   ├── prompt_engine.py          #   AI 프롬프트 빌더
│   │   ├── pinecone_client.py        #   Pinecone 연결 관리
│   │   └── jeju_regions.py           #   제주 지역 분류 + Haversine
│   └── models/
│       └── schemas.py                #   Pydantic 모델 정의
│
└── data/
    └── places.json                   # 제주 장소 데이터 (1,974개)
```

---

## 알고리즘 심층 분석

### 1. RAG 검색 파이프라인

```python
# 1. 쿼리 확장 (GPT-4o-mini)
"조용한 카페" → ["조용한 카페", "한적한 카페", "여유로운 카페", "붐비지 않는 카페", "힐링 카페"]

# 2. 임베딩 생성 (text-embedding-3-small, 512D)
combined_query = " ".join(expanded_queries)
query_vector = embed(combined_query)

# 3. Pinecone 검색 (top_k × 4, 멀티벡터)
# 같은 장소의 여러 벡터(base, vibe, practical, recommend) 중 최고 점수 사용

# 4. 키워드 점수 (가중치)
#   이름 매칭: 10점, 카테고리: 5점, 서브카테고리: 4점, 태그: 3점, 설명: 2점
#   정규화: min(score / 30, 1)

# 5. 하이브리드 점수
hybrid_score = vector_score × 0.7 + keyword_score × 0.3
```

### 2. 동선 최적화 알고리즘

```
Input: 하루 일정의 장소 리스트

[지역 클러스터링]
├── 장소 → 5개 지역 분류 (위/경도 기반)
│   ├── 제주시:   lat > 33.42 && lng < 126.65
│   ├── 서부:     lng < 126.40
│   ├── 동부:     lng > 126.75
│   ├── 서귀포:   lat < 33.30
│   └── 중산간:   나머지
│
[지역 순서 최적화]
├── 시작 지역 기준 인접 지역 체인 (환형 순서)
│   예: 제주시 → 동부 → 서귀포 → 서부 → 중산간
│
[지역 내 경로 최적화]
├── Nearest Neighbor (그리디 초기해)
├── 2-opt (로컬 서치)
│   ├── i, j 구간 뒤집기 시도
│   ├── 개선 시 적용 (threshold: 0.1km)
│   └── 최대 100 iterations
│
[시간 재계산]
├── 이동 시간 = 거리(km) / 속도(렌트카 40km/h, 대중교통 25km/h)
├── 대중교통: +10분 대기시간
└── 다음 장소 시작시간 = 이전 종료 + 이동시간

Output: 최적화된 장소 리스트 + travelTime + 효율성 점수
```

### 3. MonitoringAgent 감시 로직

```
[날씨 감시]
├── 캐시 TTL: 30분
├── 비/폭우 감지: condition ∈ {비, 폭우} && 강수확률 ≥ 50%
│   └── 야외 장소 필터: 키워드 매칭 (해변, 오름, 폭포, 공원, ...)
├── 강풍 감지: wind.speed ≥ 10 m/s
│   └── 해안가 장소 필터: 키워드 매칭 (해변, 해안, 항구, ...)
└── 대안: 실내 변경 / 일정 교환 / 유지 (pros/cons 포함)

[혼잡도 감시]
├── crowdLevel === "high" 인 장소
├── 방문 시간 vs peakHours 비교 (±1시간 범위)
└── 대안: 시간 조정 / 그냥 대기

[예산 감시]
├── totalCost > budget × 1.1 → medium severity
├── totalCost > budget × 1.2 → high severity
└── 대안: 비용 절감 장소 변경
```

---

## 데이터 설계

### 장소 데이터 (places.json - 1,974개)

```json
{
  "id": "spot-1",
  "name": "함덕해수욕장",
  "category": "관광지",
  "subcategory": "자연",
  "description": "에메랄드빛 바다와 하얀 모래사장이 아름다운 해수욕장",
  "address": "제주시 조천읍 함덕리",
  "latitude": 33.543,
  "longitude": 126.669,
  "avg_cost": 3000,
  "avg_time": 90,
  "style_tags": ["자연", "가족", "사진"],
  "image_url": "https://...",
  "naver_link": "https://...",
  "rating": 4.2,
  "waitingInfo": {
    "peakHours": ["12:00-13:00", "15:00-16:00"],
    "recommendedTime": "오전 10시 또는 오후 4시 이후",
    "avgWaitTime": 20,
    "crowdLevel": "high",
    "tips": "주말은 주차장 혼잡, 평일 오전 추천"
  }
}
```

### 카테고리 분포

| 카테고리 | 수량 | 서브카테고리 |
|---------|------|------------|
| 관광지 | ~500 | 자연, 문화, 체험, 테마파크 |
| 맛집 | ~800 | 흑돼지, 해산물, 로컬, 한식, 분식 |
| 카페 | ~500 | 오션뷰, 감성, 디저트, 로스터리 |
| 숙소 | ~170 | 호텔, 펜션, 게스트하우스, 리조트 |

### TypeScript 타입 시스템 (18개 인터페이스)

| 타입 | 용도 |
|------|------|
| `Place` | 장소 데이터 (12 필드 + waitingInfo) |
| `WaitingInfo` | 혼잡도 정보 (peakHours, crowdLevel, tips) |
| `TripInput` | 사용자 입력 (예산, 기간, 인원, 스타일) |
| `SchedulePlace` | 일정 내 장소 (시간, 이동시간 포함) |
| `DaySchedule` | 하루 일정 (day, date, places[]) |
| `TripPlan` | 전체 여행 계획 (비용, 일정, 효율성, 분석) |
| `CostBreakdown` | 비용 분류 (6개 카테고리) |
| `RouteEfficiency` | 동선 효율성 (거리, 시간, 역주행, 점수) |
| `ScheduleAnalysis` | 일정 분석 (혼잡 리스크, 균형, 시간 제약) |
| `WeatherForecast` | 날씨 예보 (기온, 강수, 풍속, 습도) |
| `AgentAlert` | 에이전트 알림 (type, severity, alternatives) |
| `AgentAlternative` | 대안 (changes, budgetImpact, pros/cons) |
| `TripChecklist` | 체크리스트 (before/during/after) |
| `ChecklistSection` | 체크리스트 섹션 (title, emoji, items) |
| `ChecklistItem` | 체크리스트 항목 (id, text, checked) |

---

## API 명세

### Frontend → Backend (Proxy)

| Method | Frontend Route | Backend Route | 설명 |
|--------|---------------|---------------|------|
| POST | `/api/generate` | `/api/generate` | AI 여행 일정 생성 |
| POST | `/api/chat` | `/api/chat` | 대화형 장소 검색 |
| POST | `/api/checklist` | `/api/checklist` | 체크리스트 생성 |
| GET | `/api/weather?days=5` | `/api/weather?days=5` | 날씨 예보 조회 |

### Backend Direct

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 서버 상태 확인 |
| GET | `/health` | 상세 헬스체크 (Pinecone, OpenAI 연결 확인) |

### 요청/응답 예시

<details>
<summary><b>POST /api/generate</b></summary>

**Request:**
```json
{
  "input": {
    "budget": 800000,
    "nights": 2,
    "days": 3,
    "people": "커플",
    "styles": ["맛집", "카페", "자연"],
    "hasRentcar": true,
    "customRequest": "해안도로 드라이브 코스 포함"
  }
}
```

**Response:**
```json
{
  "totalCost": 750000,
  "costBreakdown": {
    "accommodation": 200000,
    "food": 250000,
    "activity": 100000,
    "cafe": 80000,
    "transport": 100000,
    "etc": 20000
  },
  "schedule": [
    {
      "day": 1,
      "date": "1월 15일 (월)",
      "places": [
        {
          "time": "09:00",
          "placeId": "spot-1",
          "name": "함덕해수욕장",
          "category": "관광지",
          "description": "에메랄드빛 바다",
          "cost": 3000,
          "duration": 90,
          "latitude": 33.543,
          "longitude": 126.669,
          "travelTime": 25
        }
      ]
    }
  ],
  "routeEfficiency": {
    "days": [{ "totalDistance": 45.2, "efficiencyScore": 82 }],
    "overall": { "totalDistance": 45.2, "efficiencyScore": 82 }
  }
}
```
</details>

---

## 설치 및 실행

### 1. 환경 변수 설정

```bash
# .env.local (프로젝트 루트 - Frontend)
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url
NEXT_PUBLIC_KAKAO_MAP_API_KEY=your_kakao_map_api_key
OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
PYTHON_BACKEND_URL=http://localhost:8000
```

```bash
# backend/.env (Backend)
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
```

### 2. Backend 실행

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
uvicorn main:app --reload --port 8000
```

### 3. Frontend 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 4. 접속

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger 문서 | http://localhost:8000/docs |

---

## 외부 서비스 설정

### Supabase

1. [Supabase](https://supabase.com) 프로젝트 생성
2. **Authentication > Providers > Email** 활성화
3. **Authentication > Providers > Google** 활성화 (OAuth Client ID/Secret 설정)
4. **Authentication > Providers > Kakao** 활성화 (REST API Key 설정)
5. (선택) **Confirm email** 비활성화 - 이메일 확인 없이 즉시 로그인

### Firebase

1. [Firebase Console](https://console.firebase.google.com) 프로젝트 생성
2. **Realtime Database** 생성
3. Rules 설정:

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "trips": {
      ".indexOn": ["userId"]
    }
  }
}
```

### Pinecone

1. [Pinecone](https://pinecone.io) 프로젝트 생성
2. Index 생성 (dimension: 512, metric: cosine)
3. 장소 데이터 임베딩 업로드 (멀티벡터: base, vibe, practical, recommend)

### Kakao Maps

1. [Kakao Developers](https://developers.kakao.com) 앱 생성
2. JavaScript Key 발급
3. 플랫폼 등록 (Web: http://localhost:3000)

---

## 향후 로드맵

### Phase 1: Edit → Replan 자동화 (수정 루프 완성)

> 장소 변경/추가/삭제 요청을 받으면 전체 파이프라인이 자동으로 재실행

| 작업 | 설명 | 현재 상태 |
|------|------|----------|
| 부분 재검색 (RAG) | 변경된 장소 슬롯만 대상으로 RAG 재검색 | 미구현 |
| 후보 재선정 | 기존 일정 맥락 + 변경 요청 기반 후보 장소 선별 | 미구현 |
| 재최적화 (TSP/제약) | 변경된 장소 포함 전체 동선 재최적화 | 부분 구현 (수동 DnD 후 시간 재계산) |
| UI 즉시 반영 | 변경 결과를 지도/일정표/비용 차트에 실시간 반영 | 부분 구현 |
| MonitoringAgent 연동 | 기존 감시 데이터 소스를 변환하여 혼잡도/날씨 반영 | 구현됨 (데이터 소스 전환 필요) |

**목표 UX 흐름:**
```
사용자 "2일차 점심을 해산물로 바꿔줘"
  → ChatBot이 의도 파악
  → 부분 RAG 재검색 (해산물 맛집)
  → 기존 동선 제약 유지하며 후보 제시
  → 선택 시 TSP 재최적화 + 시간 재계산
  → 지도/일정/비용 즉시 업데이트
  → MonitoringAgent가 변경된 일정 재감시
```

### Phase 2: Places 데이터 확장 + 신뢰도 레이어

| 작업 | 설명 |
|------|------|
| 데이터 커버리지 확장 | 현재 1,974개 → 3,000개+ 목표 (카테고리/지역 균형) |
| 품질 관리 파이프라인 | 중복 장소 감지/제거, 폐업 장소 필터링 |
| 태그 보강 | 자동 태깅 (LLM 기반) + 수동 큐레이션 |
| 폴백 로직 강화 | RAG 검색 실패/빈 결과 시 카테고리 기반 폴백 |
| 이미지 데이터 | 장소별 대표 이미지 자동 수집 + CDN 관리 |
| 리뷰 점수 연동 | 네이버/카카오 리뷰 점수 주기적 크롤링 반영 |

### Phase 3: Billing/Plan 정식화 (권한/제한/구독)

| 플랜 | 기능 |
|------|------|
| **Free** | 일정 생성 3회/월, 저장 1개, 기본 최적화 |
| **Basic** | 일정 생성 무제한, 저장 10개, 고급 최적화, PDF 내보내기 |
| **Premium** | 전체 기능, 무제한 저장, 프리미엄 장소 추천, 실시간 모니터링, 공유(PDF/링크) |

| 작업 | 설명 |
|------|------|
| 플랜별 기능 게이트 | 생성/저장/재생성 횟수 제한, 고급 기능 잠금 |
| Checkout 연동 | Stripe/토스페이먼츠 결제 플로우 (Intent → 확인 → 활성화) |
| 실패 핸들링 | 결제 실패/취소/환불 시나리오 처리 |
| 구독 관리 | 플랜 변경, 자동 갱신, 사용량 대시보드 |

### Phase 4: Save/Share 안정화

| 작업 | 설명 |
|------|------|
| PDF 품질 개선 | 레이아웃 최적화, 지도 캡처 포함, 폰트/이미지 깨짐 해결 |
| 소셜 로그인 안정화 | Google/카카오 OAuth 리다이렉트 엣지케이스 처리 |
| 공유 페이지 개선 | OG 메타태그, 소셜 미리보기 이미지 |
| 오프라인 지원 | 저장된 일정 PWA 캐싱 (Service Worker) |

### Phase 5: UX/성능 고도화

| 작업 | 설명 |
|------|------|
| 스트리밍 응답 | 일정 생성 중 실시간 프로그레스 표시 (SSE/WebSocket) |
| 모바일 최적화 | 반응형 UI 개선, 터치 DnD 최적화 |
| 에러 바운더리 | Graceful degradation, API 실패 시 폴백 UI |
| 로딩 성능 | 코드 스플리팅, 이미지 Lazy Loading, API 응답 캐싱 |
| 다국어 지원 | i18n (한국어, English, 日本語, 中文) |
| 테스트 커버리지 | Unit(Jest) + Integration(Playwright) + API(pytest) |
| 로그/분석 | 사용자 행동 분석, AI 응답 품질 모니터링, 에러 트래킹 |

### Phase 6: 서비스 지역 확장 (국내 + 해외)

> 현재 시스템은 **데이터 레이어와 비즈니스 로직이 분리**된 구조로 설계되어 있어,
> 장소 데이터(places.json)와 지역 분류(jejuRegions)만 교체하면 다른 지역으로 즉시 확장 가능합니다.

**확장 가능한 이유 — 아키텍처 독립성:**

```
┌─ 지역 독립적 (변경 불필요) ─────────────────────────────────┐
│  RAG 검색 파이프라인  │  TSP + 2-opt 최적화  │  AI 프롬프트 엔진  │
│  MonitoringAgent     │  비용 분석/차트       │  DnD 일정 편집      │
│  인증/저장/공유      │  PDF 내보내기         │  체크리스트 생성     │
└──────────────────────────────────────────────────────────────┘
                              ▲
                         데이터만 교체
                              │
┌─ 지역 종속적 (교체 대상) ───────────────────────────────────┐
│  places.json (장소 DB)  │  지역 분류 로직  │  지도 API 설정     │
│  Pinecone 임베딩 인덱스 │  계절/날씨 매핑  │  프롬프트 지역 컨텍스트│
└──────────────────────────────────────────────────────────────┘
```

**국내 확장:**

| 대상 지역 | 교체 항목 | 비고 |
|-----------|----------|------|
| 부산/경주 | places.json + 지역 분류 (해운대, 광안리, 경주 등) | Kakao Maps 그대로 사용 |
| 강원도 | places.json + 지역 분류 (속초, 강릉, 평창 등) | 계절 컨텍스트 조정 (스키/단풍) |
| 서울 | places.json + 지역 분류 (강남, 종로, 홍대 등) | 대중교통 최적화 가중치 조정 |
| 전라도 | places.json + 지역 분류 (여수, 순천, 담양 등) | 맛집 카테고리 비중 확대 |

**해외 확장:**

| 대상 지역 | 교체 항목 | 추가 고려 |
|-----------|----------|----------|
| 일본 (오사카/도쿄/후쿠오카) | places.json + 지역 분류 + Pinecone 인덱스 | 지도 API 전환 (Google Maps), 통화(JPY) 변환, i18n |
| 중국 (상하이/베이징) | places.json + 지역 분류 + Pinecone 인덱스 | 지도 API 전환 (Baidu Maps), 통화(CNY) 변환 |
| 동남아 (방콕/다낭/발리) | places.json + 지역 분류 + Pinecone 인덱스 | Google Maps, 다중 통화 지원, 비자 체크리스트 |

**확장 시 기술적 변경 범위:**

| 레이어 | 변경 수준 | 상세 |
|--------|----------|------|
| places.json | **교체** | 해당 지역 장소 데이터 수집 + 포맷 맞춤 |
| Pinecone 인덱스 | **추가** | 새 지역 전용 인덱스 생성 + 멀티벡터 임베딩 |
| jejuRegions.ts/.py | **교체** | 해당 지역 클러스터링 로직 (위/경도 기반) |
| prompt_engine.py | **설정 변경** | 계절 컨텍스트, 지역 키워드, 통화 단위 |
| 지도 API | **설정 변경** | 국내: Kakao 유지 / 해외: Google Maps 전환 |
| RAG + TSP + Agent | **변경 없음** | 데이터 무관하게 동일 로직 동작 |

---
