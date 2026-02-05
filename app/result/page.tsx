"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TripInput, TripPlan, Place, SchedulePlace, CostBreakdown as CostBreakdownType, AgentAlert, AgentAlternative } from "@/lib/types";
import { recalculateTimes } from "@/lib/routeOptimizer";
import { getSeasonContext } from "@/lib/season";
import ScheduleCard from "@/components/ScheduleCard";
import DraggableSchedule from "@/components/DraggableSchedule";
import CostBreakdown from "@/components/CostBreakdown";
import KakaoMap from "@/components/KakaoMap";
import ShareButtons from "@/components/ShareButtons";
import PlaceReplacementModal from "@/components/PlaceReplacementModal";
import ChatBot from "@/components/ChatBot";
import Checklist from "@/components/Checklist";
import AgentStatus from "@/components/AgentStatus";
import AgentAlertModal from "@/components/AgentAlertModal";
import MonitoringAgent from "@/lib/agents/MonitoringAgent";
import { saveTrip, generateShareLink } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import placesData from "@/data/places.json";
import { TripChecklist } from "@/lib/types";

const LOADING_STEPS = [
  { emoji: "📍", label: "장소 선택 중" },
  { emoji: "🗺️", label: "동선 최적화 중" },
  { emoji: "✨", label: "일정 완성 중" },
];

const TRAVEL_TIPS = [
  "제주 흑돼지는 근고기와 오겹살이 가장 인기 있어요!",
  "한라산 입산 시간이 정해져 있으니 미리 확인하세요.",
  "제주 버스는 배차 간격이 길 수 있어요. 시간 여유를 두세요.",
  "성산일출봉은 일출 시간에 맞춰가면 더 감동적이에요.",
  "제주 감귤은 10~2월이 가장 맛있어요!",
  "렌트카 없이도 제주 동쪽은 버스로 충분해요.",
  "카페 투어는 애월~한림 해안도로가 최고예요.",
];

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [tipFade, setTipFade] = useState(true);

  // 교체 모달 상태
  const [replaceModal, setReplaceModal] = useState<{
    isOpen: boolean;
    dayIndex: number;
    placeIndex: number;
    category: string;
  }>({ isOpen: false, dayIndex: -1, placeIndex: -1, category: "" });

  // 챗봇 상태
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 체크리스트 상태
  const [checklist, setChecklist] = useState<TripChecklist | null>(null);
  const [isChecklistLoading, setIsChecklistLoading] = useState(false);

  // Agent 상태
  const [agentActive, setAgentActive] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AgentAlert | null>(null);
  const agentRef = useRef<MonitoringAgent | null>(null);

  // 공유 상태
  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const hasRentcar = searchParams.get("hasRentcar") === "true";
  const budget = Number(searchParams.get("budget")) || 500000;
  const nights = searchParams.get("nights") || "2";
  const days = searchParams.get("days") || "3";
  const season = getSeasonContext();

  const getInput = useCallback((): TripInput => ({
    budget: Number(searchParams.get("budget")) || 500000,
    nights: Number(searchParams.get("nights")) || 2,
    days: Number(searchParams.get("days")) || 3,
    people: (searchParams.get("people") as TripInput["people"]) || "커플",
    styles: searchParams.get("styles")?.split(",") || ["맛집", "자연"],
    hasRentcar,
    customRequest: searchParams.get("customRequest") || "",
  }), [searchParams, hasRentcar]);

  // 체크리스트 생성
  const generateChecklist = useCallback(async (schedule: TripPlan["schedule"]) => {
    setIsChecklistLoading(true);
    try {
      const input = getInput();
      const response = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, schedule }),
      });

      if (response.ok) {
        const data = await response.json();
        setChecklist(data);
      }
    } catch (err) {
      console.error("체크리스트 생성 실패:", err);
    } finally {
      setIsChecklistLoading(false);
    }
  }, [getInput]);

  const generatePlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStep(0);
    setTripPlan(null);
    setChecklist(null);

    try {
      const input = getInput();
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, places: placesData as Place[] }),
      });

      if (!response.ok) throw new Error("일정 생성에 실패했습니다.");

      const data = await response.json();
      setTripPlan(data);

      // 일정 생성 후 체크리스트도 생성
      generateChecklist(data.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [getInput, generateChecklist]);

  // Monitoring Agent 시작/관리
  useEffect(() => {
    if (!tripPlan) return;

    // Agent 생성
    const agent = new MonitoringAgent({
      schedule: tripPlan.schedule,
      budget: budget,
      totalCost: tripPlan.totalCost,
    });

    agentRef.current = agent;

    // 알림 이벤트 리스너
    const handleAlert = (event: CustomEvent<AgentAlert>) => {
      setCurrentAlert(event.detail);
    };

    window.addEventListener("agent-alert", handleAlert as EventListener);

    // Agent 자동 시작
    agent.start();
    setAgentActive(true);

    return () => {
      agent.stop();
      setAgentActive(false);
      window.removeEventListener("agent-alert", handleAlert as EventListener);
    };
  }, [tripPlan, budget]);

  // tripPlan 변경 시 Agent 데이터 업데이트
  useEffect(() => {
    if (agentRef.current && tripPlan) {
      agentRef.current.updateTripData({
        schedule: tripPlan.schedule,
        budget: budget,
        totalCost: tripPlan.totalCost,
      });
    }
  }, [tripPlan, budget]);

  // Agent 토글
  const handleToggleAgent = useCallback(() => {
    if (!agentRef.current) return;

    if (agentActive) {
      agentRef.current.stop();
      setAgentActive(false);
    } else {
      agentRef.current.start();
      setAgentActive(true);
    }
  }, [agentActive]);

  // Agent 알림 적용
  const handleApplyAlternative = useCallback((alternative: AgentAlternative) => {
    // 현재는 알림만 표시 (실제 적용은 Phase 4에서 구현)
    console.log("대안 적용:", alternative);
    setCurrentAlert(null);
  }, []);

  // 로딩 스텝 애니메이션
  useEffect(() => {
    if (!isLoading) return;
    const t1 = setTimeout(() => setLoadingStep(1), 1500);
    const t2 = setTimeout(() => setLoadingStep(2), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isLoading]);

  // 여행 팁 로테이션
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setTipFade(false);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % TRAVEL_TIPS.length);
        setTipFade(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, [isLoading]);

  // 최초 로드
  useEffect(() => {
    generatePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 비용 재계산 헬퍼
  const recalculateCosts = useCallback((schedule: TripPlan["schedule"]): CostBreakdownType => {
    const breakdown: CostBreakdownType = {
      accommodation: 0,
      food: 0,
      activity: 0,
      cafe: 0,
      transport: 0,
      etc: 0,
    };
    for (const day of schedule) {
      for (const place of day.places) {
        switch (place.category) {
          case "숙소":
            breakdown.accommodation += place.cost;
            break;
          case "맛집":
            breakdown.food += place.cost;
            break;
          case "관광지":
            breakdown.activity += place.cost;
            break;
          case "카페":
            breakdown.cafe += place.cost;
            break;
          default:
            breakdown.etc += place.cost;
            break;
        }
      }
    }
    return breakdown;
  }, []);

  // 장소 순서 변경 (드래그 앤 드롭)
  const handleReorderPlaces = useCallback(
    (dayIndex: number, newPlaces: SchedulePlace[]) => {
      if (!tripPlan) return;

      const newSchedule = tripPlan.schedule.map((day, di) => {
        if (di !== dayIndex) return day;
        return { ...day, places: newPlaces };
      });

      // 시간 재계산
      const optimized = newSchedule.map((day) => ({
        ...day,
        places: recalculateTimes(day.places, hasRentcar),
      }));

      const costBreakdown = recalculateCosts(optimized);
      const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

      setTripPlan({
        schedule: optimized,
        costBreakdown,
        totalCost,
      });
    },
    [tripPlan, hasRentcar, recalculateCosts]
  );

  // 장소 삭제
  const handleDeletePlace = useCallback(
    (dayIndex: number, placeIndex: number) => {
      if (!tripPlan) return;

      const newSchedule = tripPlan.schedule.map((day, di) => {
        if (di !== dayIndex) return day;
        const newPlaces = day.places.filter((_, pi) => pi !== placeIndex);
        return { ...day, places: newPlaces };
      }).filter((day) => day.places.length > 0);

      // 시간 재계산
      const optimized = newSchedule.map((day) => ({
        ...day,
        places: recalculateTimes(day.places, hasRentcar),
      }));

      const costBreakdown = recalculateCosts(optimized);
      const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

      setTripPlan({
        schedule: optimized,
        costBreakdown,
        totalCost,
      });
    },
    [tripPlan, hasRentcar, recalculateCosts]
  );

  // 장소 교체 모달 열기
  const handleOpenReplace = useCallback(
    (dayIndex: number, placeIndex: number) => {
      if (!tripPlan) return;
      const place = tripPlan.schedule[dayIndex].places[placeIndex];
      setReplaceModal({
        isOpen: true,
        dayIndex,
        placeIndex,
        category: place.category,
      });
    },
    [tripPlan]
  );

  // 장소 교체 실행
  const handleSelectReplacement = useCallback(
    (newPlace: Place) => {
      if (!tripPlan) return;
      const { dayIndex, placeIndex } = replaceModal;

      const sp: SchedulePlace = {
        time: tripPlan.schedule[dayIndex].places[placeIndex].time,
        placeId: newPlace.id,
        name: newPlace.name,
        category: newPlace.category,
        description: newPlace.description,
        cost: newPlace.avg_cost,
        duration: newPlace.avg_time,
        latitude: newPlace.latitude,
        longitude: newPlace.longitude,
        naver_link: newPlace.naver_link,
      };

      const newSchedule = tripPlan.schedule.map((day, di) => {
        if (di !== dayIndex) return day;
        const newPlaces = day.places.map((p, pi) => (pi === placeIndex ? sp : p));
        return { ...day, places: newPlaces };
      });

      const optimized = newSchedule.map((day) => ({
        ...day,
        places: recalculateTimes(day.places, hasRentcar),
      }));

      const costBreakdown = recalculateCosts(optimized);
      const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

      setTripPlan({ schedule: optimized, costBreakdown, totalCost });
      setReplaceModal({ isOpen: false, dayIndex: -1, placeIndex: -1, category: "" });
    },
    [tripPlan, replaceModal, hasRentcar, recalculateCosts]
  );

  // 스케줄 내 모든 placeId 수집 (교체 모달 중복 제외용)
  const allPlaceIds = tripPlan
    ? tripPlan.schedule.flatMap((d) => d.places.map((p) => p.placeId))
    : [];

  // 챗봇에서 장소 추가
  const handleAddPlaceFromChat = useCallback(
    (place: Place, dayIndex: number, time: string) => {
      if (!tripPlan) return;

      const sp: SchedulePlace = {
        time,
        placeId: place.id,
        name: place.name,
        category: place.category,
        description: place.description,
        cost: place.avg_cost,
        duration: place.avg_time,
        latitude: place.latitude,
        longitude: place.longitude,
        naver_link: place.naver_link,
      };

      const newSchedule = tripPlan.schedule.map((day, di) => {
        if (di !== dayIndex) return day;
        // 시간순으로 정렬하여 추가
        const newPlaces = [...day.places, sp].sort((a, b) => {
          const timeA = parseInt(a.time.replace(":", ""));
          const timeB = parseInt(b.time.replace(":", ""));
          return timeA - timeB;
        });
        return { ...day, places: newPlaces };
      });

      // 시간 재계산
      const optimized = newSchedule.map((day) => ({
        ...day,
        places: recalculateTimes(day.places, hasRentcar),
      }));

      const costBreakdown = recalculateCosts(optimized);
      const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

      setTripPlan({ schedule: optimized, costBreakdown, totalCost });
    },
    [tripPlan, hasRentcar, recalculateCosts]
  );

  // 일정 저장 & 공유 링크 생성
  const handleSaveAndShare = useCallback(async () => {
    if (!tripPlan || !user) {
      alert("로그인이 필요합니다.");
      return;
    }

    setIsSaving(true);
    try {
      const input = getInput();
      const title = `${input.nights}박 ${input.days}일 제주 여행`;

      const tripId = await saveTrip(user.id, title, input, tripPlan, checklist || undefined);
      const link = generateShareLink(tripId);

      setShareLink(link);
      setShowShareModal(true);
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  }, [tripPlan, checklist, getInput, user]);

  // 링크 복사
  const handleCopyLink = useCallback(() => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
    }
  }, [shareLink]);

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          {/* 감귤 아이콘 */}
          <div className="text-5xl mb-6 animate-float">🍊</div>

          <h2 className="text-2xl font-light text-[#2C2C2C] mb-3 animate-fade-in-up">
            일정을 만들고 있어요
          </h2>
          <p className="text-[#8C8C8C] mb-10 animate-fade-in-up animate-delay-200">
            AI가 최적의 동선을 계산하고 있습니다
          </p>

          {/* 3단계 프로그레스 */}
          <div className="flex items-center justify-center gap-0 mb-8">
            {LOADING_STEPS.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                        i < loadingStep
                          ? "bg-[#2C2C2C] text-white"
                          : i === loadingStep
                          ? "border-2 border-[#2C2C2C] bg-white text-[#2C2C2C]"
                          : "border-2 border-[#D8D4CE] bg-white text-[#D8D4CE]"
                      }`}
                    >
                      {i < loadingStep ? "✓" : step.emoji}
                    </div>
                    {i === loadingStep && (
                      <div className="absolute inset-0 rounded-full animate-pulse-ring" />
                    )}
                  </div>
                  <span
                    className={`text-xs whitespace-nowrap transition-colors duration-300 ${
                      i <= loadingStep ? "text-[#2C2C2C] font-medium" : "text-[#A0A0A0]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < LOADING_STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 mb-6 transition-colors duration-500 ${
                      i < loadingStep ? "bg-[#2C2C2C]" : "bg-[#D8D4CE]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* 프로그레스 바 */}
          <div className="h-1 bg-[#E8E4DE] rounded-full overflow-hidden mb-6">
            <div className="h-full bg-[#2C2C2C] rounded-full animate-loading-progress" />
          </div>

          {/* 여행 팁 */}
          <p
            className={`text-sm text-[#8C8C8C] italic transition-opacity duration-300 ${
              tipFade ? "opacity-100" : "opacity-0"
            }`}
          >
            💡 {TRAVEL_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center px-6">
        <div className="text-center bg-white p-12 rounded-2xl border border-[#E8E4DE] max-w-md">
          <div className="text-5xl mb-6">😢</div>
          <h2 className="text-xl font-medium text-[#2C2C2C] mb-3">
            일정 생성에 실패했어요
          </h2>
          <p className="text-[#6C6C6C] mb-8">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-[#2C2C2C] text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-all"
          >
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  if (!tripPlan) return null;

  const tripTitle = `${nights}박 ${days}일 제주 여행`;
  const placeSummary = tripPlan.schedule
    .flatMap((d) => d.places.slice(0, 2))
    .map((p) => p.name)
    .slice(0, 4)
    .join(", ");

  return (
    <main className="min-h-screen bg-[#FAF9F7]">
      {/* 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF9F7]/80 backdrop-blur-md border-b border-[#E8E4DE]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-[#6C6C6C] hover:text-[#2C2C2C] transition-colors"
          >
            <span>←</span>
            <span>새로 만들기</span>
          </button>
          <div className="text-lg font-medium text-[#2C2C2C]">제주메이트</div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndShare}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#5558E3] transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <span>🔗</span>
                  <span>실시간 공유</span>
                </>
              )}
            </button>
            <ShareButtons
              title={tripTitle}
              totalCost={tripPlan.totalCost}
              summary={placeSummary}
            />
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Agent 상태 */}
          <div className="mb-4 animate-fade-in-up">
            <AgentStatus active={agentActive} onToggle={handleToggleAgent} />
          </div>

          {/* 헤더 */}
          <div className="mb-8 animate-fade-in-up">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-light text-[#2C2C2C]">
                {tripTitle}
              </h1>
              <span className="px-3 py-1 bg-[#F5F0E8] text-[#6B5D4A] text-sm rounded-full border border-[#E8E0D2]">
                {season.season}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[#6C6C6C]">
              <span>
                총 예상 비용{" "}
                <span className="font-medium text-[#2C2C2C]">
                  {tripPlan.totalCost.toLocaleString()}원
                </span>
              </span>
              <span className="text-[#D8D4CE]">|</span>
              <span>예산 {budget.toLocaleString()}원</span>
              {tripPlan.totalCost <= budget ? (
                <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-xs rounded">
                  예산 내
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-[#FFEBEE] text-[#C62828] text-xs rounded">
                  예산 초과
                </span>
              )}
              <span className="text-[#D8D4CE]">|</span>
              <button
                onClick={generatePlan}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white border border-[#E8E4DE] text-[#4C4C4C] text-sm rounded-full hover:border-[#2C2C2C] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                다시 생성
              </button>
            </div>
          </div>

          {/* Day 탭 + 지도 영역 */}
          <div className="mb-8 animate-fade-in-up animate-delay-200">
            <div className="flex flex-wrap gap-2 mb-4">
              {tripPlan.schedule.map((day) => (
                <button
                  key={day.day}
                  onClick={() =>
                    setSelectedDay(selectedDay === day.day ? null : day.day)
                  }
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedDay === day.day
                      ? "bg-[#2C2C2C] text-white"
                      : "bg-white text-[#4C4C4C] border border-[#E8E4DE] hover:border-[#2C2C2C]"
                  }`}
                >
                  Day {day.day}
                </button>
              ))}
              <button
                onClick={() => setSelectedDay(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedDay === null
                    ? "bg-[#2C2C2C] text-white"
                    : "bg-white text-[#4C4C4C] border border-[#E8E4DE] hover:border-[#2C2C2C]"
                }`}
              >
                전체 동선
              </button>
            </div>

            <KakaoMap
              schedule={tripPlan.schedule}
              selectedDay={selectedDay}
            />
          </div>

          {/* 하단 그리드: 일정 + 비용 */}
          <div id="pdf-export-area" className="animate-fade-in-up animate-delay-400">
            {/* PDF 전용 헤더 (화면에서는 숨김) */}
            <div className="hidden print:block pdf-header mb-6 p-6 bg-white rounded-2xl border border-[#E8E4DE]">
              <h1 className="text-2xl font-semibold text-[#2C2C2C] mb-2">{tripTitle}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-[#6C6C6C]">
                <span>총 예상 비용: <strong className="text-[#2C2C2C]">{tripPlan.totalCost.toLocaleString()}원</strong></span>
                <span>예산: {budget.toLocaleString()}원</span>
                <span>계절: {season.season}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* 왼쪽: 일정표 (3칸) - 드래그 앤 드롭 지원 */}
            <div className="lg:col-span-3 space-y-6">
              {tripPlan.schedule.map((day, dayIdx) => (
                <div
                  key={day.day}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${600 + dayIdx * 150}ms` }}
                >
                  <DraggableSchedule
                    daySchedule={day}
                    hasRentcar={hasRentcar}
                    onReorder={(newPlaces) => handleReorderPlaces(dayIdx, newPlaces)}
                    onDeletePlace={(placeIdx) => handleDeletePlace(dayIdx, placeIdx)}
                    onReplacePlace={(placeIdx) => handleOpenReplace(dayIdx, placeIdx)}
                  />
                </div>
              ))}
            </div>

            {/* 오른쪽: 비용 + 체크리스트 (2칸) */}
            <div className="lg:col-span-2 animate-slide-in-right animate-delay-500">
              <div className="sticky top-24 space-y-6">
                <CostBreakdown
                  costBreakdown={tripPlan.costBreakdown}
                  totalCost={tripPlan.totalCost}
                />

                {/* 체크리스트 */}
                {isChecklistLoading ? (
                  <div className="bg-white rounded-2xl border border-[#E8E4DE] p-6">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#E8E4DE] border-t-[#2C2C2C] rounded-full animate-spin" />
                      <span className="text-sm text-[#8C8C8C]">체크리스트 생성 중...</span>
                    </div>
                  </div>
                ) : checklist ? (
                  <Checklist
                    checklist={checklist}
                    onUpdate={setChecklist}
                  />
                ) : null}
              </div>
            </div>
            </div>{/* grid 닫기 */}
          </div>{/* pdf-export-area 닫기 */}
        </div>
      </div>

      {/* 푸터 */}
      <footer className="bg-[#F5F0E8]/30 border-t border-[#E8E4DE] py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <div className="text-lg font-semibold text-[#2C2C2C] mb-1">제주메이트</div>
              <p className="text-sm text-[#8C8C8C]">AI가 만드는 나만의 제주 여행</p>
            </div>
            <div className="flex gap-6 text-sm text-[#8C8C8C]">
              <a href="#" className="hover:text-[#2C2C2C] transition-colors">
                이용약관
              </a>
              <a href="#" className="hover:text-[#2C2C2C] transition-colors">
                개인정보처리방침
              </a>
            </div>
          </div>
          <div className="pt-4 border-t border-[#E8E4DE]">
            <p className="text-xs text-[#A0A0A0]">&copy; 2024 제주메이트. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 장소 교체 모달 */}
      <PlaceReplacementModal
        isOpen={replaceModal.isOpen}
        onClose={() =>
          setReplaceModal({ isOpen: false, dayIndex: -1, placeIndex: -1, category: "" })
        }
        onSelect={handleSelectReplacement}
        category={replaceModal.category}
        excludePlaceIds={allPlaceIds}
      />

      {/* 챗봇 플로팅 버튼 */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-[#2C2C2C] text-white rounded-full shadow-lg hover:bg-[#1a1a1a] hover:shadow-xl hover:scale-105 transition-all duration-200"
      >
        <span className="text-lg">💬</span>
        <span className="font-medium">장소 더 찾기</span>
      </button>

      {/* 챗봇 모달 */}
      <ChatBot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        schedule={tripPlan.schedule}
        onAddPlace={handleAddPlaceFromChat}
        hasRentcar={hasRentcar}
      />

      {/* Agent 알림 모달 */}
      {currentAlert && (
        <AgentAlertModal
          alert={currentAlert}
          onApply={handleApplyAlternative}
          onDismiss={() => setCurrentAlert(null)}
        />
      )}

      {/* 공유 링크 모달 */}
      {showShareModal && shareLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-[90%] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-semibold text-[#2C2C2C] mb-2">
                일정이 저장되었어요!
              </h2>
              <p className="text-[#6C6C6C] text-sm">
                링크를 공유하면 친구와 실시간으로 함께 수정할 수 있어요
              </p>
            </div>

            <div className="bg-[#F5F0E8] rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-[#4C4C4C] outline-none"
                />
                <button
                  onClick={() => {
                    handleCopyLink();
                    alert("링크가 복사되었습니다!");
                  }}
                  className="px-3 py-1.5 bg-[#2C2C2C] text-white text-sm rounded-lg hover:bg-[#1a1a1a] transition-all"
                >
                  복사
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 py-3 border-2 border-[#E8E4DE] text-[#6C6C6C] rounded-xl font-medium hover:bg-[#F5F0E8] transition-all"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  window.open(shareLink, "_blank");
                  setShowShareModal(false);
                }}
                className="flex-1 py-3 bg-[#6366F1] text-white rounded-xl font-medium hover:bg-[#5558E3] transition-all"
              >
                공유 페이지 열기
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
          <div className="w-12 h-12 border-2 border-[#E8E4DE] border-t-[#2C2C2C] rounded-full animate-spin" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
