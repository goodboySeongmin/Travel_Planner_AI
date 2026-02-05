"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTrips, deleteTrip, SavedTrip } from "@/lib/firebase";

export default function StoragePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 비로그인 시 홈으로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // 사용자의 여행 일정 가져오기
  useEffect(() => {
    async function fetchTrips() {
      if (!user) return;

      setIsLoading(true);
      try {
        const userTrips = await getUserTrips(user.id);
        setTrips(userTrips);
      } catch (error) {
        console.error("여행 일정 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchTrips();
    }
  }, [user]);

  // 일정 삭제
  const handleDelete = async (tripId: string) => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;

    setDeletingId(tripId);
    try {
      await deleteTrip(tripId);
      setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setDeletingId(null);
    }
  };

  // 날짜 포맷
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  // 스타일 태그 색상
  const getStyleColor = (style: string) => {
    const colors: { [key: string]: string } = {
      맛집: "bg-[#FFEBEE] text-[#C62828]",
      자연: "bg-[#E8F5E9] text-[#2E7D32]",
      카페: "bg-[#FFF3E0] text-[#E65100]",
      힐링: "bg-[#E3F2FD] text-[#1565C0]",
      액티비티: "bg-[#F3E5F5] text-[#7B1FA2]",
      문화: "bg-[#FFF8E1] text-[#F57F17]",
      쇼핑: "bg-[#FCE4EC] text-[#C2185B]",
    };
    return colors[style] || "bg-[#F5F5F5] text-[#616161]";
  };

  // 로딩 또는 비로그인 상태
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#E8E4DE] border-t-[#2C2C2C] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F7]">
      {/* 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF9F7]/80 backdrop-blur-md border-b border-[#E8E4DE]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-[#6C6C6C] hover:text-[#2C2C2C] transition-colors"
          >
            <span>←</span>
            <span>홈으로</span>
          </button>
          <div className="text-lg font-medium text-[#2C2C2C]">제주메이트</div>
          <div className="w-20" /> {/* 균형을 위한 빈 공간 */}
        </div>
      </nav>

      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-light text-[#2C2C2C] mb-2">보관함</h1>
            <p className="text-[#6C6C6C]">저장한 여행 일정을 확인하세요</p>
          </div>

          {/* 로딩 상태 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-[#E8E4DE] border-t-[#2C2C2C] rounded-full animate-spin" />
                <p className="text-[#8C8C8C]">일정을 불러오는 중...</p>
              </div>
            </div>
          ) : trips.length === 0 ? (
            /* 빈 상태 */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-6xl mb-6">📋</div>
              <h2 className="text-xl font-medium text-[#2C2C2C] mb-2">
                저장된 일정이 없습니다
              </h2>
              <p className="text-[#6C6C6C] mb-8">
                새로운 여행 일정을 만들고 저장해보세요
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-8 py-3 bg-[#2C2C2C] text-white rounded-full font-medium hover:bg-[#1a1a1a] transition-all"
              >
                일정 만들기
              </button>
            </div>
          ) : (
            /* 일정 목록 */
            <div className="space-y-4">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="bg-white rounded-2xl border border-[#E8E4DE] p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      {/* 제목 */}
                      <h3 className="text-lg font-medium text-[#2C2C2C] mb-2">
                        {trip.title}
                      </h3>

                      {/* 메타 정보 */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[#6C6C6C] mb-3">
                        <span>
                          총 비용{" "}
                          <span className="font-medium text-[#2C2C2C]">
                            {trip.tripPlan.totalCost.toLocaleString()}원
                          </span>
                        </span>
                        <span className="text-[#D8D4CE]">|</span>
                        <span>{formatDate(trip.createdAt)}</span>
                      </div>

                      {/* 스타일 태그 */}
                      <div className="flex flex-wrap gap-2">
                        {trip.input.styles.map((style) => (
                          <span
                            key={style}
                            className={`px-2.5 py-1 text-xs rounded-full ${getStyleColor(style)}`}
                          >
                            {style}
                          </span>
                        ))}
                        <span className="px-2.5 py-1 text-xs rounded-full bg-[#F5F0E8] text-[#6B5D4A]">
                          {trip.input.people}
                        </span>
                        {trip.input.hasRentcar && (
                          <span className="px-2.5 py-1 text-xs rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                            렌트카
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-2 sm:flex-col">
                      <button
                        onClick={() => router.push(`/shared/${trip.id}`)}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-[#2C2C2C] text-white text-sm rounded-lg font-medium hover:bg-[#1a1a1a] transition-all"
                      >
                        보기
                      </button>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        disabled={deletingId === trip.id}
                        className="flex-1 sm:flex-none px-6 py-2.5 border border-[#E8E4DE] text-[#6C6C6C] text-sm rounded-lg font-medium hover:bg-[#FFEBEE] hover:border-[#FFCDD2] hover:text-[#C62828] transition-all disabled:opacity-50"
                      >
                        {deletingId === trip.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3 h-3 border-2 border-[#C62828]/30 border-t-[#C62828] rounded-full animate-spin" />
                          </span>
                        ) : (
                          "삭제"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 푸터 */}
      <footer className="bg-[#F5F0E8]/30 border-t border-[#E8E4DE] py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto">
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
    </main>
  );
}
