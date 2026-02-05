"""
RAG 검색 모듈
- 쿼리 확장 (Query Expansion)
- 하이브리드 검색 (Vector + Keyword)
- 메타데이터 필터링
"""

import os
import json
from typing import Optional
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

from .pinecone_client import get_jeju_places_index
from models.schemas import Place, SearchFilter, RAGSearchResult

# .env 파일 경로 명시적 지정
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
EMBEDDING_MODEL = "text-embedding-3-small"

# 장소 데이터 로드
_places_cache: list[Place] | None = None


def load_places() -> list[Place]:
    """places.json 로드 (캐싱)"""
    global _places_cache

    if _places_cache is None:
        # backend 폴더 기준으로 상위의 data 폴더 참조
        data_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "data",
            "places.json",
        )
        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            _places_cache = [Place(**p) for p in data]

    return _places_cache


async def expand_query(query: str) -> list[str]:
    """쿼리 확장: 사용자 쿼리를 LLM으로 확장"""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """당신은 제주도 여행 검색 쿼리 확장 전문가입니다.
사용자의 검색어를 받아서 의미적으로 유사한 다양한 표현으로 확장합니다.

규칙:
1. 원본 쿼리의 의도를 유지하면서 다양한 표현 생성
2. 제주도 여행 관련 키워드 포함
3. 동의어, 유사어, 관련어 포함
4. JSON 배열로만 응답 (최대 5개)

예시:
입력: "조용한 카페"
출력: ["조용한 카페", "한적한 카페", "여유로운 카페", "붐비지 않는 카페", "힐링 카페"]""",
                },
                {"role": "user", "content": f'검색어: "{query}"'},
            ],
            temperature=0.7,
            max_tokens=200,
        )

        content = response.choices[0].message.content or "[]"

        # JSON 추출
        import re

        json_match = re.search(r"\[[\s\S]*\]", content)
        if json_match:
            expanded = json.loads(json_match.group())
            return [query] + [q for q in expanded if q != query]

        return [query]

    except Exception as e:
        print(f"쿼리 확장 실패: {e}")
        return [query]


def build_pinecone_filter(filter: SearchFilter) -> dict | None:
    """Pinecone 필터 객체 생성"""
    conditions = []

    if filter.category:
        conditions.append({"category": {"$eq": filter.category}})
    if filter.categories:
        conditions.append({"category": {"$in": filter.categories}})
    if filter.region:
        conditions.append({"region": {"$eq": filter.region}})
    if filter.regions:
        conditions.append({"region": {"$in": filter.regions}})
    if filter.maxCost:
        conditions.append({"cost": {"$lte": filter.maxCost}})
    if filter.minRating:
        conditions.append({"rating": {"$gte": filter.minRating}})

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def calculate_keyword_score(place: Place, queries: list[str]) -> float:
    """키워드 매칭 점수 계산"""
    score = 0
    name_lower = place.name.lower()
    category_lower = place.category.lower()
    subcategory_lower = (place.subcategory or "").lower()
    desc_lower = (place.description or "").lower()
    tags = [t.lower() for t in (place.style_tags or [])]

    for query in queries:
        keywords = query.lower().split()

        for keyword in keywords:
            if len(keyword) < 2:
                continue

            if keyword in name_lower:
                score += 10
            if keyword in category_lower:
                score += 5
            if keyword in subcategory_lower:
                score += 4
            if any(keyword in t for t in tags):
                score += 3
            if keyword in desc_lower:
                score += 2

    return min(score / 30, 1)


def extract_filter_from_query(query: str) -> SearchFilter:
    """쿼리에서 필터 추출"""
    filter = SearchFilter()
    query_lower = query.lower()

    # 카테고리 추출
    if "카페" in query_lower or "커피" in query_lower:
        filter.category = "카페"
    elif "맛집" in query_lower or "식당" in query_lower or "음식" in query_lower:
        filter.category = "맛집"
    elif "관광" in query_lower or "명소" in query_lower or "볼거리" in query_lower:
        filter.category = "관광지"
    elif "숙소" in query_lower or "호텔" in query_lower or "펜션" in query_lower:
        filter.category = "숙소"

    # 지역 추출
    if "동쪽" in query_lower or "동부" in query_lower or "성산" in query_lower:
        filter.region = "동부"
    elif "서쪽" in query_lower or "서부" in query_lower or "애월" in query_lower:
        filter.region = "서부"
    elif "서귀포" in query_lower:
        filter.region = "서귀포"
    elif "제주시" in query_lower:
        filter.region = "제주시"

    # 예산 추출
    import re

    cost_match = re.search(r"(\d+)\s*만\s*원?\s*(이하|미만|까지)", query)
    if cost_match:
        filter.maxCost = int(cost_match.group(1)) * 10000

    return filter


async def rag_search(
    query: str,
    top_k: int = 5,
    filter: Optional[SearchFilter] = None,
    enable_query_expansion: bool = True,
    vector_weight: float = 0.7,
    keyword_weight: float = 0.3,
) -> list[RAGSearchResult]:
    """RAG 검색 메인 함수"""

    # 1. 쿼리에서 필터 자동 추출
    extracted_filter = extract_filter_from_query(query)
    if filter:
        # 명시적 필터가 있으면 병합
        merged_filter = SearchFilter(
            category=filter.category or extracted_filter.category,
            categories=filter.categories or extracted_filter.categories,
            region=filter.region or extracted_filter.region,
            regions=filter.regions or extracted_filter.regions,
            maxCost=filter.maxCost or extracted_filter.maxCost,
            minRating=filter.minRating or extracted_filter.minRating,
            styles=filter.styles or extracted_filter.styles,
        )
    else:
        merged_filter = extracted_filter

    # 2. 쿼리 확장
    expanded_queries = [query]
    if enable_query_expansion:
        expanded_queries = await expand_query(query)
        print(f"확장된 쿼리: {expanded_queries}")

    # 3. 임베딩 생성
    combined_query = " ".join(expanded_queries)
    embedding_response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL, input=combined_query
    )
    query_vector = embedding_response.data[0].embedding

    # 4. Pinecone 검색
    index = get_jeju_places_index()
    pinecone_filter = build_pinecone_filter(merged_filter)

    search_result = index.query(
        vector=query_vector,
        top_k=top_k * 4,  # 멀티벡터이므로 더 많이 검색
        include_metadata=True,
        filter=pinecone_filter,
    )

    # 5. 장소별로 집계 (같은 장소의 여러 벡터 → 최고 점수 사용)
    place_scores: dict[str, dict] = {}

    for match in search_result.matches or []:
        place_id = match.metadata.get("placeId", "")
        vector_score = match.score or 0
        vector_type = match.metadata.get("vectorType", "")

        existing = place_scores.get(place_id)
        if not existing or vector_score > existing["vectorScore"]:
            place_scores[place_id] = {
                "vectorScore": vector_score,
                "vectorType": vector_type,
                "metadata": match.metadata,
            }

    # 6. 하이브리드 점수 계산
    places = load_places()
    place_map = {p.id: p for p in places}
    results: list[RAGSearchResult] = []

    for place_id, data in place_scores.items():
        place = place_map.get(place_id)
        if not place:
            continue

        keyword_score = calculate_keyword_score(place, expanded_queries)
        hybrid_score = data["vectorScore"] * vector_weight + keyword_score * keyword_weight

        results.append(
            RAGSearchResult(
                place=place,
                score=hybrid_score,
                vectorScore=data["vectorScore"],
                keywordScore=keyword_score,
                matchedVectorType=data["vectorType"],
            )
        )

    # 7. 정렬 및 상위 N개 반환
    results.sort(key=lambda x: x.score, reverse=True)
    return results[:top_k]


async def simple_rag_search(query: str, top_k: int = 5) -> list[Place]:
    """간단한 RAG 검색 (옵션 없이)"""
    results = await rag_search(query, top_k=top_k)
    return [r.place for r in results]


async def search_by_category(
    query: str,
    category: str,
    top_k: int = 5,
) -> list[RAGSearchResult]:
    """카테고리별 RAG 검색"""
    return await rag_search(
        query, top_k=top_k, filter=SearchFilter(category=category)
    )
