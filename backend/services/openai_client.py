"""
OpenAI API 클라이언트
GPT-4o를 사용한 AI 생성
"""

import os
import json
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

# .env 파일 경로 명시적 지정
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

print(f"[DEBUG] OpenAI client loaded from: {__file__}")
print(f"[DEBUG] .env path: {env_path}")
print(f"[DEBUG] OPENAI_API_KEY exists: {bool(os.getenv('OPENAI_API_KEY'))}")

_client: OpenAI | None = None


def get_openai_client() -> OpenAI:
    """OpenAI 클라이언트 싱글톤"""
    global _client

    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
        _client = OpenAI(api_key=api_key)

    return _client


async def generate_with_openai(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 4096,
    temperature: float = 0.7,
    model: str = "gpt-4o"
) -> str:
    """OpenAI API 호출"""
    client = get_openai_client()

    response = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    )

    return response.choices[0].message.content or ""


async def generate_json_with_openai(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 4096,
    model: str = "gpt-4o"
) -> dict:
    """OpenAI API 호출 후 JSON 파싱"""
    response = await generate_with_openai(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max_tokens,
        temperature=0.7,
        model=model
    )

    # JSON 추출
    try:
        # ```json ... ``` 블록 추출
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            json_str = response.split("```")[1].split("```")[0].strip()
        else:
            json_str = response.strip()

        return json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"JSON 파싱 오류: {e}")
        print(f"원본 응답: {response[:500]}")
        raise ValueError(f"OpenAI 응답을 JSON으로 파싱할 수 없습니다: {e}")
