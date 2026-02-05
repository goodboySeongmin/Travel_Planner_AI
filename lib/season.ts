export interface SeasonContext {
  month: number;
  season: string;
  weather: string;
  recommendation: string;
}

export function getSeasonContext(): SeasonContext {
  const month = new Date().getMonth() + 1;

  if (month >= 3 && month <= 5) {
    return {
      month,
      season: "봄",
      weather: "따뜻하고 화창한 날씨 (평균 10~20°C)",
      recommendation:
        "유채꽃, 벚꽃 명소 위주 추천. 야외 활동과 오름 트레킹에 적합한 계절입니다.",
    };
  }

  if (month >= 6 && month <= 8) {
    return {
      month,
      season: "여름",
      weather: "덥고 습한 날씨, 소나기 가능 (평균 23~33°C)",
      recommendation:
        "해수욕장, 물놀이 위주 추천. 비 올 때를 대비해 실내 대안 장소도 포함할 것.",
    };
  }

  if (month >= 9 && month <= 11) {
    return {
      month,
      season: "가을",
      weather: "선선하고 맑은 날씨 (평균 12~22°C)",
      recommendation:
        "한라산 단풍, 억새밭(새별오름, 산굼부리), 감귤 체험 위주 추천.",
    };
  }

  return {
    month,
    season: "겨울",
    weather: "쌀쌀하고 바람이 강함 (평균 3~10°C)",
    recommendation:
      "실내 관광지, 온천, 맛집 위주 추천. 한라산 눈꽃 트레킹도 고려.",
  };
}
