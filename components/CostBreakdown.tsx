"use client";

import { CostBreakdown as CostBreakdownType } from "@/lib/types";

interface CostBreakdownProps {
  costBreakdown: CostBreakdownType;
  totalCost: number;
}

const COST_ITEMS = [
  { key: "accommodation", label: "숙소", emoji: "🏨", color: "#8B7355" },
  { key: "food", label: "식비", emoji: "🍜", color: "#6B7B6E" },
  { key: "activity", label: "관광", emoji: "🏔️", color: "#5B6B8A" },
  { key: "cafe", label: "카페", emoji: "☕", color: "#A08B6E" },
  { key: "transport", label: "교통", emoji: "🚗", color: "#8A7B6B" },
  { key: "etc", label: "기타", emoji: "📦", color: "#B0A898" },
];

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function CostBreakdown({
  costBreakdown,
  totalCost,
}: CostBreakdownProps) {
  const segments = COST_ITEMS.map((item) => ({
    ...item,
    value: costBreakdown[item.key as keyof CostBreakdownType],
  })).filter((s) => s.value > 0);

  let cumulativeOffset = 0;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DE] p-6">
      <h3 className="text-sm font-medium text-[#2C2C2C] mb-6 tracking-wide">
        비용 breakdown
      </h3>

      {/* SVG 도넛 차트 */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {segments.map((seg) => {
              const pct = totalCost > 0 ? seg.value / totalCost : 0;
              const dashLen = pct * CIRCUMFERENCE;
              const offset = -cumulativeOffset;
              cumulativeOffset += dashLen;

              return (
                <circle
                  key={seg.key}
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="20"
                  strokeDasharray={`${dashLen} ${CIRCUMFERENCE - dashLen}`}
                  strokeDashoffset={offset}
                  transform="rotate(-90 80 80)"
                  className="transition-all duration-700"
                />
              );
            })}
            {segments.length === 0 && (
              <circle
                cx="80"
                cy="80"
                r={RADIUS}
                fill="none"
                stroke="#E8E4DE"
                strokeWidth="20"
              />
            )}
          </svg>
          {/* 중앙 텍스트 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-[#8C8C8C]">총 비용</span>
            <span className="text-lg font-bold text-[#2C2C2C]">
              {totalCost >= 10000
                ? `${Math.round(totalCost / 10000)}만`
                : `${totalCost.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>

      {/* 범례 */}
      <div className="space-y-2">
        {COST_ITEMS.map((item) => {
          const cost = costBreakdown[item.key as keyof CostBreakdownType];
          const pct = totalCost > 0 ? ((cost / totalCost) * 100).toFixed(1) : "0.0";

          return (
            <div
              key={item.key}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>
                  {item.emoji} {item.label}
                </span>
              </div>
              <div className="text-right">
                <span className="font-medium text-[#2C2C2C]">
                  {cost.toLocaleString()}원
                </span>
                <span className="text-[#8C8C8C] ml-1">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 총 비용 */}
      <div className="mt-6 pt-4 border-t border-[#E8E4DE]">
        <div className="flex justify-between items-center">
          <span className="font-medium text-[#2C2C2C]">총 예상 비용</span>
          <span className="text-xl font-bold text-[#2C2C2C]">
            {totalCost.toLocaleString()}원
          </span>
        </div>
      </div>
    </div>
  );
}
