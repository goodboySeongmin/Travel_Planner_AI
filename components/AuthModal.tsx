"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithKakao, signOut, user } = useAuth();
  const [justSignedUp, setJustSignedUp] = useState(false);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // 로그인 성공 시 콜백 호출 (회원가입 직후가 아닐 때만)
  useEffect(() => {
    if (user && isOpen && !justSignedUp) {
      onSuccess?.();
      onClose();
    }
  }, [user, isOpen, onSuccess, onClose, justSignedUp]);

  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setEmail("");
      setPassword("");
      setName("");
      setPhone("");
      setMode("login");
      setJustSignedUp(false);
    }
  }, [isOpen]);

  // 모드 전환 시 입력 필드 초기화
  const switchMode = (newMode: "login" | "signup") => {
    setMode(newMode);
    setError(null);
    setEmail("");
    setPassword("");
    setName("");
    setPhone("");
    setJustSignedUp(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else {
          // 로그인 성공 시 자동 이동 허용
          setJustSignedUp(false);
        }
      } else {
        const { error } = await signUpWithEmail(email, password, name, phone);
        if (error) {
          console.error("회원가입 에러:", error.message);
          if (error.message.includes("already registered")) {
            setError("이미 가입된 이메일입니다.");
          } else if (error.message.includes("password")) {
            setError("비밀번호는 6자 이상이어야 합니다.");
          } else if (error.message.includes("valid email")) {
            setError("올바른 이메일 형식을 입력해주세요.");
          } else if (error.message.includes("Email rate limit")) {
            setError("너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.");
          } else {
            setError(`회원가입에 실패했습니다: ${error.message}`);
          }
        } else {
          // 회원가입 성공 후 자동 로그인 세션 종료
          await signOut();
          alert("회원가입이 완료되었습니다. 로그인해주세요.");
          switchMode("login");
          setJustSignedUp(true); // switchMode 후에 설정하여 자동 이동 방지
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setError("Google 로그인에 실패했습니다.");
    }
  };

  const handleKakaoLogin = async () => {
    setError(null);
    const { error } = await signInWithKakao();
    if (error) {
      setError("카카오 로그인에 실패했습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl max-w-md w-[90%] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8C8C8C] hover:text-[#2C2C2C] transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* 헤더 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-[#2C2C2C] mb-2">
            {mode === "login" ? "로그인" : "회원가입"}
          </h2>
          <p className="text-[#6C6C6C] text-sm">
            {mode === "login"
              ? "제주메이트에 오신 것을 환영합니다"
              : "계정을 만들고 여행 일정을 저장하세요"}
          </p>
        </div>

        {/* 소셜 로그인 - 로그인 모드에서만 표시 */}
        {mode === "login" && (
          <>
            <div className="space-y-3 mb-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#E8E4DE] rounded-xl hover:bg-[#F5F0E8] transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-[#4C4C4C] font-medium">Google로 계속하기</span>
              </button>

              <button
                onClick={handleKakaoLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FEE500] rounded-xl hover:bg-[#FDDC3F] transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#000000"
                    d="M12 3c-5.52 0-10 3.59-10 8 0 2.84 1.9 5.33 4.75 6.73-.21.78-.76 2.82-.87 3.26-.14.56.2.55.43.4.18-.12 2.8-1.9 3.94-2.67.57.08 1.15.13 1.75.13 5.52 0 10-3.59 10-8s-4.48-8-10-8z"
                  />
                </svg>
                <span className="text-[#191919] font-medium">카카오로 계속하기</span>
              </button>
            </div>

            {/* 구분선 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-[#E8E4DE]" />
              <span className="text-sm text-[#8C8C8C]">또는</span>
              <div className="flex-1 h-px bg-[#E8E4DE]" />
            </div>
          </>
        )}

        {/* 이메일/비밀번호 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 회원가입 시 이름, 전화번호 필드 */}
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[#4C4C4C] mb-1.5">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-[#E8E4DE] rounded-xl focus:outline-none focus:border-[#2C2C2C] transition-colors"
                  placeholder="홍길동"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4C4C4C] mb-1.5">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-[#E8E4DE] rounded-xl focus:outline-none focus:border-[#2C2C2C] transition-colors"
                  placeholder="010-1234-5678"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-[#4C4C4C] mb-1.5">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#E8E4DE] rounded-xl focus:outline-none focus:border-[#2C2C2C] transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#4C4C4C] mb-1.5">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-[#E8E4DE] rounded-xl focus:outline-none focus:border-[#2C2C2C] transition-colors"
              placeholder={mode === "signup" ? "6자 이상 입력" : "비밀번호 입력"}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-[#FFEBEE] text-[#C62828] text-sm rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#2C2C2C] text-white rounded-xl font-medium hover:bg-[#1a1a1a] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                처리 중...
              </span>
            ) : mode === "login" ? (
              "로그인"
            ) : (
              "회원가입"
            )}
          </button>
        </form>

        {/* 모드 전환 */}
        <div className="mt-6 text-center text-sm text-[#6C6C6C]">
          {mode === "login" ? (
            <>
              계정이 없으신가요?{" "}
              <button
                onClick={() => switchMode("signup")}
                className="text-[#2C2C2C] font-medium hover:underline"
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{" "}
              <button
                onClick={() => switchMode("login")}
                className="text-[#2C2C2C] font-medium hover:underline"
              >
                로그인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
