/**
 * Portfolio Backtest Service
 * 
 * Simulates trading performance over historical data
 * Tests the 3-layer prediction system with real market data
 */

import { fetchEconomicIndicators } from './fred-service';

// ============================================================================
// TYPES
// ============================================================================

interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
}

interface Trade {
  entryDate: string;
  exitDate: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  prediction: {
    direction: 'up' | 'down' | 'neutral';
    probability: number;
    confidence: number;
  };
  outcome: 'win' | 'loss';
}

interface BacktestResult {
  symbol: string;
  period: {
    start: string;
    end: string;
    totalDays: number;
  };
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPct: number;
  annualizedReturn: number;
  
  // Trade stats
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  
  // Risk metrics
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  volatility: number;
  
  // Monthly breakdown
  monthlyReturns: { month: string; returnPct: number; trades: number }[];
  
  // Equity curve
  equityCurve: { date: string; equity: number }[];
  
  // All trades
  trades: Trade[];
}

// ============================================================================
// YAHOO FINANCE DATA FETCHER
// ============================================================================

async function fetchYahooFinanceData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<HistoricalPrice[]> {
  const start = Math.floor(startDate.getTime() / 1000);
  const end = Math.floor(endDate.getTime() / 1000);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${start}&period2=${end}&interval=1d`;
  
  console.log(`[Backtest] Fetching ${symbol} data from Yahoo Finance...`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Yahoo Finance error: ${response.status}`);
  }
  
  const data = await response.json();
  const result = data.chart.result[0];
  
  if (!result || !result.timestamp) {
    throw new Error('No data returned from Yahoo Finance');
  }
  
  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  
  const prices: HistoricalPrice[] = [];
  
  for (let i = 0; i < timestamps.length; i++) {
    if (quotes.close[i] === null) continue;
    
    const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
    const prevClose = i > 0 ? quotes.close[i - 1] : quotes.open[i];
    const change = prevClose ? ((quotes.close[i] - prevClose) / prevClose) * 100 : 0;
    
    prices.push({
      date,
      open: quotes.open[i] || quotes.close[i],
      high: quotes.high[i] || quotes.close[i],
      low: quotes.low[i] || quotes.close[i],
      close: quotes.close[i],
      volume: quotes.volume[i] || 0,
      change
    });
  }
  
  console.log(`[Backtest] Fetched ${prices.length} days of data for ${symbol}`);
  return prices;
}

// ============================================================================
// SIMPLIFIED PREDICTION MODEL (For Backtest)
// ============================================================================

interface SimplePrediction {
  direction: 'up' | 'down' | 'neutral';
  probability: number;
  confidence: number;
}

function generateBacktestPrediction(
  prices: HistoricalPrice[],
  currentIndex: number,
  economicData: any
): SimplePrediction {
  // Look-back periods
  const lookback5 = Math.max(0, currentIndex - 5);
  const lookback20 = Math.max(0, currentIndex - 20);
  
  const current = prices[currentIndex];
  const prev5 = prices[lookback5];
  const prev20 = prices[lookback20];
  
  // Technical indicators
  const momentum5d = ((current.close - prev5.close) / prev5.close) * 100;
  const momentum20d = ((current.close - prev20.close) / prev20.close) * 100;
  
  // Volatility (simplified)
  let volatility = 0;
  for (let i = Math.max(0, currentIndex - 20); i < currentIndex; i++) {
    volatility += Math.abs(prices[i].change);
  }
  volatility = volatility / Math.min(20, currentIndex || 1);
  
  // RSI approximation
  let gains = 0, losses = 0;
  for (let i = Math.max(0, currentIndex - 14); i < currentIndex; i++) {
    if (prices[i].change > 0) gains += prices[i].change;
    else losses += Math.abs(prices[i].change);
  }
  const rsi = gains + losses > 0 ? (gains / (gains + losses)) * 100 : 50;
  
  // Volume trend
  const avgVolume = prices.slice(Math.max(0, currentIndex - 20), currentIndex)
    .reduce((sum, p) => sum + p.volume, 0) / Math.min(20, currentIndex || 1);
  const volumeRatio = avgVolume > 0 ? current.volume / avgVolume : 1;
  
  // Economic factors (VIX, yield curve)
  const vixScore = economicData.vix < 20 ? 0.3 : economicData.vix > 30 ? -0.3 : 0;
  const yieldScore = economicData.yieldCurve > 0 ? 0.2 : -0.3;
  
  // Composite score
  let score = 0;
  
  // Momentum signals (mean reversion + trend following)
  if (momentum5d > 3) score += 0.15; // Strong momentum
  else if (momentum5d < -3) score -= 0.15;
  
  if (momentum20d > 5) score += 0.1;
  else if (momentum20d < -5) score -= 0.1;
  
  // RSI signals (oversold/overbought)
  if (rsi < 30) score += 0.25; // Oversold = buy signal
  else if (rsi > 70) score -= 0.25; // Overbought = sell signal
  
  // Volume confirmation
  if (volumeRatio > 1.5 && momentum5d > 0) score += 0.1;
  else if (volumeRatio > 1.5 && momentum5d < 0) score -= 0.1;
  
  // Economic overlay
  score += vixScore;
  score += yieldScore;
  
  // Add some noise for realism
  score += (Math.random() - 0.5) * 0.1;
  
  // Determine direction
  let direction: 'up' | 'down' | 'neutral';
  let probability: number;
  
  if (score > 0.15) {
    direction = 'up';
    probability = 0.5 + Math.min(0.25, score * 0.4);
  } else if (score < -0.15) {
    direction = 'down';
    probability = 0.5 + Math.min(0.25, Math.abs(score) * 0.4);
  } else {
    direction = 'neutral';
    probability = 0.5;
  }
  
  // Confidence based on signal strength
  const confidence = Math.min(80, 30 + Math.abs(score) * 100);
  
  return { direction, probability, confidence };
}

// ============================================================================
// BACKTEST ENGINE
// ============================================================================

export async function runPortfolioBacktest(
  symbol: string = 'QQQ', // Nasdaq ETF
  initialCapital: number = 10000,
  years: number = 2,
  horizonDays: number = 5
): Promise<BacktestResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[Backtest] Starting ${years}-year backtest for ${symbol}`);
  console.log(`[Backtest] Initial Capital: $${initialCapital.toLocaleString()}`);
  console.log(`[Backtest] Horizon: ${horizonDays} days per trade`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);
  
  // Fetch historical data
  const prices = await fetchYahooFinanceData(symbol, startDate, endDate);
  
  if (prices.length < 50) {
    throw new Error('Insufficient historical data');
  }
  
  // Get current economic data (will use as baseline)
  const economicData = await fetchEconomicIndicators();
  
  // Initialize tracking
  let capital = initialCapital;
  let peakCapital = initialCapital;
  let maxDrawdown = 0;
  const trades: Trade[] = [];
  const equityCurve: { date: string; equity: number }[] = [];
  const monthlyReturns: Map<string, { returnPct: number; trades: number }> = new Map();
  
  // Run backtest
  let i = 30; // Start after enough lookback data
  
  while (i < prices.length - horizonDays) {
    const currentPrice = prices[i];
    const prediction = generateBacktestPrediction(prices, i, economicData);
    
    // Only trade on strong signals
    if (prediction.direction === 'neutral' || prediction.probability < 0.55) {
      i += 1;
      continue;
    }
    
    // Position sizing (fixed fraction)
    const positionSize = capital * 0.95; // 95% of capital per trade
    
    // Entry
    const entryPrice = currentPrice.close;
    const entryDate = currentPrice.date;
    
    // Exit after horizon days
    const exitIndex = Math.min(i + horizonDays, prices.length - 1);
    const exitPrice = prices[exitIndex].close;
    const exitDate = prices[exitIndex].date;
    
    // Calculate return
    let returnPct: number;
    if (prediction.direction === 'up') {
      returnPct = ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      returnPct = ((entryPrice - exitPrice) / entryPrice) * 100;
    }
    
    // Apply transaction costs (0.1% round trip)
    returnPct -= 0.1;
    
    // Update capital
    const pnl = positionSize * (returnPct / 100);
    capital += pnl;
    
    // Track drawdown
    if (capital > peakCapital) {
      peakCapital = capital;
    }
    const drawdown = ((peakCapital - capital) / peakCapital) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
    
    // Record trade
    const trade: Trade = {
      entryDate,
      exitDate,
      direction: prediction.direction === 'up' ? 'long' : 'short',
      entryPrice,
      exitPrice,
      returnPct,
      prediction: {
        direction: prediction.direction,
        probability: prediction.probability,
        confidence: prediction.confidence
      },
      outcome: returnPct > 0 ? 'win' : 'loss'
    };
    trades.push(trade);
    
    // Track monthly
    const month = entryDate.substring(0, 7);
    const existing = monthlyReturns.get(month) || { returnPct: 0, trades: 0 };
    existing.returnPct += returnPct;
    existing.trades += 1;
    monthlyReturns.set(month, existing);
    
    // Record equity
    equityCurve.push({ date: exitDate, equity: capital });
    
    // Move to next trade window
    i = exitIndex + 1;
  }
  
  // Calculate statistics
  const winningTrades = trades.filter(t => t.outcome === 'win');
  const losingTrades = trades.filter(t => t.outcome === 'loss');
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.returnPct, 0) / winningTrades.length 
    : 0;
  const avgLoss = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.returnPct, 0) / losingTrades.length)
    : 0;
  
  const totalWins = winningTrades.reduce((sum, t) => sum + t.returnPct, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.returnPct, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  
  const totalReturn = capital - initialCapital;
  const totalReturnPct = (totalReturn / initialCapital) * 100;
  const annualizedReturn = Math.pow(capital / initialCapital, 1 / years) - 1;
  
  // Risk metrics
  const returns = trades.map(t => t.returnPct);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  
  const riskFreeRate = 0.05 / 52; // Weekly risk-free rate (~5% annual)
  const sharpeRatio = volatility > 0 ? (avgReturn - riskFreeRate) / volatility * Math.sqrt(52) : 0;
  
  const negativeReturns = returns.filter(r => r < 0);
  const downVariance = negativeReturns.length > 0 
    ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length 
    : 0;
  const downDeviation = Math.sqrt(downVariance);
  const sortinoRatio = downDeviation > 0 ? (avgReturn - riskFreeRate) / downDeviation * Math.sqrt(52) : 0;
  
  const result: BacktestResult = {
    symbol,
    period: {
      start: prices[0].date,
      end: prices[prices.length - 1].date,
      totalDays: prices.length
    },
    initialCapital,
    finalCapital: Math.round(capital * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
    
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    
    monthlyReturns: Array.from(monthlyReturns.entries()).map(([month, data]) => ({
      month,
      returnPct: Math.round(data.returnPct * 100) / 100,
      trades: data.trades
    })),
    
    equityCurve,
    trades
  };
  
  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('BACKTEST SONUÇLARI');
  console.log(`${'='.repeat(60)}`);
  console.log(`Sembol: ${symbol}`);
  console.log(`Dönem: ${result.period.start} - ${result.period.end}`);
  console.log(`Başlangıç Sermaye: $${initialCapital.toLocaleString()}`);
  console.log(`Final Sermaye: $${result.finalCapital.toLocaleString()}`);
  console.log(`Toplam Getiri: $${result.totalReturn.toLocaleString()} (${result.totalReturnPct}%)`);
  console.log(`Yıllık Getiri: ${result.annualizedReturn}%`);
  console.log(`---`);
  console.log(`Toplam İşlem: ${result.totalTrades}`);
  console.log(`Kazanan: ${result.winningTrades} | Kaybeden: ${result.losingTrades}`);
  console.log(`Kazanma Oranı: ${result.winRate}%`);
  console.log(`Ortalama Kazanç: +${result.avgWin}% | Ortalama Kayıp: -${result.avgLoss}%`);
  console.log(`Kar Faktörü: ${result.profitFactor}`);
  console.log(`---`);
  console.log(`Max Drawdown: ${result.maxDrawdownPct}%`);
  console.log(`Sharpe Ratio: ${result.sharpeRatio}`);
  console.log(`Sortino Ratio: ${result.sortinoRatio}`);
  console.log(`${'='.repeat(60)}\n`);
  
  return result;
}

// Export for use in routes
export const backtestService = {
  runPortfolioBacktest
};
