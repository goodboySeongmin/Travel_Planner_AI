"use client";

import { useState, useRef, useEffect } from "react";
import { Place, DaySchedule, SchedulePlace } from "@/lib/types";

interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  places?: PlaceRecommendation[];
  imageUrl?: string;
}

interface PlaceRecommendation {
  place: Place;
  reason: string;
  bestDay: number;
  bestTime: string;
  alreadyInSchedule?: { day: number; time: string };
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: DaySchedule[];
  onAddPlace: (place: Place, dayIndex: number, time: string) => void;
  hasRentcar: boolean;
}

export default function ChatBot({
  isOpen,
  onClose,
  schedule,
  onAddPlace,
  hasRentcar,
}: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      type: "assistant",
      content: "안녕하세요! 어떤 장소를 찾으시나요?\n텍스트로 검색하거나 사진을 업로드해보세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 스크롤 하단으로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // 현재 일정의 placeId 목록
  const schedulePlaceIds = schedule.flatMap((d) => d.places.map((p) => p.placeId));

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 이미지 제거
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 메시지 전송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: input || "이 장소가 어디인가요?",
      imageUrl: imagePreview || undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", input);
      formData.append("schedule", JSON.stringify(schedule));
      formData.append("hasRentcar", String(hasRentcar));
      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      clearImage();

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("응답 실패");

      const data = await response.json();

      // 백엔드 응답 변환: flat Place[] → PlaceRecommendation[]
      const places: PlaceRecommendation[] | undefined = data.places?.map(
        (p: Place | PlaceRecommendation) => {
          // 이미 PlaceRecommendation 형태면 그대로
          if ("place" in p && "reason" in p) return p as PlaceRecommendation;
          // flat Place → PlaceRecommendation 변환
          const place = p as Place;
          return {
            place,
            reason: place.description || "",
            bestDay: 1,
            bestTime: "14:00",
          };
        }
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.message || data.reply || "",
        places,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "system",
          content: "죄송해요, 오류가 발생했어요. 다시 시도해주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 장소 추가 핸들러
  const handleAddToDay = (place: Place, dayIndex: number, time: string) => {
    onAddPlace(place, dayIndex, time);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "system",
        content: `✅ ${place.name}을(를) Day ${dayIndex + 1} ${time}에 추가했어요!`,
      },
    ]);
  };

  // 중복 체크
  const isAlreadyInSchedule = (placeId: string) => {
    for (let i = 0; i < schedule.length; i++) {
      const found = schedule[i].places.find((p) => p.placeId === placeId);
      if (found) {
        return { day: i + 1, time: found.time };
      }
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 챗봇 모달 */}
      <div className="relative w-full sm:max-w-lg h-[85vh] sm:h-[600px] bg-white sm:rounded-2xl flex flex-col shadow-2xl animate-slide-up">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4DE]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F5F0E8] rounded-full flex items-center justify-center text-lg">
              🏝️
            </div>
            <div>
              <h3 className="font-medium text-[#2C2C2C]">장소 찾기</h3>
              <p className="text-xs text-[#8C8C8C]">AI가 추천해드려요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#8C8C8C] hover:text-[#2C2C2C] hover:bg-[#F5F0E8] rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${
                  msg.type === "user"
                    ? "bg-[#2C2C2C] text-white rounded-2xl rounded-br-md"
                    : msg.type === "system"
                    ? "bg-[#E8F5E9] text-[#2E7D32] rounded-2xl text-sm"
                    : "bg-[#F5F0E8] text-[#2C2C2C] rounded-2xl rounded-bl-md"
                } px-4 py-3`}
              >
                {/* 이미지 미리보기 (사용자 메시지) */}
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="업로드 이미지"
                    className="w-full max-w-[200px] rounded-lg mb-2"
                  />
                )}

                {/* 메시지 텍스트 */}
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

                {/* 추천 장소 카드 */}
                {msg.places && msg.places.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {msg.places.map((rec, idx) => {
                      const existing = isAlreadyInSchedule(rec.place.id);
                      return (
                        <div
                          key={idx}
                          className="bg-white rounded-xl p-3 border border-[#E8E4DE]"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-medium text-[#2C2C2C] text-sm">
                                {rec.place.name}
                              </h4>
                              <p className="text-xs text-[#8C8C8C]">
                                {rec.place.category} · {rec.place.subcategory}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-0.5 bg-[#F5F0E8] text-[#6B5D4A] rounded">
                              ⭐ {rec.place.rating}
                            </span>
                          </div>

                          <p className="text-xs text-[#6C6C6C] mb-2">
                            {rec.reason}
                          </p>

                          <div className="text-xs text-[#8C8C8C] mb-3">
                            💰 {rec.place.avg_cost.toLocaleString()}원 · ⏱️{" "}
                            {rec.place.avg_time}분
                          </div>

                          {existing ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-[#E8F5E9] rounded-lg">
                              <span className="text-xs text-[#2E7D32]">
                                ✅ Day {existing.day} {existing.time}에 이미 있어요
                              </span>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs text-[#8C8C8C] mb-2">
                                어느 날에 추가할까요?
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {schedule.map((day, dayIdx) => (
                                  <button
                                    key={dayIdx}
                                    onClick={() =>
                                      handleAddToDay(
                                        rec.place,
                                        dayIdx,
                                        rec.bestTime
                                      )
                                    }
                                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                                      dayIdx === rec.bestDay - 1
                                        ? "bg-[#2C2C2C] text-white border-[#2C2C2C]"
                                        : "bg-white text-[#4C4C4C] border-[#E8E4DE] hover:border-[#2C2C2C]"
                                    }`}
                                  >
                                    Day {day.day}
                                    {dayIdx === rec.bestDay - 1 && " ⭐"}
                                  </button>
                                ))}
                              </div>
                              {rec.bestDay && (
                                <p className="text-xs text-[#8C8C8C] mt-2">
                                  💡 Day {rec.bestDay} {rec.bestTime} 추천
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 로딩 표시 */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#F5F0E8] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#2C2C2C] rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-[#2C2C2C] rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-[#2C2C2C] rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 이미지 미리보기 */}
        {imagePreview && (
          <div className="px-5 py-2 border-t border-[#E8E4DE]">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="미리보기"
                className="h-16 rounded-lg"
              />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-[#2C2C2C] text-white rounded-full text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 빠른 검색 버튼 */}
        <div className="px-5 py-2 border-t border-[#E8E4DE] flex gap-2 overflow-x-auto">
          {["카페 추천", "맛집 추천", "관광지 추천", "숨은 명소"].map((text) => (
            <button
              key={text}
              onClick={() => setInput(text)}
              className="flex-shrink-0 px-3 py-1.5 bg-[#F5F0E8] text-[#6B5D4A] text-xs rounded-full hover:bg-[#EDE8DD] transition-colors"
            >
              {text}
            </button>
          ))}
        </div>

        {/* 입력 영역 */}
        <form
          onSubmit={handleSubmit}
          className="px-5 py-4 border-t border-[#E8E4DE] flex items-center gap-3"
        >
          {/* 이미지 업로드 버튼 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 flex items-center justify-center bg-[#F5F0E8] text-[#6B5D4A] rounded-full hover:bg-[#EDE8DD] transition-colors"
          >
            📷
          </button>

          {/* 텍스트 입력 */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="장소를 검색해보세요..."
            className="flex-1 px-4 py-2.5 bg-[#F5F0E8] rounded-full text-sm text-[#2C2C2C] placeholder-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#2C2C2C]/20"
          />

          {/* 전송 버튼 */}
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !selectedImage)}
            className="w-10 h-10 flex items-center justify-center bg-[#2C2C2C] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1a1a1a] transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
