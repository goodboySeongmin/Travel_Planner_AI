"use client";

import { useState } from "react";
import { AgentAlert, AgentAlternative } from "@/lib/types";

interface AgentAlertModalProps {
  alert: AgentAlert;
  onApply: (alternative: AgentAlternative) => void;
  onDismiss: () => void;
}

export default function AgentAlertModal({
  alert,
  onApply,
  onDismiss,
}: AgentAlertModalProps) {
  const [selectedOption, setSelectedOption] = useState(0);

  const getAlertIcon = () => {
    switch (alert.type) {
      case "weather":
        return "☔";
      case "waiting":
        return "⏰";
      case "budget":
        return "💰";
      default:
        return "🔔";
    }
  };

  const getSeverityStyle = () => {
    switch (alert.severity) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getSeverityText = () => {
    switch (alert.severity) {
      case "high":
        return "긴급";
      case "medium":
        return "주의";
      case "low":
        return "알림";
      default:
        return "알림";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-2xl max-w-lg w-[90%] max-h-[80vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-[#E8E4DE] bg-[#FAF9F7]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getAlertIcon()}</span>
              <h2 className="text-lg font-semibold text-[#2C2C2C]">
                {alert.title}
              </h2>
            </div>
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full border ${getSeverityStyle()}`}
            >
              {getSeverityText()}
            </span>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          {/* 메시지 */}
          <p className="text-[#4C4C4C] mb-4">{alert.message}</p>

          {/* 대안 목록 */}
          {alert.alternatives && alert.alternatives.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#6C6C6C] flex items-center gap-2">
                <span>🤖</span> AI 제안
              </h3>

              {alert.alternatives.map((option, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedOption(index)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedOption === index
                      ? "border-[#6366F1] bg-[#F5F3FF]"
                      : "border-[#E8E4DE] bg-white hover:border-[#D8D4CE]"
                  }`}
                >
                  {/* 옵션 헤더 */}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedOption === index
                          ? "border-[#6366F1] bg-[#6366F1]"
                          : "border-[#D8D4CE]"
                      }`}
                    >
                      {selectedOption === index && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-[#2C2C2C]">
                      {option.title}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs bg-amber-400 text-white rounded-full font-medium">
                        추천
                      </span>
                    )}
                  </div>

                  {/* 설명 */}
                  <p className="text-sm text-[#6C6C6C] ml-8 mb-2">
                    {option.description}
                  </p>

                  {/* 변경 사항 */}
                  {option.changes && option.changes.length > 0 && (
                    <div className="ml-8 p-3 bg-[#FAF9F7] rounded-lg mt-2">
                      {option.changes.map((change, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm mb-1 last:mb-0"
                        >
                          <span className="text-red-500 line-through">
                            {change.from}
                          </span>
                          <span className="text-[#8C8C8C]">→</span>
                          <span className="text-green-600 font-medium">
                            {change.to}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 예산 영향 */}
                  {option.budgetImpact && (
                    <div className="ml-8 text-sm text-[#6C6C6C] mt-2">
                      💰 예산 영향: {option.budgetImpact}
                    </div>
                  )}

                  {/* 장단점 */}
                  {(option.pros || option.cons) && (
                    <div className="ml-8 mt-2 grid grid-cols-2 gap-2 text-xs">
                      {option.pros && (
                        <div>
                          <span className="text-green-600 font-medium">장점</span>
                          <ul className="mt-1 space-y-0.5">
                            {option.pros.map((pro, i) => (
                              <li key={i} className="text-[#6C6C6C]">
                                ✓ {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {option.cons && (
                        <div>
                          <span className="text-red-500 font-medium">단점</span>
                          <ul className="mt-1 space-y-0.5">
                            {option.cons.map((con, i) => (
                              <li key={i} className="text-[#6C6C6C]">
                                ✗ {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-[#E8E4DE] bg-[#FAF9F7] flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-3 px-4 rounded-xl border-2 border-[#E8E4DE] text-[#6C6C6C] font-medium hover:bg-[#F5F0E8] transition-all"
          >
            나중에
          </button>
          <button
            onClick={() =>
              alert.alternatives && onApply(alert.alternatives[selectedOption])
            }
            className="flex-1 py-3 px-4 rounded-xl bg-[#6366F1] text-white font-medium hover:bg-[#5558E3] transition-all"
          >
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}
