import { NextRequest, NextResponse } from "next/server";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    // FormData 또는 JSON 처리
    const contentType = request.headers.get("content-type") || "";
    let body: { message: string; schedule?: unknown[]; hasRentcar?: boolean };

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const message = formData.get("message") as string;
      const scheduleStr = formData.get("schedule") as string;
      const hasRentcar = formData.get("hasRentcar") === "true";

      body = {
        message: message || "",
        schedule: JSON.parse(scheduleStr || "[]"),
        hasRentcar,
      };
    } else {
      body = await request.json();
    }

    const response = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Python backend error:", errorText);
      return NextResponse.json(
        { message: "응답 생성에 실패했습니다.", places: [] },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Chat API 오류:", error);
    return NextResponse.json(
      { message: "서버 오류가 발생했습니다.", places: [] },
      { status: 500 }
    );
  }
}
