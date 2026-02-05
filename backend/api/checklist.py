"""
체크리스트 생성 API 엔드포인트
POST /api/checklist
"""

from fastapi import APIRouter, HTTPException
from models.schemas import ChecklistRequest, TripChecklist
from services.openai_client import generate_json_with_openai
from services.prompt_engine import build_checklist_prompt

router = APIRouter()


@router.post("/checklist")
async def generate_checklist(request: ChecklistRequest) -> TripChecklist:
    """여행 체크리스트 생성"""
    try:
        input_data = request.input
        schedule = request.schedule

        # 스케줄을 dict로 변환
        schedule_dicts = [
            s.model_dump() if hasattr(s, "model_dump") else s for s in schedule
        ]

        # 프롬프트 생성
        system_prompt, user_prompt = build_checklist_prompt(input_data, schedule_dicts)

        # OpenAI API 호출
        result = await generate_json_with_openai(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_tokens=2048,
        )

        return TripChecklist(**result)

    except Exception as e:
        print(f"체크리스트 생성 오류: {e}")
        raise HTTPException(
            status_code=500, detail=f"체크리스트 생성에 실패했습니다: {str(e)}"
        )
