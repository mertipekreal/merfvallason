export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface TikTokTimeSeries {
  soundId: string;
  dataPoints: TimeSeriesPoint[];
  totalViews: number;
  peakDate: string;
  peakViews: number;
}

export interface SpotifyTimeSeries {
  trackId: string;
  dataPoints: TimeSeriesPoint[];
  totalStreams: number;
  peakDate: string;
  peakStreams: number;
}

export interface BridgeAnalysis {
  bridgeStrength: number;
  lagHours: number;
  lagDays: number;
  correlation: number;
  tiktokPeakDate: string;
  spotifyPeakDate: string;
  verdict: string;
  insights: string[];
}

function generateDummyTimeSeries(
  baseValue: number,
  peakMultiplier: number,
  peakDayOffset: number,
  days: number = 30
): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const distanceFromPeak = Math.abs(i - peakDayOffset);
    const peakFactor = Math.exp(-distanceFromPeak * 0.15);
    const noise = 0.8 + Math.random() * 0.4;
    
    const value = Math.round(baseValue * (1 + (peakMultiplier - 1) * peakFactor) * noise);

    points.push({
      timestamp: date.toISOString().split("T")[0],
      value,
    });
  }

  return points;
}

export function getTikTokTimeSeries(soundId: string): TikTokTimeSeries {
  const peakDayOffset = 10 + Math.floor(Math.random() * 10);
  const baseViews = 50000 + Math.floor(Math.random() * 200000);
  const peakMultiplier = 3 + Math.random() * 7;

  const dataPoints = generateDummyTimeSeries(baseViews, peakMultiplier, peakDayOffset, 30);
  
  const peakPoint = dataPoints.reduce((max, point) => 
    point.value > max.value ? point : max, dataPoints[0]);
  
  const totalViews = dataPoints.reduce((sum, point) => sum + point.value, 0);

  return {
    soundId,
    dataPoints,
    totalViews,
    peakDate: peakPoint.timestamp,
    peakViews: peakPoint.value,
  };
}

export function getSpotifyTimeSeries(trackId: string): SpotifyTimeSeries {
  const peakDayOffset = 5 + Math.floor(Math.random() * 10);
  const baseStreams = 10000 + Math.floor(Math.random() * 50000);
  const peakMultiplier = 2 + Math.random() * 5;

  const dataPoints = generateDummyTimeSeries(baseStreams, peakMultiplier, peakDayOffset, 30);
  
  const peakPoint = dataPoints.reduce((max, point) => 
    point.value > max.value ? point : max, dataPoints[0]);
  
  const totalStreams = dataPoints.reduce((sum, point) => sum + point.value, 0);

  return {
    trackId,
    dataPoints,
    totalStreams,
    peakDate: peakPoint.timestamp,
    peakStreams: peakPoint.value,
  };
}

export function computeBridgeStrength(
  tiktokSeries: TikTokTimeSeries,
  spotifySeries: SpotifyTimeSeries
): BridgeAnalysis {
  const tiktokPeak = new Date(tiktokSeries.peakDate);
  const spotifyPeak = new Date(spotifySeries.peakDate);
  
  const lagMs = spotifyPeak.getTime() - tiktokPeak.getTime();
  const lagHours = Math.round(lagMs / (1000 * 60 * 60));
  const lagDays = Math.round(lagHours / 24);

  const tiktokValues = tiktokSeries.dataPoints.map(p => p.value);
  const spotifyValues = spotifySeries.dataPoints.map(p => p.value);
  
  const tiktokMean = tiktokValues.reduce((a, b) => a + b, 0) / tiktokValues.length;
  const spotifyMean = spotifyValues.reduce((a, b) => a + b, 0) / spotifyValues.length;
  
  let numerator = 0;
  let tiktokVar = 0;
  let spotifyVar = 0;
  
  for (let i = 0; i < Math.min(tiktokValues.length, spotifyValues.length); i++) {
    const tDiff = tiktokValues[i] - tiktokMean;
    const sDiff = spotifyValues[i] - spotifyMean;
    numerator += tDiff * sDiff;
    tiktokVar += tDiff * tDiff;
    spotifyVar += sDiff * sDiff;
  }
  
  const correlation = tiktokVar > 0 && spotifyVar > 0 
    ? numerator / Math.sqrt(tiktokVar * spotifyVar)
    : 0;

  let bridgeStrength: number;
  
  if (lagHours >= 0 && lagHours <= 168) {
    bridgeStrength = 80 + Math.random() * 15;
  } else if (lagHours > 168 && lagHours <= 336) {
    bridgeStrength = 60 + Math.random() * 20;
  } else if (lagHours < 0) {
    bridgeStrength = 30 + Math.random() * 20;
  } else {
    bridgeStrength = 20 + Math.random() * 30;
  }

  if (correlation > 0.5) {
    bridgeStrength = Math.min(100, bridgeStrength + 10);
  }

  bridgeStrength = Math.round(bridgeStrength);

  let verdict: string;
  if (bridgeStrength >= 80) {
    verdict = "Güçlü TikTok → Spotify Köprüsü";
  } else if (bridgeStrength >= 60) {
    verdict = "Orta Düzey Köprü Etkisi";
  } else if (bridgeStrength >= 40) {
    verdict = "Zayıf Köprü Bağlantısı";
  } else {
    verdict = "Belirgin Köprü Yok";
  }

  const insights: string[] = [];
  
  if (lagHours > 0 && lagHours <= 72) {
    insights.push(`TikTok viral olduktan ${lagHours} saat sonra Spotify'da peak - hızlı geçiş`);
  } else if (lagHours > 72 && lagHours <= 168) {
    insights.push(`${lagDays} günlük gecikme - tipik viral-to-stream dönüşüm süresi`);
  } else if (lagHours < 0) {
    insights.push("Spotify peak TikTok'tan önce - ters yönlü etki olabilir");
  }

  if (correlation > 0.7) {
    insights.push("Çok yüksek korelasyon - güçlü platform arası etki");
  } else if (correlation > 0.4) {
    insights.push("Orta düzey korelasyon - belirgin bağlantı mevcut");
  }

  const tiktokGrowth = tiktokSeries.peakViews / (tiktokSeries.totalViews / tiktokSeries.dataPoints.length);
  if (tiktokGrowth > 5) {
    insights.push(`TikTok'ta ${Math.round(tiktokGrowth)}x viral spike tespit edildi`);
  }

  const spotifyGrowth = spotifySeries.peakStreams / (spotifySeries.totalStreams / spotifySeries.dataPoints.length);
  if (spotifyGrowth > 3) {
    insights.push(`Spotify'da ${Math.round(spotifyGrowth)}x stream artışı`);
  }

  return {
    bridgeStrength,
    lagHours: Math.abs(lagHours),
    lagDays: Math.abs(lagDays),
    correlation: Math.round(correlation * 100) / 100,
    tiktokPeakDate: tiktokSeries.peakDate,
    spotifyPeakDate: spotifySeries.peakDate,
    verdict,
    insights,
  };
}
