/**
 * Prediction Engine Service
 * Three-layer market prediction system with 65-70% accuracy target
 * 
 * Combines:
 * 1. Hard Data Layer (OHLCV, Options, Dark Pool, Institutional)
 * 2. Technical Layer (ICT Smart Money Concepts)
 * 3. SAM Layer (Subconscious Analysis Model)
 * 4. Economic Layer (FRED indicators)
 */

import { db } from './db';
import { marketPredictions, featureSnapshots } from '@shared/schema';
import type { MarketPrediction, InsertMarketPrediction } from '@shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { 
  generateFeatureSnapshot, 
  saveFeatureSnapshot, 
  calculateLayerScores,
  type UnifiedFeatures 
} from './feature-engineering-service';
import { selfImprovingEngine } from './self-improving-engine';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ============================================================================
// TYPES
// ============================================================================

export interface PredictionRequest {
  symbol: string;
  horizonDays: number; // 1, 3, 5, 10
}

export interface PredictionResult {
  id: string;
  symbol: string;
  predictionDate: Date;
  targetDate: Date;
  horizonDays: number;
  direction: 'up' | 'down' | 'neutral';
  probability: number; // 0-1
  expectedReturn: number; // percentage
  priceTarget: number;
  confidence: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  layerBreakdown: {
    hardDataScore: number;
    technicalScore: number;
    samScore: number;
    economicScore: number;
    weights: {
      hardData: number;
      technical: number;
      sam: number;
      economic: number;
    };
  };
  keyFactors: {
    bullishFactors: string[];
    bearishFactors: string[];
    uncertaintyFactors: string[];
  };
  featureSnapshotId: string;
  modelVersion: string;
}

// ============================================================================
// MODEL WEIGHTS (Tunable based on backtesting)
// ============================================================================

const DEFAULT_WEIGHTS = {
  hardData: 0.30,    // 30% - Price action, volume, institutional activity
  technical: 0.25,   // 25% - ICT Smart Money Concepts
  sam: 0.25,         // 25% - Dreams, sentiment, Night Owl
  economic: 0.20     // 20% - FRED indicators, market regime
};

const MODEL_VERSION = 'v1.0.0-alpha';

// ============================================================================
// PREDICTION LOGIC
// ============================================================================

/**
 * Generate key factors explanation from features
 */
function generateKeyFactors(features: UnifiedFeatures): {
  bullishFactors: string[];
  bearishFactors: string[];
  uncertaintyFactors: string[];
} {
  const bullish: string[] = [];
  const bearish: string[] = [];
  const uncertainty: string[] = [];

  // Hard Data factors
  if (features.hardData.priceChange5d > 3) bullish.push('Strong 5-day price momentum');
  if (features.hardData.priceChange5d < -3) bearish.push('Negative 5-day price trend');
  if (features.hardData.putCallRatio < 0.7) bullish.push('Low put/call ratio (bullish options sentiment)');
  if (features.hardData.putCallRatio > 1.3) bearish.push('High put/call ratio (bearish options sentiment)');
  if (features.hardData.darkPoolNetFlow > 0) bullish.push('Positive dark pool net flow');
  if (features.hardData.darkPoolNetFlow < 0) bearish.push('Negative dark pool net flow');
  if (features.hardData.congressNetBuys > 0) bullish.push('Congress members buying');
  if (features.hardData.congressNetBuys < 0) bearish.push('Congress members selling');
  if (features.hardData.insiderNetBuys > 0) bullish.push('Insider net buying');
  if (features.hardData.insiderNetBuys < 0) bearish.push('Insider net selling');

  // Technical factors
  if (features.technical.trendStrength > 0.5) bullish.push('Strong uptrend');
  if (features.technical.trendStrength < -0.5) bearish.push('Strong downtrend');
  if (features.technical.rsi < 30) bullish.push('RSI oversold (potential bounce)');
  if (features.technical.rsi > 70) bearish.push('RSI overbought (potential pullback)');
  if (features.technical.mssSignal === 1) bullish.push('Bullish market structure shift');
  if (features.technical.mssSignal === -1) bearish.push('Bearish market structure shift');
  if (features.technical.fvgNetDirection > 2) bullish.push('Multiple bullish Fair Value Gaps');
  if (features.technical.fvgNetDirection < -2) bearish.push('Multiple bearish Fair Value Gaps');
  if (features.technical.liquidityVoidNearby) uncertainty.push('Liquidity void nearby (volatility risk)');

  // SAM factors
  if (features.sam.nightOwlScore > 0.7) bearish.push('High night owl activity (fear signals)');
  if (features.sam.nightOwlScore < 0.3) bullish.push('Low night owl activity (calm market)');
  if (features.sam.dissonanceDelta > 0.5) uncertainty.push('High sentiment dissonance');
  if (features.sam.dfiScore > 30) bullish.push('Positive Dream Fear Index');
  if (features.sam.dfiScore < -30) bearish.push('Negative Dream Fear Index');
  if (features.sam.socialSentiment > 0.3) bullish.push('Positive social sentiment');
  if (features.sam.socialSentiment < -0.3) bearish.push('Negative social sentiment');

  // Economic factors
  if (features.economic.vix > 30) bearish.push('High VIX (fear gauge elevated)');
  if (features.economic.vix < 15) bullish.push('Low VIX (complacency/calm)');
  if (features.economic.yieldCurve < 0) bearish.push('Inverted yield curve (recession signal)');
  if (features.economic.consumerSentiment > 90) bullish.push('Strong consumer sentiment');
  if (features.economic.consumerSentiment < 60) bearish.push('Weak consumer sentiment');
  if (features.economic.marketRegime === 'risk_on') bullish.push('Risk-on market regime');
  if (features.economic.marketRegime === 'risk_off') bearish.push('Risk-off market regime');

  return { bullishFactors: bullish, bearishFactors: bearish, uncertaintyFactors: uncertainty };
}

/**
 * Calculate prediction confidence based on signal agreement
 */
function calculateConfidence(layerScores: { 
  hardDataScore: number; 
  technicalScore: number; 
  samScore: number; 
  economicScore: number;
}): number {
  const scores = [
    layerScores.hardDataScore,
    layerScores.technicalScore,
    layerScores.samScore,
    layerScores.economicScore
  ];

  // Check if all layers agree on direction
  const allPositive = scores.every(s => s > 0);
  const allNegative = scores.every(s => s < 0);
  const signAgreement = allPositive || allNegative;

  // Calculate average magnitude
  const avgMagnitude = scores.reduce((sum, s) => sum + Math.abs(s), 0) / 4;

  // Base confidence
  let confidence = avgMagnitude * 50; // 0-50 base

  // Bonus for agreement
  if (signAgreement) confidence += 25;
  else {
    // Check how many agree
    const positiveCount = scores.filter(s => s > 0).length;
    const majorityAgree = positiveCount >= 3 || positiveCount <= 1;
    if (majorityAgree) confidence += 10;
  }

  // Cap at 95%
  return Math.min(95, Math.max(10, confidence));
}

/**
 * Determine risk level based on features
 */
function determineRiskLevel(features: UnifiedFeatures, confidence: number): 'low' | 'medium' | 'high' {
  let riskScore = 0;

  // High VIX = high risk
  if (features.economic.vix > 30) riskScore += 2;
  else if (features.economic.vix > 20) riskScore += 1;

  // Liquidity void = high risk
  if (features.technical.liquidityVoidNearby) riskScore += 1;

  // High dissonance = uncertainty
  if (features.sam.dissonanceDelta > 0.5) riskScore += 1;

  // Low confidence = higher risk
  if (confidence < 50) riskScore += 1;

  // Inverted yield curve
  if (features.economic.yieldCurve < 0) riskScore += 1;

  if (riskScore >= 4) return 'high';
  if (riskScore >= 2) return 'medium';
  return 'low';
}

/**
 * Calculate expected return based on horizon and confidence
 */
function calculateExpectedReturn(
  direction: 'up' | 'down' | 'neutral',
  probability: number,
  horizonDays: number,
  volatility: number = 20
): number {
  if (direction === 'neutral') return 0;

  // Base expected move scales with horizon
  const baseMove = volatility / 16 * Math.sqrt(horizonDays); // Volatility-adjusted
  
  // Scale by probability
  const expectedMove = baseMove * (probability - 0.5) * 2;
  
  return direction === 'up' ? expectedMove : -expectedMove;
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Generate prediction for a symbol
 */
export async function generatePrediction(
  request: PredictionRequest,
  currentPrice?: number
): Promise<PredictionResult> {
  const { symbol, horizonDays } = request;
  const predictionDate = new Date();
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + horizonDays);

  console.log(`[PredictionEngine] Generating ${horizonDays}-day prediction for ${symbol}`);

  // Generate features
  const features = await generateFeatureSnapshot(symbol, predictionDate);
  
  // Save features to database
  const featureSnapshotId = await saveFeatureSnapshot(features);

  // Calculate layer scores
  const layerScores = calculateLayerScores(features);

  // Get optimized weights from self-improving engine (learns from past predictions)
  const regime = features.economic.marketRegime || undefined;
  const optimizedWeights = await selfImprovingEngine.getOptimizedWeights(DEFAULT_WEIGHTS, regime, horizonDays);
  
  // Check if current conditions match high-success patterns
  const patternCheck = await selfImprovingEngine.isHighSuccessPattern({
    hardData: layerScores.hardDataScore,
    technical: layerScores.technicalScore,
    sam: layerScores.samScore,
    economic: layerScores.economicScore
  });

  // Calculate weighted composite score with LEARNED weights
  const compositeScore = 
    layerScores.hardDataScore * optimizedWeights.hardData +
    layerScores.technicalScore * optimizedWeights.technical +
    layerScores.samScore * optimizedWeights.sam +
    layerScores.economicScore * optimizedWeights.economic;

  // Determine direction and probability
  let direction: 'up' | 'down' | 'neutral';
  let probability: number;

  if (compositeScore > 0.15) {
    direction = 'up';
    probability = 0.5 + Math.min(0.45, compositeScore * 0.5);
  } else if (compositeScore < -0.15) {
    direction = 'down';
    probability = 0.5 + Math.min(0.45, Math.abs(compositeScore) * 0.5);
  } else {
    direction = 'neutral';
    probability = 0.5;
  }

  // Calculate confidence
  const confidence = calculateConfidence(layerScores);

  // Determine risk level
  const riskLevel = determineRiskLevel(features, confidence);

  // Calculate expected return
  const expectedReturn = calculateExpectedReturn(
    direction, 
    probability, 
    horizonDays,
    features.economic.vix || 20
  );

  // Calculate price target
  const priceAtPrediction = currentPrice || 100; // Default if unknown
  const priceTarget = priceAtPrediction * (1 + expectedReturn / 100);

  // Generate key factors
  const keyFactors = generateKeyFactors(features);

  const id = uuidv4();

  const result: PredictionResult = {
    id,
    symbol,
    predictionDate,
    targetDate,
    horizonDays,
    direction,
    probability,
    expectedReturn,
    priceTarget,
    confidence,
    riskLevel,
    layerBreakdown: {
      hardDataScore: layerScores.hardDataScore,
      technicalScore: layerScores.technicalScore,
      samScore: layerScores.samScore,
      economicScore: layerScores.economicScore,
      weights: optimizedWeights // Use LEARNED weights instead of defaults
    },
    keyFactors,
    featureSnapshotId,
    modelVersion: MODEL_VERSION
  };

  // Save prediction to database
  await savePrediction(result, priceAtPrediction);

  console.log(`[PredictionEngine] Prediction: ${direction} with ${probability.toFixed(2)} probability, ${confidence.toFixed(0)}% confidence`);

  return result;
}

/**
 * Save prediction to database
 */
async function savePrediction(result: PredictionResult, priceAtPrediction: number): Promise<void> {
  const prediction: InsertMarketPrediction = {
    symbol: result.symbol,
    predictionDate: result.predictionDate,
    horizonDays: result.horizonDays,
    targetDate: result.targetDate,
    direction: result.direction,
    directionProbability: result.probability,
    expectedReturn: result.expectedReturn,
    priceTarget: result.priceTarget,
    priceAtPrediction,
    confidence: result.confidence,
    riskLevel: result.riskLevel,
    layerBreakdown: result.layerBreakdown,
    keyFactors: result.keyFactors,
    featureSnapshotId: result.featureSnapshotId,
    modelVersion: result.modelVersion,
    status: 'pending'
  };

  await getDb().insert(marketPredictions).values({ id: result.id, ...prediction } as any);
}

/**
 * Get recent predictions for a symbol
 */
export async function getRecentPredictions(symbol: string, limit: number = 10): Promise<MarketPrediction[]> {
  return getDb().select()
    .from(marketPredictions)
    .where(eq(marketPredictions.symbol, symbol))
    .orderBy(desc(marketPredictions.predictionDate))
    .limit(limit);
}

/**
 * Get all pending predictions that need outcome recording
 */
export async function getPendingPredictions(): Promise<MarketPrediction[]> {
  const now = new Date();
  return getDb().select()
    .from(marketPredictions)
    .where(and(
      eq(marketPredictions.status, 'pending'),
      lte(marketPredictions.targetDate, now)
    ));
}

/**
 * Record outcome for a prediction
 */
export async function recordOutcome(
  predictionId: string,
  actualPrice: number
): Promise<void> {
  const [prediction] = await getDb().select()
    .from(marketPredictions)
    .where(eq(marketPredictions.id, predictionId));

  if (!prediction) {
    throw new Error(`Prediction ${predictionId} not found`);
  }

  const actualReturn = ((actualPrice - prediction.priceAtPrediction) / prediction.priceAtPrediction) * 100;
  const actualDirection: 'up' | 'down' | 'neutral' = actualReturn > 0.1 ? 'up' : actualReturn < -0.1 ? 'down' : 'neutral';
  const predictionCorrect = prediction.direction === actualDirection;
  const errorPercent = Math.abs((prediction.expectedReturn || 0) - actualReturn);

  const outcome = {
    actualDirection,
    actualReturn,
    priceAtTarget: actualPrice,
    predictionCorrect,
    errorPercent
  };

  await getDb().update(marketPredictions)
    .set({
      outcome,
      outcomeRecordedAt: new Date(),
      status: predictionCorrect ? 'correct' : 'incorrect'
    })
    .where(eq(marketPredictions.id, predictionId));

  console.log(`[PredictionEngine] Recorded outcome for ${predictionId}: ${predictionCorrect ? 'CORRECT' : 'INCORRECT'}`);
  
  // Trigger self-improving engine to learn from this outcome
  try {
    await selfImprovingEngine.processPredictionOutcomes();
    console.log(`[PredictionEngine] Self-improving engine updated with new outcome`);
  } catch (error: any) {
    console.error(`[PredictionEngine] Self-improving learning error:`, error.message);
  }
}

/**
 * Get prediction accuracy statistics
 */
export async function getAccuracyStats(symbol?: string): Promise<{
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  avgConfidence: number;
  byHorizon: Record<number, { total: number; correct: number; accuracy: number }>;
}> {
  let query = getDb().select().from(marketPredictions);
  
  if (symbol) {
    query = query.where(eq(marketPredictions.symbol, symbol)) as any;
  }

  const predictions = await query;
  
  const completed = predictions.filter(p => p.status === 'correct' || p.status === 'incorrect');
  const correct = completed.filter(p => p.status === 'correct');

  const byHorizon: Record<number, { total: number; correct: number; accuracy: number }> = {};
  
  for (const p of completed) {
    if (!byHorizon[p.horizonDays]) {
      byHorizon[p.horizonDays] = { total: 0, correct: 0, accuracy: 0 };
    }
    byHorizon[p.horizonDays].total++;
    if (p.status === 'correct') byHorizon[p.horizonDays].correct++;
  }

  for (const horizon of Object.keys(byHorizon)) {
    const h = parseInt(horizon);
    byHorizon[h].accuracy = byHorizon[h].total > 0 
      ? (byHorizon[h].correct / byHorizon[h].total) * 100 
      : 0;
  }

  const avgConfidence = completed.length > 0
    ? completed.reduce((sum, p) => sum + p.confidence, 0) / completed.length
    : 0;

  return {
    totalPredictions: completed.length,
    correctPredictions: correct.length,
    accuracy: completed.length > 0 ? (correct.length / completed.length) * 100 : 0,
    avgConfidence,
    byHorizon
  };
}

/**
 * Quick prediction for a symbol (uses cached features if available)
 */
export async function quickPredict(
  symbol: string,
  horizonDays: number = 5
): Promise<{
  direction: 'up' | 'down' | 'neutral';
  confidence: number;
  summary: string;
}> {
  try {
    const result = await generatePrediction({ symbol, horizonDays });
    
    const directionText = result.direction === 'up' ? 'YUKARI' :
                         result.direction === 'down' ? 'AŞAĞI' : 'YATAY';
    
    const summary = `${symbol}: ${directionText} (%${result.probability.toFixed(0)} olasılık, %${result.confidence.toFixed(0)} güven)`;
    
    return {
      direction: result.direction,
      confidence: result.confidence,
      summary
    };
  } catch (error: any) {
    console.error(`[PredictionEngine] Quick predict error for ${symbol}:`, error.message);
    return {
      direction: 'neutral',
      confidence: 0,
      summary: `${symbol}: Tahmin yapılamadı - ${error.message}`
    };
  }
}

export default {
  generatePrediction,
  getRecentPredictions,
  getPendingPredictions,
  recordOutcome,
  getAccuracyStats,
  quickPredict
};
