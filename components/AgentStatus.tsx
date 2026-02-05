"use client";

interface AgentStatusProps {
  active: boolean;
  onToggle?: () => void;
}

export default function AgentStatus({ active, onToggle }: AgentStatusProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        active
          ? "bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white shadow-lg"
          : "bg-[#F5F0E8] text-[#6C6C6C] border border-[#E8E4DE]"
      }`}
    >
      {/* 로봇 아이콘 */}
      <div className="text-2xl">
        {active ? (
          <span className="animate-pulse">🤖</span>
        ) : (
          <span className="opacity-50">🤖</span>
        )}
      </div>

      {/* 상태 텍스트 */}
      <div className="flex-1">
        <div className="font-medium text-sm">AI Agent</div>
        <div className={`text-xs ${active ? "text-white/80" : "text-[#8C8C8C]"}`}>
          {active ? (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              모니터링 중...
            </span>
          ) : (
            "비활성"
          )}
        </div>
      </div>

      {/* 모니터링 항목 */}
      {active && (
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-white/20 rounded-full flex items-center gap-1">
            <span>☀️</span> 날씨
          </span>
          <span className="px-2 py-1 bg-white/20 rounded-full flex items-center gap-1">
            <span>⏱️</span> 웨이팅
          </span>
          <span className="px-2 py-1 bg-white/20 rounded-full flex items-center gap-1">
            <span>💰</span> 예산
          </span>
        </div>
      )}

      {/* 토글 버튼 */}
      {onToggle && (
        <button
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            active
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-[#2C2C2C] hover:bg-[#3C3C3C] text-white"
          }`}
        >
          {active ? "중지" : "시작"}
        </button>
      )}
    </div>
  );
}
