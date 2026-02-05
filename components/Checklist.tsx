"use client";

import { useState } from "react";
import { TripChecklist, ChecklistSection, ChecklistItem } from "@/lib/types";

interface ChecklistProps {
  checklist: TripChecklist;
  onUpdate?: (checklist: TripChecklist) => void;
}

// 개별 체크리스트 아이템
function ChecklistItemRow({
  item,
  onToggle,
}: {
  item: ChecklistItem;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 ${
        item.checked
          ? "bg-[#E8F5E9] text-[#2E7D32]"
          : "bg-[#FAF9F7] hover:bg-[#F5F0E8]"
      }`}
    >
      <input
        type="checkbox"
        checked={item.checked}
        onChange={onToggle}
        className="sr-only"
      />
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          item.checked
            ? "bg-[#2E7D32] border-[#2E7D32]"
            : "border-[#D8D4CE] bg-white"
        }`}
      >
        {item.checked && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span
        className={`flex-1 text-sm transition-all duration-200 ${
          item.checked ? "line-through opacity-60" : "text-[#2C2C2C]"
        }`}
      >
        {item.text}
      </span>
    </label>
  );
}

// 체크리스트 섹션
function ChecklistSectionCard({
  section,
  onToggleItem,
}: {
  section: ChecklistSection;
  onToggleItem: (itemId: string) => void;
}) {
  const checkedCount = section.items.filter((item) => item.checked).length;
  const totalCount = section.items.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-[#E8E4DE] overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="px-4 py-3 bg-[#F5F0E8] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{section.emoji}</span>
          <span className="font-medium text-[#2C2C2C]">{section.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8C8C8C]">
            {checkedCount}/{totalCount}
          </span>
          {checkedCount === totalCount && totalCount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] rounded-full">
              완료!
            </span>
          )}
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="h-1 bg-[#E8E4DE]">
        <div
          className="h-full bg-[#2E7D32] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 아이템 목록 */}
      <div className="p-3 space-y-1">
        {section.items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={() => onToggleItem(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Checklist({ checklist, onUpdate }: ChecklistProps) {
  const [activeTab, setActiveTab] = useState<"before" | "during" | "after">(
    "before"
  );
  const [localChecklist, setLocalChecklist] =
    useState<TripChecklist>(checklist);

  // 아이템 토글
  const toggleItem = (
    type: "beforeTrip" | "duringTrip" | "afterTrip",
    sectionIndex: number | null,
    itemId: string
  ) => {
    setLocalChecklist((prev) => {
      const newChecklist = { ...prev };

      if (type === "afterTrip") {
        newChecklist.afterTrip = {
          ...newChecklist.afterTrip,
          items: newChecklist.afterTrip.items.map((item) =>
            item.id === itemId ? { ...item, checked: !item.checked } : item
          ),
        };
      } else {
        newChecklist[type] = newChecklist[type].map((section, idx) => {
          if (idx !== sectionIndex) return section;
          return {
            ...section,
            items: section.items.map((item) =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            ),
          };
        });
      }

      onUpdate?.(newChecklist);
      return newChecklist;
    });
  };

  // 전체 진행률 계산
  const calculateProgress = () => {
    const allItems = [
      ...localChecklist.beforeTrip.flatMap((s) => s.items),
      ...localChecklist.duringTrip.flatMap((s) => s.items),
      ...localChecklist.afterTrip.items,
    ];
    const checked = allItems.filter((item) => item.checked).length;
    return allItems.length > 0
      ? Math.round((checked / allItems.length) * 100)
      : 0;
  };

  const progress = calculateProgress();

  return (
    <div className="bg-white rounded-2xl border border-[#E8E4DE] overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 bg-[#F5F0E8] border-b border-[#E8E4DE]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-[#2C2C2C] flex items-center gap-2">
            <span>✅</span>
            여행 체크리스트
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#6C6C6C]">{progress}% 완료</span>
            {progress === 100 && (
              <span className="text-lg">🎉</span>
            )}
          </div>
        </div>

        {/* 전체 프로그레스 바 */}
        <div className="h-2 bg-[#E8E4DE] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2E7D32] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-[#E8E4DE]">
        {[
          { key: "before", label: "출발 전", emoji: "📅" },
          { key: "during", label: "여행 중", emoji: "🏝️" },
          { key: "after", label: "여행 후", emoji: "🏠" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "text-[#2C2C2C] bg-white border-b-2 border-[#2C2C2C]"
                : "text-[#8C8C8C] hover:text-[#2C2C2C] hover:bg-[#FAF9F7]"
            }`}
          >
            <span className="mr-1">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {activeTab === "before" &&
          localChecklist.beforeTrip.map((section, idx) => (
            <ChecklistSectionCard
              key={section.title}
              section={section}
              onToggleItem={(itemId) => toggleItem("beforeTrip", idx, itemId)}
            />
          ))}

        {activeTab === "during" &&
          localChecklist.duringTrip.map((section, idx) => (
            <ChecklistSectionCard
              key={section.title}
              section={section}
              onToggleItem={(itemId) => toggleItem("duringTrip", idx, itemId)}
            />
          ))}

        {activeTab === "after" && (
          <ChecklistSectionCard
            section={localChecklist.afterTrip}
            onToggleItem={(itemId) => toggleItem("afterTrip", null, itemId)}
          />
        )}
      </div>
    </div>
  );
}
