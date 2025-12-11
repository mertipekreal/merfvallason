/**
 * Technical Analysis Service
 * ICT (Inner Circle Trader) Smart Money Concepts Implementation
 * 
 * Implements:
 * 1. Fair Value Gaps (FVG) - Price inefficiencies
 * 2. Market Structure Shifts (MSS) - Trend reversals
 * 3. Liquidity Voids - Rapid price movements
 * 4. Order Blocks - Institutional entry zones
 * 5. RSI, MACD, Trend Analysis
 */

import type { StockPriceData } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export interface FairValueGap {
  direction: 'bullish' | 'bearish';
  gapTop: number;
  gapBottom: number;
  gapSize: number;
  gapPercent: number;
  significance: 'high' | 'medium' | 'low';
  timestamp: Date;
  filled: boolean;
  filledPercent: number;
}

export interface MarketStructureShift {
  shiftType: 'bullish_to_bearish' | 'bearish_to_bullish';
  breakLevel: number;
  previousHigh: number;
  previousLow: number;
  strength: 'strong' | 'moderate' | 'weak';
  timestamp: Date;
}

export interface LiquidityVoid {
  voidTop: number;
  voidBottom: number;
  voidSize: number;
  priceVelocity: number;
  magnetStrength: 'strong' | 'medium' | 'weak';
  timestamp: Date;
}

export interface OrderBlock {
  direction: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  strength: 'strong' | 'moderate' | 'weak';
  mitigated: boolean;
  timestamp: Date;
}

export interface TechnicalSignals {
  rsi: number;
  rsiSignal: 'overbought' | 'oversold' | 'neutral';
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    crossover: 'bullish' | 'bearish' | 'none';
  };
  trendStrength: number; // -1 to 1
  trendDirection: 'up' | 'down' | 'sideways';
  volatility: number;
  volumeRatio: number; // vs 20-day average
}

export interface TechnicalAnalysis {
  symbol: string;
  timeframe: string;
  fvgs: FairValueGap[];
  mss: MarketStructureShift[];
  liquidityVoids: LiquidityVoid[];
  orderBlocks: OrderBlock[];
  signals: TechnicalSignals;
  overallBias: 'bullish' | 'bearish' | 'neutral';
  biasStrength: number; // 0-100
  timestamp: Date;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateRSI(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[candles.length - i].close - candles[candles.length - i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(candles: Candle[]): TechnicalSignals['macd'] {
  const closes = candles.map(c => c.close);
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;
  
  // Simple signal line (9-period SMA of MACD for simplicity)
  const macdHistory: number[] = [];
  for (let i = Math.max(0, closes.length - 9); i < closes.length; i++) {
    const e12 = calculateEMA(closes.slice(0, i + 1), 12);
    const e26 = calculateEMA(closes.slice(0, i + 1), 26);
    macdHistory.push(e12 - e26);
  }
  const signalLine = macdHistory.reduce((a, b) => a + b, 0) / macdHistory.length;
  const histogram = macdLine - signalLine;

  // Detect crossover
  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (macdHistory.length >= 2) {
    const prevHistogram = macdHistory[macdHistory.length - 2] - signalLine;
    if (prevHistogram < 0 && histogram > 0) crossover = 'bullish';
    else if (prevHistogram > 0 && histogram < 0) crossover = 'bearish';
  }

  return { macd: macdLine, signal: signalLine, histogram, crossover };
}

function calculateEMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  if (values.length < period) return values[values.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (values[i] * multiplier) + (ema * (1 - multiplier));
  }

  return ema;
}

function calculateVolatility(candles: Candle[], period: number = 20): number {
  if (candles.length < period) return 0;
  
  const recent = candles.slice(-period);
  const returns = recent.slice(1).map((c, i) => 
    Math.log(c.close / recent[i].close)
  );
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized volatility %
}

// ============================================================================
// ICT SMART MONEY CONCEPTS
// ============================================================================

/**
 * Detect Fair Value Gaps (FVG)
 * A gap between candle wicks indicating price inefficiency
 */
export function detectFairValueGaps(candles: Candle[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const prev = candles[i - 2];
    const current = candles[i - 1];
    const next = candles[i];
    
    // Bullish FVG: Gap between prev high and next low
    if (next.low > prev.high) {
      const gapSize = next.low - prev.high;
      const gapPercent = (gapSize / current.close) * 100;
      
      if (gapPercent > 0.1) { // Minimum 0.1% gap
        fvgs.push({
          direction: 'bullish',
          gapTop: next.low,
          gapBottom: prev.high,
          gapSize,
          gapPercent,
          significance: gapPercent > 1 ? 'high' : gapPercent > 0.5 ? 'medium' : 'low',
          timestamp: current.timestamp,
          filled: false,
          filledPercent: 0
        });
      }
    }
    
    // Bearish FVG: Gap between prev low and next high
    if (next.high < prev.low) {
      const gapSize = prev.low - next.high;
      const gapPercent = (gapSize / current.close) * 100;
      
      if (gapPercent > 0.1) {
        fvgs.push({
          direction: 'bearish',
          gapTop: prev.low,
          gapBottom: next.high,
          gapSize,
          gapPercent,
          significance: gapPercent > 1 ? 'high' : gapPercent > 0.5 ? 'medium' : 'low',
          timestamp: current.timestamp,
          filled: false,
          filledPercent: 0
        });
      }
    }
  }
  
  return fvgs.slice(-10); // Return last 10 FVGs
}

/**
 * Detect Market Structure Shifts (MSS)
 * Break of market structure indicating trend reversal
 */
export function detectMarketStructureShifts(candles: Candle[]): MarketStructureShift[] {
  const shifts: MarketStructureShift[] = [];
  if (candles.length < 10) return shifts;
  
  // Find swing highs and lows
  const swingHighs: { price: number; index: number }[] = [];
  const swingLows: { price: number; index: number }[] = [];
  
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    const isSwingHigh = c.high > candles[i-1].high && c.high > candles[i-2].high &&
                        c.high > candles[i+1].high && c.high > candles[i+2].high;
    const isSwingLow = c.low < candles[i-1].low && c.low < candles[i-2].low &&
                       c.low < candles[i+1].low && c.low < candles[i+2].low;
    
    if (isSwingHigh) swingHighs.push({ price: c.high, index: i });
    if (isSwingLow) swingLows.push({ price: c.low, index: i });
  }
  
  // Detect structure breaks
  for (let i = 1; i < swingHighs.length; i++) {
    if (swingHighs[i].price < swingHighs[i-1].price * 0.99) { // Lower high
      const lowsBetween = swingLows.filter(l => 
        l.index > swingHighs[i-1].index && l.index < swingHighs[i].index
      );
      if (lowsBetween.length > 0) {
        const lowestLow = Math.min(...lowsBetween.map(l => l.price));
        // Check if price broke below the low
        const lastCandle = candles[candles.length - 1];
        if (lastCandle.close < lowestLow) {
          shifts.push({
            shiftType: 'bullish_to_bearish',
            breakLevel: lowestLow,
            previousHigh: swingHighs[i-1].price,
            previousLow: lowestLow,
            strength: 'strong',
            timestamp: candles[swingHighs[i].index].timestamp
          });
        }
      }
    }
  }
  
  for (let i = 1; i < swingLows.length; i++) {
    if (swingLows[i].price > swingLows[i-1].price * 1.01) { // Higher low
      const highsBetween = swingHighs.filter(h => 
        h.index > swingLows[i-1].index && h.index < swingLows[i].index
      );
      if (highsBetween.length > 0) {
        const highestHigh = Math.max(...highsBetween.map(h => h.price));
        const lastCandle = candles[candles.length - 1];
        if (lastCandle.close > highestHigh) {
          shifts.push({
            shiftType: 'bearish_to_bullish',
            breakLevel: highestHigh,
            previousHigh: highestHigh,
            previousLow: swingLows[i-1].price,
            strength: 'strong',
            timestamp: candles[swingLows[i].index].timestamp
          });
        }
      }
    }
  }
  
  return shifts.slice(-5);
}

/**
 * Detect Liquidity Voids
 * Areas where price moved rapidly with little trading
 */
export function detectLiquidityVoids(candles: Candle[]): LiquidityVoid[] {
  const voids: LiquidityVoid[] = [];
  if (candles.length < 5) return voids;
  
  const avgVolume = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;
  const avgRange = candles.reduce((sum, c) => sum + (c.high - c.low), 0) / candles.length;
  
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const range = c.high - c.low;
    const velocity = range / avgRange;
    
    // Large move with relatively low volume = liquidity void
    if (velocity > 2 && c.volume < avgVolume * 0.7) {
      voids.push({
        voidTop: c.high,
        voidBottom: c.low,
        voidSize: range,
        priceVelocity: velocity,
        magnetStrength: velocity > 3 ? 'strong' : velocity > 2 ? 'medium' : 'weak',
        timestamp: c.timestamp
      });
    }
  }
  
  return voids.slice(-5);
}

/**
 * Detect Order Blocks
 * Institutional entry zones identified by large moves
 */
export function detectOrderBlocks(candles: Candle[]): OrderBlock[] {
  const blocks: OrderBlock[] = [];
  if (candles.length < 5) return blocks;
  
  for (let i = 1; i < candles.length - 1; i++) {
    const prev = candles[i - 1];
    const current = candles[i];
    const next = candles[i + 1];
    
    // Bullish Order Block: Last bearish candle before strong bullish move
    if (current.close < current.open && // Bearish candle
        next.close > next.open && // Bullish candle after
        next.close > current.high && // Strong move up
        (next.close - next.open) > (current.open - current.close) * 1.5) {
      blocks.push({
        direction: 'bullish',
        top: current.high,
        bottom: current.low,
        strength: 'strong',
        mitigated: false,
        timestamp: current.timestamp
      });
    }
    
    // Bearish Order Block: Last bullish candle before strong bearish move
    if (current.close > current.open && // Bullish candle
        next.close < next.open && // Bearish candle after
        next.close < current.low && // Strong move down
        (next.open - next.close) > (current.close - current.open) * 1.5) {
      blocks.push({
        direction: 'bearish',
        top: current.high,
        bottom: current.low,
        strength: 'strong',
        mitigated: false,
        timestamp: current.timestamp
      });
    }
  }
  
  return blocks.slice(-5);
}

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

/**
 * Perform complete technical analysis on price data
 */
export function performTechnicalAnalysis(
  symbol: string,
  candles: Candle[],
  timeframe: string = '1d'
): TechnicalAnalysis {
  if (candles.length < 30) {
    return {
      symbol,
      timeframe,
      fvgs: [],
      mss: [],
      liquidityVoids: [],
      orderBlocks: [],
      signals: {
        rsi: 50,
        rsiSignal: 'neutral',
        macd: { macd: 0, signal: 0, histogram: 0, crossover: 'none' },
        trendStrength: 0,
        trendDirection: 'sideways',
        volatility: 0,
        volumeRatio: 1
      },
      overallBias: 'neutral',
      biasStrength: 0,
      timestamp: new Date()
    };
  }

  // Calculate technical indicators
  const rsi = calculateRSI(candles, 14);
  const macd = calculateMACD(candles);
  const volatility = calculateVolatility(candles, 20);
  
  // Calculate volume ratio
  const recentVolume = candles.slice(-5).reduce((sum, c) => sum + c.volume, 0) / 5;
  const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
  const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 1;
  
  // Calculate trend strength
  const ema20 = calculateEMA(candles.map(c => c.close), 20);
  const ema50 = calculateEMA(candles.map(c => c.close), 50);
  const currentPrice = candles[candles.length - 1].close;
  
  let trendStrength = 0;
  let trendDirection: 'up' | 'down' | 'sideways' = 'sideways';
  
  if (currentPrice > ema20 && ema20 > ema50) {
    trendStrength = Math.min(1, (currentPrice - ema50) / ema50 * 10);
    trendDirection = 'up';
  } else if (currentPrice < ema20 && ema20 < ema50) {
    trendStrength = Math.max(-1, (currentPrice - ema50) / ema50 * 10);
    trendDirection = 'down';
  }

  // RSI signal
  let rsiSignal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
  if (rsi > 70) rsiSignal = 'overbought';
  else if (rsi < 30) rsiSignal = 'oversold';

  // ICT concepts
  const fvgs = detectFairValueGaps(candles);
  const mss = detectMarketStructureShifts(candles);
  const liquidityVoids = detectLiquidityVoids(candles);
  const orderBlocks = detectOrderBlocks(candles);

  // Calculate overall bias
  let biasScore = 0;
  let biasFactors = 0;

  // RSI contribution
  if (rsi > 70) { biasScore -= 1; biasFactors++; }
  else if (rsi < 30) { biasScore += 1; biasFactors++; }

  // MACD contribution
  if (macd.crossover === 'bullish') { biasScore += 1; biasFactors++; }
  else if (macd.crossover === 'bearish') { biasScore -= 1; biasFactors++; }

  // Trend contribution
  if (trendDirection === 'up') { biasScore += trendStrength; biasFactors++; }
  else if (trendDirection === 'down') { biasScore += trendStrength; biasFactors++; } // Already negative

  // FVG contribution
  const bullishFVGs = fvgs.filter(f => f.direction === 'bullish').length;
  const bearishFVGs = fvgs.filter(f => f.direction === 'bearish').length;
  if (bullishFVGs > bearishFVGs) { biasScore += 0.5; biasFactors++; }
  else if (bearishFVGs > bullishFVGs) { biasScore -= 0.5; biasFactors++; }

  // MSS contribution
  const lastMSS = mss[mss.length - 1];
  if (lastMSS) {
    if (lastMSS.shiftType === 'bearish_to_bullish') { biasScore += 1; biasFactors++; }
    else { biasScore -= 1; biasFactors++; }
  }

  const normalizedBias = biasFactors > 0 ? biasScore / biasFactors : 0;
  const overallBias: 'bullish' | 'bearish' | 'neutral' = 
    normalizedBias > 0.3 ? 'bullish' : 
    normalizedBias < -0.3 ? 'bearish' : 'neutral';
  const biasStrength = Math.abs(normalizedBias) * 100;

  return {
    symbol,
    timeframe,
    fvgs,
    mss,
    liquidityVoids,
    orderBlocks,
    signals: {
      rsi,
      rsiSignal,
      macd,
      trendStrength,
      trendDirection,
      volatility,
      volumeRatio
    },
    overallBias,
    biasStrength,
    timestamp: new Date()
  };
}

/**
 * Convert StockPriceData to Candle format
 */
export function priceDataToCandles(priceData: StockPriceData[]): Candle[] {
  return priceData
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(p => ({
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume,
      timestamp: new Date(p.timestamp)
    }));
}

/**
 * Get technical features for ML model
 */
export function getTechnicalFeatures(analysis: TechnicalAnalysis): {
  fvgCount: number;
  fvgNetDirection: number;
  mssSignal: number;
  liquidityVoidNearby: boolean;
  trendStrength: number;
  rsi: number;
  macdSignal: number;
} {
  const bullishFVGs = analysis.fvgs.filter(f => f.direction === 'bullish').length;
  const bearishFVGs = analysis.fvgs.filter(f => f.direction === 'bearish').length;
  
  const lastMSS = analysis.mss[analysis.mss.length - 1];
  let mssSignal = 0;
  if (lastMSS) {
    mssSignal = lastMSS.shiftType === 'bearish_to_bullish' ? 1 : -1;
  }

  return {
    fvgCount: analysis.fvgs.length,
    fvgNetDirection: bullishFVGs - bearishFVGs,
    mssSignal,
    liquidityVoidNearby: analysis.liquidityVoids.length > 0,
    trendStrength: analysis.signals.trendStrength,
    rsi: analysis.signals.rsi,
    macdSignal: analysis.signals.macd.crossover === 'bullish' ? 1 : 
                analysis.signals.macd.crossover === 'bearish' ? -1 : 0
  };
}

export default {
  performTechnicalAnalysis,
  detectFairValueGaps,
  detectMarketStructureShifts,
  detectLiquidityVoids,
  detectOrderBlocks,
  priceDataToCandles,
  getTechnicalFeatures
};
