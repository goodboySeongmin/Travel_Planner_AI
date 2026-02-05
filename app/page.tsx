"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TripForm from "@/components/TripForm";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { TripInput } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { user, isLoading: authLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"hero" | "form">("hero");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"form" | "storage" | null>(null);

  const handleSubmit = async (input: TripInput) => {
    setIsLoading(true);

    const params = new URLSearchParams({
      budget: input.budget.toString(),
      nights: input.nights.toString(),
      days: input.days.toString(),
      people: input.people,
      styles: input.styles.join(","),
      hasRentcar: input.hasRentcar.toString(),
      customRequest: input.customRequest || "",
    });

    router.push(`/result?${params.toString()}`);
  };

  const handleStartPlanning = () => {
    if (!user) {
      setPendingAction("form");
      setShowAuthModal(true);
    } else {
      setView("form");
    }
  };

  const handleGoToStorage = () => {
    if (!user) {
      setPendingAction("storage");
      setShowAuthModal(true);
    } else {
      router.push("/storage");
    }
  };

  const handleAuthSuccess = () => {
    if (pendingAction === "form") {
      setView("form");
    } else if (pendingAction === "storage") {
      router.push("/storage");
    }
    setPendingAction(null);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <main className="min-h-screen bg-[#FAF9F7]">
      {/* 네비게이션 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF9F7]/80 backdrop-blur-md border-b border-[#E8E4DE]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div
            className="text-xl font-semibold text-[#2C2C2C] tracking-tight cursor-pointer"
            onClick={() => setView("hero")}
          >
            제주메이트
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={handleGoToStorage}
              className="text-sm text-[#5C5C5C] hover:text-[#2C2C2C] transition-colors"
            >
              보관함
            </button>
            {authLoading ? (
              <div className="w-16 h-9 bg-[#E8E4DE] rounded-full animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#5C5C5C] hidden sm:block">
                  {user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "사용자"}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm px-4 py-2 border border-[#E8E4DE] text-[#5C5C5C] rounded-full hover:bg-[#F5F0E8] transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-sm px-4 py-2 bg-[#2C2C2C] text-white rounded-full hover:bg-[#1a1a1a] transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 컨텐츠 영역 - 히어로와 폼을 동시 렌더링하며 CSS 전환 */}
      <div className="relative">
        {/* 히어로 섹션 */}
        <section
          className={`pt-32 pb-20 px-6 transition-all duration-500 ${
            view === "hero"
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-8 pointer-events-none absolute inset-0"
          }`}
        >
          <div className="max-w-4xl mx-auto relative overflow-hidden">
            {/* 배경 장식 블롭 */}
            <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#F5F0E8] rounded-full blur-3xl opacity-60 animate-float pointer-events-none" />
            <div className="absolute top-10 -right-16 w-80 h-80 bg-[#EDE8DD] rounded-full blur-3xl opacity-40 animate-float-slow pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#F0EBE0] rounded-full blur-3xl opacity-30 pointer-events-none" />

            {/* 메인 타이틀 */}
            <div className="text-center mb-16 relative">
              <p className="text-sm text-[#8C8C8C] tracking-widest uppercase mb-4 animate-fade-in-up">
                AI Travel Planner
              </p>
              <h1 className="text-5xl md:text-7xl font-light text-[#2C2C2C] leading-tight mb-6 animate-fade-in-up animate-delay-200">
                예산만 알려주세요
                <br />
                <span className="font-medium">제주 일정</span>은 제가 짤게요
              </h1>
              <p className="text-lg text-[#6C6C6C] max-w-xl mx-auto leading-relaxed animate-fade-in-up animate-delay-400">
                AI가 당신의 예산, 취향, 여행 스타일을 분석해서
                <br />
                최적의 제주 여행 일정을 만들어 드립니다
              </p>
            </div>

            {/* CTA 버튼 */}
            <div className="flex justify-center mb-20 relative animate-fade-in-up animate-delay-600">
              <button
                onClick={handleStartPlanning}
                className="group px-8 py-4 bg-[#2C2C2C] text-white rounded-full text-lg font-medium hover:bg-[#1a1a1a] transition-all hover:shadow-xl hover:scale-105"
              >
                일정 만들기
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </button>
            </div>

            {/* 특징 카드 */}
            <div className="grid md:grid-cols-3 gap-6 relative">
              <div className="bg-white p-8 rounded-2xl border border-[#E8E4DE] hover:shadow-lg transition-shadow animate-fade-in-up animate-delay-700">
                <div className="w-12 h-12 bg-[#F5F0E8] rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-lg font-medium text-[#2C2C2C] mb-2">
                  예산 맞춤
                </h3>
                <p className="text-[#6C6C6C] text-sm leading-relaxed">
                  설정한 예산 내에서 숙소, 식당, 관광지를 최적으로 배분합니다
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-[#E8E4DE] hover:shadow-lg transition-shadow animate-fade-in-up animate-delay-800">
                <div className="w-12 h-12 bg-[#F5F0E8] rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">🗺️</span>
                </div>
                <h3 className="text-lg font-medium text-[#2C2C2C] mb-2">
                  동선 최적화
                </h3>
                <p className="text-[#6C6C6C] text-sm leading-relaxed">
                  이동 거리를 최소화하는 효율적인 여행 동선을 설계합니다
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-[#E8E4DE] hover:shadow-lg transition-shadow animate-fade-in-up animate-delay-1000">
                <div className="w-12 h-12 bg-[#F5F0E8] rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="text-lg font-medium text-[#2C2C2C] mb-2">
                  개인화 추천
                </h3>
                <p className="text-[#6C6C6C] text-sm leading-relaxed">
                  여행 스타일에 맞는 숨은 명소와 맛집을 추천합니다
                </p>
              </div>
            </div>

            {/* 이렇게 만들어져요 섹션 */}
            <div className="mt-24 relative">
              <h2 className="text-center text-2xl font-light text-[#2C2C2C] mb-12 animate-fade-in-up animate-delay-800">
                이렇게 만들어져요
              </h2>
              <div className="grid md:grid-cols-3 gap-8 relative">
                {/* 데스크톱 점선 연결선 */}
                <div className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] border-t-2 border-dashed border-[#D8D4CE]" />

                {[
                  { num: 1, title: "정보 입력", desc: "예산, 기간, 여행 스타일을 선택하세요" },
                  { num: 2, title: "AI 분석", desc: "AI가 장소를 선정하고 동선을 최적화합니다" },
                  { num: 3, title: "일정 완성", desc: "맞춤 여행 일정을 바로 확인하세요" },
                ].map((step) => (
                  <div key={step.num} className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-[#2C2C2C] text-white rounded-2xl flex items-center justify-center text-xl font-semibold mb-4 relative z-10">
                      {step.num}
                    </div>
                    <h3 className="text-lg font-medium text-[#2C2C2C] mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#6C6C6C] leading-relaxed max-w-[200px]">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 폼 섹션 */}
        <section
          className={`pt-28 pb-20 px-6 transition-all duration-500 ${
            view === "form"
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8 pointer-events-none absolute inset-0"
          }`}
        >
          <div className="max-w-5xl mx-auto">
            {/* 뒤로가기 */}
            <button
              onClick={() => setView("hero")}
              className="flex items-center gap-2 text-[#6C6C6C] hover:text-[#2C2C2C] transition-colors mb-8"
            >
              <span>←</span>
              <span>돌아가기</span>
            </button>

            {/* 폼 타이틀 */}
            <div className="mb-10">
              <h2 className="text-3xl font-light text-[#2C2C2C] mb-2">
                여행 정보를 알려주세요
              </h2>
              <p className="text-[#6C6C6C]">
                AI가 최적의 일정을 만들어 드립니다
              </p>
            </div>

            {/* 입력 폼 */}
            <div className="bg-white rounded-3xl border border-[#E8E4DE] p-8 shadow-sm">
              <TripForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        </section>
      </div>

      {/* 푸터 */}
      <footer className="bg-[#F5F0E8]/30 border-t border-[#E8E4DE] py-8 px-6">
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

      {/* 인증 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingAction(null);
        }}
        onSuccess={handleAuthSuccess}
      />
    </main>
  );
}
