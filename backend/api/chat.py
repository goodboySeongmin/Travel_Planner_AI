"""
챗봇 API 엔드포인트
POST /api/chat
"""

from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse, Place
from services.openai_client import generate_with_openai
from services.prompt_engine import build_chat_prompt
from services.rag_search import rag_search

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    """대화형 장소 검색 및 추천"""
    try:
        message = request.message
        schedule = request.schedule

        # RAG 검색으로 관련 장소 찾기
        search_results = await rag_search(
            query=message,
            top_k=5,
            enable_query_expansion=True,
        )

        places = [r.place for r in search_results]

        # 프롬프트 생성
        system_prompt, user_prompt = build_chat_prompt(
            message=message,
            schedule=[s.model_dump() if hasattr(s, 'model_dump') else s for s in schedule] if schedule else None,
            search_results=places,
        )

        # OpenAI API 호출
        reply = await generate_with_openai(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=1024,
            temperature=0.7,
        )

        # 검색 방법 표시
        if search_results:
            search_method = "🔍 AI 검색"
        else:
            search_method = "💬 일반 응답"

        return ChatResponse(
            reply=f"{search_method}\n\n{reply}",
            places=places if places else None,
        )

    except Exception as e:
        print(f"챗봇 오류: {e}")
        raise HTTPException(status_code=500, detail=f"응답 생성에 실패했습니다: {str(e)}")
