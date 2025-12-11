/**
 * Self-Improving Engine
 * Learns from real prediction outcomes to continuously improve future predictions
 * 
 * Key Features:
 * 1. Analyzes completed predictions to identify patterns
 * 2. Tracks layer-specific accuracy over time (persisted to DB)
 * 3. Automatically adjusts layer weights based on historical performance
 * 4. Detects high-success patterns (layer agreement, regime-specific, etc.)
 * 5. Provides learning insights for system tuning
 */

import { db } from './db';
import { 
  marketPredictions, 
  layerLearningHistory, 
  predictionPatterns,
  type MarketPrediction,
  type LayerLearningHistory,
  type PredictionPattern
} from '@shared/schema';
import { eq, and, gte, desc, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { updateLayerPerformance, getLayerPerformanceStats } from './adaptive-weight-engine';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ============================================================================
// TYPES
// ============================================================================

export interface LearningAnalysis {
  layer: string;
  regime: string | null;
  horizonDays: number | null;
  accuracy: number;
  totalPredictions: number;
  rollingAccuracy: number;
  weightAdjustment: number;
  insights: string[];
}

export interface PatternInsight {
  patternType: string;
  description: string;
  successRate: number;
  occurrences: number;
  isActionable: boolean;
  recommendation: string;
}

export interface LearningReport {
  timestamp: Date;
  overallAccuracy: number;
  layerAnalysis: LearningAnalysis[];
  topPatterns: PatternInsight[];
  recommendations: string[];
  newPredictionsAnalyzed: number;
}

// ============================================================================
// CORE LEARNING FUNCTIONS
// ============================================================================

/**
 * Process completed predictions and update learning history
 * Uses learningProcessedAt column for idempotency - each prediction is only processed once
 */
export async function processPredictionOutcomes(): Promise<number> {
  console.log('[SelfImproving] Processing prediction outcomes...');
  
  // Only get predictions that have NOT been processed for learning yet (idempotency)
  const completedPredictions = await getDb().select()
    .from(marketPredictions)
    .where(
      and(
        sql`${marketPredictions.status} IN ('correct', 'incorrect')`,
        sql`${marketPredictions.learningProcessedAt} IS NULL` // Key: Only unprocessed predictions
      )
    )
    .orderBy(desc(marketPredictions.outcomeRecordedAt))
    .limit(100);
  
  if (completedPredictions.length === 0) {
    console.log('[SelfImproving] No new predictions to learn from');
    return 0;
  }
  
  let processedCount = 0;
  
  for (const prediction of completedPredictions) {
    await updateLayerLearning(prediction);
    await detectPatterns(prediction);
    
    // Mark as processed to prevent double-counting
    await getDb().update(marketPredictions)
      .set({ learningProcessedAt: new Date() })
      .where(eq(marketPredictions.id, prediction.id));
    
    processedCount++;
  }
  
  console.log(`[SelfImproving] Learned from ${processedCount} new predictions`);
  return processedCount;
}

/**
 * Update layer-specific learning history from a prediction
 */
async function updateLayerLearning(prediction: MarketPrediction): Promise<void> {
  if (!prediction.layerBreakdown || !prediction.outcome) return;
  
  const layers = ['hardData', 'technical', 'sam', 'economic'] as const;
  const isCorrect = prediction.status === 'correct';
  const regime = extractRegime(prediction);
  
  for (const layer of layers) {
    const layerScore = prediction.layerBreakdown[`${layer}Score` as keyof typeof prediction.layerBreakdown] as number;
    const layerWeight = prediction.layerBreakdown.weights?.[layer] || 0.25;
    
    // Check if layer predicted correctly (same direction as outcome)
    const layerDirection = layerScore > 0 ? 'up' : layerScore < 0 ? 'down' : 'neutral';
    const actualDirection = prediction.outcome.actualDirection;
    const layerCorrect = layerDirection === actualDirection;
    
    // Update in-memory cache (for immediate use)
    updateLayerPerformance(layer, layerCorrect, regime || 'neutral');
    
    // Update database (for persistence)
    await upsertLayerHistory(layer, regime, prediction.horizonDays, layerCorrect, Math.abs(layerScore), prediction.confidence);
  }
}

/**
 * Upsert layer learning history in database
 */
async function upsertLayerHistory(
  layer: string,
  regime: string | null,
  horizonDays: number,
  wasCorrect: boolean,
  score: number,
  confidence: number
): Promise<void> {
  // Find existing record or create new
  const existing = await getDb().select()
    .from(layerLearningHistory)
    .where(
      and(
        eq(layerLearningHistory.layer, layer),
        regime ? eq(layerLearningHistory.regime, regime) : sql`${layerLearningHistory.regime} IS NULL`,
        eq(layerLearningHistory.horizonDays, horizonDays)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    const record = existing[0];
    const newTotal = (record.totalPredictions || 0) + 1;
    const newCorrect = (record.correctPredictions || 0) + (wasCorrect ? 1 : 0);
    const newAccuracy = newTotal > 0 ? newCorrect / newTotal : 0;
    
    // Exponential rolling accuracy (more weight to recent)
    const decay = record.decayFactor || 0.95;
    const newRollingAccuracy = (record.rollingAccuracy || 0.5) * decay + (wasCorrect ? 1 : 0) * (1 - decay);
    
    // Update score/confidence averages
    const avgScoreCorrect = wasCorrect 
      ? ((record.avgScoreWhenCorrect || 0) * (newCorrect - 1) + score) / newCorrect
      : record.avgScoreWhenCorrect;
    const avgScoreWrong = !wasCorrect
      ? ((record.avgScoreWhenWrong || 0) * (newTotal - newCorrect - 1) + score) / (newTotal - newCorrect)
      : record.avgScoreWhenWrong;
    
    // Calculate weight adjustment recommendation
    const weightAdjustment = calculateWeightAdjustment(newRollingAccuracy, newTotal);
    
    await getDb().update(layerLearningHistory)
      .set({
        totalPredictions: newTotal,
        correctPredictions: newCorrect,
        accuracy: newAccuracy,
        rollingAccuracy: newRollingAccuracy,
        avgScoreWhenCorrect: avgScoreCorrect,
        avgScoreWhenWrong: avgScoreWrong,
        weightAdjustment,
        lastUpdated: new Date()
      })
      .where(eq(layerLearningHistory.id, record.id));
  } else {
    // Create new record
    await getDb().insert(layerLearningHistory).values({
      id: uuidv4(),
      layer,
      regime,
      horizonDays,
      totalPredictions: 1,
      correctPredictions: wasCorrect ? 1 : 0,
      accuracy: wasCorrect ? 1 : 0,
      rollingAccuracy: wasCorrect ? 0.55 : 0.45,
      avgScoreWhenCorrect: wasCorrect ? score : null,
      avgScoreWhenWrong: wasCorrect ? null : score,
      weightAdjustment: 0
    });
  }
}

/**
 * Calculate weight adjustment based on performance
 */
function calculateWeightAdjustment(rollingAccuracy: number, sampleSize: number): number {
  if (sampleSize < 10) return 0; // Need minimum samples
  
  // Performance thresholds
  if (rollingAccuracy >= 0.70) return 0.08;  // Excellent: boost weight 8%
  if (rollingAccuracy >= 0.60) return 0.04;  // Good: boost 4%
  if (rollingAccuracy >= 0.55) return 0.02;  // Slightly above average: small boost
  if (rollingAccuracy >= 0.50) return 0;      // Average: no change
  if (rollingAccuracy >= 0.45) return -0.02; // Below average: small reduction
  if (rollingAccuracy >= 0.40) return -0.04; // Poor: reduce 4%
  return -0.06; // Very poor: reduce 6%
}

/**
 * Detect patterns in predictions
 */
async function detectPatterns(prediction: MarketPrediction): Promise<void> {
  if (!prediction.layerBreakdown || !prediction.outcome) return;
  
  const isCorrect = prediction.status === 'correct';
  const patterns: string[] = [];
  
  // Pattern 1: Full layer agreement
  const scores = [
    prediction.layerBreakdown.hardDataScore,
    prediction.layerBreakdown.technicalScore,
    prediction.layerBreakdown.samScore,
    prediction.layerBreakdown.economicScore
  ];
  const allPositive = scores.every(s => s > 0);
  const allNegative = scores.every(s => s < 0);
  
  if (allPositive || allNegative) {
    patterns.push('full_layer_agreement');
    await updatePattern('full_layer_agreement', 'All 4 layers agree on direction', isCorrect);
  }
  
  // Pattern 2: 3/4 layer agreement
  const positiveCount = scores.filter(s => s > 0).length;
  const negativeCount = scores.filter(s => s < 0).length;
  if (positiveCount >= 3 || negativeCount >= 3) {
    patterns.push('three_layer_agreement');
    await updatePattern('three_layer_agreement', '3 out of 4 layers agree', isCorrect);
  }
  
  // Pattern 3: High confidence prediction
  if (prediction.confidence >= 70) {
    patterns.push('high_confidence');
    await updatePattern('high_confidence', 'Prediction confidence >= 70%', isCorrect);
  }
  
  // Pattern 4: SAM dominance (SAM score > 50 AND direction agrees with actual outcome)
  const samScore = prediction.layerBreakdown.samScore;
  const actualDirection = prediction.outcome.actualDirection;
  const samDirection = samScore > 0 ? 'up' : samScore < 0 ? 'down' : 'neutral';
  if (Math.abs(samScore) > 50 && samDirection === actualDirection) {
    patterns.push('strong_sam_signal');
    await updatePattern('strong_sam_signal', 'SAM score > 50 with correct direction', isCorrect);
  }
  
  // Pattern 5: Hard Data + SAM agreement
  const hdDirection = prediction.layerBreakdown.hardDataScore > 0 ? 1 : -1;
  const samDir = prediction.layerBreakdown.samScore > 0 ? 1 : -1;
  if (hdDirection === samDir && Math.abs(prediction.layerBreakdown.hardDataScore) > 20 && Math.abs(prediction.layerBreakdown.samScore) > 20) {
    patterns.push('harddata_sam_agreement');
    await updatePattern('harddata_sam_agreement', 'Hard Data and SAM layers agree strongly', isCorrect);
  }
}

/**
 * Update pattern statistics
 */
async function updatePattern(patternType: string, description: string, wasCorrect: boolean): Promise<void> {
  const existing = await getDb().select()
    .from(predictionPatterns)
    .where(eq(predictionPatterns.patternType, patternType))
    .limit(1);
  
  if (existing.length > 0) {
    const record = existing[0];
    const newOccurrences = (record.occurrences || 0) + 1;
    const newSuccessRate = ((record.successRate || 0) * (record.occurrences || 0) + (wasCorrect ? 1 : 0)) / newOccurrences;
    
    await getDb().update(predictionPatterns)
      .set({
        occurrences: newOccurrences,
        successRate: newSuccessRate,
        isActive: newOccurrences >= (record.minOccurrencesRequired || 10) ? 1 : 0,
        lastUpdated: new Date()
      })
      .where(eq(predictionPatterns.id, record.id));
  } else {
    await getDb().insert(predictionPatterns).values({
      id: uuidv4(),
      patternType,
      description,
      conditions: { minLayerAgreement: patternType.includes('agreement') ? 3 : undefined },
      occurrences: 1,
      successRate: wasCorrect ? 1 : 0,
      isActive: 0, // Not active until min occurrences
      minOccurrencesRequired: 10
    });
  }
}

// ============================================================================
// LEARNING INSIGHTS
// ============================================================================

/**
 * Get learned weight adjustments for each layer
 */
export async function getLearnedWeightAdjustments(
  regime?: string,
  horizonDays?: number
): Promise<Record<string, number>> {
  const adjustments: Record<string, number> = {
    hardData: 0,
    technical: 0,
    sam: 0,
    economic: 0
  };
  
  try {
    let query = getDb().select().from(layerLearningHistory);
    
    // Get most relevant records
    const records = await query
      .where(
        and(
          regime ? eq(layerLearningHistory.regime, regime) : sql`true`,
          horizonDays ? eq(layerLearningHistory.horizonDays, horizonDays) : sql`true`
        )
      )
      .orderBy(desc(layerLearningHistory.totalPredictions));
    
    // Aggregate adjustments by layer
    const layerTotals: Record<string, { adjustment: number; weight: number }> = {};
    
    for (const record of records) {
      if (!record.layer || record.totalPredictions! < 5) continue;
      
      if (!layerTotals[record.layer]) {
        layerTotals[record.layer] = { adjustment: 0, weight: 0 };
      }
      
      // Weight by sample size
      const sampleWeight = Math.min(record.totalPredictions! / 100, 1);
      layerTotals[record.layer].adjustment += (record.weightAdjustment || 0) * sampleWeight;
      layerTotals[record.layer].weight += sampleWeight;
    }
    
    // Calculate weighted average adjustments
    for (const layer of Object.keys(adjustments)) {
      if (layerTotals[layer] && layerTotals[layer].weight > 0) {
        adjustments[layer] = layerTotals[layer].adjustment / layerTotals[layer].weight;
      }
    }
  } catch (error: any) {
    console.error('[SelfImproving] Error getting weight adjustments:', error.message);
  }
  
  return adjustments;
}

/**
 * Get top performing patterns
 */
export async function getTopPatterns(limit: number = 5): Promise<PatternInsight[]> {
  try {
    const patterns = await getDb().select()
      .from(predictionPatterns)
      .where(eq(predictionPatterns.isActive, 1))
      .orderBy(desc(predictionPatterns.successRate))
      .limit(limit);
    
    return patterns.map(p => ({
      patternType: p.patternType,
      description: p.description || '',
      successRate: p.successRate || 0,
      occurrences: p.occurrences || 0,
      isActionable: (p.occurrences || 0) >= (p.minOccurrencesRequired || 10),
      recommendation: generatePatternRecommendation(p)
    }));
  } catch (error: any) {
    console.error('[SelfImproving] Error getting top patterns:', error.message);
    return [];
  }
}

/**
 * Generate recommendation for a pattern
 */
function generatePatternRecommendation(pattern: PredictionPattern): string {
  const successRate = pattern.successRate || 0;
  
  if (successRate >= 0.70) {
    return `HIGH CONFIDENCE: ${pattern.patternType} has ${(successRate * 100).toFixed(0)}% success rate. Increase position size when this pattern occurs.`;
  } else if (successRate >= 0.60) {
    return `RELIABLE: ${pattern.patternType} shows ${(successRate * 100).toFixed(0)}% accuracy. Good signal for trading decisions.`;
  } else if (successRate >= 0.50) {
    return `NEUTRAL: ${pattern.patternType} at ${(successRate * 100).toFixed(0)}% is near coin-flip odds. Use with caution.`;
  } else {
    return `INVERSE SIGNAL: ${pattern.patternType} at ${(successRate * 100).toFixed(0)}% - consider fading this pattern.`;
  }
}

/**
 * Generate full learning report
 */
export async function generateLearningReport(): Promise<LearningReport> {
  console.log('[SelfImproving] Generating learning report...');
  
  // Get overall accuracy
  const allPredictions = await getDb().select()
    .from(marketPredictions)
    .where(sql`${marketPredictions.status} IN ('correct', 'incorrect')`);
  
  const correct = allPredictions.filter(p => p.status === 'correct').length;
  const total = allPredictions.length;
  const overallAccuracy = total > 0 ? correct / total : 0;
  
  // Get layer analysis
  const layerRecords = await getDb().select()
    .from(layerLearningHistory)
    .where(sql`${layerLearningHistory.totalPredictions} >= 5`)
    .orderBy(desc(layerLearningHistory.rollingAccuracy));
  
  const layerAnalysis: LearningAnalysis[] = layerRecords.map(r => ({
    layer: r.layer,
    regime: r.regime,
    horizonDays: r.horizonDays,
    accuracy: r.accuracy || 0,
    totalPredictions: r.totalPredictions || 0,
    rollingAccuracy: r.rollingAccuracy || 0.5,
    weightAdjustment: r.weightAdjustment || 0,
    insights: generateLayerInsights(r)
  }));
  
  // Get top patterns
  const topPatterns = await getTopPatterns();
  
  // Generate recommendations
  const recommendations = generateRecommendations(layerAnalysis, topPatterns, overallAccuracy);
  
  // Process new outcomes
  const newPredictionsAnalyzed = await processPredictionOutcomes();
  
  return {
    timestamp: new Date(),
    overallAccuracy,
    layerAnalysis,
    topPatterns,
    recommendations,
    newPredictionsAnalyzed
  };
}

/**
 * Generate insights for a layer
 */
function generateLayerInsights(record: LayerLearningHistory): string[] {
  const insights: string[] = [];
  
  if (record.rollingAccuracy! >= 0.65) {
    insights.push(`${record.layer} performing excellently with ${(record.rollingAccuracy! * 100).toFixed(0)}% rolling accuracy`);
  } else if (record.rollingAccuracy! <= 0.45) {
    insights.push(`${record.layer} underperforming at ${(record.rollingAccuracy! * 100).toFixed(0)}% - consider reducing weight`);
  }
  
  if (record.avgScoreWhenCorrect && record.avgScoreWhenWrong) {
    if (record.avgScoreWhenCorrect > record.avgScoreWhenWrong * 1.5) {
      insights.push(`Higher scores correlate with correct predictions - good signal strength`);
    }
  }
  
  if (record.totalPredictions! > 50) {
    insights.push(`Strong sample size: ${record.totalPredictions} predictions analyzed`);
  }
  
  return insights;
}

/**
 * Generate system recommendations
 */
function generateRecommendations(
  layerAnalysis: LearningAnalysis[],
  patterns: PatternInsight[],
  overallAccuracy: number
): string[] {
  const recommendations: string[] = [];
  
  // Overall accuracy recommendation
  if (overallAccuracy >= 0.65) {
    recommendations.push('System performing above target. Current model weights are well-calibrated.');
  } else if (overallAccuracy < 0.50) {
    recommendations.push('System accuracy below baseline. Review layer weights and consider more conservative predictions.');
  }
  
  // Layer-specific recommendations
  const topLayers = layerAnalysis
    .filter(l => l.rollingAccuracy >= 0.60 && l.totalPredictions >= 20)
    .sort((a, b) => b.rollingAccuracy - a.rollingAccuracy)
    .slice(0, 2);
  
  if (topLayers.length > 0) {
    recommendations.push(`Best performing layers: ${topLayers.map(l => `${l.layer} (${(l.rollingAccuracy * 100).toFixed(0)}%)`).join(', ')}`);
  }
  
  // Pattern recommendations
  const highSuccessPatterns = patterns.filter(p => p.successRate >= 0.65);
  if (highSuccessPatterns.length > 0) {
    recommendations.push(`High-success patterns detected: ${highSuccessPatterns.map(p => p.patternType).join(', ')}`);
  }
  
  // SAM-specific recommendations
  const samAnalysis = layerAnalysis.find(l => l.layer === 'sam');
  if (samAnalysis && samAnalysis.rollingAccuracy >= 0.60 && samAnalysis.totalPredictions >= 30) {
    recommendations.push('SAM layer showing strong performance - consider increasing maximum weight ceiling.');
  }
  
  return recommendations;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractRegime(prediction: MarketPrediction): string | null {
  // Try to extract regime from key factors or layer breakdown
  if (prediction.keyFactors?.bullishFactors?.some(f => f.includes('Risk-on'))) {
    return 'risk_on';
  }
  if (prediction.keyFactors?.bearishFactors?.some(f => f.includes('Risk-off'))) {
    return 'risk_off';
  }
  return null;
}

// ============================================================================
// INTEGRATION WITH PREDICTION ENGINE
// ============================================================================

/**
 * Apply learned adjustments to prediction weights
 * Call this before making predictions to use learned insights
 */
export async function getOptimizedWeights(
  defaultWeights: { hardData: number; technical: number; sam: number; economic: number },
  regime?: string,
  horizonDays?: number
): Promise<{ hardData: number; technical: number; sam: number; economic: number }> {
  const adjustments = await getLearnedWeightAdjustments(regime, horizonDays);
  
  let weights = {
    hardData: defaultWeights.hardData + adjustments.hardData,
    technical: defaultWeights.technical + adjustments.technical,
    sam: defaultWeights.sam + adjustments.sam,
    economic: defaultWeights.economic + adjustments.economic
  };
  
  // Clamp to valid ranges
  weights.hardData = Math.max(0.15, Math.min(0.45, weights.hardData));
  weights.technical = Math.max(0.10, Math.min(0.40, weights.technical));
  weights.sam = Math.max(0.10, Math.min(0.50, weights.sam)); // SAM can go higher!
  weights.economic = Math.max(0.05, Math.min(0.30, weights.economic));
  
  // Normalize to sum to 1
  const total = weights.hardData + weights.technical + weights.sam + weights.economic;
  weights.hardData /= total;
  weights.technical /= total;
  weights.sam /= total;
  weights.economic /= total;
  
  return weights;
}

/**
 * Check if a pattern is currently active and high-success
 */
export async function isHighSuccessPattern(
  layerScores: { hardData: number; technical: number; sam: number; economic: number }
): Promise<{ isHighSuccess: boolean; patterns: string[]; avgSuccessRate: number }> {
  const matchingPatterns: string[] = [];
  let totalSuccessRate = 0;
  
  // Check for patterns
  const scores = Object.values(layerScores);
  const allPositive = scores.every(s => s > 0);
  const allNegative = scores.every(s => s < 0);
  
  if (allPositive || allNegative) {
    matchingPatterns.push('full_layer_agreement');
  }
  
  const positiveCount = scores.filter(s => s > 0).length;
  const negativeCount = scores.filter(s => s < 0).length;
  if (positiveCount >= 3 || negativeCount >= 3) {
    matchingPatterns.push('three_layer_agreement');
  }
  
  if (Math.abs(layerScores.sam) > 50) {
    matchingPatterns.push('strong_sam_signal');
  }
  
  // Look up success rates
  if (matchingPatterns.length > 0) {
    const patterns = await getDb().select()
      .from(predictionPatterns)
      .where(inArray(predictionPatterns.patternType, matchingPatterns));
    
    for (const p of patterns) {
      if (p.isActive && p.successRate) {
        totalSuccessRate += p.successRate;
      }
    }
  }
  
  const avgSuccessRate = matchingPatterns.length > 0 ? totalSuccessRate / matchingPatterns.length : 0;
  
  return {
    isHighSuccess: avgSuccessRate >= 0.60,
    patterns: matchingPatterns,
    avgSuccessRate
  };
}

// ============================================================================
// RESET & RECOMPUTE FUNCTIONS
// ============================================================================

/**
 * Reset learning tables and recompute from scratch
 * Call this once to fix any past inflation from double-counting
 * Loops until ALL predictions are processed (not limited to 100)
 */
export async function resetAndRecomputeLearning(): Promise<{
  predictionsReprocessed: number;
  layerRecordsCreated: number;
  patternsCreated: number;
}> {
  console.log('[SelfImproving] Resetting and recomputing learning data...');
  
  // 1. Clear existing learning history and patterns
  await getDb().delete(layerLearningHistory);
  await getDb().delete(predictionPatterns);
  console.log('[SelfImproving] Cleared existing learning history and patterns');
  
  // 2. Reset learningProcessedAt on all predictions so they can be reprocessed
  await getDb().update(marketPredictions)
    .set({ learningProcessedAt: null })
    .where(sql`${marketPredictions.learningProcessedAt} IS NOT NULL`);
  console.log('[SelfImproving] Reset learningProcessedAt on all predictions');
  
  // 3. Reprocess ALL completed predictions (loop until no more to process)
  let totalProcessed = 0;
  let batchCount = 0;
  let processed: number;
  
  do {
    processed = await processPredictionOutcomes();
    totalProcessed += processed;
    batchCount++;
    if (processed > 0) {
      console.log(`[SelfImproving] Batch ${batchCount}: processed ${processed} predictions`);
    }
  } while (processed > 0 && batchCount < 100); // Safety limit of 100 batches = 10,000 predictions max
  
  // 4. Count created records
  const layerRecords = await getDb().select({ count: sql<number>`count(*)` })
    .from(layerLearningHistory);
  const patternRecords = await getDb().select({ count: sql<number>`count(*)` })
    .from(predictionPatterns);
  
  const result = {
    predictionsReprocessed: totalProcessed,
    layerRecordsCreated: Number(layerRecords[0]?.count || 0),
    patternsCreated: Number(patternRecords[0]?.count || 0)
  };
  
  console.log(`[SelfImproving] Recompute complete:`, result);
  return result;
}

/**
 * Initialize learning tables if empty (safe to call multiple times)
 */
export async function initializeLearningIfNeeded(): Promise<boolean> {
  const existing = await getDb().select({ count: sql<number>`count(*)` })
    .from(layerLearningHistory);
  
  if (Number(existing[0]?.count || 0) === 0) {
    console.log('[SelfImproving] No learning data found, processing existing predictions...');
    await processPredictionOutcomes();
    return true;
  }
  
  return false;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const selfImprovingEngine = {
  processPredictionOutcomes,
  generateLearningReport,
  getLearnedWeightAdjustments,
  getTopPatterns,
  getOptimizedWeights,
  isHighSuccessPattern,
  resetAndRecomputeLearning,
  initializeLearningIfNeeded
};

export default selfImprovingEngine;
