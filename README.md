# 제주메이트 (Jeju Mate)

> AI 기반 제주 여행 일정 자동 생성 서비스

예산, 여행 스타일, 인원 정보만 입력하면 AI가 최적의 제주 여행 일정을 만들어 드립니다.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?logo=supabase)
![Firebase](https://img.shields.io/badge/Firebase-Database-FFCA28?logo=firebase)

---

## 목차

- [아키텍처](#아키텍처)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [API 엔드포인트](#api-엔드포인트)
- [알고리즘 설명](#알고리즘-설명)
- [데이터 구조](#데이터-구조)
- [향후 개발 계획](#향후-개발-계획)

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                    Next.js + React + TypeScript                  │
│         (UI Components, Map, Drag & Drop, PDF Export)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                         HTTP/REST
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│                      FastAPI + Python                            │
│    (RAG Search, Route Optimization, AI Prompt, LLM Integration)  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ Pinecone │    │  Claude  │    │  OpenAI  │
        │ VectorDB │    │   API    │    │   API    │
        └──────────┘    └──────────┘    └──────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    Supabase     │    Firebase     │       Kakao Maps            │
│  (사용자 인증)   │  (데이터 저장)   │       (지도 표시)            │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## 주요 기능

### 1. 회원 관리 (Supabase Auth)

| 기능 | 설명 |
|------|------|
| **이메일 회원가입** | 이름, 전화번호, 이메일, 비밀번호 입력 |
| **이메일 로그인** | 이메일/비밀번호로 로그인 |
| **소셜 로그인** | Google, 카카오 OAuth 연동 |
| **세션 관리** | 브라우저 종료 시 자동 로그아웃 |

### 2. AI 일정 생성

- **Claude API** (Anthropic) 기반 여행 일정 생성
- 예산 범위 내 최적의 장소 조합
- 여행 스타일에 맞는 맞춤 추천 (자연, 맛집, 액티비티 등)

### 3. RAG 검색 (Python Backend)

- **Pinecone Vector DB** + OpenAI Embedding
- 멀티벡터 임베딩 (장소당 4개: base, vibe, practical, recommend)
- 하이브리드 검색 (Vector 70% + Keyword 30%)
- 쿼리 자동 확장 (Query Expansion)

### 4. 동선 최적화 (Python Backend)

- **TSP 알고리즘** + 2-opt 최적화
- 지역 클러스터링 (제주시, 서귀포, 동부, 서부, 중산간)
- 역주행 감지 및 방지

### 5. 대화형 장소 검색

- 챗봇 기반 장소 추천
- RAG 기반 자연어 검색
- 일정에 바로 장소 추가

### 6. 일정 커스터마이징

- **드래그 앤 드롭** 순서 변경 (@dnd-kit)
- 장소 삭제/교체 기능
- 시간 자동 재계산

### 7. 저장 및 공유

| 기능 | 설명 |
|------|------|
| **일정 저장** | 로그인 후 Firebase에 일정 저장 |
| **보관함** | 저장된 일정 목록 조회/삭제 |
| **공유 링크** | Firebase 실시간 공유 링크 생성 |
| **PDF 내보내기** | html2canvas + jsPDF |
| **카카오톡 공유** | 카카오 SDK 연동 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 15, React 19, TypeScript 5, TailwindCSS 4 |
| **Backend** | FastAPI, Python 3.11+, Pydantic |
| **AI/ML** | Claude API (Anthropic), OpenAI Embeddings, LangChain |
| **Vector DB** | Pinecone (text-embedding-3-small) |
| **Auth** | Supabase Authentication (Email, Google, Kakao) |
| **Database** | Firebase Realtime Database |
| **Map** | Kakao Maps API |
| **Drag & Drop** | @dnd-kit/core, @dnd-kit/sortable |

---

## 프로젝트 구조

```
jeju-travel-planner/
├── app/                          # Next.js App Router (Frontend)
│   ├── page.tsx                  # 메인 페이지 (여행 정보 입력)
│   ├── result/page.tsx           # 결과 페이지 (일정 표시)
│   ├── storage/page.tsx          # 보관함 페이지 (저장된 일정)
│   ├── shared/[tripId]/page.tsx  # 공유 페이지
│   ├── auth/callback/route.ts    # OAuth 콜백 처리
│   └── api/                      # API Proxy (→ Python Backend)
│       ├── generate/route.ts
│       ├── chat/route.ts
│       ├── checklist/route.ts
│       └── weather/route.ts
│
├── components/                   # React 컴포넌트
│   ├── TripForm.tsx              # 여행 정보 입력 폼
│   ├── DraggableSchedule.tsx     # 드래그 가능 일정
│   ├── KakaoMap.tsx              # 카카오 지도
│   ├── ChatBot.tsx               # 대화형 검색
│   ├── CostBreakdown.tsx         # 비용 차트
│   ├── ShareButtons.tsx          # 공유/PDF 버튼
│   ├── AuthModal.tsx             # 로그인/회원가입 모달
│   └── ...
│
├── contexts/                     # React Context
│   └── AuthContext.tsx           # 인증 상태 관리
│
├── lib/                          # Frontend 유틸리티
│   ├── types.ts                  # TypeScript 타입 정의
│   ├── supabase.ts               # Supabase 클라이언트
│   ├── firebase.ts               # Firebase 연동
│   ├── routeOptimizer.ts         # 클라이언트 측 시간 재계산
│   └── season.ts                 # 계절 정보
│
├── backend/                      # Python Backend (FastAPI)
│   ├── main.py                   # FastAPI 엔트리포인트
│   ├── requirements.txt          # Python 의존성
│   ├── api/                      # API 엔드포인트
│   │   ├── generate.py           # /api/generate
│   │   ├── chat.py               # /api/chat
│   │   ├── checklist.py          # /api/checklist
│   │   └── weather.py            # /api/weather
│   ├── services/                 # 비즈니스 로직
│   │   ├── rag_search.py         # RAG 검색 (LangChain)
│   │   ├── route_optimizer.py    # 동선 최적화 (TSP + 2-opt)
│   │   ├── claude_client.py      # Claude API
│   │   ├── pinecone_client.py    # Pinecone 클라이언트
│   │   ├── jeju_regions.py       # 제주 지역 분류
│   │   └── prompt_engine.py      # AI 프롬프트 생성
│   └── models/
│       └── schemas.py            # Pydantic 모델
│
└── data/
    └── places.json               # 제주 장소 데이터 (1,974개)
```

---

## 설치 및 실행

### 1. 환경 변수 설정

```bash
# .env.local (프로젝트 루트)

# AI APIs
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key

# Supabase (인증)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase (데이터 저장)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url

# Kakao Maps
NEXT_PUBLIC_KAKAO_MAP_API_KEY=your_kakao_map_api_key

# Backend URL
PYTHON_BACKEND_URL=http://localhost:8000
```

### 2. Python Backend 실행

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

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
| API 문서 (Swagger) | http://localhost:8000/docs |

---

## 외부 서비스 설정

### Supabase 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. **Authentication > Providers > Email** 활성화
3. **Authentication > Providers > Google** 활성화 (OAuth 설정)
4. **Authentication > Providers > Kakao** 활성화 (OAuth 설정)
5. (선택) **Confirm email** 비활성화 - 이메일 확인 없이 바로 로그인

### Firebase 설정

1. [Firebase Console](https://console.firebase.google.com) 프로젝트 생성
2. **Realtime Database** 생성
3. **Rules** 설정:

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

---

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/generate` | AI 여행 일정 생성 |
| POST | `/api/chat` | 대화형 장소 검색 |
| POST | `/api/checklist` | 체크리스트 생성 |
| GET | `/api/weather` | 날씨 정보 조회 |
| GET | `/health` | 헬스체크 |

---

## 알고리즘 설명

### 1. RAG 검색 (Hybrid Search)

```
사용자 쿼리
    │
    ├── Query Expansion (GPT-4o-mini)
    │   └── "조용한 카페" → ["조용한 카페", "한적한 카페", ...]
    │
    ├── Vector Search (Pinecone)
    │   └── 멀티벡터에서 유사도 검색
    │
    ├── Keyword Search (Local)
    │   └── 이름, 카테고리, 태그 매칭
    │
    └── Hybrid Score = Vector × 0.7 + Keyword × 0.3
```

### 2. 동선 최적화 (TSP + 2-opt)

```
일정 내 장소들
    │
    ├── 1. 지역 클러스터링
    │   └── 제주시, 서귀포, 동부, 서부, 중산간
    │
    ├── 2. 최적 지역 순서 결정
    │   └── 역주행 방지
    │
    ├── 3. Nearest Neighbor
    │   └── 가장 가까운 장소부터 순회
    │
    └── 4. 2-opt 개선
        └── 교차 경로 해소
```

---

## 데이터 구조

### 장소 데이터 (places.json)

```json
{
  "id": "spot-1",
  "name": "함덕해수욕장",
  "category": "관광지",
  "subcategory": "자연",
  "description": "에메랄드빛 바다와 하얀 모래사장",
  "latitude": 33.543,
  "longitude": 126.669,
  "avg_cost": 3000,
  "avg_time": 90,
  "style_tags": ["자연", "가족"],
  "rating": 4.2
}
```

### 카테고리 분류

| 카테고리 | 개수 | 설명 |
|---------|------|------|
| 관광지 | ~500 | 자연, 문화, 체험 |
| 맛집 | ~800 | 흑돼지, 해산물, 로컬 맛집 |
| 카페 | ~500 | 오션뷰, 분위기 카페 |
| 숙소 | ~170 | 호텔, 펜션, 게스트하우스 |

---

## 향후 개발 계획

### 완료된 기능

- [x] AI 기반 일정 생성
- [x] RAG 검색 및 동선 최적화
- [x] 드래그 앤 드롭 일정 편집
- [x] 사용자 인증 (이메일, Google, 카카오)
- [x] 일정 저장 및 보관함
- [x] 공유 링크 및 PDF 내보내기

### 개발 예정

| 우선순위 | 기능 |
|---------|------|
| 높음 | 스트리밍 응답 (일정 생성 중 실시간 표시) |
| 높음 | 이미지 최적화 (장소 이미지 자동 수집) |
| 중간 | 리뷰 연동 (네이버/카카오 리뷰) |
| 중간 | 다국어 지원 (i18n) |
| 낮음 | PWA 지원 (오프라인 캐싱) |

---

## 라이선스

MIT License

---

## 기여

이슈나 PR은 언제든 환영합니다!

```bash
# Fork → Clone → Branch → Commit → Push → PR
git checkout -b feature/AmazingFeature
git commit -m 'Add AmazingFeature'
git push origin feature/AmazingFeature
```
