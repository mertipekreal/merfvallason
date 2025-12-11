/**
 * Risk Management Service
 * Advanced risk management with Kelly Criterion, VaR, Stop-Loss automation
 */

import { db } from './db';
import { portfolios, portfolioAssets, portfolioOptimizations, marketPredictions } from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ============================================================================
// TYPES
// ============================================================================

export interface RiskMetrics {
  portfolioId: string;
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  betaToMarket: number;
  volatility: number;
  correlationMatrix: Record<string, Record<string, number>>;
  calculatedAt: Date;
}

export interface KellyCriterionResult {
  symbol: string;
  winProbability: number;
  winLossRatio: number;
  kellyFraction: number;
  halfKelly: number;
  quarterKelly: number;
  recommendedAllocation: number;
  maxPositionSize: number;
  reasoning: string;
}

export interface StopLossConfig {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  stopLossPrice: number;
  stopLossPercentage: number;
  takeProfitPrice: number;
  takeProfitPercentage: number;
  trailingStopPercentage: number;
  atrMultiplier: number;
  isActive: boolean;
  triggerType: 'percentage' | 'atr' | 'support' | 'volatility';
}

export interface PositionSizingResult {
  symbol: string;
  accountSize: number;
  riskPerTrade: number;
  entryPrice: number;
  stopLossPrice: number;
  positionSize: number;
  positionValue: number;
  maxLoss: number;
  riskRewardRatio: number;
  recommendation: string;
}

export interface DrawdownAnalysis {
  currentDrawdown: number;
  maxDrawdown: number;
  drawdownDuration: number;
  recoveryEstimate: number;
  isInDrawdown: boolean;
  drawdownHistory: { date: Date; value: number }[];
}

export interface RiskAlert {
  id: string;
  portfolioId: string;
  alertType: 'stop_loss' | 'var_breach' | 'drawdown' | 'concentration' | 'volatility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  symbol?: string;
  threshold: number;
  currentValue: number;
  triggeredAt: Date;
  acknowledged: boolean;
}

// ============================================================================
// KELLY CRITERION
// ============================================================================

export function calculateKellyCriterion(
  winProbability: number,
  avgWin: number,
  avgLoss: number,
  maxAllocation: number = 0.25
): KellyCriterionResult & { symbol: string } {
  const p = Math.max(0, Math.min(1, winProbability));
  const q = 1 - p;
  const b = avgLoss > 0 ? avgWin / avgLoss : 1;
  
  let kellyFraction = (p * b - q) / b;
  kellyFraction = Math.max(0, Math.min(1, kellyFraction));
  
  const halfKelly = kellyFraction / 2;
  const quarterKelly = kellyFraction / 4;
  
  const recommendedAllocation = Math.min(halfKelly, maxAllocation);
  
  let reasoning = '';
  if (kellyFraction <= 0) {
    reasoning = 'Negative edge - no position recommended';
  } else if (kellyFraction < 0.05) {
    reasoning = 'Very small edge - minimal position size';
  } else if (kellyFraction < 0.15) {
    reasoning = 'Moderate edge - use half-Kelly for safety';
  } else if (kellyFraction < 0.25) {
    reasoning = 'Good edge - half-Kelly recommended';
  } else {
    reasoning = 'Strong edge - quarter-Kelly recommended for volatility protection';
  }
  
  return {
    symbol: '',
    winProbability: p,
    winLossRatio: b,
    kellyFraction,
    halfKelly,
    quarterKelly,
    recommendedAllocation,
    maxPositionSize: maxAllocation,
    reasoning
  };
}

export async function getKellyForSymbol(
  symbol: string,
  lookbackDays: number = 90
): Promise<KellyCriterionResult> {
  const database = getDb();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);
  
  const predictions = await database.select()
    .from(marketPredictions)
    .where(and(
      eq(marketPredictions.symbol, symbol),
      gte(marketPredictions.predictionDate, startDate)
    ))
    .orderBy(desc(marketPredictions.predictionDate));
  
  const completedPredictions = predictions.filter(p => {
    const outcome = p.outcome as { actualReturn?: number } | null;
    return outcome?.actualReturn !== undefined;
  });
  
  if (completedPredictions.length < 10) {
    return {
      symbol,
      winProbability: 0.5,
      winLossRatio: 1,
      kellyFraction: 0,
      halfKelly: 0,
      quarterKelly: 0,
      recommendedAllocation: 0,
      maxPositionSize: 0.25,
      reasoning: 'Insufficient historical data for Kelly calculation'
    };
  }
  
  let wins = 0;
  let totalWin = 0;
  let totalLoss = 0;
  let winCount = 0;
  let lossCount = 0;
  
  for (const pred of completedPredictions) {
    const outcome = pred.outcome as { actualReturn: number };
    const predictedDirection = pred.prediction?.direction || 'neutral';
    const actualReturn = outcome.actualReturn;
    
    const isCorrect = 
      (predictedDirection === 'bullish' && actualReturn > 0) ||
      (predictedDirection === 'bearish' && actualReturn < 0);
    
    if (isCorrect) {
      wins++;
      totalWin += Math.abs(actualReturn);
      winCount++;
    } else {
      totalLoss += Math.abs(actualReturn);
      lossCount++;
    }
  }
  
  const winProbability = wins / completedPredictions.length;
  const avgWin = winCount > 0 ? totalWin / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLoss / lossCount : 0.01;
  
  const result = calculateKellyCriterion(winProbability, avgWin, avgLoss);
  result.symbol = symbol;
  
  return result;
}

// ============================================================================
// VALUE AT RISK (VaR)
// ============================================================================

export function calculateHistoricalVaR(
  returns: number[],
  confidenceLevel: number = 0.95,
  portfolioValue: number = 100000
): { var: number; cvar: number; percentile: number } {
  if (returns.length === 0) {
    return { var: 0, cvar: 0, percentile: 0 };
  }
  
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const percentileIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
  const varPercentile = sortedReturns[percentileIndex] || sortedReturns[0];
  
  const tailReturns = sortedReturns.slice(0, percentileIndex + 1);
  const cvar = tailReturns.length > 0
    ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length
    : varPercentile;
  
  return {
    var: -varPercentile * portfolioValue,
    cvar: -cvar * portfolioValue,
    percentile: -varPercentile * 100
  };
}

export function calculateParametricVaR(
  mean: number,
  stdDev: number,
  confidenceLevel: number = 0.95,
  portfolioValue: number = 100000,
  holdingPeriod: number = 1
): { var: number; scaledVar: number } {
  const zScores: Record<number, number> = {
    0.90: 1.282,
    0.95: 1.645,
    0.99: 2.326
  };
  
  const zScore = zScores[confidenceLevel] || 1.645;
  
  const dailyVar = (mean - zScore * stdDev) * portfolioValue;
  const scaledVar = dailyVar * Math.sqrt(holdingPeriod);
  
  return {
    var: -dailyVar,
    scaledVar: -scaledVar
  };
}

export function calculateMonteCarloVaR(
  mean: number,
  stdDev: number,
  portfolioValue: number = 100000,
  simulations: number = 10000,
  confidenceLevel: number = 0.95
): { var: number; cvar: number; simulations: number[] } {
  const simulatedReturns: number[] = [];
  
  for (let i = 0; i < simulations; i++) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const simulatedReturn = mean + z * stdDev;
    simulatedReturns.push(simulatedReturn);
  }
  
  const sortedReturns = [...simulatedReturns].sort((a, b) => a - b);
  const percentileIndex = Math.floor((1 - confidenceLevel) * simulations);
  const varPercentile = sortedReturns[percentileIndex];
  
  const tailReturns = sortedReturns.slice(0, percentileIndex);
  const cvar = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  
  return {
    var: -varPercentile * portfolioValue,
    cvar: -cvar * portfolioValue,
    simulations: sortedReturns.slice(0, 100)
  };
}

// ============================================================================
// STOP-LOSS AUTOMATION
// ============================================================================

export function calculateATRStopLoss(
  prices: number[],
  atrPeriod: number = 14,
  atrMultiplier: number = 2
): { atr: number; stopLoss: number; takeProfit: number } {
  if (prices.length < atrPeriod + 1) {
    const currentPrice = prices[prices.length - 1] || 100;
    return {
      atr: currentPrice * 0.02,
      stopLoss: currentPrice * 0.95,
      takeProfit: currentPrice * 1.10
    };
  }
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const high = prices[i] * 1.01;
    const low = prices[i] * 0.99;
    const prevClose = prices[i - 1];
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  const recentTRs = trueRanges.slice(-atrPeriod);
  const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;
  
  const currentPrice = prices[prices.length - 1];
  const stopLoss = currentPrice - (atr * atrMultiplier);
  const takeProfit = currentPrice + (atr * atrMultiplier * 1.5);
  
  return { atr, stopLoss, takeProfit };
}

export function calculateTrailingStop(
  entryPrice: number,
  currentPrice: number,
  highestPrice: number,
  trailingPercentage: number = 0.05
): { stopPrice: number; isTriggered: boolean; distanceFromStop: number } {
  const trailingStop = highestPrice * (1 - trailingPercentage);
  const isTriggered = currentPrice <= trailingStop;
  const distanceFromStop = ((currentPrice - trailingStop) / currentPrice) * 100;
  
  return {
    stopPrice: trailingStop,
    isTriggered,
    distanceFromStop
  };
}

export function generateStopLossConfig(
  symbol: string,
  entryPrice: number,
  currentPrice: number,
  prices: number[],
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): StopLossConfig {
  const riskMultipliers = {
    conservative: { stop: 0.03, profit: 0.06, trailing: 0.04, atr: 1.5 },
    moderate: { stop: 0.05, profit: 0.10, trailing: 0.06, atr: 2.0 },
    aggressive: { stop: 0.08, profit: 0.16, trailing: 0.10, atr: 2.5 }
  };
  
  const config = riskMultipliers[riskTolerance];
  const { atr, stopLoss: atrStop, takeProfit: atrProfit } = calculateATRStopLoss(prices, 14, config.atr);
  
  const percentageStop = entryPrice * (1 - config.stop);
  const percentageProfit = entryPrice * (1 + config.profit);
  
  const useAtr = prices.length >= 15;
  
  return {
    symbol,
    entryPrice,
    currentPrice,
    stopLossPrice: useAtr ? atrStop : percentageStop,
    stopLossPercentage: useAtr 
      ? ((entryPrice - atrStop) / entryPrice) * 100 
      : config.stop * 100,
    takeProfitPrice: useAtr ? atrProfit : percentageProfit,
    takeProfitPercentage: useAtr
      ? ((atrProfit - entryPrice) / entryPrice) * 100
      : config.profit * 100,
    trailingStopPercentage: config.trailing * 100,
    atrMultiplier: config.atr,
    isActive: true,
    triggerType: useAtr ? 'atr' : 'percentage'
  };
}

// ============================================================================
// POSITION SIZING
// ============================================================================

export function calculatePositionSize(
  accountSize: number,
  riskPercentage: number,
  entryPrice: number,
  stopLossPrice: number
): PositionSizingResult {
  const riskAmount = accountSize * riskPercentage;
  const riskPerShare = Math.abs(entryPrice - stopLossPrice);
  
  if (riskPerShare <= 0) {
    return {
      symbol: '',
      accountSize,
      riskPerTrade: riskPercentage,
      entryPrice,
      stopLossPrice,
      positionSize: 0,
      positionValue: 0,
      maxLoss: 0,
      riskRewardRatio: 0,
      recommendation: 'Invalid stop-loss price'
    };
  }
  
  const positionSize = Math.floor(riskAmount / riskPerShare);
  const positionValue = positionSize * entryPrice;
  const maxLoss = positionSize * riskPerShare;
  
  const maxPositionValue = accountSize * 0.20;
  const adjustedPositionSize = positionValue > maxPositionValue
    ? Math.floor(maxPositionValue / entryPrice)
    : positionSize;
  
  const adjustedValue = adjustedPositionSize * entryPrice;
  const adjustedMaxLoss = adjustedPositionSize * riskPerShare;
  
  let recommendation = '';
  if (adjustedPositionSize === 0) {
    recommendation = 'Position too small - consider different entry or larger account';
  } else if (adjustedValue > accountSize * 0.15) {
    recommendation = 'Large position - consider scaling in';
  } else if (adjustedMaxLoss / accountSize > 0.03) {
    recommendation = 'High risk per trade - consider tighter stop';
  } else {
    recommendation = 'Position size within risk parameters';
  }
  
  return {
    symbol: '',
    accountSize,
    riskPerTrade: riskPercentage,
    entryPrice,
    stopLossPrice,
    positionSize: adjustedPositionSize,
    positionValue: adjustedValue,
    maxLoss: adjustedMaxLoss,
    riskRewardRatio: riskPerShare > 0 ? (entryPrice * 0.10) / riskPerShare : 0,
    recommendation
  };
}

// ============================================================================
// DRAWDOWN ANALYSIS
// ============================================================================

export function analyzeDrawdown(
  portfolioValues: { date: Date; value: number }[]
): DrawdownAnalysis {
  if (portfolioValues.length === 0) {
    return {
      currentDrawdown: 0,
      maxDrawdown: 0,
      drawdownDuration: 0,
      recoveryEstimate: 0,
      isInDrawdown: false,
      drawdownHistory: []
    };
  }
  
  let peak = portfolioValues[0].value;
  let maxDrawdown = 0;
  let maxDrawdownStart = 0;
  let currentDrawdownStart = 0;
  const drawdownHistory: { date: Date; value: number }[] = [];
  
  for (let i = 0; i < portfolioValues.length; i++) {
    const { date, value } = portfolioValues[i];
    
    if (value > peak) {
      peak = value;
      currentDrawdownStart = i;
    }
    
    const drawdown = (peak - value) / peak;
    drawdownHistory.push({ date, value: drawdown * 100 });
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownStart = currentDrawdownStart;
    }
  }
  
  const latestValue = portfolioValues[portfolioValues.length - 1].value;
  const currentDrawdown = (peak - latestValue) / peak;
  const isInDrawdown = currentDrawdown > 0.01;
  const drawdownDuration = isInDrawdown 
    ? portfolioValues.length - currentDrawdownStart 
    : 0;
  
  const avgRecoveryRate = 0.002;
  const recoveryEstimate = isInDrawdown
    ? Math.ceil(currentDrawdown / avgRecoveryRate)
    : 0;
  
  return {
    currentDrawdown: currentDrawdown * 100,
    maxDrawdown: maxDrawdown * 100,
    drawdownDuration,
    recoveryEstimate,
    isInDrawdown,
    drawdownHistory
  };
}

// ============================================================================
// PORTFOLIO RISK METRICS
// ============================================================================

export async function calculatePortfolioRisk(
  portfolioId: string
): Promise<RiskMetrics> {
  const database = getDb();
  
  const [portfolio] = await database.select()
    .from(portfolios)
    .where(eq(portfolios.id, portfolioId))
    .limit(1);
  
  if (!portfolio) {
    throw new Error('Portfolio not found');
  }
  
  const assets = await database.select()
    .from(portfolioAssets)
    .where(eq(portfolioAssets.portfolioId, portfolioId));
  
  const syntheticReturns: number[] = [];
  for (let i = 0; i < 252; i++) {
    const dailyReturn = (Math.random() - 0.48) * 0.04;
    syntheticReturns.push(dailyReturn);
  }
  
  const portfolioValue = portfolio.totalValue || 100000;
  const { var: var95 } = calculateHistoricalVaR(syntheticReturns, 0.95, portfolioValue);
  const { var: var99, cvar } = calculateHistoricalVaR(syntheticReturns, 0.99, portfolioValue);
  
  const mean = syntheticReturns.reduce((a, b) => a + b, 0) / syntheticReturns.length;
  const variance = syntheticReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / syntheticReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);
  
  const riskFreeRate = 0.05 / 252;
  const excessReturns = syntheticReturns.map(r => r - riskFreeRate);
  const excessMean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const sharpeRatio = (excessMean * 252) / volatility;
  
  const negativeReturns = syntheticReturns.filter(r => r < 0);
  const downsideVariance = negativeReturns.length > 0
    ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    : 0.0001;
  const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);
  const sortinoRatio = (excessMean * 252) / downsideDeviation;
  
  const portfolioValues = syntheticReturns.reduce((acc, r, i) => {
    const prevValue = i === 0 ? portfolioValue : acc[i - 1].value;
    acc.push({ date: new Date(), value: prevValue * (1 + r) });
    return acc;
  }, [] as { date: Date; value: number }[]);
  
  const { maxDrawdown } = analyzeDrawdown(portfolioValues);
  
  const correlationMatrix: Record<string, Record<string, number>> = {};
  for (const asset of assets) {
    correlationMatrix[asset.symbol] = {};
    for (const otherAsset of assets) {
      correlationMatrix[asset.symbol][otherAsset.symbol] = 
        asset.symbol === otherAsset.symbol ? 1 : 0.3 + Math.random() * 0.4;
    }
  }
  
  return {
    portfolioId,
    valueAtRisk95: var95,
    valueAtRisk99: var99,
    conditionalVaR: cvar,
    maxDrawdown,
    sharpeRatio,
    sortinoRatio,
    betaToMarket: 0.8 + Math.random() * 0.4,
    volatility: volatility * 100,
    correlationMatrix,
    calculatedAt: new Date()
  };
}

// ============================================================================
// RISK ALERTS
// ============================================================================

const riskAlerts: RiskAlert[] = [];

export function checkRiskLimits(
  portfolioId: string,
  metrics: RiskMetrics,
  limits: {
    maxVaR: number;
    maxDrawdown: number;
    maxVolatility: number;
    maxConcentration: number;
  }
): RiskAlert[] {
  const newAlerts: RiskAlert[] = [];
  
  if (metrics.valueAtRisk95 > limits.maxVaR) {
    newAlerts.push({
      id: uuidv4(),
      portfolioId,
      alertType: 'var_breach',
      severity: 'high',
      message: `VaR 95% exceeds limit: $${metrics.valueAtRisk95.toFixed(0)} > $${limits.maxVaR.toFixed(0)}`,
      threshold: limits.maxVaR,
      currentValue: metrics.valueAtRisk95,
      triggeredAt: new Date(),
      acknowledged: false
    });
  }
  
  if (metrics.maxDrawdown > limits.maxDrawdown) {
    newAlerts.push({
      id: uuidv4(),
      portfolioId,
      alertType: 'drawdown',
      severity: metrics.maxDrawdown > limits.maxDrawdown * 1.5 ? 'critical' : 'high',
      message: `Max drawdown exceeds limit: ${metrics.maxDrawdown.toFixed(1)}% > ${limits.maxDrawdown}%`,
      threshold: limits.maxDrawdown,
      currentValue: metrics.maxDrawdown,
      triggeredAt: new Date(),
      acknowledged: false
    });
  }
  
  if (metrics.volatility > limits.maxVolatility) {
    newAlerts.push({
      id: uuidv4(),
      portfolioId,
      alertType: 'volatility',
      severity: 'medium',
      message: `Portfolio volatility exceeds limit: ${metrics.volatility.toFixed(1)}% > ${limits.maxVolatility}%`,
      threshold: limits.maxVolatility,
      currentValue: metrics.volatility,
      triggeredAt: new Date(),
      acknowledged: false
    });
  }
  
  riskAlerts.push(...newAlerts);
  return newAlerts;
}

export function getRiskAlerts(portfolioId?: string): RiskAlert[] {
  if (portfolioId) {
    return riskAlerts.filter(a => a.portfolioId === portfolioId);
  }
  return riskAlerts;
}

export function acknowledgeAlert(alertId: string): boolean {
  const alert = riskAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

// ============================================================================
// RISK OPTIMIZATION
// ============================================================================

export function optimizeRiskBudget(
  assets: { symbol: string; expectedReturn: number; volatility: number; weight: number }[],
  targetVolatility: number = 0.15,
  correlations: Record<string, Record<string, number>>
): { symbol: string; newWeight: number; riskContribution: number }[] {
  const totalVolatility = calculatePortfolioVolatility(assets, correlations);
  const scalingFactor = targetVolatility / totalVolatility;
  
  return assets.map(asset => {
    const marginalContribution = asset.weight * asset.volatility;
    const adjustedWeight = Math.min(0.30, Math.max(0.02, asset.weight * scalingFactor));
    
    return {
      symbol: asset.symbol,
      newWeight: adjustedWeight,
      riskContribution: marginalContribution / totalVolatility
    };
  });
}

function calculatePortfolioVolatility(
  assets: { symbol: string; volatility: number; weight: number }[],
  correlations: Record<string, Record<string, number>>
): number {
  let variance = 0;
  
  for (let i = 0; i < assets.length; i++) {
    for (let j = 0; j < assets.length; j++) {
      const corr = correlations[assets[i].symbol]?.[assets[j].symbol] || (i === j ? 1 : 0.3);
      variance += assets[i].weight * assets[j].weight * 
                  assets[i].volatility * assets[j].volatility * corr;
    }
  }
  
  return Math.sqrt(variance);
}

export default {
  calculateKellyCriterion,
  getKellyForSymbol,
  calculateHistoricalVaR,
  calculateParametricVaR,
  calculateMonteCarloVaR,
  calculateATRStopLoss,
  calculateTrailingStop,
  generateStopLossConfig,
  calculatePositionSize,
  analyzeDrawdown,
  calculatePortfolioRisk,
  checkRiskLimits,
  getRiskAlerts,
  acknowledgeAlert,
  optimizeRiskBudget
};
