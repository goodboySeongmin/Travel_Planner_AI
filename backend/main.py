"""
FastAPI 메인 엔트리포인트
제주 여행 플래너 백엔드 API
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# API 라우터 임포트
from api.generate import router as generate_router
from api.chat import router as chat_router
from api.checklist import router as checklist_router
from api.weather import router as weather_router

# FastAPI 앱 생성
app = FastAPI(
    title="제주메이트 API",
    description="AI 기반 제주 여행 일정 생성 서비스",
    version="1.0.0",
)

# CORS 설정 (Next.js 프론트엔드 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(generate_router, prefix="/api", tags=["generate"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(checklist_router, prefix="/api", tags=["checklist"])
app.include_router(weather_router, prefix="/api", tags=["weather"])


@app.get("/")
async def root():
    """헬스체크 엔드포인트"""
    return {
        "status": "ok",
        "message": "제주메이트 API 서버가 실행 중입니다.",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """상세 헬스체크"""
    # Pinecone 연결 테스트
    pinecone_ok = False
    try:
        from services.pinecone_client import get_pinecone_client
        pc = get_pinecone_client()
        pinecone_ok = True
    except Exception:
        pass

    return {
        "status": "healthy",
        "services": {
            "api": True,
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "pinecone": pinecone_ok,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
