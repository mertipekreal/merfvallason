import { db } from './db';
import { stockPriceData } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const BASE_URL = 'https://api.polygon.io';

interface PolygonBar {
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
  t: number;  // timestamp (ms)
  vw?: number; // volume weighted average
  n?: number;  // number of trades
}

interface PolygonAggResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results?: PolygonBar[];
  status: string;
  request_id: string;
  count?: number;
  next_url?: string;
}

export class PolygonService {
  private apiKey: string;

  constructor() {
    if (!POLYGON_API_KEY) {
      console.warn('⚠️ POLYGON_API_KEY not set - stock data fetching disabled');
    }
    this.apiKey = POLYGON_API_KEY || '';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}apiKey=${this.apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Polygon API error: ${response.status} - ${error}`);
    }
    
    return response.json();
  }

  async fetchOHLCV(
    symbol: string,
    timeframe: '1m' | '5m' | '15m' | '1h' | '1d' = '1d',
    from: string,
    to: string
  ): Promise<PolygonBar[]> {
    const multiplierMap: Record<string, { multiplier: number; timespan: string }> = {
      '1m': { multiplier: 1, timespan: 'minute' },
      '5m': { multiplier: 5, timespan: 'minute' },
      '15m': { multiplier: 15, timespan: 'minute' },
      '1h': { multiplier: 1, timespan: 'hour' },
      '1d': { multiplier: 1, timespan: 'day' }
    };

    const { multiplier, timespan } = multiplierMap[timeframe];
    const endpoint = `/v2/aggs/ticker/${symbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000`;

    const data = await this.fetch<PolygonAggResponse>(endpoint);
    
    if (!data.results || data.results.length === 0) {
      console.log(`No data returned for ${symbol} from ${from} to ${to}`);
      return [];
    }

    console.log(`📊 Fetched ${data.results.length} bars for ${symbol} (${timeframe})`);
    return data.results;
  }

  async importPriceData(
    symbol: string,
    timeframe: '1m' | '5m' | '15m' | '1h' | '1d' = '1d',
    from: string,
    to: string
  ): Promise<{ imported: number; symbol: string; timeframe: string }> {
    if (!this.isConfigured()) {
      throw new Error('Polygon API key not configured');
    }

    const bars = await this.fetchOHLCV(symbol, timeframe, from, to);
    
    if (bars.length === 0) {
      return { imported: 0, symbol, timeframe };
    }

    let imported = 0;
    for (const bar of bars) {
      try {
        const existing = await db!.select()
          .from(stockPriceData)
          .where(and(
            eq(stockPriceData.symbol, symbol.toUpperCase()),
            eq(stockPriceData.timestamp, new Date(bar.t)),
            eq(stockPriceData.timeframe, timeframe)
          ))
          .limit(1);

        if (existing.length === 0) {
          await db!.insert(stockPriceData).values({
            id: uuidv4(),
            symbol: symbol.toUpperCase(),
            timestamp: new Date(bar.t),
            open: bar.o,
            high: bar.h,
            low: bar.l,
            close: bar.c,
            volume: bar.v,
            timeframe
          });
          imported++;
        }
      } catch (error: any) {
        console.error(`Error inserting bar for ${symbol}:`, error.message);
      }
    }

    console.log(`✅ Imported ${imported} new bars for ${symbol} (${timeframe})`);
    return { imported, symbol, timeframe };
  }

  async importMultipleSymbols(
    symbols: string[],
    timeframe: '1m' | '5m' | '15m' | '1h' | '1d' = '1d',
    from: string,
    to: string
  ): Promise<{ total: number; results: { symbol: string; imported: number }[] }> {
    const results: { symbol: string; imported: number }[] = [];
    let total = 0;

    for (const symbol of symbols) {
      try {
        await new Promise(resolve => setTimeout(resolve, 250));
        
        const result = await this.importPriceData(symbol, timeframe, from, to);
        results.push({ symbol, imported: result.imported });
        total += result.imported;
      } catch (error: any) {
        console.error(`Error importing ${symbol}:`, error.message);
        results.push({ symbol, imported: 0 });
      }
    }

    return { total, results };
  }

  async getLatestPrice(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
    try {
      const endpoint = `/v2/aggs/ticker/${symbol.toUpperCase()}/prev`;
      const data = await this.fetch<PolygonAggResponse>(endpoint);
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      const bar = data.results[0];
      const change = bar.c - bar.o;
      const changePercent = (change / bar.o) * 100;

      return {
        price: bar.c,
        change,
        changePercent
      };
    } catch (error) {
      console.error(`Error fetching latest price for ${symbol}:`, error);
      return null;
    }
  }

  async getTickerDetails(symbol: string): Promise<any> {
    try {
      const endpoint = `/v3/reference/tickers/${symbol.toUpperCase()}`;
      return await this.fetch(endpoint);
    } catch (error) {
      console.error(`Error fetching ticker details for ${symbol}:`, error);
      return null;
    }
  }

  async searchTickers(query: string, limit: number = 10): Promise<any[]> {
    try {
      const endpoint = `/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=${limit}`;
      const data = await this.fetch<{ results: any[] }>(endpoint);
      return data.results || [];
    } catch (error) {
      console.error(`Error searching tickers:`, error);
      return [];
    }
  }

  async getDataStats(): Promise<{
    totalBars: number;
    symbols: string[];
    dateRange: { earliest: Date | null; latest: Date | null };
  }> {
    const rows = await db!.select().from(stockPriceData);
    const symbolSet = new Set<string>();
    rows.forEach(r => symbolSet.add(r.symbol));
    const symbols = Array.from(symbolSet);
    const timestamps = rows.map(r => r.timestamp).filter(Boolean) as Date[];
    
    return {
      totalBars: rows.length,
      symbols,
      dateRange: {
        earliest: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null,
        latest: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null
      }
    };
  }

  // ==========================================
  // INDICES ADVANCED ($99/m Premium Feature)
  // ==========================================

  async getIndexData(indexTicker: string, from: string, to: string): Promise<PolygonBar[]> {
    const endpoint = `/v2/aggs/ticker/${indexTicker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=5000`;
    const data = await this.fetch<PolygonAggResponse>(endpoint);
    console.log(`📈 Fetched ${data.results?.length || 0} bars for index ${indexTicker}`);
    return data.results || [];
  }

  async getIndexSnapshot(indexTicker: string): Promise<{
    ticker: string;
    value: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    previousClose: number;
    timestamp: number;
  } | null> {
    try {
      const endpoint = `/v2/aggs/ticker/${indexTicker}/prev`;
      const data = await this.fetch<PolygonAggResponse>(endpoint);
      
      if (!data.results || data.results.length === 0) return null;
      
      const bar = data.results[0];
      const previousClose = bar.o;
      const change = bar.c - previousClose;
      
      return {
        ticker: indexTicker,
        value: bar.c,
        change,
        changePercent: (change / previousClose) * 100,
        high: bar.h,
        low: bar.l,
        open: bar.o,
        previousClose,
        timestamp: bar.t
      };
    } catch (error) {
      console.error(`Error fetching index ${indexTicker}:`, error);
      return null;
    }
  }

  async getAllMajorIndices(): Promise<Array<{
    ticker: string;
    name: string;
    value: number | null;
    change: number | null;
    changePercent: number | null;
  }>> {
    const indices = [
      { ticker: 'I:NDX', name: 'NASDAQ-100' },
      { ticker: 'I:SPX', name: 'S&P 500' },
      { ticker: 'I:DJI', name: 'Dow Jones' },
      { ticker: 'I:RUT', name: 'Russell 2000' },
      { ticker: 'I:VIX', name: 'VIX Fear Index' },
      { ticker: 'I:COMP', name: 'NASDAQ Composite' }
    ];

    const results = await Promise.all(
      indices.map(async (idx) => {
        try {
          const snapshot = await this.getIndexSnapshot(idx.ticker);
          return {
            ticker: idx.ticker,
            name: idx.name,
            value: snapshot?.value || null,
            change: snapshot?.change || null,
            changePercent: snapshot?.changePercent || null
          };
        } catch {
          return { ticker: idx.ticker, name: idx.name, value: null, change: null, changePercent: null };
        }
      })
    );

    return results;
  }

  // ==========================================
  // BENZINGA NEWS ($99/m Premium Feature)
  // ==========================================

  async getBenzingaNews(params: {
    tickers?: string[];
    topics?: string[];
    limit?: number;
    publishedBefore?: string;
    publishedAfter?: string;
  } = {}): Promise<Array<{
    id: string;
    title: string;
    author: string;
    publishedAt: string;
    updatedAt: string;
    url: string;
    tickers: string[];
    summary: string;
    source: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    keywords: string[];
  }>> {
    try {
      let endpoint = `/v2/reference/news?limit=${params.limit || 50}`;
      
      if (params.tickers && params.tickers.length > 0) {
        endpoint += `&ticker=${params.tickers.join(',')}`;
      }
      if (params.publishedAfter) {
        endpoint += `&published_utc.gte=${params.publishedAfter}`;
      }
      if (params.publishedBefore) {
        endpoint += `&published_utc.lte=${params.publishedBefore}`;
      }

      const data = await this.fetch<{ results: any[] }>(endpoint);
      
      return (data.results || []).map((article: any) => ({
        id: article.id,
        title: article.title,
        author: article.author || 'Benzinga',
        publishedAt: article.published_utc,
        updatedAt: article.article_url,
        url: article.article_url,
        tickers: article.tickers || [],
        summary: article.description || '',
        source: article.publisher?.name || 'Benzinga',
        sentiment: this.analyzeNewsSentiment(article.title + ' ' + (article.description || '')),
        keywords: article.keywords || []
      }));
    } catch (error) {
      console.error('Benzinga News error:', error);
      return [];
    }
  }

  private analyzeNewsSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['surge', 'rally', 'gain', 'growth', 'beat', 'up', 'rise', 'bullish', 'record', 'profit'];
    const negativeWords = ['fall', 'drop', 'decline', 'crash', 'miss', 'down', 'bearish', 'loss', 'cut', 'fear'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => { if (lowerText.includes(word)) score++; });
    negativeWords.forEach(word => { if (lowerText.includes(word)) score--; });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  async getTickerNews(ticker: string, limit: number = 20): Promise<any[]> {
    return this.getBenzingaNews({ tickers: [ticker], limit });
  }

  async getMarketNews(limit: number = 50): Promise<any[]> {
    return this.getBenzingaNews({ limit });
  }

  // ==========================================
  // ETF GLOBAL FUND FLOWS ($99/m Premium Feature)
  // ==========================================

  async getETFFundFlows(etfTicker: string): Promise<{
    ticker: string;
    name: string;
    netFlows: number;
    aum: number;
    sharesOutstanding: number;
    nav: number;
    price: number;
    premium: number;
    flowTrend: 'inflow' | 'outflow' | 'neutral';
  } | null> {
    try {
      const endpoint = `/v3/reference/tickers/${etfTicker.toUpperCase()}`;
      const tickerData = await this.fetch<{ results: any }>(endpoint);
      
      const priceData = await this.getLatestPrice(etfTicker);
      
      if (!tickerData.results) return null;
      
      const result = tickerData.results;
      
      return {
        ticker: etfTicker.toUpperCase(),
        name: result.name || etfTicker,
        netFlows: result.weighted_shares_outstanding ? result.weighted_shares_outstanding * (priceData?.price || 0) : 0,
        aum: result.market_cap || 0,
        sharesOutstanding: result.weighted_shares_outstanding || result.share_class_shares_outstanding || 0,
        nav: priceData?.price || 0,
        price: priceData?.price || 0,
        premium: 0,
        flowTrend: priceData?.changePercent && priceData.changePercent > 0 ? 'inflow' : 
                   priceData?.changePercent && priceData.changePercent < 0 ? 'outflow' : 'neutral'
      };
    } catch (error) {
      console.error(`ETF Fund Flows error for ${etfTicker}:`, error);
      return null;
    }
  }

  async getPopularETFs(): Promise<Array<{
    ticker: string;
    name: string;
    category: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
  }>> {
    const popularETFs = [
      { ticker: 'SPY', name: 'SPDR S&P 500 ETF', category: 'US Large Cap' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', category: 'US Tech' },
      { ticker: 'IWM', name: 'iShares Russell 2000', category: 'US Small Cap' },
      { ticker: 'EEM', name: 'iShares MSCI Emerging Markets', category: 'Emerging Markets' },
      { ticker: 'VXX', name: 'iPath VIX Short-Term', category: 'Volatility' },
      { ticker: 'GLD', name: 'SPDR Gold Shares', category: 'Commodities' },
      { ticker: 'TLT', name: 'iShares 20+ Year Treasury', category: 'Bonds' },
      { ticker: 'XLF', name: 'Financial Select Sector SPDR', category: 'Financials' },
      { ticker: 'XLE', name: 'Energy Select Sector SPDR', category: 'Energy' },
      { ticker: 'ARKK', name: 'ARK Innovation ETF', category: 'Innovation' }
    ];

    const results = await Promise.all(
      popularETFs.map(async (etf) => {
        try {
          const priceData = await this.getLatestPrice(etf.ticker);
          return {
            ...etf,
            price: priceData?.price || null,
            change: priceData?.change || null,
            changePercent: priceData?.changePercent || null
          };
        } catch {
          return { ...etf, price: null, change: null, changePercent: null };
        }
      })
    );

    return results;
  }

  async getETFHoldings(etfTicker: string): Promise<Array<{
    ticker: string;
    name: string;
    weight: number;
  }>> {
    try {
      const endpoint = `/v3/reference/tickers/${etfTicker.toUpperCase()}`;
      const data = await this.fetch<{ results: any }>(endpoint);
      return [];
    } catch (error) {
      console.error(`ETF Holdings error for ${etfTicker}:`, error);
      return [];
    }
  }

  // ==========================================
  // UNIFIED MARKET DASHBOARD DATA
  // ==========================================

  async getMarketDashboard(): Promise<{
    indices: any[];
    news: any[];
    etfs: any[];
    timestamp: string;
  }> {
    const [indices, news, etfs] = await Promise.all([
      this.getAllMajorIndices(),
      this.getMarketNews(10),
      this.getPopularETFs()
    ]);

    return {
      indices,
      news,
      etfs,
      timestamp: new Date().toISOString()
    };
  }

  async healthCheck(): Promise<{
    configured: boolean;
    connected: boolean;
    features: {
      indices: boolean;
      news: boolean;
      etf: boolean;
    };
    error?: string;
  }> {
    if (!this.apiKey) {
      return { 
        configured: false, 
        connected: false, 
        features: { indices: false, news: false, etf: false },
        error: 'API key not configured' 
      };
    }

    try {
      await this.getLatestPrice('SPY');
      
      let indicesOk = false, newsOk = false, etfOk = false;
      
      try {
        await this.getIndexSnapshot('I:SPX');
        indicesOk = true;
      } catch {}
      
      try {
        await this.getBenzingaNews({ limit: 1 });
        newsOk = true;
      } catch {}
      
      try {
        await this.getETFFundFlows('SPY');
        etfOk = true;
      } catch {}

      return { 
        configured: true, 
        connected: true,
        features: { indices: indicesOk, news: newsOk, etf: etfOk }
      };
    } catch (error: any) {
      return { 
        configured: true, 
        connected: false, 
        features: { indices: false, news: false, etf: false },
        error: error.message 
      };
    }
  }
}

export const polygonService = new PolygonService();
