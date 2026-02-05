import { NextRequest, NextResponse } from "next/server";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${PYTHON_BACKEND_URL}/api/checklist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Python backend error:", errorText);

      // 에러 시 기본 체크리스트 반환
      return NextResponse.json(getDefaultChecklist());
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Checklist API 오류:", error);
    return NextResponse.json(getDefaultChecklist());
  }
}

// 기본 체크리스트
function getDefaultChecklist() {
  const generateId = () => Math.random().toString(36).substring(2, 9);

  return {
    beforeTrip: [
      {
        title: "D-7",
        emoji: "📅",
        items: [
          { id: generateId(), text: "숙소 예약 확인", checked: false },
          { id: generateId(), text: "렌트카 예약 확인", checked: false },
          { id: generateId(), text: "항공권 확인", checked: false },
        ],
      },
      {
        title: "D-3",
        emoji: "🎒",
        items: [
          { id: generateId(), text: "제주 날씨 확인", checked: false },
          { id: generateId(), text: "짐 목록 작성", checked: false },
          { id: generateId(), text: "여행자 보험 가입", checked: false },
        ],
      },
      {
        title: "D-1",
        emoji: "✈️",
        items: [
          { id: generateId(), text: "신분증 챙기기", checked: false },
          { id: generateId(), text: "충전기 챙기기", checked: false },
          { id: generateId(), text: "카메라 충전", checked: false },
        ],
      },
    ],
    duringTrip: [
      {
        title: "Day 1",
        emoji: "1️⃣",
        items: [
          { id: generateId(), text: "공항 도착", checked: false },
          { id: generateId(), text: "렌트카 픽업", checked: false },
          { id: generateId(), text: "숙소 체크인", checked: false },
        ],
      },
    ],
    afterTrip: {
      title: "여행 후",
      emoji: "🏠",
      items: [
        { id: generateId(), text: "렌트카 반납", checked: false },
        { id: generateId(), text: "여행 경비 정산", checked: false },
        { id: generateId(), text: "여행 사진 정리", checked: false },
      ],
    },
  };
}
