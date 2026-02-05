"use client";

import { useState } from "react";
import { TripInput } from "@/lib/types";

interface TripFormProps {
  onSubmit: (input: TripInput) => void;
  isLoading: boolean;
}

const STYLE_OPTIONS = [
  { id: "휴양", label: "휴양" },
  { id: "맛집", label: "맛집" },
  { id: "액티비티", label: "액티비티" },
  { id: "자연", label: "자연" },
  { id: "카페", label: "카페" },
  { id: "인생샷", label: "인생샷" },
];

export default function TripForm({ onSubmit, isLoading }: TripFormProps) {
  const [budget, setBudget] = useState<number>(500000);
  const [nights, setNights] = useState<number>(2);
  const [people, setPeople] = useState<"혼자" | "커플" | "친구" | "가족">("커플");
  const [styles, setStyles] = useState<string[]>(["맛집", "자연"]);
  const [hasRentcar, setHasRentcar] = useState<boolean>(true);
  const [customRequest, setCustomRequest] = useState<string>("");

  const handleStyleToggle = (styleId: string) => {
    setStyles((prev) =>
      prev.includes(styleId)
        ? prev.filter((s) => s !== styleId)
        : [...prev, styleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (styles.length === 0) {
      alert("여행 스타일을 최소 1개 선택해주세요!");
      return;
    }

    onSubmit({
      budget,
      nights,
      days: nights + 1,
      people,
      styles,
      hasRentcar,
      customRequest,
    });
  };

  const sliderProgress = ((budget - 200000) / (2000000 - 200000)) * 100;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-12">
        {/* 왼쪽 컬럼 */}
        <div className="space-y-12">
          {/* 예산 */}
          <div className="animate-fade-in-up animate-delay-100">
            <label className="block text-sm font-medium text-[#2C2C2C] mb-4 tracking-wide">
              예산
            </label>
            <div className="text-4xl font-medium text-[#2C2C2C] mb-6">
              {(budget / 10000).toFixed(0)}
              <span className="text-xl ml-1 font-normal">만원</span>
            </div>
            <input
              type="range"
              min={200000}
              max={2000000}
              step={50000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full budget-slider"
              style={{ "--slider-progress": `${sliderProgress}%` } as React.CSSProperties}
            />
            <div className="flex justify-between text-sm text-[#6C6C6C] mt-3">
              <span>20만원</span>
              <span>200만원</span>
            </div>
          </div>

          {/* 기간 */}
          <div className="animate-fade-in-up animate-delay-200">
            <label className="block text-sm font-medium text-[#2C2C2C] mb-4 tracking-wide">
              여행 기간
            </label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNights(n)}
                  className={`px-5 py-3 rounded-lg text-sm font-medium transition-all ${
                    nights === n
                      ? "bg-[#2C2C2C] text-white scale-[1.02] shadow-sm"
                      : "bg-[#F5F0E8] text-[#4C4C4C] hover:bg-[#E8E4DE] active:scale-95"
                  }`}
                >
                  {n}박 {n + 1}일
                </button>
              ))}
            </div>
          </div>

          {/* 인원 */}
          <div className="animate-fade-in-up animate-delay-300">
            <label className="block text-sm font-medium text-[#2C2C2C] mb-4 tracking-wide">
              인원
            </label>
            <div className="flex flex-wrap gap-2">
              {(["혼자", "커플", "친구", "가족"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPeople(option)}
                  className={`px-5 py-3 rounded-lg text-sm font-medium transition-all ${
                    people === option
                      ? "bg-[#2C2C2C] text-white scale-[1.02] shadow-sm"
                      : "bg-[#F5F0E8] text-[#4C4C4C] hover:bg-[#E8E4DE] active:scale-95"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* 렌트카 */}
          <div className="animate-fade-in-up animate-delay-400">
            <label className="block text-sm font-medium text-[#2C2C2C] mb-4 tracking-wide">
              렌트카
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHasRentcar(true)}
                className={`px-5 py-3 rounded-lg text-sm font-medium transition-all ${
                  hasRentcar
                    ? "bg-[#2C2C2C] text-white scale-[1.02] shadow-sm"
                    : "bg-[#F5F0E8] text-[#4C4C4C] hover:bg-[#E8E4DE] active:scale-95"
                }`}
              >
                있음
              </button>
              <button
                type="button"
                onClick={() => setHasRentcar(false)}
                className={`px-5 py-3 rounded-lg text-sm font-medium transition-all ${
                  !hasRentcar
                    ? "bg-[#2C2C2C] text-white scale-[1.02] shadow-sm"
                    : "bg-[#F5F0E8] text-[#4C4C4C] hover:bg-[#E8E4DE] active:scale-95"
                }`}
              >
                없음
              </button>
            </div>
          </div>
        </div>

        {/* 오른쪽 컬럼 */}
        <div className="space-y-12">
          {/* 여행 스타일 */}
          <div className="animate-fade-in-up animate-delay-200">
            <label className="block text-sm font-medium text-[#2C2C2C] mb-4 tracking-wide">
              여행 스타일
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleStyleToggle(style.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    styles.includes(style.id)
                      ? "bg-[#2C2C2C] text-white border-[#2C2C2C] scale-[1.02] shadow-sm"
                      : "bg-white text-[#4C4C4C] border-[#D8D4CE] hover:border-[#2C2C2C] active:scale-95"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* 자유 입력 */}
          <div className="animate-fade-in-up animate-delay-300">
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2 tracking-wide">
              원하는 여행 스타일을 자유롭게 적어주세요
            </label>
            <p className="text-sm text-[#8C8C8C] mb-4">
              AI가 참고해서 더 맞춤화된 일정을 만들어 드려요
            </p>
            <textarea
              value={customRequest}
              onChange={(e) => setCustomRequest(e.target.value)}
              placeholder="예: 사람 많은 곳은 피하고 싶어요. 현지인들이 가는 숨은 맛집 위주로 짜주세요. 일출을 꼭 보고 싶어요..."
              className="w-full h-40 p-4 bg-[#F5F0E8] border-0 rounded-xl text-[#2C2C2C] placeholder-[#A0A0A0] resize-none focus:outline-none focus:ring-2 focus:ring-[#2C2C2C]"
            />
          </div>
        </div>
      </div>

      {/* 제출 버튼 */}
      <div className="mt-12 pt-8 border-t border-[#E8E4DE]">
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-5 rounded-2xl text-lg font-medium transition-all ${
            isLoading
              ? "bg-[#D8D4CE] text-[#8C8C8C] cursor-not-allowed"
              : "bg-[#2C2C2C] text-white hover:bg-[#1a1a1a] hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI가 일정을 만들고 있어요...
            </span>
          ) : (
            "일정 만들기 →"
          )}
        </button>
      </div>
    </form>
  );
}
