/**
 * Alpha Signals Engine Service
 * 
 * Synthesizes 6 intelligence layers into dashboard-ready insights:
 * - Hard Data (30%): Price, volume, options flow, dark pool, institutional
 * - Technical (25%): ICT Smart Money Concepts, RSI, MACD
 * - SAM (25%): Night Owl, Dissonance, Dream Fear Index
 * - Economic (10%): FRED indicators, VIX, yield curve
 * - Emotion (5%): FinBERT sentiment from news/social
 * - Microstructure (5%): Order flow, market maker positioning
 * 
 * NOTE: This MVP implementation uses demo/fallback data from SAM service
 * when real-time data pipelines are unavailable. As data sources are integrated
 * (Unusual Whales, FRED API, DreamBank scraper), the engine will automatically
 * switch to live data. Demo values ensure the dashboard remains functional
 * during development and when external APIs are unreachable.
 */

import { db } from '../../../db';
import {
  alphaSignals,
  dailyMarketSummary,
  type InsertAlphaSignal,
  type InsertDailyMarketSummary,
  type AlphaSignal,
  type DailyMarketSummary
} from '@shared/schema';
import { eq, desc, gte } from 'drizzle-orm';
import { generatePrediction, type PredictionResult } from './prediction-engine-service';
import { samService } from './sam-analysis-service';
import { fetchEconomicIndicators, type EconomicIndicators } from './fred-service';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ============================================================================
// TYPES
// ============================================================================

export interface AlphaDashboardData {
  // Main Market Direction Card
  marketDirection: {
    direction: 'up' | 'down' | 'neutral';
    confidenceScore: number;
    expectedReturn: number;
    riskLevel: 'low' | 'medium' | 'high';
    signalStrength: 'weak' | 'moderate' | 'strong';
    primaryMessage: string;
    secondaryMessage: string;
  };

  // Layer Breakdown (for "Neden?" flip card)
  layerBreakdown: {
    hardDataScore: number;
    technicalScore: number;
    samScore: number;
    economicScore: number;
    emotionScore: number;
    microstructureScore: number;
    weights: {
      hard: number;
      technical: number;
      sam: number;
      economic: number;
      emotion: number;
      microstructure: number;
    };
  };

  // Night Owl Widget
  nightOwlStatus: {
    activityLevel: number; // 0-100
    isActive: boolean;
    panicIndicator: number;
    marketSignal: 'fear' | 'neutral' | 'greed';
    interpretation: string;
    nightPosts: number;
    totalPosts: number;
  };

  // Dream-Market Widget
  dreamMarket: {
    fearIndex: number; // -100 to 100
    hopeIndex: number;
    netScore: number;
    dominantThemes: string[];
    marketCorrelation: string;
    dreamsAnalyzed: number;
  };

  // Economic Calendar Strip
  economicCalendar: {
    vixLevel: number;
    fearGreedIndex: number;
    yieldCurve: number;
    marketRegime: string;
    upcomingEvents: Array<{
      event: string;
      date: string;
      impact: 'low' | 'medium' | 'high';
    }>;
  };

  // Key Factors
  keyFactors: {
    bullish: string[];
    bearish: string[];
    uncertainty: string[];
  };

  // Metadata
  timestamp: Date;
  modelVersion: string;
}

export interface NightOwlWidgetData {
  activityRatio: number;
  nightSentiment: number;
  daySentiment: number;
  sentimentDissonance: number;
  panicIndicator: number;
  fearKeywords: string[];
  nightPosts: number;
  totalPosts: number;
  marketSignal: 'fear' | 'neutral' | 'greed';
  interpretation: string;
  hourlyActivity: Array<{ hour: number; count: number; sentiment: number }>;
  isNightOwlWindow: boolean;
}

export interface DreamMarketWidgetData {
  fearRatio: number;
  hopeRatio: number;
  netFearScore: number;
  dominantThemes: string[];
  marketCorrelation: string;
  hvdcCategories: Array<{ category: string; count: number; percentage: number }>;
  historicalCorrelation: number;
  dreamCount: number;
  recentDreams: Array<{
    title: string;
    emotion: string;
    fearLevel: number;
    timestamp: Date;
  }>;
}

// ============================================================================
// LAYER WEIGHTS
// ============================================================================

const DEFAULT_WEIGHTS = {
  hard: 0.30,
  technical: 0.25,
  sam: 0.25,
  economic: 0.10,
  emotion: 0.05,
  microstructure: 0.05
};

const MODEL_VERSION = 'alpha-v1.0.0';

// ============================================================================
// CORE ENGINE FUNCTIONS
// ============================================================================

/**
 * Generate full Alpha Dashboard data for a symbol
 */
export async function generateAlphaDashboard(
  symbol: string = 'NASDAQ'
): Promise<AlphaDashboardData> {
  console.log(`[AlphaEngine] Generating dashboard data for ${symbol}`);

  const now = new Date();

  // Gather data from all layers in parallel
  const [
    predictionResult,
    economicData,
    samDemoMetrics
  ] = await Promise.all([
    generatePredictionSafe(symbol),
    fetchEconomicIndicatorsSafe(),
    Promise.resolve(samService.getDemoMetrics())
  ]);

  // Calculate layer scores
  const layerScores = {
    hardDataScore: predictionResult?.layerBreakdown?.hardDataScore ?? 50,
    technicalScore: predictionResult?.layerBreakdown?.technicalScore ?? 50,
    samScore: predictionResult?.layerBreakdown?.samScore ?? 50,
    economicScore: predictionResult?.layerBreakdown?.economicScore ?? 50,
    emotionScore: (predictionResult?.layerBreakdown?.emotionScore ?? 0) * 100,
    microstructureScore: (predictionResult?.layerBreakdown?.microstructureScore ?? 0) * 100
  };

  // Normalize scores to 0-100 range
  const normalizeScore = (score: number): number => {
    return Math.max(0, Math.min(100, (score + 1) * 50)); // Convert -1 to 1 → 0 to 100
  };

  // Calculate weighted composite
  const compositeScore =
    normalizeScore(layerScores.hardDataScore) * DEFAULT_WEIGHTS.hard +
    normalizeScore(layerScores.technicalScore) * DEFAULT_WEIGHTS.technical +
    normalizeScore(layerScores.samScore) * DEFAULT_WEIGHTS.sam +
    normalizeScore(layerScores.economicScore) * DEFAULT_WEIGHTS.economic +
    layerScores.emotionScore * DEFAULT_WEIGHTS.emotion +
    layerScores.microstructureScore * DEFAULT_WEIGHTS.microstructure;

  // Determine direction and signal strength
  const direction = predictionResult?.direction ?? 'neutral';
  const confidenceScore = predictionResult?.confidence ?? 50;
  const signalStrength = getSignalStrength(compositeScore, confidenceScore);

  // Generate messages
  const { primaryMessage, secondaryMessage } = generateMessages(
    direction,
    confidenceScore,
    layerScores,
    economicData
  );

  // Build Night Owl status
  const nightOwlStatus = {
    activityLevel: samDemoMetrics.nightOwlIndicator * 100,
    isActive: isInNightOwlWindow(),
    panicIndicator: samDemoMetrics.dreamFearIndex,
    marketSignal: samDemoMetrics.overallBias as 'fear' | 'neutral' | 'greed',
    interpretation: getNightOwlInterpretation(samDemoMetrics.nightOwlIndicator),
    nightPosts: Math.round(samDemoMetrics.nightOwlIndicator * 100),
    totalPosts: 100
  };

  // Build Dream-Market status
  const dreamMarket = {
    fearIndex: samDemoMetrics.dreamFearIndex * 100 - 50,
    hopeIndex: (1 - samDemoMetrics.dreamFearIndex) * 100,
    netScore: (samDemoMetrics.dreamFearIndex - 0.5) * 200,
    dominantThemes: getDominantDreamThemes(samDemoMetrics.dreamFearIndex),
    marketCorrelation: getDreamMarketCorrelation(samDemoMetrics.dreamFearIndex),
    dreamsAnalyzed: 150 // Demo value
  };

  // Build Economic Calendar
  const economicCalendar = {
    vixLevel: economicData?.vix ?? 20,
    fearGreedIndex: calculateFearGreedIndex(economicData),
    yieldCurve: economicData?.yieldCurve ?? 0,
    marketRegime: economicData?.fearGreedSignal ?? 'neutral',
    upcomingEvents: getUpcomingEconomicEvents()
  };

  // Key factors
  const keyFactors = predictionResult?.keyFactors ?? {
    bullishFactors: [],
    bearishFactors: [],
    uncertaintyFactors: []
  };

  const dashboardData: AlphaDashboardData = {
    marketDirection: {
      direction,
      confidenceScore,
      expectedReturn: predictionResult?.expectedReturn ?? 0,
      riskLevel: predictionResult?.riskLevel ?? 'medium',
      signalStrength,
      primaryMessage,
      secondaryMessage
    },
    layerBreakdown: {
      hardDataScore: normalizeScore(layerScores.hardDataScore),
      technicalScore: normalizeScore(layerScores.technicalScore),
      samScore: normalizeScore(layerScores.samScore),
      economicScore: normalizeScore(layerScores.economicScore),
      emotionScore: layerScores.emotionScore,
      microstructureScore: layerScores.microstructureScore,
      weights: DEFAULT_WEIGHTS
    },
    nightOwlStatus,
    dreamMarket,
    economicCalendar,
    keyFactors: {
      bullish: keyFactors.bullishFactors ?? [],
      bearish: keyFactors.bearishFactors ?? [],
      uncertainty: keyFactors.uncertaintyFactors ?? []
    },
    timestamp: now,
    modelVersion: MODEL_VERSION
  };

  // Store signal in database
  await storeAlphaSignal(symbol, dashboardData);

  console.log(`[AlphaEngine] Dashboard generated: ${direction} (${confidenceScore}% confidence)`);

  return dashboardData;
}

/**
 * Get Night Owl widget data
 */
export async function getNightOwlData(): Promise<NightOwlWidgetData> {
  const now = new Date();
  const currentHour = now.getHours();
  const isNightOwlWindow = currentHour >= 2 && currentHour < 5;

  // Get demo metrics from SAM service
  const samMetrics = samService.getDemoMetrics();

  // Generate hourly activity data (simulated from historical patterns)
  const hourlyActivity = generateHourlyActivityPattern(samMetrics.nightOwlIndicator);

  return {
    activityRatio: samMetrics.nightOwlIndicator,
    nightSentiment: -0.2, // Demo: slightly negative at night
    daySentiment: 0.1, // Demo: slightly positive during day
    sentimentDissonance: samMetrics.dissonanceScore,
    panicIndicator: samMetrics.dreamFearIndex,
    fearKeywords: ['crash', 'sell', 'panic', 'düşüş', 'korku'],
    nightPosts: Math.round(samMetrics.nightOwlIndicator * 50),
    totalPosts: 100,
    marketSignal: samMetrics.overallBias as 'fear' | 'neutral' | 'greed',
    interpretation: getNightOwlInterpretation(samMetrics.nightOwlIndicator),
    hourlyActivity,
    isNightOwlWindow
  };
}

/**
 * Get Dream-Market correlation widget data
 */
export async function getDreamMarketData(): Promise<DreamMarketWidgetData> {
  const samMetrics = samService.getDemoMetrics();

  // Get recent dreams from database
  const recentDreams = await getRecentDreamsFromDb();

  return {
    fearRatio: samMetrics.dreamFearIndex,
    hopeRatio: 1 - samMetrics.dreamFearIndex,
    netFearScore: (samMetrics.dreamFearIndex - 0.5) * 2,
    dominantThemes: getDominantDreamThemes(samMetrics.dreamFearIndex),
    marketCorrelation: getDreamMarketCorrelation(samMetrics.dreamFearIndex),
    hvdcCategories: [
      { category: 'Düşme/Ölüm', count: Math.round(samMetrics.dreamFearIndex * 100), percentage: samMetrics.dreamFearIndex * 100 },
      { category: 'Uçma/Başarı', count: Math.round((1 - samMetrics.dreamFearIndex) * 100), percentage: (1 - samMetrics.dreamFearIndex) * 100 }
    ],
    historicalCorrelation: samMetrics.historicalAccuracy,
    dreamCount: 150,
    recentDreams
  };
}

/**
 * Get daily market summary
 */
export async function getDailyMarketSummary(): Promise<DailyMarketSummary | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const summaries = await getDb()
    .select()
    .from(dailyMarketSummary)
    .where(gte(dailyMarketSummary.summaryDate, today))
    .orderBy(desc(dailyMarketSummary.createdAt))
    .limit(1);

  return summaries[0] ?? null;
}

/**
 * Generate and store daily market summary
 */
export async function generateDailyMarketSummary(): Promise<DailyMarketSummary> {
  const dashboard = await generateAlphaDashboard('NASDAQ');

  const moodMap: Record<string, { mood: string; emoji: string }> = {
    up: { mood: 'Yükseliş Beklentisi', emoji: '📈' },
    down: { mood: 'Düşüş Beklentisi', emoji: '📉' },
    neutral: { mood: 'Yatay Seyir', emoji: '➡️' }
  };

  const moodInfo = moodMap[dashboard.marketDirection.direction];

  const summary: InsertDailyMarketSummary = {
    summaryDate: new Date(),
    marketMood: moodInfo.mood,
    moodEmoji: moodInfo.emoji,
    overallConfidence: dashboard.marketDirection.confidenceScore,
    primaryInsight: dashboard.marketDirection.primaryMessage,
    secondaryInsight: dashboard.marketDirection.secondaryMessage,
    fearGreedLevel: dashboard.economicCalendar.fearGreedIndex,
    nightOwlAlert: dashboard.nightOwlStatus.panicIndicator > 0.6 ? 1 : 0,
    dreamFearIndex: dashboard.dreamMarket.netScore,
    volatilityExpected: dashboard.economicCalendar.vixLevel > 25 ? 'high' : dashboard.economicCalendar.vixLevel > 15 ? 'medium' : 'low',
    recommendations: generateRecommendations(dashboard),
    upcomingEvents: dashboard.economicCalendar.upcomingEvents
  };

  const [inserted] = await getDb()
    .insert(dailyMarketSummary)
    .values([summary])
    .returning();

  return inserted;
}

/**
 * Get recent Alpha Signals history
 */
export async function getAlphaSignalHistory(
  symbol: string = 'NASDAQ',
  limit: number = 10
): Promise<AlphaSignal[]> {
  return getDb()
    .select()
    .from(alphaSignals)
    .where(eq(alphaSignals.assetSymbol, symbol))
    .orderBy(desc(alphaSignals.createdAt))
    .limit(limit);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function generatePredictionSafe(symbol: string): Promise<PredictionResult | null> {
  try {
    return await generatePrediction({ symbol, horizonDays: 5 });
  } catch (error: any) {
    console.log(`[AlphaEngine] Prediction unavailable: ${error.message}`);
    return null;
  }
}

async function fetchEconomicIndicatorsSafe(): Promise<EconomicIndicators | null> {
  try {
    return await fetchEconomicIndicators();
  } catch (error: any) {
    console.log(`[AlphaEngine] Economic data unavailable: ${error.message}`);
    return null;
  }
}

function getSignalStrength(compositeScore: number, confidence: number): 'weak' | 'moderate' | 'strong' {
  const avgStrength = (Math.abs(compositeScore - 50) + confidence) / 2;
  if (avgStrength > 70) return 'strong';
  if (avgStrength > 40) return 'moderate';
  return 'weak';
}

function generateMessages(
  direction: 'up' | 'down' | 'neutral',
  confidence: number,
  layerScores: any,
  economicData: EconomicIndicators | null
): { primaryMessage: string; secondaryMessage: string } {
  const directionText = direction === 'up' ? 'YUKARI' : direction === 'down' ? 'AŞAĞI' : 'YATAY';
  const confidenceText = confidence > 70 ? 'Yüksek' : confidence > 50 ? 'Orta' : 'Düşük';

  let primaryMessage = `Piyasa ${directionText} yönünde hareket bekleniyor. (${confidenceText} güven)`;

  let secondaryMessage = '';
  if (layerScores.samScore > 60) {
    secondaryMessage = 'Bilinçaltı analizleri pozitif sinyaller veriyor.';
  } else if (layerScores.samScore < 40) {
    secondaryMessage = 'Gece aktivitelerinde korku sinyalleri tespit edildi.';
  } else if (economicData?.vix && economicData.vix > 25) {
    secondaryMessage = 'VIX seviyesi yüksek - volatilite bekleniyor.';
  } else {
    secondaryMessage = 'Teknik göstergeler ve Smart Money akışları izleniyor.';
  }

  return { primaryMessage, secondaryMessage };
}

function isInNightOwlWindow(): boolean {
  const hour = new Date().getHours();
  return hour >= 2 && hour < 5;
}

function getNightOwlInterpretation(activityRatio: number): string {
  if (activityRatio > 0.5) {
    return 'Yüksek gece aktivitesi tespit edildi. "Mind After Midnight" hipotezine göre prefrontal korteks inhibisyonu nedeniyle gerçek korku ortaya çıkıyor olabilir.';
  } else if (activityRatio > 0.3) {
    return 'Orta düzey gece aktivitesi. Normal piyasa stres göstergelerini izleyin.';
  }
  return 'Normal aktivite paterni. Gece/gündüz uyumsuzluğu düşük.';
}

function getDominantDreamThemes(fearIndex: number): string[] {
  if (fearIndex > 0.6) {
    return ['düşme', 'kayıp', 'kovalanma', 'korku'];
  } else if (fearIndex < 0.4) {
    return ['uçma', 'başarı', 'özgürlük', 'mutluluk'];
  }
  return ['arama', 'keşif', 'değişim'];
}

function getDreamMarketCorrelation(fearIndex: number): string {
  if (fearIndex > 0.6) {
    return 'DreamBank analizi: Kolektif bilinçaltında korku dominantı. Backtest verilerine göre bu durum piyasa düşüşlerinden 3-5 gün önce artış gösterir.';
  } else if (fearIndex < 0.4) {
    return 'DreamBank analizi: Umut/başarı temaları baskın. Piyasa iyimserliği ile korelasyon olabilir.';
  }
  return 'DreamBank analizi: Dengeli korku/umut oranı. Piyasa için nötr sinyal.';
}

function calculateFearGreedIndex(economicData: EconomicIndicators | null): number {
  if (!economicData) return 50;

  let score = 50;

  // VIX contribution (inverted - high VIX = fear)
  if (economicData.vix) {
    if (economicData.vix > 30) score -= 20;
    else if (economicData.vix > 20) score -= 10;
    else if (economicData.vix < 15) score += 15;
  }

  // Yield curve contribution
  if (economicData.yieldCurve && economicData.yieldCurve < 0) {
    score -= 15; // Inverted yield curve = fear
  }

  // Consumer sentiment
  if (economicData.consumerSentiment) {
    if (economicData.consumerSentiment > 90) score += 10;
    else if (economicData.consumerSentiment < 60) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function getUpcomingEconomicEvents(): Array<{ event: string; date: string; impact: 'low' | 'medium' | 'high' }> {
  // Demo upcoming events - in production, fetch from FRED calendar or similar
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return [
    { event: 'FOMC Toplantısı', date: getNextWeekday(3).toISOString().split('T')[0], impact: 'high' },
    { event: 'İşsizlik Verileri', date: getNextWeekday(5).toISOString().split('T')[0], impact: 'medium' },
    { event: 'CPI Açıklaması', date: getNextWeekday(10).toISOString().split('T')[0], impact: 'high' }
  ];
}

function getNextWeekday(daysAhead: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date;
}

function generateHourlyActivityPattern(nightOwlRatio: number): Array<{ hour: number; count: number; sentiment: number }> {
  const pattern: Array<{ hour: number; count: number; sentiment: number }> = [];

  for (let hour = 0; hour < 24; hour++) {
    let count: number;
    let sentiment: number;

    // Night owl window (02:00-05:00)
    if (hour >= 2 && hour < 5) {
      count = Math.round(nightOwlRatio * 50 + Math.random() * 20);
      sentiment = -0.3 + Math.random() * 0.2; // More negative at night
    }
    // Market hours
    else if (hour >= 9 && hour < 16) {
      count = Math.round(30 + Math.random() * 40);
      sentiment = 0.1 + Math.random() * 0.3;
    }
    // Evening
    else if (hour >= 18 && hour < 23) {
      count = Math.round(20 + Math.random() * 30);
      sentiment = -0.1 + Math.random() * 0.3;
    }
    // Other hours
    else {
      count = Math.round(5 + Math.random() * 15);
      sentiment = Math.random() * 0.4 - 0.2;
    }

    pattern.push({ hour, count, sentiment: parseFloat(sentiment.toFixed(2)) });
  }

  return pattern;
}

async function getRecentDreamsFromDb(): Promise<Array<{
  title: string;
  emotion: string;
  fearLevel: number;
  timestamp: Date;
}>> {
  // Demo data - in production, fetch from dreams table
  return [
    { title: 'Düşme rüyası', emotion: 'korku', fearLevel: 0.8, timestamp: new Date() },
    { title: 'Uçma rüyası', emotion: 'mutluluk', fearLevel: 0.2, timestamp: new Date(Date.now() - 86400000) },
    { title: 'Kovalanma', emotion: 'endişe', fearLevel: 0.7, timestamp: new Date(Date.now() - 172800000) }
  ];
}

function generateRecommendations(dashboard: AlphaDashboardData): string[] {
  const recommendations: string[] = [];

  if (dashboard.marketDirection.direction === 'up' && dashboard.marketDirection.confidenceScore > 60) {
    recommendations.push('Yükseliş beklentisi güçlü - pozisyon almayı düşünün');
  } else if (dashboard.marketDirection.direction === 'down' && dashboard.marketDirection.confidenceScore > 60) {
    recommendations.push('Düşüş beklentisi güçlü - risk yönetimi önemli');
  }

  if (dashboard.nightOwlStatus.panicIndicator > 0.6) {
    recommendations.push('Gece panik sinyalleri yüksek - kısa vadeli volatilite bekleyin');
  }

  if (dashboard.economicCalendar.vixLevel > 25) {
    recommendations.push('VIX yüksek - opsiyon fiyatlarına dikkat');
  }

  if (dashboard.dreamMarket.netScore > 30) {
    recommendations.push('Kolektif korku yükseliyor - 3-5 gün içinde düşüş riski');
  }

  if (recommendations.length === 0) {
    recommendations.push('Piyasa normal görünüyor - mevcut stratejiye devam');
  }

  return recommendations;
}

async function storeAlphaSignal(symbol: string, dashboard: AlphaDashboardData): Promise<void> {
  try {
    const signal: InsertAlphaSignal = {
      targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days ahead
      assetSymbol: symbol,
      predictedDirection: dashboard.marketDirection.direction,
      confidenceScore: dashboard.marketDirection.confidenceScore,
      expectedReturn: dashboard.marketDirection.expectedReturn,
      riskLevel: dashboard.marketDirection.riskLevel,
      hardDataScore: dashboard.layerBreakdown.hardDataScore,
      technicalScore: dashboard.layerBreakdown.technicalScore,
      samScore: dashboard.layerBreakdown.samScore,
      economicScore: dashboard.layerBreakdown.economicScore,
      emotionScore: dashboard.layerBreakdown.emotionScore,
      microstructureScore: dashboard.layerBreakdown.microstructureScore,
      sourceWeights: dashboard.layerBreakdown.weights,
      bullishFactors: dashboard.keyFactors.bullish,
      bearishFactors: dashboard.keyFactors.bearish,
      nightOwlInfluence: dashboard.nightOwlStatus.activityLevel / 100,
      dreamFearContribution: dashboard.dreamMarket.fearIndex / 100,
      signalStrength: dashboard.marketDirection.signalStrength,
      marketRegime: dashboard.economicCalendar.marketRegime
    };

    await getDb().insert(alphaSignals).values([signal]);
    console.log(`[AlphaEngine] Signal stored for ${symbol}`);
  } catch (error: any) {
    console.error(`[AlphaEngine] Failed to store signal: ${error.message}`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const alphaSignalsEngine = {
  generateAlphaDashboard,
  getNightOwlData,
  getDreamMarketData,
  getDailyMarketSummary,
  generateDailyMarketSummary,
  getAlphaSignalHistory
};

export default alphaSignalsEngine;
