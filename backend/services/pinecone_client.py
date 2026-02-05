"""
Pinecone Vector Database 클라이언트
"""

import os
from pathlib import Path
from pinecone import Pinecone
from dotenv import load_dotenv

# .env 파일 경로 명시적 지정
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

INDEX_NAME = "jeju-places"

_pinecone_client: Pinecone | None = None


def get_pinecone_client() -> Pinecone:
    """Pinecone 클라이언트 싱글톤"""
    global _pinecone_client

    if _pinecone_client is None:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY 환경변수가 설정되지 않았습니다.")
        _pinecone_client = Pinecone(api_key=api_key)

    return _pinecone_client


def get_jeju_places_index():
    """제주 장소 인덱스 반환"""
    client = get_pinecone_client()
    return client.Index(INDEX_NAME)
