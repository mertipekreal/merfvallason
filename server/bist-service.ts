/**
 * BIST (Borsa Istanbul) Service
 * Turkish Stock Exchange data fetching, analysis, and integration
 */

import { db } from './db';
import { bistListings, bistPriceData, turkishMacroIndicators, currencyRates } from '@shared/schema';
import type { BistListing, BistPriceData, TurkishMacroIndicator, CurrencyRate } from '@shared/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// BIST Index Classifications
export const BIST_INDICES = ['BIST100', 'BIST50', 'BIST30', 'BIST_BANK', 'BIST_SINAI'] as const;
export type BistIndex = typeof BIST_INDICES[number];

// BIST Sector Classifications (Turkish)
export const BIST_SECTORS = {
  BANK: 'Bankacılık',
  HOLDING: 'Holding ve Yatırım',
  METAL: 'Metal Ana Sanayi',
  OTOMOTIV: 'Otomotiv',
  INSAAT: 'İnşaat',
  ENERJI: 'Enerji',
  GIDA: 'Gıda',
  TEKSTIL: 'Tekstil',
  TEKNOLOJI: 'Teknoloji',
  SAGLIK: 'Sağlık',
  PERAKENDE: 'Perakende Ticaret',
  ULAŞTIRMA: 'Ulaştırma',
  ILETISIM: 'İletişim',
  TURIZM: 'Turizm',
} as const;

// Popular BIST30 symbols for quick reference
export const BIST30_SYMBOLS = [
  'THYAO', 'GARAN', 'ASELS', 'EREGL', 'KCHOL', 'SISE', 'AKBNK', 'SAHOL',
  'ISCTR', 'KOZAL', 'PGSUS', 'TUPRS', 'TCELL', 'BIMAS', 'TOASO', 'ARCLK',
  'EKGYO', 'PETKM', 'YKBNK', 'SASA', 'HALKB', 'KORDS', 'TAVHL', 'FROTO',
  'GUBRF', 'DOHOL', 'VESTL', 'ENKAI', 'KONTR', 'KOZAA'
];

interface BistQuote {
  symbol: string;
  name?: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover?: number;
  bid?: number;
  ask?: number;
  timestamp: Date;
}

interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  bollingerBands: { upper: number; middle: number; lower: number } | null;
  atr14: number | null;
  volume20Avg: number | null;
  relativeVolume: number | null;
}

interface BistAnalysis {
  symbol: string;
  currentPrice: number;
  technicals: TechnicalIndicators;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  signals: string[];
  supports: number[];
  resistances: number[];
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
}

interface CurrencyInfo {
  usdTry: number;
  eurTry: number;
  gbpTry: number;
  goldTry: number;
  dailyChange: { usd: number; eur: number; gbp: number };
}

class BistService {
  private mockDataMode: boolean = false;

  constructor() {
    console.log('🇹🇷 BIST Service initialized');
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{ 
    configured: boolean; 
    mockMode: boolean;
    listingsCount: number;
    priceDataCount: number;
    lastUpdate: Date | null;
  }> {
    let listingsCount = 0;
    let priceDataCount = 0;
    let lastUpdate: Date | null = null;

    try {
      if (db) {
        const listings = await db.select({ count: sql<number>`count(*)` }).from(bistListings);
        listingsCount = listings[0]?.count || 0;

        const prices = await db.select({ count: sql<number>`count(*)` }).from(bistPriceData);
        priceDataCount = prices[0]?.count || 0;

        const latest = await db.select({ updatedAt: bistListings.updatedAt })
          .from(bistListings)
          .orderBy(desc(bistListings.updatedAt))
          .limit(1);
        lastUpdate = latest[0]?.updatedAt || null;
      }
    } catch (error) {
      console.error('Error getting BIST status:', error);
    }

    return {
      configured: true,
      mockMode: this.mockDataMode,
      listingsCount,
      priceDataCount,
      lastUpdate
    };
  }

  /**
   * Generate realistic mock BIST data for development
   */
  private generateMockQuote(symbol: string): BistQuote {
    const basePrice = Math.random() * 500 + 10;
    const change = (Math.random() - 0.5) * 10;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol,
      name: `${symbol} A.Ş.`,
      lastPrice: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      open: parseFloat((basePrice - change / 2).toFixed(2)),
      high: parseFloat((basePrice + Math.abs(change)).toFixed(2)),
      low: parseFloat((basePrice - Math.abs(change)).toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 100000,
      turnover: Math.floor(Math.random() * 1000000000),
      timestamp: new Date()
    };
  }

  /**
   * Fetch current quote for a BIST symbol
   */
  async getQuote(symbol: string): Promise<BistQuote | null> {
    try {
      // Check database first for recent data
      if (db) {
        const cached = await db.select()
          .from(bistListings)
          .where(eq(bistListings.symbol, symbol.toUpperCase()))
          .limit(1);

        if (cached.length > 0) {
          const listing = cached[0];
          // If updated within last 15 minutes, return cached
          const cacheAge = Date.now() - (listing.updatedAt?.getTime() || 0);
          if (cacheAge < 15 * 60 * 1000) {
            return {
              symbol: listing.symbol,
              name: listing.name,
              lastPrice: listing.lastPrice || 0,
              change: listing.dailyChange || 0,
              changePercent: listing.dailyChange || 0,
              open: listing.lastPrice || 0,
              high: listing.lastPrice || 0,
              low: listing.lastPrice || 0,
              volume: listing.avgVolume || 0,
              timestamp: listing.updatedAt || new Date()
            };
          }
        }
      }

      // For now, generate mock data (can be replaced with real API)
      return this.generateMockQuote(symbol.toUpperCase());
    } catch (error) {
      console.error(`Error fetching BIST quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple quotes for an index
   */
  async getIndexQuotes(index: BistIndex = 'BIST30'): Promise<BistQuote[]> {
    const symbols = index === 'BIST30' ? BIST30_SYMBOLS : BIST30_SYMBOLS.slice(0, 10);
    const quotes: BistQuote[] = [];

    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol);
      if (quote) {
        quotes.push(quote);
      }
    }

    return quotes.sort((a, b) => b.volume - a.volume);
  }

  /**
   * Get historical price data for a symbol
   */
  async getHistoricalData(
    symbol: string, 
    days: number = 30
  ): Promise<BistPriceData[]> {
    try {
      if (db) {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const data = await db.select()
          .from(bistPriceData)
          .where(and(
            eq(bistPriceData.symbol, symbol.toUpperCase()),
            gte(bistPriceData.timestamp, fromDate)
          ))
          .orderBy(desc(bistPriceData.timestamp));

        if (data.length > 0) {
          return data;
        }
      }

      // Generate mock historical data
      return this.generateMockHistoricalData(symbol, days);
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Generate mock historical data for development
   */
  private generateMockHistoricalData(symbol: string, days: number): BistPriceData[] {
    const data: BistPriceData[] = [];
    let price = Math.random() * 500 + 50;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const change = (Math.random() - 0.48) * price * 0.05;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * Math.abs(change);
      const low = Math.min(open, close) - Math.random() * Math.abs(change);
      const volume = Math.floor(Math.random() * 10000000) + 100000;

      data.push({
        id: uuidv4(),
        symbol: symbol.toUpperCase(),
        timestamp: date,
        open,
        high,
        low,
        close,
        volume,
        turnover: volume * close,
        usdRate: 34.5 + Math.random(),
        closeUsd: close / 34.5,
        changePercent: (change / open) * 100
      });

      price = close;
    }

    return data;
  }

  /**
   * Calculate technical indicators for a symbol
   */
  async calculateTechnicals(symbol: string): Promise<TechnicalIndicators> {
    const historicalData = await this.getHistoricalData(symbol, 200);
    
    if (historicalData.length < 20) {
      return {
        sma20: null,
        sma50: null,
        sma200: null,
        ema12: null,
        ema26: null,
        rsi14: null,
        macd: null,
        bollingerBands: null,
        atr14: null,
        volume20Avg: null,
        relativeVolume: null
      };
    }

    const closes = historicalData.map(d => d.close).reverse();
    const highs = historicalData.map(d => d.high).reverse();
    const lows = historicalData.map(d => d.low).reverse();
    const volumes = historicalData.map(d => d.volume).reverse();

    // Simple Moving Averages
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = closes.length >= 50 ? this.calculateSMA(closes, 50) : null;
    const sma200 = closes.length >= 200 ? this.calculateSMA(closes, 200) : null;

    // Exponential Moving Averages
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);

    // RSI
    const rsi14 = this.calculateRSI(closes, 14);

    // MACD
    const macd = ema12 !== null && ema26 !== null ? {
      macd: ema12 - ema26,
      signal: this.calculateEMA([ema12 - ema26], 9) || 0,
      histogram: (ema12 - ema26) - (this.calculateEMA([ema12 - ema26], 9) || 0)
    } : null;

    // Bollinger Bands
    const bollingerBands = sma20 !== null ? {
      upper: sma20 + 2 * this.calculateStdDev(closes.slice(-20)),
      middle: sma20,
      lower: sma20 - 2 * this.calculateStdDev(closes.slice(-20))
    } : null;

    // ATR
    const atr14 = this.calculateATR(highs, lows, closes, 14);

    // Volume Analysis
    const volume20Avg = this.calculateSMA(volumes, 20);
    const currentVolume = volumes[volumes.length - 1];
    const relativeVolume = volume20Avg ? currentVolume / volume20Avg : null;

    return {
      sma20,
      sma50,
      sma200,
      ema12,
      ema26,
      rsi14,
      macd,
      bollingerBands,
      atr14,
      volume20Avg,
      relativeVolume
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period)!;
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(data: number[], period: number): number | null {
    if (data.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = data[data.length - i] - data[data.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate Standard Deviation
   */
  private calculateStdDev(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / data.length);
  }

  /**
   * Calculate Average True Range
   */
  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number | null {
    if (highs.length < period + 1) return null;

    const trueRanges: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }

    return this.calculateSMA(trueRanges.slice(-period), period);
  }

  /**
   * Perform full technical analysis for a symbol
   */
  async analyzeSymbol(symbol: string): Promise<BistAnalysis> {
    const quote = await this.getQuote(symbol);
    const technicals = await this.calculateTechnicals(symbol);
    const historicalData = await this.getHistoricalData(symbol, 30);

    const currentPrice = quote?.lastPrice || 0;
    const signals: string[] = [];
    let bullishScore = 0;
    let bearishScore = 0;

    // Trend Analysis
    if (technicals.sma20 && technicals.sma50) {
      if (currentPrice > technicals.sma20 && technicals.sma20 > technicals.sma50) {
        signals.push('Güçlü yükseliş trendi (Fiyat > SMA20 > SMA50)');
        bullishScore += 20;
      } else if (currentPrice < technicals.sma20 && technicals.sma20 < technicals.sma50) {
        signals.push('Güçlü düşüş trendi (Fiyat < SMA20 < SMA50)');
        bearishScore += 20;
      }
    }

    // RSI Analysis
    if (technicals.rsi14) {
      if (technicals.rsi14 < 30) {
        signals.push(`RSI aşırı satım bölgesinde (${technicals.rsi14.toFixed(1)})`);
        bullishScore += 15;
      } else if (technicals.rsi14 > 70) {
        signals.push(`RSI aşırı alım bölgesinde (${technicals.rsi14.toFixed(1)})`);
        bearishScore += 15;
      }
    }

    // MACD Analysis
    if (technicals.macd) {
      if (technicals.macd.histogram > 0 && technicals.macd.macd > technicals.macd.signal) {
        signals.push('MACD yükseliş sinyali');
        bullishScore += 10;
      } else if (technicals.macd.histogram < 0 && technicals.macd.macd < technicals.macd.signal) {
        signals.push('MACD düşüş sinyali');
        bearishScore += 10;
      }
    }

    // Bollinger Bands Analysis
    if (technicals.bollingerBands) {
      if (currentPrice < technicals.bollingerBands.lower) {
        signals.push('Fiyat Bollinger alt bandının altında');
        bullishScore += 10;
      } else if (currentPrice > technicals.bollingerBands.upper) {
        signals.push('Fiyat Bollinger üst bandının üstünde');
        bearishScore += 10;
      }
    }

    // Volume Analysis
    if (technicals.relativeVolume) {
      if (technicals.relativeVolume > 2) {
        signals.push(`Yüksek hacim (${technicals.relativeVolume.toFixed(1)}x ortalama)`);
        bullishScore += 5;
      }
    }

    // Calculate support and resistance levels
    const prices = historicalData.map(d => d.close);
    const supports = this.findPivotLevels(prices, 'support').slice(0, 3);
    const resistances = this.findPivotLevels(prices, 'resistance').slice(0, 3);

    // Determine overall trend and strength
    const totalScore = bullishScore + bearishScore;
    const netScore = bullishScore - bearishScore;
    const strength = Math.min(100, Math.abs(netScore) * 2);
    
    let trend: 'bullish' | 'bearish' | 'neutral';
    let recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

    if (netScore > 25) {
      trend = 'bullish';
      recommendation = 'strong_buy';
    } else if (netScore > 10) {
      trend = 'bullish';
      recommendation = 'buy';
    } else if (netScore < -25) {
      trend = 'bearish';
      recommendation = 'strong_sell';
    } else if (netScore < -10) {
      trend = 'bearish';
      recommendation = 'sell';
    } else {
      trend = 'neutral';
      recommendation = 'hold';
    }

    return {
      symbol: symbol.toUpperCase(),
      currentPrice,
      technicals,
      trend,
      strength,
      signals,
      supports,
      resistances,
      recommendation
    };
  }

  /**
   * Find pivot support/resistance levels
   */
  private findPivotLevels(prices: number[], type: 'support' | 'resistance'): number[] {
    if (prices.length < 5) return [];

    const levels: number[] = [];
    const sortedPrices = [...prices].sort((a, b) => a - b);

    if (type === 'support') {
      // Find local minimums
      for (let i = 2; i < prices.length - 2; i++) {
        if (prices[i] < prices[i - 1] && prices[i] < prices[i - 2] &&
            prices[i] < prices[i + 1] && prices[i] < prices[i + 2]) {
          levels.push(prices[i]);
        }
      }
    } else {
      // Find local maximums
      for (let i = 2; i < prices.length - 2; i++) {
        if (prices[i] > prices[i - 1] && prices[i] > prices[i - 2] &&
            prices[i] > prices[i + 1] && prices[i] > prices[i + 2]) {
          levels.push(prices[i]);
        }
      }
    }

    return levels.sort((a, b) => type === 'support' ? b - a : a - b);
  }

  /**
   * Get currency exchange rates
   */
  async getCurrencyRates(): Promise<CurrencyInfo> {
    // Try to get from database first
    try {
      if (db) {
        const rates = await db.select()
          .from(currencyRates)
          .where(eq(currencyRates.baseCurrency, 'TRY'))
          .orderBy(desc(currencyRates.timestamp))
          .limit(4);

        if (rates.length > 0) {
          const usd = rates.find(r => r.quoteCurrency === 'USD');
          const eur = rates.find(r => r.quoteCurrency === 'EUR');
          const gbp = rates.find(r => r.quoteCurrency === 'GBP');

          if (usd && eur && gbp) {
            return {
              usdTry: 1 / (usd.rate || 1),
              eurTry: 1 / (eur.rate || 1),
              gbpTry: 1 / (gbp.rate || 1),
              goldTry: 3200 + Math.random() * 100,
              dailyChange: {
                usd: usd.dailyChange || 0,
                eur: eur.dailyChange || 0,
                gbp: gbp.dailyChange || 0
              }
            };
          }
        }
      }
    } catch (error) {
      console.error('Error fetching currency rates:', error);
    }

    // Return mock data for development
    return {
      usdTry: 34.50 + (Math.random() - 0.5) * 0.5,
      eurTry: 36.20 + (Math.random() - 0.5) * 0.5,
      gbpTry: 43.50 + (Math.random() - 0.5) * 0.5,
      goldTry: 3200 + (Math.random() - 0.5) * 50,
      dailyChange: {
        usd: (Math.random() - 0.5) * 2,
        eur: (Math.random() - 0.5) * 2,
        gbp: (Math.random() - 0.5) * 2
      }
    };
  }

  /**
   * Get top gainers from BIST
   */
  async getTopGainers(limit: number = 10): Promise<BistQuote[]> {
    const quotes = await this.getIndexQuotes('BIST30');
    return quotes
      .filter(q => q.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, limit);
  }

  /**
   * Get top losers from BIST
   */
  async getTopLosers(limit: number = 10): Promise<BistQuote[]> {
    const quotes = await this.getIndexQuotes('BIST30');
    return quotes
      .filter(q => q.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, limit);
  }

  /**
   * Get most active stocks by volume
   */
  async getMostActive(limit: number = 10): Promise<BistQuote[]> {
    const quotes = await this.getIndexQuotes('BIST30');
    return quotes
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  }

  /**
   * Get sector performance summary
   */
  async getSectorPerformance(): Promise<Array<{
    sector: string;
    avgChange: number;
    topGainer: string;
    topLoser: string;
    symbolCount: number;
  }>> {
    // Simplified sector performance with mock data
    const sectors = Object.entries(BIST_SECTORS).map(([key, name]) => ({
      sector: name,
      avgChange: (Math.random() - 0.5) * 5,
      topGainer: BIST30_SYMBOLS[Math.floor(Math.random() * BIST30_SYMBOLS.length)],
      topLoser: BIST30_SYMBOLS[Math.floor(Math.random() * BIST30_SYMBOLS.length)],
      symbolCount: Math.floor(Math.random() * 20) + 5
    }));

    return sectors.sort((a, b) => b.avgChange - a.avgChange);
  }

  /**
   * Get market summary
   */
  async getMarketSummary(): Promise<{
    bist100: { value: number; change: number; changePercent: number };
    bist30: { value: number; change: number; changePercent: number };
    bist50: { value: number; change: number; changePercent: number };
    usdTry: number;
    eurTry: number;
    totalVolume: number;
    advancers: number;
    decliners: number;
    unchanged: number;
    lastUpdate: Date;
  }> {
    const quotes = await this.getIndexQuotes('BIST30');
    const currencies = await this.getCurrencyRates();

    const advancers = quotes.filter(q => q.changePercent > 0).length;
    const decliners = quotes.filter(q => q.changePercent < 0).length;
    const totalVolume = quotes.reduce((sum, q) => sum + q.volume, 0);

    return {
      bist100: {
        value: 10500 + (Math.random() - 0.5) * 200,
        change: (Math.random() - 0.5) * 100,
        changePercent: (Math.random() - 0.5) * 2
      },
      bist30: {
        value: 10800 + (Math.random() - 0.5) * 200,
        change: (Math.random() - 0.5) * 100,
        changePercent: (Math.random() - 0.5) * 2
      },
      bist50: {
        value: 10300 + (Math.random() - 0.5) * 200,
        change: (Math.random() - 0.5) * 100,
        changePercent: (Math.random() - 0.5) * 2
      },
      usdTry: currencies.usdTry,
      eurTry: currencies.eurTry,
      totalVolume,
      advancers,
      decliners,
      unchanged: quotes.length - advancers - decliners,
      lastUpdate: new Date()
    };
  }

  /**
   * Import BIST listing data (for populating the database)
   */
  async importListings(listings: Array<{
    symbol: string;
    name: string;
    sector?: string;
    index?: string;
  }>): Promise<{ imported: number }> {
    if (!db) return { imported: 0 };

    let imported = 0;
    for (const listing of listings) {
      try {
        await db.insert(bistListings).values({
          id: uuidv4(),
          symbol: listing.symbol.toUpperCase(),
          name: listing.name,
          sector: listing.sector,
          index: listing.index
        }).onConflictDoNothing();
        imported++;
      } catch (error) {
        console.error(`Error importing ${listing.symbol}:`, error);
      }
    }

    console.log(`✅ Imported ${imported} BIST listings`);
    return { imported };
  }

  /**
   * Store price data for a symbol
   */
  async storePriceData(data: {
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp?: Date;
  }): Promise<void> {
    if (!db) return;

    try {
      await db.insert(bistPriceData).values({
        id: uuidv4(),
        symbol: data.symbol.toUpperCase(),
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
        timestamp: data.timestamp || new Date(),
        changePercent: ((data.close - data.open) / data.open) * 100
      });
    } catch (error) {
      console.error(`Error storing price data for ${data.symbol}:`, error);
    }
  }

  /**
   * Search symbols by name or symbol
   */
  async searchSymbols(query: string): Promise<Array<{ symbol: string; name: string; sector?: string }>> {
    const normalizedQuery = query.toLowerCase();
    
    // Check database first
    try {
      if (db) {
        const results = await db.select({
          symbol: bistListings.symbol,
          name: bistListings.name,
          sector: bistListings.sector
        })
        .from(bistListings)
        .where(sql`LOWER(${bistListings.symbol}) LIKE ${`%${normalizedQuery}%`} OR LOWER(${bistListings.name}) LIKE ${`%${normalizedQuery}%`}`)
        .limit(20);

        if (results.length > 0) {
          return results.map(r => ({
            symbol: r.symbol,
            name: r.name,
            sector: r.sector || undefined
          }));
        }
      }
    } catch (error) {
      console.error('Error searching symbols:', error);
    }

    // Fallback to BIST30 search
    return BIST30_SYMBOLS
      .filter(s => s.toLowerCase().includes(normalizedQuery))
      .map(s => ({ symbol: s, name: `${s} A.Ş.` }));
  }
}

export const bistService = new BistService();
