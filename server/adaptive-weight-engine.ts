/**
 * Adaptive Weight Engine
 * Dynamically adjusts layer weights based on signal confidence, market regime, and historical performance
 * 
 * Key Innovation: SAM layer weight ranges from 15% to 45% based on:
 * - Night Owl indicator strength
 * - Dissonance signal clarity
 * - Historical SAM accuracy in current market regime
 * 
 * Target: Break the 68% ceiling by allowing SAM to dominate when its signals are strong
 */

import { storage } from './storage';

// ============================================================================
// TYPES
// ============================================================================

export interface LayerConfidence {
  hardData: number;    // 0-100
  technical: number;   // 0-100
  sam: number;         // 0-100
  economic: number;    // 0-100
}

export interface MarketRegime {
  regime: 'risk_on' | 'risk_off' | 'expansion' | 'contraction' | 'neutral';
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  trend: 'bullish' | 'bearish' | 'sideways';
}

export interface AdaptiveWeights {
  hardData: number;    // 0.20-0.40
  technical: number;   // 0.15-0.35
  sam: number;         // 0.15-0.45 (HIGHER CEILING!)
  economic: number;    // 0.10-0.25
  totalWeight: number; // Should always equal 1.0
  adjustmentReason: string;
}

export interface LayerPerformanceHistory {
  layer: string;
  recentAccuracy: number;      // Last 30 days
  regime: string;
  sampleSize: number;
  lastUpdated: Date;
}

// ============================================================================
// WEIGHT BOUNDS (Configurable ranges for each layer)
// ============================================================================

const WEIGHT_BOUNDS = {
  hardData: { min: 0.20, max: 0.40, default: 0.30 },
  technical: { min: 0.15, max: 0.35, default: 0.25 },
  sam: { min: 0.15, max: 0.45, default: 0.25 },      // Key: SAM can go up to 45%!
  economic: { min: 0.10, max: 0.25, default: 0.20 }
};

// Performance cache for layer accuracy (in-memory, persisted to DB periodically)
let layerPerformanceCache: Map<string, LayerPerformanceHistory> = new Map();

// ============================================================================
// CORE ADAPTIVE WEIGHT CALCULATION
// ============================================================================

export function calculateAdaptiveWeights(
  layerConfidences: LayerConfidence,
  regime: MarketRegime,
  layerScores?: { hardData: number; technical: number; sam: number; economic: number }
): AdaptiveWeights {
  const reasons: string[] = [];
  
  // Start with default weights
  let weights = {
    hardData: WEIGHT_BOUNDS.hardData.default,
    technical: WEIGHT_BOUNDS.technical.default,
    sam: WEIGHT_BOUNDS.sam.default,
    economic: WEIGHT_BOUNDS.economic.default
  };
  
  // 1. Adjust based on layer confidence (higher confidence = higher weight)
  const confidenceAdjustments = calculateConfidenceAdjustments(layerConfidences);
  weights.hardData += confidenceAdjustments.hardData;
  weights.technical += confidenceAdjustments.technical;
  weights.sam += confidenceAdjustments.sam;
  weights.economic += confidenceAdjustments.economic;
  
  if (Math.abs(confidenceAdjustments.sam) > 0.05) {
    reasons.push(`SAM confidence adjustment: ${confidenceAdjustments.sam > 0 ? '+' : ''}${(confidenceAdjustments.sam * 100).toFixed(0)}%`);
  }
  
  // 2. Adjust based on market regime
  const regimeAdjustments = calculateRegimeAdjustments(regime);
  weights.hardData += regimeAdjustments.hardData;
  weights.technical += regimeAdjustments.technical;
  weights.sam += regimeAdjustments.sam;
  weights.economic += regimeAdjustments.economic;
  
  if (regime.volatility === 'extreme' || regime.volatility === 'high') {
    reasons.push(`High volatility regime: Boosted SAM weight`);
  }
  
  // 3. Adjust based on signal agreement (if scores provided)
  if (layerScores) {
    const agreementAdjustments = calculateAgreementAdjustments(layerScores);
    weights.hardData += agreementAdjustments.hardData;
    weights.technical += agreementAdjustments.technical;
    weights.sam += agreementAdjustments.sam;
    weights.economic += agreementAdjustments.economic;
    
    if (agreementAdjustments.sam !== 0) {
      reasons.push(agreementAdjustments.sam > 0 
        ? 'SAM agrees with Hard Data: Weight boosted'
        : 'SAM diverges: Reduced weight');
    }
  }
  
  // 4. Adjust based on historical layer performance
  const performanceAdjustments = calculatePerformanceAdjustments();
  weights.hardData += performanceAdjustments.hardData;
  weights.technical += performanceAdjustments.technical;
  weights.sam += performanceAdjustments.sam;
  weights.economic += performanceAdjustments.economic;
  
  // 5. Clamp to bounds
  weights.hardData = clampWeight(weights.hardData, WEIGHT_BOUNDS.hardData);
  weights.technical = clampWeight(weights.technical, WEIGHT_BOUNDS.technical);
  weights.sam = clampWeight(weights.sam, WEIGHT_BOUNDS.sam);
  weights.economic = clampWeight(weights.economic, WEIGHT_BOUNDS.economic);
  
  // 6. Normalize to ensure total = 1.0
  const total = weights.hardData + weights.technical + weights.sam + weights.economic;
  weights.hardData /= total;
  weights.technical /= total;
  weights.sam /= total;
  weights.economic /= total;
  
  return {
    ...weights,
    totalWeight: 1.0,
    adjustmentReason: reasons.length > 0 ? reasons.join('; ') : 'Using default weights'
  };
}

// ============================================================================
// ADJUSTMENT CALCULATORS
// ============================================================================

function calculateConfidenceAdjustments(confidences: LayerConfidence): {
  hardData: number;
  technical: number;
  sam: number;
  economic: number;
} {
  // Scale: confidence 0-100 maps to adjustment -0.05 to +0.10
  const scaleAdjustment = (confidence: number): number => {
    if (confidence >= 80) return 0.10;
    if (confidence >= 60) return 0.05;
    if (confidence >= 40) return 0;
    if (confidence >= 20) return -0.03;
    return -0.05;
  };
  
  return {
    hardData: scaleAdjustment(confidences.hardData),
    technical: scaleAdjustment(confidences.technical),
    sam: scaleAdjustment(confidences.sam),
    economic: scaleAdjustment(confidences.economic)
  };
}

function calculateRegimeAdjustments(regime: MarketRegime): {
  hardData: number;
  technical: number;
  sam: number;
  economic: number;
} {
  let adjustments = { hardData: 0, technical: 0, sam: 0, economic: 0 };
  
  // High volatility = SAM more important (panic/greed more visible)
  if (regime.volatility === 'extreme') {
    adjustments.sam += 0.10;
    adjustments.hardData += 0.05;
    adjustments.technical -= 0.05;
    adjustments.economic -= 0.05;
  } else if (regime.volatility === 'high') {
    adjustments.sam += 0.05;
    adjustments.hardData += 0.03;
  }
  
  // Risk-off regime = Economic indicators more important
  if (regime.regime === 'risk_off') {
    adjustments.economic += 0.05;
    adjustments.technical -= 0.03;
  }
  
  // Trending market = Technical more reliable
  if (regime.trend === 'bullish' || regime.trend === 'bearish') {
    adjustments.technical += 0.05;
  }
  
  // Contraction = Economic layer critical
  if (regime.regime === 'contraction') {
    adjustments.economic += 0.05;
    adjustments.hardData += 0.03;
  }
  
  return adjustments;
}

function calculateAgreementAdjustments(scores: {
  hardData: number;
  technical: number;
  sam: number;
  economic: number;
}): {
  hardData: number;
  technical: number;
  sam: number;
  economic: number;
} {
  let adjustments = { hardData: 0, technical: 0, sam: 0, economic: 0 };
  
  // Check if SAM agrees with Hard Data (the most reliable layer)
  const samDirection = scores.sam > 0 ? 1 : scores.sam < 0 ? -1 : 0;
  const hardDataDirection = scores.hardData > 0 ? 1 : scores.hardData < 0 ? -1 : 0;
  
  if (samDirection !== 0 && samDirection === hardDataDirection) {
    // SAM and Hard Data agree - boost SAM
    adjustments.sam += 0.08;
    adjustments.hardData += 0.03;
  } else if (samDirection !== 0 && samDirection !== hardDataDirection && hardDataDirection !== 0) {
    // SAM and Hard Data disagree - reduce SAM slightly
    adjustments.sam -= 0.03;
    adjustments.hardData += 0.03;
  }
  
  // Check full agreement (all layers same direction)
  const allPositive = Object.values(scores).every(s => s > 0);
  const allNegative = Object.values(scores).every(s => s < 0);
  
  if (allPositive || allNegative) {
    // Full agreement - boost all slightly (confidence in signal)
    adjustments.hardData += 0.02;
    adjustments.technical += 0.02;
    adjustments.sam += 0.02;
    adjustments.economic += 0.02;
  }
  
  return adjustments;
}

function calculatePerformanceAdjustments(): {
  hardData: number;
  technical: number;
  sam: number;
  economic: number;
} {
  let adjustments = { hardData: 0, technical: 0, sam: 0, economic: 0 };
  
  // Get cached performance data
  const layers = ['hardData', 'technical', 'sam', 'economic'] as const;
  
  for (const layer of layers) {
    const performance = layerPerformanceCache.get(layer);
    if (performance && performance.sampleSize >= 10) {
      // Adjust based on recent accuracy
      // >70% accuracy = boost, <50% = reduce
      if (performance.recentAccuracy > 0.70) {
        adjustments[layer] += 0.05;
      } else if (performance.recentAccuracy > 0.60) {
        adjustments[layer] += 0.02;
      } else if (performance.recentAccuracy < 0.45) {
        adjustments[layer] -= 0.05;
      } else if (performance.recentAccuracy < 0.50) {
        adjustments[layer] -= 0.02;
      }
    }
  }
  
  return adjustments;
}

// ============================================================================
// DYNAMIC WIN RATE CALCULATION
// ============================================================================

export interface DynamicWinRateFactors {
  baseSessionRate: number;
  layerAgreementBonus: number;
  samStrengthBonus: number;
  regimeBonus: number;
  historicalPerformanceBonus: number;
  totalRate: number;
}

export function calculateDynamicWinRate(
  session: string,
  layerScores: { hardData: number; technical: number; sam: number; economic: number },
  layerConfidences: LayerConfidence,
  regime: MarketRegime
): DynamicWinRateFactors {
  // Base rate from session (now just a starting point, not a ceiling)
  const baseRates: Record<string, number> = {
    'ny_am_power_hour': 0.58,  // Reduced from 0.68 - this is just the BASE
    'ny_pm_power_hour': 0.55,
    'london_open': 0.52,
    'london_am': 0.48,
    'ny_premarket': 0.47,
    'ny_midday': 0.42,
    'pre_market': 0.45,
    'after_hours': 0.43,
    'closed': 0
  };
  
  const baseSessionRate = baseRates[session] || 0.50;
  
  // 1. Layer Agreement Bonus (up to +12%)
  const allPositive = Object.values(layerScores).every(s => s > 0);
  const allNegative = Object.values(layerScores).every(s => s < 0);
  const threeAgree = countAgreeing(layerScores) >= 3;
  
  let layerAgreementBonus = 0;
  if (allPositive || allNegative) {
    layerAgreementBonus = 0.12; // Full agreement = +12%
  } else if (threeAgree) {
    layerAgreementBonus = 0.08; // 3/4 agree = +8%
  }
  
  // 2. SAM Strength Bonus (up to +10%)
  // When SAM confidence is high AND Night Owl/DFI signals are strong
  let samStrengthBonus = 0;
  if (layerConfidences.sam >= 70 && Math.abs(layerScores.sam) >= 50) {
    samStrengthBonus = 0.10;
  } else if (layerConfidences.sam >= 50 && Math.abs(layerScores.sam) >= 30) {
    samStrengthBonus = 0.05;
  }
  
  // 3. Regime Bonus (up to +5%)
  let regimeBonus = 0;
  if (regime.volatility === 'extreme' && Math.abs(layerScores.sam) > 40) {
    // High volatility + strong SAM signal = contrarian edge
    regimeBonus = 0.05;
  } else if (regime.regime === 'risk_on' && layerScores.hardData > 30) {
    regimeBonus = 0.03;
  }
  
  // 4. Historical Performance Bonus (up to +5%)
  let historicalPerformanceBonus = 0;
  const avgLayerAccuracy = getAverageLayerAccuracy();
  if (avgLayerAccuracy > 0.65) {
    historicalPerformanceBonus = 0.05;
  } else if (avgLayerAccuracy > 0.55) {
    historicalPerformanceBonus = 0.02;
  }
  
  // Calculate total (NO HARD CEILING - truly dynamic accuracy)
  // Only practical limit: 95% (to account for market randomness)
  const totalRate = Math.min(0.95, 
    baseSessionRate + 
    layerAgreementBonus + 
    samStrengthBonus + 
    regimeBonus + 
    historicalPerformanceBonus
  );
  
  return {
    baseSessionRate,
    layerAgreementBonus,
    samStrengthBonus,
    regimeBonus,
    historicalPerformanceBonus,
    totalRate
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function clampWeight(value: number, bounds: { min: number; max: number }): number {
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

function countAgreeing(scores: { hardData: number; technical: number; sam: number; economic: number }): number {
  const values = Object.values(scores);
  const positives = values.filter(s => s > 0).length;
  const negatives = values.filter(s => s < 0).length;
  return Math.max(positives, negatives);
}

function getAverageLayerAccuracy(): number {
  let total = 0;
  let count = 0;
  
  const performances = Array.from(layerPerformanceCache.values());
  for (const performance of performances) {
    if (performance.sampleSize >= 5) {
      total += performance.recentAccuracy;
      count++;
    }
  }
  
  return count > 0 ? total / count : 0.55; // Default to 55% if no data
}

// ============================================================================
// PERFORMANCE TRACKING (for self-improvement)
// ============================================================================

export function updateLayerPerformance(
  layer: 'hardData' | 'technical' | 'sam' | 'economic',
  wasCorrect: boolean,
  regime: string
): void {
  const key = layer;
  const existing = layerPerformanceCache.get(key);
  
  if (existing) {
    // Rolling average with decay
    const newSampleSize = Math.min(existing.sampleSize + 1, 100);
    const weight = 0.95; // Give more weight to recent performance
    const newAccuracy = existing.recentAccuracy * weight + (wasCorrect ? 1 : 0) * (1 - weight);
    
    layerPerformanceCache.set(key, {
      layer,
      recentAccuracy: newAccuracy,
      regime,
      sampleSize: newSampleSize,
      lastUpdated: new Date()
    });
  } else {
    layerPerformanceCache.set(key, {
      layer,
      recentAccuracy: wasCorrect ? 1 : 0,
      regime,
      sampleSize: 1,
      lastUpdated: new Date()
    });
  }
}

export function getLayerPerformanceStats(): Map<string, LayerPerformanceHistory> {
  return layerPerformanceCache;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const adaptiveWeightEngine = {
  calculateAdaptiveWeights,
  calculateDynamicWinRate,
  updateLayerPerformance,
  getLayerPerformanceStats,
  WEIGHT_BOUNDS
};
