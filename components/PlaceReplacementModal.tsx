"use client";

import { useEffect, useRef } from "react";
import { Place } from "@/lib/types";
import placesData from "@/data/places.json";

interface PlaceReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (place: Place) => void;
  category: string;
  excludePlaceIds: string[];
}

export default function PlaceReplacementModal({
  isOpen,
  onClose,
  onSelect,
  category,
  excludePlaceIds,
}: PlaceReplacementModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allPlaces = placesData as Place[];
  const filtered = allPlaces
    .filter(
      (p) =>
        p.category === category && !excludePlaceIds.includes(p.id)
    )
    .sort((a, b) => b.rating - a.rating);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-2xl border border-[#E8E4DE] w-full max-w-lg mx-4 max-h-[80vh] flex flex-col animate-scale-in shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DE]">
          <h3 className="text-lg font-medium text-[#2C2C2C]">
            장소 교체 — {category}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F0E8] text-[#8C8C8C] hover:text-[#2C2C2C] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 장소 리스트 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-[#8C8C8C] py-8">
              교체 가능한 장소가 없습니다.
            </p>
          ) : (
            filtered.map((place) => (
              <div
                key={place.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#FAF9F7] hover:bg-[#F5F0E8] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[#2C2C2C] truncate">
                      {place.name}
                    </span>
                    <span className="text-xs text-[#8C8C8C] flex items-center gap-0.5">
                      ⭐ {place.rating}
                    </span>
                  </div>
                  <p className="text-sm text-[#6C6C6C] truncate">
                    {place.description}
                  </p>
                  <span className="text-xs text-[#8C8C8C]">
                    💰 {place.avg_cost.toLocaleString()}원
                  </span>
                </div>
                <button
                  onClick={() => onSelect(place)}
                  className="shrink-0 px-4 py-2 bg-[#2C2C2C] text-white text-sm rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  선택
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
