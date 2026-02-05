"use client";

import { DaySchedule, WeatherForecast, AgentAlert, AgentAlternative } from "@/lib/types";

interface TripData {
  schedule: DaySchedule[];
  budget: number;
  totalCost: number;
  startDate?: string;
}

class MonitoringAgent {
  private tripData: TripData;
  private monitoring: boolean = false;
  private interval: NodeJS.Timeout | null = null;
  private weatherCache: WeatherForecast[] = [];
  private lastWeatherCheck: number = 0;

  constructor(tripData: TripData) {
    this.tripData = tripData;
  }

  // Agent 시작
  start() {
    if (this.monitoring) return;

    this.monitoring = true;
    console.log("🤖 Monitoring Agent 시작");

    // 즉시 1회 실행
    this.runChecks();

    // 30분마다 실행
    this.interval = setInterval(() => {
      this.runChecks();
    }, 30 * 60 * 1000); // 30분
  }

  // Agent 중지
  stop() {
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("🤖 Monitoring Agent 중지");
  }

  // 모니터링 상태 반환
  isMonitoring(): boolean {
    return this.monitoring;
  }

  // 데이터 업데이트
  updateTripData(tripData: TripData) {
    this.tripData = tripData;
  }

  // 모든 체크 실행
  async runChecks() {
    console.log("🔍 모니터링 실행 중...");

    try {
      await Promise.all([
        this.checkWeather(),
        this.checkWaiting(),
        this.checkBudget(),
      ]);
    } catch (error) {
      console.error("모니터링 에러:", error);
    }
  }

  // 1. 날씨 체크
  async checkWeather() {
    const now = Date.now();

    // 캐시된 날씨가 30분 이내면 스킵
    if (now - this.lastWeatherCheck < 30 * 60 * 1000 && this.weatherCache.length > 0) {
      return;
    }

    try {
      const response = await fetch(`/api/weather?days=${this.tripData.schedule.length}`);
      if (!response.ok) return;

      const weather: WeatherForecast[] = await response.json();
      this.weatherCache = weather;
      this.lastWeatherCheck = now;

      // 각 날짜별 날씨 체크
      for (let dayIndex = 0; dayIndex < this.tripData.schedule.length; dayIndex++) {
        const day = this.tripData.schedule[dayIndex];
        const dayWeather = weather[dayIndex];

        if (!dayWeather) continue;

        // 비 예보 감지
        if (
          (dayWeather.condition === "비" || dayWeather.condition === "폭우") &&
          dayWeather.precipitation.chance >= 50
        ) {
          // 야외 장소가 있는지 체크
          const outdoorPlaces = day.places.filter((p) =>
            this.isOutdoorPlace(p.category, p.name)
          );

          if (outdoorPlaces.length > 0) {
            console.log(`⚠️ Day ${dayIndex + 1}: 비 예보 감지!`);
            await this.handleWeatherAlert(dayIndex, dayWeather, outdoorPlaces);
          }
        }

        // 강풍 감지
        if (dayWeather.condition === "강풍" || dayWeather.wind.isStrong) {
          const coastalPlaces = day.places.filter((p) =>
            this.isCoastalPlace(p.name)
          );

          if (coastalPlaces.length > 0) {
            console.log(`⚠️ Day ${dayIndex + 1}: 강풍 예보 감지!`);
            await this.handleWindAlert(dayIndex, dayWeather, coastalPlaces);
          }
        }
      }
    } catch (error) {
      console.error("날씨 체크 에러:", error);
    }
  }

  // 야외 장소 판별
  private isOutdoorPlace(category: string, name: string): boolean {
    const outdoorKeywords = [
      "해변", "해수욕장", "오름", "올레길", "폭포", "공원",
      "테마파크", "동물원", "수목원", "정원", "일출봉", "성산"
    ];
    return outdoorKeywords.some((kw) => name.includes(kw)) || category === "관광지";
  }

  // 해안가 장소 판별
  private isCoastalPlace(name: string): boolean {
    const coastalKeywords = [
      "해변", "해수욕장", "바다", "항구", "선착장", "해안",
      "용두암", "주상절리", "협재", "월정리", "함덕"
    ];
    return coastalKeywords.some((kw) => name.includes(kw));
  }

  // 2. 웨이팅 체크
  async checkWaiting() {
    for (let dayIndex = 0; dayIndex < this.tripData.schedule.length; dayIndex++) {
      const day = this.tripData.schedule[dayIndex];

      for (const place of day.places) {
        if (place.waitingInfo && place.waitingInfo.crowdLevel === "high") {
          // 방문 시간이 피크타임인지 체크
          const visitHour = parseInt(place.time.split(":")[0]);
          const isPeakTime = place.waitingInfo.peakHours.some((peak) => {
            const [start] = peak.split("-");
            const peakHour = parseInt(start.split(":")[0]);
            return Math.abs(visitHour - peakHour) <= 1;
          });

          if (isPeakTime) {
            console.log(`⚠️ ${place.name}: 웨이팅 예상`);
            this.handleWaitingAlert(dayIndex, place);
          }
        }
      }
    }
  }

  // 3. 예산 체크
  async checkBudget() {
    const { budget, totalCost } = this.tripData;

    if (totalCost > budget) {
      const overbudget = totalCost - budget;
      const percentage = (overbudget / budget) * 100;

      if (percentage > 10) {
        console.log("⚠️ 예산 초과 위험!");
        this.handleBudgetAlert(overbudget, percentage);
      }
    }
  }

  // 날씨 알림 처리
  private async handleWeatherAlert(
    dayIndex: number,
    weather: WeatherForecast,
    outdoorPlaces: { name: string; category: string }[]
  ) {
    const alternatives = await this.generateWeatherAlternatives(dayIndex, weather, outdoorPlaces);

    this.notifyUser({
      type: "weather",
      severity: weather.condition === "폭우" ? "high" : "medium",
      title: `☔ Day ${dayIndex + 1} 비 예보 감지!`,
      message: `${dayIndex + 1}일차에 ${weather.condition} 예보 (강수확률 ${weather.precipitation.chance}%). ${outdoorPlaces.map(p => p.name).join(", ")} 등 야외 일정 변경을 추천드려요.`,
      alternatives: alternatives,
      autoApply: alternatives[0],
    });
  }

  // 강풍 알림 처리
  private async handleWindAlert(
    dayIndex: number,
    weather: WeatherForecast,
    coastalPlaces: { name: string }[]
  ) {
    this.notifyUser({
      type: "weather",
      severity: "medium",
      title: `💨 Day ${dayIndex + 1} 강풍 예보!`,
      message: `${dayIndex + 1}일차에 강풍(${weather.wind.speed}m/s) 예보가 있어요. ${coastalPlaces.map(p => p.name).join(", ")} 방문 시 주의가 필요해요.`,
      alternatives: [
        {
          type: "reschedule",
          title: "내륙 장소로 변경",
          description: "해안가 대신 내륙의 실내 장소로 변경합니다.",
          pros: ["강풍 위험 회피", "안전한 여행"],
          cons: ["해안 풍경 못 봄"],
        },
      ],
    });
  }

  // 웨이팅 알림 처리
  private handleWaitingAlert(
    dayIndex: number,
    place: { name: string; time: string; waitingInfo?: { avgWaitTime: number; recommendedTime: string } }
  ) {
    this.notifyUser({
      type: "waiting",
      severity: "medium",
      title: `⏰ ${place.name} 웨이팅 예상`,
      message: `${place.name}에서 약 ${place.waitingInfo?.avgWaitTime || 30}분 웨이팅이 예상돼요.`,
      alternatives: [
        {
          type: "reschedule",
          title: "방문 시간 조정",
          description: `${place.waitingInfo?.recommendedTime || "피크타임 전후"}에 방문하면 웨이팅을 줄일 수 있어요.`,
          changes: [
            {
              from: place.time,
              to: place.waitingInfo?.recommendedTime || "11:00",
              reason: "웨이팅 최소화",
            },
          ],
          pros: ["웨이팅 시간 감소", "효율적인 일정"],
        },
        {
          type: "keep",
          title: "그냥 기다리기",
          description: "현재 시간대로 방문하고 웨이팅합니다.",
          pros: ["일정 변경 없음"],
          cons: ["대기 시간 발생"],
        },
      ],
    });
  }

  // 예산 알림 처리
  private handleBudgetAlert(overbudget: number, percentage: number) {
    this.notifyUser({
      type: "budget",
      severity: percentage > 20 ? "high" : "medium",
      title: "💰 예산 초과 예상",
      message: `현재 계획대로면 약 ${overbudget.toLocaleString()}원 초과 예상이에요 (${percentage.toFixed(1)}%).`,
      alternatives: [
        {
          type: "reduce",
          title: "비용 절감 추천",
          description: "일부 장소를 저렴한 대안으로 변경하거나 생략합니다.",
          budgetImpact: `-${overbudget.toLocaleString()}원`,
          pros: ["예산 내 여행 가능"],
          cons: ["일부 장소 변경 필요"],
        },
      ],
    });
  }

  // 날씨 대안 생성
  private async generateWeatherAlternatives(
    dayIndex: number,
    weather: WeatherForecast,
    outdoorPlaces: { name: string }[]
  ): Promise<AgentAlternative[]> {
    // 간단한 대안 생성 (GPT 호출 없이)
    const alternatives: AgentAlternative[] = [
      {
        type: "indoor",
        title: "실내 코스로 변경",
        description: "박물관, 카페, 실내 관광지 중심으로 변경합니다.",
        changes: outdoorPlaces.map((p) => ({
          from: p.name,
          to: "실내 대안 (박물관/카페)",
          reason: "비 예보로 인한 변경",
        })),
        budgetImpact: "비슷함",
        pros: ["비 걱정 없음", "계획대로 진행 가능"],
        cons: ["야외 풍경 못 봄"],
      },
      {
        type: "postpone",
        title: "다른 날로 이동",
        description: "야외 일정을 날씨 좋은 날로 옮깁니다.",
        pros: ["야외 활동 그대로 즐김"],
        cons: ["일정 재조정 필요"],
      },
      {
        type: "keep",
        title: "우산 챙기고 진행",
        description: "현재 일정대로 진행하되 우산과 우비를 준비합니다.",
        pros: ["일정 변경 없음"],
        cons: ["비 맞을 수 있음", "불편할 수 있음"],
      },
    ];

    return alternatives;
  }

  // 사용자 알림
  private notifyUser(alert: AgentAlert) {
    // CustomEvent로 알림 발생
    if (typeof window !== "undefined") {
      const event = new CustomEvent("agent-alert", {
        detail: alert,
      });
      window.dispatchEvent(event);
    }
  }
}

export default MonitoringAgent;
