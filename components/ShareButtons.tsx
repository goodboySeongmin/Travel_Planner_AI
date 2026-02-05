"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Kakao: any;
  }
}

interface ShareButtonsProps {
  title: string;
  totalCost: number;
  summary: string;
}

export default function ShareButtons({ title, totalCost, summary }: ShareButtonsProps) {
  const kakaoInitialized = useRef(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    if (kakaoInitialized.current) return;

    const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!kakaoAppKey) return;

    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(kakaoAppKey);
      kakaoInitialized.current = true;
      return;
    }

    if (window.Kakao) {
      kakaoInitialized.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized() && kakaoAppKey) {
        window.Kakao.init(kakaoAppKey);
        kakaoInitialized.current = true;
      }
    };
    document.head.appendChild(script);
  }, []);

  const handleKakaoShare = () => {
    if (!window.Kakao?.Share) {
      alert("카카오 SDK를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: title,
        description: `총 비용: ${totalCost.toLocaleString()}원\n${summary}`,
        imageUrl: "https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_medium.png",
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
      buttons: [
        {
          title: "일정 보기",
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
      ],
    });
  };

  const handlePdfSave = async () => {
    const target = document.getElementById("pdf-export-area");
    if (!target) {
      alert("PDF 영역을 찾을 수 없습니다.");
      return;
    }

    setIsPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      // PDF 헤더 표시
      const pdfHeader = target.querySelector(".pdf-header");
      if (pdfHeader) {
        (pdfHeader as HTMLElement).classList.remove("hidden");
        (pdfHeader as HTMLElement).style.display = "block";
      }

      // 버튼들 숨기기
      const buttons = target.querySelectorAll("button");
      const originalDisplays: string[] = [];
      buttons.forEach((btn, i) => {
        originalDisplays[i] = (btn as HTMLElement).style.display;
        (btn as HTMLElement).style.display = "none";
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // html2canvas로 캡처
      const canvas = await html2canvas(target, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: "#FAF9F7",
      });

      // UI 복구
      if (pdfHeader) {
        (pdfHeader as HTMLElement).classList.add("hidden");
        (pdfHeader as HTMLElement).style.display = "";
      }
      buttons.forEach((btn, i) => {
        (btn as HTMLElement).style.display = originalDisplays[i] || "";
      });

      console.log("Canvas:", canvas.width, "x", canvas.height);

      // PDF 생성 - 가장 간단한 방식
      const imgData = canvas.toDataURL("image/jpeg", 0.9);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${title}.pdf`);

      console.log("PDF 저장 완료");

    } catch (err) {
      console.error("PDF 생성 실패:", err);
      alert("PDF 저장에 실패했습니다: " + (err as Error).message);
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleKakaoShare}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#FEE500] text-[#3C1E1E] rounded-lg text-sm font-medium hover:brightness-95 transition-all"
      >
        카카오톡
      </button>
      <button
        onClick={handlePdfSave}
        disabled={isPdfLoading}
        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#E8E4DE] text-[#4C4C4C] rounded-lg text-sm font-medium hover:border-[#2C2C2C] transition-all disabled:opacity-50"
      >
        {isPdfLoading ? "저장 중..." : "PDF 저장"}
      </button>
    </div>
  );
}
