"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DaySchedule, SchedulePlace, WaitingInfo } from "@/lib/types";

interface DraggableScheduleProps {
  daySchedule: DaySchedule;
  hasRentcar: boolean;
  onReorder: (newPlaces: SchedulePlace[]) => void;
  onDeletePlace?: (placeIndex: number) => void;
  onReplacePlace?: (placeIndex: number) => void;
}

// 혼잡도 레벨별 스타일
const getCrowdLevelStyle = (level: string) => {
  switch (level) {
    case "high":
      return { bg: "bg-[#FFEBEE]", text: "text-[#C62828]", label: "혼잡" };
    case "medium":
      return { bg: "bg-[#FFF8E1]", text: "text-[#F57C00]", label: "보통" };
    case "low":
      return { bg: "bg-[#E8F5E9]", text: "text-[#2E7D32]", label: "여유" };
    default:
      return { bg: "bg-[#F5F5F5]", text: "text-[#757575]", label: "정보없음" };
  }
};

const isPeakTime = (time: string, peakHours?: string[]) => {
  if (!peakHours || peakHours.length === 0) return false;
  const [hours, minutes] = time.split(":").map(Number);
  const currentMinutes = hours * 60 + minutes;

  for (const peak of peakHours) {
    const [start, end] = peak.split("-");
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const startMinutes = startH * 60 + (startM || 0);
    const endMinutes = endH * 60 + (endM || 0);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      return true;
    }
  }
  return false;
};

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case "관광지": return "🏔️";
    case "맛집": return "🍜";
    case "카페": return "☕";
    case "숙소": return "🏨";
    default: return "📍";
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "관광지": return "bg-[#EEF0E8] text-[#4A5240] border-[#DDE0D5]";
    case "맛집": return "bg-[#F0ECE4] text-[#6B5D4A] border-[#E0D9CE]";
    case "카페": return "bg-[#F5F0E8] text-[#7A6E5A] border-[#E8E0D2]";
    case "숙소": return "bg-[#ECE8F0] text-[#5A4E6B] border-[#DDD6E5]";
    default: return "bg-[#F0EEEC] text-[#6C6C6C] border-[#E8E4DE]";
  }
};

// 드래그 가능한 장소 아이템
function SortablePlaceItem({
  place,
  index,
  isLast,
  hasRentcar,
  onDelete,
  onReplace,
}: {
  place: SchedulePlace;
  index: number;
  isLast: boolean;
  hasRentcar: boolean;
  onDelete?: () => void;
  onReplace?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.placeId || `place-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex gap-4">
        {/* 시간 + 연결선 */}
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold text-[#2C2C2C] bg-[#F5F0E8] px-2 py-1 rounded">
            {place.time}
          </div>
          {!isLast && (
            <div className="w-0.5 flex-1 bg-[#E8E4DE] my-2 min-h-[20px]"></div>
          )}
        </div>

        {/* 장소 정보 */}
        <div className="group relative flex-1 bg-[#FAF9F7] rounded-xl p-4 hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-[#E8E4DE]">
          {/* 드래그 핸들 */}
          <div
            {...attributes}
            {...listeners}
            className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-2 text-[#C0C0C0] hover:text-[#8C8C8C] transition-colors"
            title="드래그하여 순서 변경"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="2" />
              <circle cx="15" cy="6" r="2" />
              <circle cx="9" cy="12" r="2" />
              <circle cx="15" cy="12" r="2" />
              <circle cx="9" cy="18" r="2" />
              <circle cx="15" cy="18" r="2" />
            </svg>
          </div>

          {/* 교체/삭제 버튼 */}
          {(onReplace || onDelete) && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {onReplace && (
                <button
                  onClick={onReplace}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-[#E8E4DE] text-[#8C8C8C] hover:text-[#2C2C2C] hover:border-[#2C2C2C] transition-colors text-xs"
                  title="장소 교체"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
                    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white border border-[#E8E4DE] text-[#8C8C8C] hover:text-[#C62828] hover:border-[#C62828] transition-colors text-xs"
                  title="장소 삭제"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="pl-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xl mr-2">{getCategoryEmoji(place.category)}</span>
                <span className="font-bold text-[#2C2C2C]">{place.name}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(place.category)} ${(onReplace || onDelete) ? "mr-16" : ""}`}>
                {place.category}
              </span>
            </div>

            <p className="text-[#6C6C6C] text-sm mb-3">{place.description}</p>

            <div className="flex items-center gap-4 text-sm text-[#8C8C8C]">
              <span className="flex items-center gap-1">💰 {place.cost.toLocaleString()}원</span>
              <span className="flex items-center gap-1">⏱️ {place.duration}분</span>
            </div>

            {/* 혼잡도 정보 */}
            {place.waitingInfo && place.category !== "숙소" && (
              <div className="mt-3 pt-3 border-t border-[#E8E4DE]">
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const style = getCrowdLevelStyle(place.waitingInfo.crowdLevel || "");
                    return (
                      <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text} font-medium`}>
                        {place.waitingInfo.crowdLevel === "high" ? "🔥" : place.waitingInfo.crowdLevel === "medium" ? "⚡" : "✨"} {style.label}
                      </span>
                    );
                  })()}

                  {isPeakTime(place.time, place.waitingInfo.peakHours) && (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#FFF3E0] text-[#E65100] font-medium">
                      ⚠️ 피크타임
                    </span>
                  )}

                  {place.waitingInfo.avgWaitTime && place.waitingInfo.avgWaitTime > 0 && (
                    <span className="text-xs text-[#8C8C8C]">
                      대기 약 {place.waitingInfo.avgWaitTime}분
                    </span>
                  )}
                </div>

                {(place.waitingInfo.tips || place.waitingInfo.recommendedTime) && (
                  <p className="text-xs text-[#6C6C6C] mt-2">
                    💡 {place.waitingInfo.tips}
                    {place.waitingInfo.recommendedTime && (
                      <span className="ml-1 text-[#2E7D32]">({place.waitingInfo.recommendedTime})</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* 네이버 지도 링크 */}
            {place.naver_link && (
              <a
                href={place.naver_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium hover:underline transition-colors"
                style={{ color: "#1EC800" }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <rect width="20" height="20" rx="4" fill="#1EC800" />
                  <path d="M11.5 5.5V10.3L8.5 5.5H5.5V14.5H8.5V9.7L11.5 14.5H14.5V5.5H11.5Z" fill="white" />
                </svg>
                네이버 지도에서 보기
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 이동 시간 뱃지 */}
      {place.travelTime != null && !isLast && (
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-3 bg-[#E8E4DE]"></div>
            <div className="bg-[#F5F0E8] border border-[#E8E4DE] text-[#8C8C8C] rounded-full text-xs px-3 py-1 whitespace-nowrap">
              {hasRentcar ? "🚗" : "🚌"} {hasRentcar ? "차로" : "버스"} {place.travelTime}분
            </div>
            <div className="w-0.5 h-3 bg-[#E8E4DE]"></div>
          </div>
          <div className="flex-1"></div>
        </div>
      )}
    </div>
  );
}

export default function DraggableSchedule({
  daySchedule,
  hasRentcar,
  onReorder,
  onDeletePlace,
  onReplacePlace,
}: DraggableScheduleProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalDayCost = daySchedule.places.reduce((sum, place) => sum + place.cost, 0);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = daySchedule.places.findIndex(
        (p) => (p.placeId || `place-${daySchedule.places.indexOf(p)}`) === active.id
      );
      const newIndex = daySchedule.places.findIndex(
        (p) => (p.placeId || `place-${daySchedule.places.indexOf(p)}`) === over.id
      );

      const newPlaces = arrayMove(daySchedule.places, oldIndex, newIndex);
      onReorder(newPlaces);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DE] overflow-hidden">
      {/* 헤더 */}
      <div className="bg-[#F5F0E8] px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-medium text-[#2C2C2C]">
            Day {daySchedule.day}
            <span className="ml-2 text-[#8C8C8C] font-normal text-base">
              ({daySchedule.date})
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#8C8C8C]">드래그하여 순서 변경</span>
            <div className="bg-white border border-[#E8E4DE] px-3 py-1 rounded-full text-[#2C2C2C] text-sm font-medium">
              {totalDayCost.toLocaleString()}원
            </div>
          </div>
        </div>
      </div>

      {/* 일정 목록 */}
      <div className="p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={daySchedule.places.map((p, i) => p.placeId || `place-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0">
              {daySchedule.places.map((place, index) => (
                <SortablePlaceItem
                  key={place.placeId || `place-${index}`}
                  place={place}
                  index={index}
                  isLast={index === daySchedule.places.length - 1}
                  hasRentcar={hasRentcar}
                  onDelete={onDeletePlace ? () => onDeletePlace(index) : undefined}
                  onReplace={onReplacePlace ? () => onReplacePlace(index) : undefined}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
