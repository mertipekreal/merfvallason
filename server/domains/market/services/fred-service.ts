/**
 * FRED (Federal Reserve Economic Data) Service
 * Free API for economic indicators critical for market prediction
 * 
 * Key Series:
 * - NASDAQCOM: Nasdaq Composite Daily
 * - VIXCLS: VIX Fear Index
 * - DGS10: 10-Year Treasury Yield
 * - T10Y2Y: Yield Curve (Recession Signal)
 * - UMCSENT: Consumer Sentiment
 * - UNRATE: Unemployment Rate
 * - FEDFUNDS: Federal Funds Rate
 * - CPIAUCSL: Consumer Price Index
 */

// FRED API is free but requires registration for API key
// For now, we use their public JSON endpoint (limited but functional)
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

export interface FREDSeries {
  id: string;
  title: string;
  observations: FREDObservation[];
  lastUpdated: Date;
}

export interface FREDObservation {
  date: string;
  value: number;
  realtime_start?: string;
  realtime_end?: string;
}

export interface EconomicIndicators {
  vix: number | null;
  vixChange: number;
  yieldCurve: number | null;  // T10Y2Y - negative = recession signal
  consumerSentiment: number | null;
  unemployment: number | null;
  fedFundsRate: number | null;
  nasdaqComposite: number | null;
  cpi: number | null;
  fearGreedSignal: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  recessionRisk: 'low' | 'moderate' | 'high' | 'imminent';
  lastUpdated: Date;
}

// Cache for FRED data (update every 6 hours for economic data)
let economicCache: EconomicIndicators | null = null;
let cacheTimestamp: Date | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Historical data for correlation analysis
interface HistoricalDataPoint {
  date: string;
  value: number;
}

const historicalCache: Record<string, HistoricalDataPoint[]> = {};

/**
 * Fetch FRED series data via public JSON (no API key required)
 * Limited to recent observations but sufficient for real-time analysis
 */
async function fetchFREDSeries(seriesId: string, limit: number = 30): Promise<FREDObservation[]> {
  try {
    // Use FRED's GeoFRED JSON endpoint (public, no key required)
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}&cosd=${getDateMonthsAgo(3)}&coed=${getTodayDate()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[FRED] Failed to fetch ${seriesId}: ${response.status}`);
      return [];
    }
    
    const csvText = await response.text();
    const observations = parseCSVToObservations(csvText, seriesId);
    
    console.log(`[FRED] Fetched ${observations.length} observations for ${seriesId}`);
    return observations.slice(-limit);
  } catch (error: any) {
    console.error(`[FRED] Error fetching ${seriesId}:`, error.message);
    return [];
  }
}

function parseCSVToObservations(csv: string, seriesId: string): FREDObservation[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const observations: FREDObservation[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const [date, valueStr] = lines[i].split(',');
    if (date && valueStr && valueStr !== '.' && valueStr !== 'NA') {
      const value = parseFloat(valueStr);
      if (!isNaN(value)) {
        observations.push({ date: date.trim(), value });
      }
    }
  }
  
  return observations;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}

/**
 * Get latest value from observations
 */
function getLatestValue(observations: FREDObservation[]): number | null {
  if (observations.length === 0) return null;
  return observations[observations.length - 1].value;
}

/**
 * Calculate change from previous observation
 */
function getChange(observations: FREDObservation[]): number {
  if (observations.length < 2) return 0;
  const current = observations[observations.length - 1].value;
  const previous = observations[observations.length - 2].value;
  return current - previous;
}

/**
 * Determine Fear/Greed signal from VIX
 * VIX < 15: Extreme Greed (complacency)
 * VIX 15-20: Greed
 * VIX 20-25: Neutral
 * VIX 25-35: Fear
 * VIX > 35: Extreme Fear (panic)
 */
function calculateFearGreedFromVIX(vix: number | null): EconomicIndicators['fearGreedSignal'] {
  if (vix === null) return 'neutral';
  if (vix < 15) return 'extreme_greed';
  if (vix < 20) return 'greed';
  if (vix < 25) return 'neutral';
  if (vix < 35) return 'fear';
  return 'extreme_fear';
}

/**
 * Calculate recession risk from yield curve
 * T10Y2Y > 0.5: Low risk
 * T10Y2Y 0 to 0.5: Moderate risk
 * T10Y2Y -0.5 to 0: High risk (curve flattening)
 * T10Y2Y < -0.5: Imminent (inverted curve)
 */
function calculateRecessionRisk(yieldCurve: number | null): EconomicIndicators['recessionRisk'] {
  if (yieldCurve === null) return 'moderate';
  if (yieldCurve > 0.5) return 'low';
  if (yieldCurve > 0) return 'moderate';
  if (yieldCurve > -0.5) return 'high';
  return 'imminent';
}

/**
 * Fetch all economic indicators
 */
export async function fetchEconomicIndicators(forceRefresh: boolean = false): Promise<EconomicIndicators> {
  // Return cached data if valid
  if (!forceRefresh && economicCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp.getTime();
    if (age < CACHE_TTL) {
      console.log(`[FRED] Returning cached indicators (${Math.round(age / 60000)}min old)`);
      return economicCache;
    }
  }
  
  console.log('[FRED] Fetching fresh economic indicators...');
  
  // Fetch all series in parallel
  const [vixObs, yieldObs, sentimentObs, unemploymentObs, fedObs, nasdaqObs, cpiObs] = await Promise.all([
    fetchFREDSeries('VIXCLS', 30),      // VIX
    fetchFREDSeries('T10Y2Y', 30),      // Yield Curve
    fetchFREDSeries('UMCSENT', 12),     // Consumer Sentiment (monthly)
    fetchFREDSeries('UNRATE', 12),      // Unemployment (monthly)
    fetchFREDSeries('FEDFUNDS', 12),    // Fed Funds Rate (monthly)
    fetchFREDSeries('NASDAQCOM', 30),   // Nasdaq Composite
    fetchFREDSeries('CPIAUCSL', 12),    // CPI (monthly)
  ]);
  
  // Store for historical analysis
  historicalCache['VIXCLS'] = vixObs;
  historicalCache['T10Y2Y'] = yieldObs;
  historicalCache['NASDAQCOM'] = nasdaqObs;
  
  const vix = getLatestValue(vixObs);
  const yieldCurve = getLatestValue(yieldObs);
  
  economicCache = {
    vix,
    vixChange: getChange(vixObs),
    yieldCurve,
    consumerSentiment: getLatestValue(sentimentObs),
    unemployment: getLatestValue(unemploymentObs),
    fedFundsRate: getLatestValue(fedObs),
    nasdaqComposite: getLatestValue(nasdaqObs),
    cpi: getLatestValue(cpiObs),
    fearGreedSignal: calculateFearGreedFromVIX(vix),
    recessionRisk: calculateRecessionRisk(yieldCurve),
    lastUpdated: new Date(),
  };
  
  cacheTimestamp = new Date();
  
  console.log(`[FRED] Economic indicators updated:`, {
    vix: economicCache.vix,
    yieldCurve: economicCache.yieldCurve,
    fearGreed: economicCache.fearGreedSignal,
    recessionRisk: economicCache.recessionRisk,
  });
  
  return economicCache;
}

/**
 * Get historical data for correlation analysis with dreams/sentiment
 */
export async function getHistoricalForCorrelation(seriesId: string, days: number = 90): Promise<HistoricalDataPoint[]> {
  if (historicalCache[seriesId] && historicalCache[seriesId].length > 0) {
    return historicalCache[seriesId];
  }
  
  const observations = await fetchFREDSeries(seriesId, days);
  historicalCache[seriesId] = observations.map(o => ({ date: o.date, value: o.value }));
  return historicalCache[seriesId];
}

/**
 * Calculate correlation between economic indicator and sentiment/dream data
 */
export function calculateCorrelation(series1: number[], series2: number[]): number {
  if (series1.length !== series2.length || series1.length < 3) return 0;
  
  const n = series1.length;
  const mean1 = series1.reduce((a, b) => a + b, 0) / n;
  const mean2 = series2.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = series1[i] - mean1;
    const diff2 = series2[i] - mean2;
    numerator += diff1 * diff2;
    denom1 += diff1 * diff1;
    denom2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(denom1 * denom2);
  if (denominator === 0) return 0;
  
  return numerator / denominator;
}

/**
 * Get market regime based on economic indicators
 */
export function getMarketRegime(indicators: EconomicIndicators): {
  regime: 'risk_on' | 'risk_off' | 'transition';
  confidence: number;
  factors: string[];
} {
  const factors: string[] = [];
  let riskScore = 0; // Higher = more risk-on
  
  // VIX analysis
  if (indicators.vix !== null) {
    if (indicators.vix < 20) {
      riskScore += 2;
      factors.push('VIX düşük (risk iştahı yüksek)');
    } else if (indicators.vix > 30) {
      riskScore -= 2;
      factors.push('VIX yüksek (korku hakim)');
    }
    
    if (indicators.vixChange < -2) {
      riskScore += 1;
      factors.push('VIX düşüyor (sakinleşme)');
    } else if (indicators.vixChange > 2) {
      riskScore -= 1;
      factors.push('VIX yükseliyor (endişe artıyor)');
    }
  }
  
  // Yield curve
  if (indicators.yieldCurve !== null) {
    if (indicators.yieldCurve > 0.5) {
      riskScore += 1;
      factors.push('Verim eğrisi normal');
    } else if (indicators.yieldCurve < 0) {
      riskScore -= 2;
      factors.push('Verim eğrisi tersine döndü (resesyon sinyali)');
    }
  }
  
  // Consumer sentiment
  if (indicators.consumerSentiment !== null) {
    if (indicators.consumerSentiment > 80) {
      riskScore += 1;
      factors.push('Tüketici güveni yüksek');
    } else if (indicators.consumerSentiment < 60) {
      riskScore -= 1;
      factors.push('Tüketici güveni düşük');
    }
  }
  
  // Determine regime
  const confidence = Math.min(Math.abs(riskScore) / 5, 1);
  
  if (riskScore >= 2) {
    return { regime: 'risk_on', confidence, factors };
  } else if (riskScore <= -2) {
    return { regime: 'risk_off', confidence, factors };
  } else {
    return { regime: 'transition', confidence: 0.5, factors };
  }
}

/**
 * Get complete FRED analysis for market prediction
 */
export async function getFREDAnalysis(): Promise<{
  indicators: EconomicIndicators;
  regime: ReturnType<typeof getMarketRegime>;
  signals: string[];
  marketBias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
}> {
  const indicators = await fetchEconomicIndicators();
  const regime = getMarketRegime(indicators);
  
  const signals: string[] = [];
  let biasScore = 0;
  
  // Fear/Greed signal
  if (indicators.fearGreedSignal === 'extreme_fear') {
    signals.push('Aşırı korku = Potansiyel dip (kontrarian alım fırsatı)');
    biasScore += 1; // Contrarian bullish
  } else if (indicators.fearGreedSignal === 'extreme_greed') {
    signals.push('Aşırı açgözlülük = Potansiyel tepe (dikkatli ol)');
    biasScore -= 1; // Contrarian bearish
  }
  
  // Recession risk
  if (indicators.recessionRisk === 'imminent') {
    signals.push('UYARI: Verim eğrisi tersine döndü - Resesyon riski çok yüksek');
    biasScore -= 2;
  } else if (indicators.recessionRisk === 'high') {
    signals.push('DİKKAT: Verim eğrisi düzleşiyor - Resesyon riski artıyor');
    biasScore -= 1;
  }
  
  // VIX spike detection
  if (indicators.vixChange > 5) {
    signals.push('VIX ani yükseliş - Panik satış olabilir');
  } else if (indicators.vixChange < -5) {
    signals.push('VIX hızlı düşüş - Piyasa sakinleşiyor');
  }
  
  // Market bias
  let marketBias: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (biasScore >= 1) marketBias = 'bullish';
  else if (biasScore <= -1) marketBias = 'bearish';
  
  return {
    indicators,
    regime,
    signals,
    marketBias,
    confidence: regime.confidence,
  };
}

export const fredService = {
  fetchEconomicIndicators,
  getHistoricalForCorrelation,
  calculateCorrelation,
  getMarketRegime,
  getFREDAnalysis,
};
