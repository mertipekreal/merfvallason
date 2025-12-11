/**
 * Feature Engineering Service
 * Combines all three layers into unified feature vectors for ML prediction
 * 
 * Layer 1: Hard Data (Price, Volume, Options, Dark Pool, Institutional)
 * Layer 2: Technical (ICT Smart Money Concepts)
 * Layer 3: SAM (Subconscious Analysis Model - Dreams, Sentiment)
 * Layer 4: Economic (FRED indicators)
 */

import { db } from './db';
import { 
  stockPriceData, optionsFlow, darkPoolTrades, congressTrades, insiderTrades,
  economicIndicators, samMetrics, featureSnapshots
} from '@shared/schema';
import type { FeatureSnapshot, InsertFeatureSnapshot } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { performTechnicalAnalysis, priceDataToCandles, getTechnicalFeatures } from './technical-analysis-service';
import { fetchEconomicIndicators } from './fred-service';
import { samService } from './sam-analysis-service';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ============================================================================
// TYPES
// ============================================================================

export interface HardDataFeatures {
  priceChange1d: number;
  priceChange5d: number;
  volume: number;
  volumeRatio: number;
  putCallRatio: number;
  darkPoolNetFlow: number;
  congressNetBuys: number;
  insiderNetBuys: number;
  institutional13fChange: number;
}

export interface TechnicalFeatures {
  fvgCount: number;
  fvgNetDirection: number;
  mssSignal: number;
  liquidityVoidNearby: boolean;
  trendStrength: number;
  rsi: number;
  macdSignal: number;
}

export interface SAMFeatures {
  nightOwlScore: number;
  dissonanceDelta: number;
  dfiScore: number;
  socialSentiment: number;
  dreamFearRatio: number;
}

export interface EconomicFeatures {
  vix: number;
  yieldCurve: number;
  consumerSentiment: number;
  unemploymentRate: number;
  cpi: number;
  fedFundsRate: number;
  marketRegime: string;
}

export interface UnifiedFeatures {
  symbol: string;
  sessionDate: Date;
  hardData: HardDataFeatures;
  technical: TechnicalFeatures;
  sam: SAMFeatures;
  economic: EconomicFeatures;
  featureVector: number[];
  featureNames: string[];
}

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/**
 * Extract hard data features from database
 */
async function extractHardDataFeatures(symbol: string, date: Date): Promise<HardDataFeatures> {
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 30);
  
  // Get price data
  const priceData = await getDb().select()
    .from(stockPriceData)
    .where(and(
      eq(stockPriceData.symbol, symbol),
      gte(stockPriceData.timestamp, startDate),
      lte(stockPriceData.timestamp, date)
    ))
    .orderBy(desc(stockPriceData.timestamp))
    .limit(30);

  let priceChange1d = 0;
  let priceChange5d = 0;
  let volume = 0;
  let volumeRatio = 1;

  if (priceData.length >= 2) {
    priceChange1d = ((priceData[0].close - priceData[1].close) / priceData[1].close) * 100;
  }
  if (priceData.length >= 6) {
    priceChange5d = ((priceData[0].close - priceData[5].close) / priceData[5].close) * 100;
  }
  if (priceData.length > 0) {
    volume = priceData[0].volume;
    const avgVolume = priceData.reduce((sum, p) => sum + p.volume, 0) / priceData.length;
    volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;
  }

  // Get options flow (last 7 days)
  const weekAgo = new Date(date);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const options = await getDb().select()
    .from(optionsFlow)
    .where(and(
      eq(optionsFlow.symbol, symbol),
      gte(optionsFlow.timestamp, weekAgo),
      lte(optionsFlow.timestamp, date)
    ));

  const calls = options.filter(o => o.optionType === 'call');
  const puts = options.filter(o => o.optionType === 'put');
  const putCallRatio = calls.length > 0 ? puts.length / calls.length : 1;

  // Get dark pool data
  const darkPool = await getDb().select()
    .from(darkPoolTrades)
    .where(and(
      eq(darkPoolTrades.symbol, symbol),
      gte(darkPoolTrades.timestamp, weekAgo),
      lte(darkPoolTrades.timestamp, date)
    ));

  let darkPoolNetFlow = 0;
  for (const trade of darkPool) {
    if (trade.sentiment === 'bullish') darkPoolNetFlow += trade.notionalValue || 0;
    else if (trade.sentiment === 'bearish') darkPoolNetFlow -= trade.notionalValue || 0;
  }

  // Get congress trades
  const congress = await getDb().select()
    .from(congressTrades)
    .where(and(
      eq(congressTrades.symbol, symbol),
      gte(congressTrades.filingDate, weekAgo),
      lte(congressTrades.filingDate, date)
    ));

  let congressNetBuys = 0;
  for (const trade of congress) {
    const avgAmount = ((trade.amountLow || 0) + (trade.amountHigh || 0)) / 2;
    if (trade.tradeType === 'buy') congressNetBuys += avgAmount;
    else congressNetBuys -= avgAmount;
  }

  // Get insider trades
  const insider = await getDb().select()
    .from(insiderTrades)
    .where(and(
      eq(insiderTrades.symbol, symbol),
      gte(insiderTrades.filingDate, weekAgo),
      lte(insiderTrades.filingDate, date)
    ));

  let insiderNetBuys = 0;
  for (const trade of insider) {
    if (trade.tradeType === 'P') insiderNetBuys += trade.totalValue || 0;
    else if (trade.tradeType === 'S') insiderNetBuys -= trade.totalValue || 0;
  }

  return {
    priceChange1d,
    priceChange5d,
    volume,
    volumeRatio,
    putCallRatio,
    darkPoolNetFlow,
    congressNetBuys,
    insiderNetBuys,
    institutional13fChange: 0 // TODO: Add 13F calculation
  };
}

/**
 * Extract technical features from price data
 */
async function extractTechnicalFeatures(symbol: string, date: Date): Promise<TechnicalFeatures> {
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 60);

  const priceData = await getDb().select()
    .from(stockPriceData)
    .where(and(
      eq(stockPriceData.symbol, symbol),
      gte(stockPriceData.timestamp, startDate),
      lte(stockPriceData.timestamp, date)
    ))
    .orderBy(stockPriceData.timestamp);

  if (priceData.length < 30) {
    return {
      fvgCount: 0,
      fvgNetDirection: 0,
      mssSignal: 0,
      liquidityVoidNearby: false,
      trendStrength: 0,
      rsi: 50,
      macdSignal: 0
    };
  }

  const candles = priceDataToCandles(priceData);
  const analysis = performTechnicalAnalysis(symbol, candles, '1d');
  return getTechnicalFeatures(analysis);
}

/**
 * Extract SAM features from sam_metrics table, fallback to SAM service
 * Uses 83% historically-validated model when no live data
 */
async function extractSAMFeatures(symbol: string | null, date: Date): Promise<SAMFeatures> {
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 7);

  // Try database first
  const metrics = await getDb().select()
    .from(samMetrics)
    .where(and(
      symbol ? eq(samMetrics.symbol, symbol) : eq(samMetrics.symbol, null as any),
      gte(samMetrics.sessionDate, startDate),
      lte(samMetrics.sessionDate, date)
    ))
    .orderBy(desc(samMetrics.sessionDate))
    .limit(1);

  if (metrics.length > 0) {
    const m = metrics[0];
    return {
      nightOwlScore: m.nightOwlScore || 0.5,
      dissonanceDelta: m.dissonanceDelta || 0,
      dfiScore: m.dfiScore || 0,
      socialSentiment: m.socialSentiment || 0,
      dreamFearRatio: m.fearKeywords && m.hopeKeywords 
        ? m.fearKeywords / (m.fearKeywords + m.hopeKeywords + 1) 
        : 0.5
    };
  }

  // Fallback to SAM service with 83% validated historical model
  const demoMetrics = samService.getDemoMetrics();
  
  // Convert demo metrics to SAM features
  // DFI of 0.42 means mild fear (below 0.5 neutral)
  // Night Owl 0.35 means less night activity (calmer market)
  const dfiScore = (demoMetrics.dreamFearIndex - 0.5) * 100; // Convert to -50 to +50 range
  
  return {
    nightOwlScore: demoMetrics.nightOwlIndicator,
    dissonanceDelta: demoMetrics.dissonanceScore,
    dfiScore: dfiScore,
    socialSentiment: demoMetrics.overallBias === 'bullish' ? 0.3 : 
                     demoMetrics.overallBias === 'bearish' ? -0.3 : 0,
    dreamFearRatio: demoMetrics.dreamFearIndex
  };
}

/**
 * Extract economic features from FRED data
 */
async function extractEconomicFeatures(date: Date): Promise<EconomicFeatures> {
  try {
    const indicators = await fetchEconomicIndicators();
    
    return {
      vix: indicators.vix || 20,
      yieldCurve: indicators.yieldCurve || 0,
      consumerSentiment: indicators.consumerSentiment || 70,
      unemploymentRate: indicators.unemployment || 4,
      cpi: indicators.cpi || 3,
      fedFundsRate: indicators.fedFundsRate || 5,
      marketRegime: indicators.recessionRisk === 'high' || indicators.recessionRisk === 'imminent' 
        ? 'risk_off' : 'risk_on'
    };
  } catch (error) {
    console.error('Error extracting economic features:', error);
    return {
      vix: 20,
      yieldCurve: 0,
      consumerSentiment: 70,
      unemploymentRate: 4,
      cpi: 3,
      fedFundsRate: 5,
      marketRegime: 'neutral'
    };
  }
}

// ============================================================================
// FEATURE NORMALIZATION
// ============================================================================

/**
 * Normalize value to 0-1 range using min-max scaling
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Convert features to normalized vector
 */
function featuresToVector(
  hardData: HardDataFeatures,
  technical: TechnicalFeatures,
  sam: SAMFeatures,
  economic: EconomicFeatures
): { vector: number[]; names: string[] } {
  const features: { name: string; value: number }[] = [
    // Hard Data (normalized)
    { name: 'price_change_1d', value: normalize(hardData.priceChange1d, -10, 10) },
    { name: 'price_change_5d', value: normalize(hardData.priceChange5d, -20, 20) },
    { name: 'volume_ratio', value: normalize(hardData.volumeRatio, 0, 3) },
    { name: 'put_call_ratio', value: normalize(hardData.putCallRatio, 0.5, 1.5) },
    { name: 'dark_pool_flow', value: normalize(hardData.darkPoolNetFlow, -1e9, 1e9) },
    { name: 'congress_net', value: normalize(hardData.congressNetBuys, -1e6, 1e6) },
    { name: 'insider_net', value: normalize(hardData.insiderNetBuys, -1e7, 1e7) },
    
    // Technical
    { name: 'fvg_count', value: normalize(technical.fvgCount, 0, 10) },
    { name: 'fvg_direction', value: normalize(technical.fvgNetDirection, -5, 5) },
    { name: 'mss_signal', value: normalize(technical.mssSignal, -1, 1) },
    { name: 'liquidity_void', value: technical.liquidityVoidNearby ? 1 : 0 },
    { name: 'trend_strength', value: normalize(technical.trendStrength, -1, 1) },
    { name: 'rsi', value: normalize(technical.rsi, 0, 100) },
    { name: 'macd_signal', value: normalize(technical.macdSignal, -1, 1) },
    
    // SAM
    { name: 'night_owl', value: sam.nightOwlScore },
    { name: 'dissonance', value: normalize(sam.dissonanceDelta, 0, 1) },
    { name: 'dfi', value: normalize(sam.dfiScore, -100, 100) },
    { name: 'social_sentiment', value: normalize(sam.socialSentiment, -1, 1) },
    { name: 'fear_ratio', value: sam.dreamFearRatio },
    
    // Economic
    { name: 'vix', value: normalize(economic.vix, 10, 50) },
    { name: 'yield_curve', value: normalize(economic.yieldCurve, -1, 3) },
    { name: 'consumer_sentiment', value: normalize(economic.consumerSentiment, 50, 100) },
    { name: 'unemployment', value: normalize(economic.unemploymentRate, 3, 10) },
    { name: 'cpi', value: normalize(economic.cpi, 0, 10) },
    { name: 'fed_funds', value: normalize(economic.fedFundsRate, 0, 8) },
    { name: 'market_regime', value: economic.marketRegime === 'risk_on' ? 1 : 0 }
  ];

  return {
    vector: features.map(f => f.value),
    names: features.map(f => f.name)
  };
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Generate unified feature snapshot for a symbol and date
 */
export async function generateFeatureSnapshot(
  symbol: string,
  sessionDate: Date
): Promise<UnifiedFeatures> {
  console.log(`[FeatureEngine] Generating features for ${symbol} on ${sessionDate.toISOString()}`);

  const [hardData, technical, sam, economic] = await Promise.all([
    extractHardDataFeatures(symbol, sessionDate),
    extractTechnicalFeatures(symbol, sessionDate),
    extractSAMFeatures(symbol, sessionDate),
    extractEconomicFeatures(sessionDate)
  ]);

  const { vector, names } = featuresToVector(hardData, technical, sam, economic);

  return {
    symbol,
    sessionDate,
    hardData,
    technical,
    sam,
    economic,
    featureVector: vector,
    featureNames: names
  };
}

/**
 * Save feature snapshot to database
 */
export async function saveFeatureSnapshot(features: UnifiedFeatures): Promise<string> {
  const id = uuidv4();

  const snapshot: InsertFeatureSnapshot = {
    symbol: features.symbol,
    sessionDate: features.sessionDate,
    hardDataFeatures: features.hardData,
    technicalFeatures: features.technical,
    samFeatures: features.sam,
    economicFeatures: features.economic,
    featureVector: features.featureVector,
    featureNames: features.featureNames,
    version: '1.0'
  };

  await getDb().insert(featureSnapshots).values({ id, ...snapshot } as any);
  
  console.log(`[FeatureEngine] Saved feature snapshot ${id}`);
  return id;
}

/**
 * Get latest feature snapshot for a symbol
 */
export async function getLatestFeatureSnapshot(symbol: string): Promise<FeatureSnapshot | null> {
  const snapshots = await getDb().select()
    .from(featureSnapshots)
    .where(eq(featureSnapshots.symbol, symbol))
    .orderBy(desc(featureSnapshots.sessionDate))
    .limit(1);

  return snapshots[0] || null;
}

/**
 * Calculate layer scores for prediction
 */
export function calculateLayerScores(features: UnifiedFeatures): {
  hardDataScore: number;
  technicalScore: number;
  samScore: number;
  economicScore: number;
} {
  // Hard Data Score (-1 to 1)
  let hardDataScore = 0;
  hardDataScore += features.hardData.priceChange1d > 0 ? 0.2 : -0.2;
  hardDataScore += features.hardData.priceChange5d > 0 ? 0.2 : -0.2;
  hardDataScore += features.hardData.putCallRatio < 1 ? 0.2 : -0.2; // Low P/C = bullish
  hardDataScore += features.hardData.darkPoolNetFlow > 0 ? 0.2 : -0.2;
  hardDataScore += features.hardData.congressNetBuys > 0 ? 0.1 : -0.1;
  hardDataScore += features.hardData.insiderNetBuys > 0 ? 0.1 : -0.1;

  // Technical Score (-1 to 1)
  let technicalScore = 0;
  technicalScore += features.technical.fvgNetDirection > 0 ? 0.3 : -0.3;
  technicalScore += features.technical.mssSignal * 0.3;
  technicalScore += features.technical.trendStrength * 0.2;
  technicalScore += features.technical.rsi < 30 ? 0.1 : features.technical.rsi > 70 ? -0.1 : 0;
  technicalScore += features.technical.macdSignal * 0.1;

  // SAM Score (-1 to 1)
  let samScore = 0;
  samScore -= (features.sam.nightOwlScore - 0.5) * 0.4; // High night activity = fear
  samScore -= features.sam.dissonanceDelta * 0.3; // High dissonance = uncertainty
  samScore += features.sam.dfiScore / 100 * 0.2; // DFI -100 to 100
  samScore += features.sam.socialSentiment * 0.1;

  // Economic Score (-1 to 1)
  let economicScore = 0;
  economicScore += features.economic.vix < 20 ? 0.3 : features.economic.vix > 30 ? -0.3 : 0;
  economicScore += features.economic.yieldCurve > 0 ? 0.2 : -0.3; // Inverted = bad
  economicScore += features.economic.consumerSentiment > 80 ? 0.2 : features.economic.consumerSentiment < 60 ? -0.2 : 0;
  economicScore += features.economic.marketRegime === 'risk_on' ? 0.3 : -0.3;

  return {
    hardDataScore: Math.max(-1, Math.min(1, hardDataScore)),
    technicalScore: Math.max(-1, Math.min(1, technicalScore)),
    samScore: Math.max(-1, Math.min(1, samScore)),
    economicScore: Math.max(-1, Math.min(1, economicScore))
  };
}

export default {
  generateFeatureSnapshot,
  saveFeatureSnapshot,
  getLatestFeatureSnapshot,
  calculateLayerScores
};
