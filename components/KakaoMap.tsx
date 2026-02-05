"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { DaySchedule } from "@/lib/types";

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  schedule: DaySchedule[];
  selectedDay?: number | null;
}

const DAY_COLORS = [
  "#6B7B6E",
  "#8B7355",
  "#5B6B8A",
  "#8A7B6B",
  "#7B6B8A",
];

export default function KakaoMap({ schedule, selectedDay }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const activeInfoRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const closeActiveInfo = useCallback(() => {
    if (activeInfoRef.current) {
      activeInfoRef.current.setMap(null);
      activeInfoRef.current = null;
    }
  }, []);

  const renderMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !window.kakao.maps) return;

    closeActiveInfo();

    overlaysRef.current.forEach((o) => o.setMap(null));
    polylinesRef.current.forEach((p) => p.setMap(null));
    overlaysRef.current = [];
    polylinesRef.current = [];

    const bounds = new window.kakao.maps.LatLngBounds();
    let hasPoints = false;

    const daysToRender =
      selectedDay != null
        ? schedule.filter((d) => d.day === selectedDay)
        : schedule;

    daysToRender.forEach((day) => {
      const dayIndex = day.day - 1;
      const dayColor = DAY_COLORS[dayIndex % DAY_COLORS.length];
      const linePath: any[] = [];

      day.places.forEach((place, placeIndex) => {
        if (!place.latitude || !place.longitude) return;

        const position = new window.kakao.maps.LatLng(
          place.latitude,
          place.longitude
        );

        bounds.extend(position);
        linePath.push(position);
        hasPoints = true;

        const markerContent = document.createElement("div");
        markerContent.style.cursor = "pointer";
        markerContent.innerHTML = `
          <div style="
            background-color: ${dayColor};
            color: white;
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            border: 2px solid white;
          ">
            ${day.day}-${placeIndex + 1}
          </div>
        `;

        // 클릭 시 상세 팝업
        markerContent.addEventListener("click", () => {
          closeActiveInfo();

          const infoContent = document.createElement("div");
          infoContent.innerHTML = `
            <div style="
              background: white;
              border: 1px solid #E8E4DE;
              border-radius: 12px;
              padding: 14px 16px;
              min-width: 200px;
              max-width: 260px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              font-family: inherit;
            ">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                <div style="font-weight:700; color:#2C2C2C; font-size:14px;">${place.name}</div>
                <button class="kakao-popup-close" style="
                  background:none; border:none; cursor:pointer;
                  color:#8C8C8C; font-size:16px; padding:0; line-height:1;
                ">&times;</button>
              </div>
              <div style="color:#6C6C6C; font-size:12px; margin-bottom:8px; line-height:1.4;">${place.description}</div>
              <div style="display:flex; gap:12px; color:#8C8C8C; font-size:12px;">
                <span>💰 ${place.cost.toLocaleString()}원</span>
                <span>⏱️ ${place.duration}분</span>
              </div>
              ${place.naver_link ? `<a href="${place.naver_link}" target="_blank" rel="noopener noreferrer" style="
                display:inline-flex; align-items:center; gap:4px; margin-top:8px;
                color:#1EC800; font-size:12px; font-weight:600; text-decoration:none;
              ">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <rect width="20" height="20" rx="4" fill="#1EC800"/>
                  <path d="M11.5 5.5V10.3L8.5 5.5H5.5V14.5H8.5V9.7L11.5 14.5H14.5V5.5H11.5Z" fill="white"/>
                </svg>
                네이버 지도에서 보기
              </a>` : ""}
            </div>
          `;

          const closeBtn = infoContent.querySelector(".kakao-popup-close");
          closeBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            closeActiveInfo();
          });

          const infoOverlay = new window.kakao.maps.CustomOverlay({
            position: position,
            content: infoContent,
            yAnchor: 1.5,
            zIndex: 10,
          });

          infoOverlay.setMap(map);
          activeInfoRef.current = infoOverlay;
        });

        const customOverlay = new window.kakao.maps.CustomOverlay({
          position: position,
          content: markerContent,
          yAnchor: 1.3,
        });

        customOverlay.setMap(map);
        overlaysRef.current.push(customOverlay);
      });

      if (linePath.length > 1) {
        const polyline = new window.kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 3,
          strokeColor: dayColor,
          strokeOpacity: 0.7,
          strokeStyle: "solid",
        });

        polyline.setMap(map);
        polylinesRef.current.push(polyline);
      }
    });

    if (hasPoints) {
      map.setBounds(bounds);
    }
  }, [schedule, selectedDay, closeActiveInfo]);

  // 지도 배경 클릭 시 팝업 닫기
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao?.maps) return;

    const listener = window.kakao.maps.event.addListener(map, "click", () => {
      closeActiveInfo();
    });

    return () => {
      if (map && window.kakao?.maps?.event) {
        window.kakao.maps.event.removeListener(listener);
      }
    };
  }, [isLoaded, closeActiveInfo]);

  // ESC 키로 전체화면 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // 전체화면 토글 시 relayout
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const timer = setTimeout(() => {
      map.relayout();
      renderMarkers();
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen, renderMarkers]);

  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY}&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        setIsLoaded(true);
      });
    };

    script.onerror = () => {
      console.error("카카오맵 스크립트 로드 실패");
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const options = {
      center: new window.kakao.maps.LatLng(33.3617, 126.5292),
      level: 10,
    };

    mapInstanceRef.current = new window.kakao.maps.Map(mapRef.current, options);
    renderMarkers();
  }, [isLoaded, renderMarkers]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      renderMarkers();
    }
  }, [selectedDay, schedule, renderMarkers]);

  return (
    <div
      className={`relative ${
        isFullscreen ? "fixed inset-0 z-[9999]" : ""
      }`}
    >
      <div
        ref={mapRef}
        style={{ width: "100%", height: isFullscreen ? "100vh" : "400px" }}
        className={`${isFullscreen ? "" : "rounded-xl"} overflow-hidden bg-[#F5F0E8]`}
      >
        {!isLoaded && (
          <div className="w-full h-full flex items-center justify-center text-[#8C8C8C]">
            지도 로딩 중...
          </div>
        )}
      </div>

      {/* 전체화면 토글 버튼 */}
      {isLoaded && (
        <button
          onClick={() => setIsFullscreen((prev) => !prev)}
          className="absolute top-3 right-3 z-10 bg-white border border-[#E8E4DE] rounded-lg px-3 py-2 text-sm text-[#4C4C4C] hover:border-[#2C2C2C] transition-all shadow-sm"
        >
          {isFullscreen ? "축소" : "전체화면"}
        </button>
      )}
    </div>
  );
}
