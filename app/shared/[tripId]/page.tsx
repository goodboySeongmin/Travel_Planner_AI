"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  SavedTrip,
  getTrip,
  subscribeToTrip,
  updateTripPlan,
  updateChecklist,
  generateShareLink,
} from "@/lib/firebase";
import { TripPlan, Place, SchedulePlace, CostBreakdown as CostBreakdownType, TripChecklist } from "@/lib/types";
import { recalculateTimes } from "@/lib/routeOptimizer";
import ScheduleCard from "@/components/ScheduleCard";
import CostBreakdown from "@/components/CostBreakdown";
import KakaoMap from "@/components/KakaoMap";
import PlaceReplacementModal from "@/components/PlaceReplacementModal";
import Checklist from "@/components/Checklist";
import placesData from "@/data/places.json";

export default function SharedTripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [savedTrip, setSavedTrip] = useState<SavedTrip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // 교체 모달 상태
  const [replaceModal, setReplaceModal] = useState<{
    isOpen: boolean;
    dayIndex: number;
    placeIndex: number;
    category: string;
  }>({ isOpen: false, dayIndex: -1, placeIndex: -1, category: "" });

  // 실시간 구독
  useEffect(() => {
    if (!tripId) return;

    setIsLoading(true);

    // 실시간 구독 시작
    const unsubscribe = subscribeToTrip(tripId, (trip) => {
      if (trip) {
        setSavedTrip(trip);
        setLastSync(new Date());
        setError(null);
      } else {
        setError("일정을 찾을 수 없습니다.");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [tripId]);

  // 비용 재계산
  const recalculateCosts = useCallback(
    (schedule: TripPlan["schedule"]): CostBreakdownType => {
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
    },
    []
  );

  // 장소 삭제 (Firebase에 저장)
  const handleDeletePlace = useCallback(
    async (dayIndex: number, placeIndex: number) => {
      if (!savedTrip) return;

      const tripPlan = savedTrip.tripPlan;
      const newSchedule = tripPlan.schedule
        .map((day, di) => {
          if (di !== dayIndex) return day;
          const newPlaces = day.places.filter((_, pi) => pi !== placeIndex);
          return { ...day, places: newPlaces };
        })
        .filter((day) => day.places.length > 0);

      const hasRentcar = savedTrip.input.hasRentcar;
      const optimized = newSchedule.map((day) => ({
        ...day,
        places: recalculateTimes(day.places, hasRentcar),
      }));

      const costBreakdown = recalculateCosts(optimized);
      const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

      const newTripPlan: TripPlan = {
        schedule: optimized,
        costBreakdown,
        totalCost,
      };

      // Firebase에 업데이트
      await updateTripPlan(tripId, newTripPlan);
    },
    [savedTrip, tripId, recalculateCosts]
  );

  // 장소 교체 모달 열기
  const handleOpenReplace = useCallback(
    (dayIndex: number, placeIndex: number) => {
      if (!savedTrip) return;
      const place = savedTrip.tripPlan.schedule[dayIndex].places[placeIndex];
      setReplaceModal({
        isOpen: true,
        dayIndex,
        placeIndex,
        category: place.category,
      });
    },
    [savedTrip]
  );

  // 장소 교체 실행 (Firebase에 저장)
  const handleSelectReplacement = useCallback(
    async (newPlace: Place) => {
      if (!savedTrip) return;
      const { dayIndex, placeIndex } = replaceModal;
      const tripPlan = savedTrip.tripPlan;

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
        const newPlaces = day.places.map((p, pi) =>
          pi === placeIndex ? sp : p
        );
        return { ...day, places: newPlaces };
      });

      const hasRentcar = savedTrip.input.hasRentcar;
      const optimized = newSchedule.map((day) => ({
        ...day,
        places: recalculateTimes(day.places, hasRentcar),
      }));

      const costBreakdown = recalculateCosts(optimized);
      const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

      const newTripPlan: TripPlan = {
        schedule: optimized,
        costBreakdown,
        totalCost,
      };

      // Firebase에 업데이트
      await updateTripPlan(tripId, newTripPlan);
      setReplaceModal({ isOpen: false, dayIndex: -1, placeIndex: -1, category: "" });
    },
    [savedTrip, replaceModal, tripId, recalculateCosts]
  );

  // 체크리스트 업데이트 (Firebase에 저장)
  const handleChecklistUpdate = useCallback(
    async (checklist: TripChecklist) => {
      if (!tripId) return;
      await updateChecklist(tripId, checklist);
    },
    [tripId]
  );

  // 링크 복사
  const handleCopyLink = useCallback(() => {
    const link = generateShareLink(tripId);
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tripId]);

  // 스케줄 내 모든 placeId
  const allPlaceIds = savedTrip
    ? savedTrip.tripPlan.schedule.flatMap((d) => d.places.map((p) => p.placeId))
    : [];

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#E8E4DE] border-t-[#2C2C2C] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6C6C6C]">일정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error || !savedTrip) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center px-6">
        <div className="text-center bg-white p-12 rounded-2xl border border-[#E8E4DE] max-w-md">
          <div className="text-5xl mb-6">😢</div>
          <h2 className="text-xl font-medium text-[#2C2C2C] mb-3">
            일정을 찾을 수 없어요
          </h2>
          <p className="text-[#6C6C6C] mb-8">
            {error || "링크가 잘못되었거나 삭제된 일정이에요."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-[#2C2C2C] text-white rounded-lg font-medium hover:bg-[#1a1a1a] transition-all"
          >
            새 일정 만들기
          </button>
        </div>
      </div>
    );
  }

  const { tripPlan, input, title, checklist } = savedTrip;

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
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg hover:bg-[#1a1a1a] transition-all"
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>복사됨!</span>
              </>
            ) : (
              <>
                <span>🔗</span>
                <span>링크 복사</span>
              </>
            )}
          </button>
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* 실시간 동기화 표시 */}
          <div className="mb-4 flex items-center gap-2 text-sm text-[#6C6C6C]">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>실시간 동기화 중</span>
            {lastSync && (
              <span className="text-[#A0A0A0]">
                · 마지막 동기화: {lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* 헤더 */}
          <div className="mb-8 animate-fade-in-up">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-light text-[#2C2C2C]">{title}</h1>
              <span className="px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] text-sm rounded-full">
                공유된 일정
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
              <span>예산 {input.budget.toLocaleString()}원</span>
              {tripPlan.totalCost <= input.budget ? (
                <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-xs rounded">
                  예산 내
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-[#FFEBEE] text-[#C62828] text-xs rounded">
                  예산 초과
                </span>
              )}
            </div>
          </div>

          {/* Day 탭 + 지도 */}
          <div className="mb-8">
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

            <KakaoMap schedule={tripPlan.schedule} selectedDay={selectedDay} />
          </div>

          {/* 하단 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* 왼쪽: 일정표 */}
            <div className="lg:col-span-3 space-y-6">
              {tripPlan.schedule.map((day, dayIdx) => (
                <ScheduleCard
                  key={day.day}
                  daySchedule={day}
                  hasRentcar={input.hasRentcar}
                  onDeletePlace={(placeIdx) => handleDeletePlace(dayIdx, placeIdx)}
                  onReplacePlace={(placeIdx) => handleOpenReplace(dayIdx, placeIdx)}
                />
              ))}
            </div>

            {/* 오른쪽: 비용 + 체크리스트 */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 space-y-6">
                <CostBreakdown
                  costBreakdown={tripPlan.costBreakdown}
                  totalCost={tripPlan.totalCost}
                />

                {checklist && (
                  <Checklist
                    checklist={checklist}
                    onUpdate={handleChecklistUpdate}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </main>
  );
}
