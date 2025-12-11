/**
 * Unusual Whales API Service
 * Options Flow, Dark Pool, and Market Intelligence Data
 * 
 * Provides real-time and historical data for:
 * - Options flow (unusual activity, whale trades)
 * - Dark pool / off-lit trading volume
 * - Market maker positioning
 * - Institutional activity signals
 */

const API_BASE = 'https://api.unusualwhales.com';

interface OptionsFlow {
  ticker: string;
  strike: number;
  expiry: string;
  optionType: 'call' | 'put';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  premium: number;
  volume: number;
  openInterest: number;
  timestamp: string;
  unusual: boolean;
}

interface DarkPoolTrade {
  ticker: string;
  price: number;
  size: number;
  timestamp: string;
  exchange: string;
  darkPoolVolume: number;
  litVolume: number;
  darkPoolPercent: number;
}

interface FlowAlert {
  id: string;
  ticker: string;
  strike: number;
  expiry: string;
  optionType: 'call' | 'put';
  premium: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  sentiment: string;
  alertType: string;
  timestamp: string;
}

interface MarketOverview {
  totalCallVolume: number;
  totalPutVolume: number;
  putCallRatio: number;
  totalPremium: number;
  bullishFlows: number;
  bearishFlows: number;
  topTickers: Array<{ticker: string; volume: number; premium: number}>;
}

class UnusualWhalesService {
  private apiKey: string | undefined;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.apiKey = process.env.UNUSUAL_WHALES_API_KEY;
    if (this.apiKey) {
      console.log('🐋 Unusual Whales API initialized');
    } else {
      console.log('⚠️ Unusual Whales API key not configured');
    }
  }

  private async fetchAPI(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Unusual Whales API key not configured');
    }

    const url = new URL(`${API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const cacheKey = url.toString();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Unusual Whales API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Get options flow alerts - unusual options activity
   */
  async getFlowAlerts(params: {
    ticker?: string;
    minPremium?: number;
    optionType?: 'call' | 'put';
    limit?: number;
  } = {}): Promise<FlowAlert[]> {
    try {
      const queryParams: Record<string, string> = {};
      if (params.ticker) queryParams.ticker = params.ticker;
      if (params.minPremium) queryParams.min_premium = params.minPremium.toString();
      if (params.optionType) queryParams.option_type = params.optionType;
      if (params.limit) queryParams.limit = params.limit.toString();

      const response = await this.fetchAPI('/api/flow/alerts', queryParams);
      
      return (response.data || []).map((item: any) => ({
        id: item.id || `${item.ticker}-${item.strike}-${item.expiry}`,
        ticker: item.ticker,
        strike: parseFloat(item.strike),
        expiry: item.expiry,
        optionType: item.option_type || item.type,
        premium: parseFloat(item.premium || 0),
        volume: parseInt(item.volume || 0),
        openInterest: parseInt(item.open_interest || 0),
        impliedVolatility: parseFloat(item.iv || 0),
        delta: parseFloat(item.delta || 0),
        sentiment: item.sentiment || 'neutral',
        alertType: item.alert_type || 'unusual',
        timestamp: item.timestamp || new Date().toISOString()
      }));
    } catch (error: any) {
      console.error('Flow alerts error:', error.message);
      return [];
    }
  }

  /**
   * Get options volume for a specific ticker
   */
  async getOptionsVolume(ticker: string, date?: string): Promise<any> {
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;

      const response = await this.fetchAPI(`/api/stock/${ticker}/options-volume`, params);
      return response.data || response;
    } catch (error: any) {
      console.error('Options volume error:', error.message);
      return null;
    }
  }

  /**
   * Get dark pool (off-lit) volume by price level
   */
  async getDarkPoolVolume(ticker: string, date?: string): Promise<DarkPoolTrade[]> {
    try {
      const params: Record<string, string> = {};
      if (date) params.date = date;

      const response = await this.fetchAPI(`/api/darkpool/ticker/${ticker}`, params);
      
      return (response.data || []).map((item: any) => ({
        ticker,
        price: parseFloat(item.price || 0),
        size: parseInt(item.size || item.volume || 0),
        timestamp: item.timestamp || item.date,
        exchange: item.exchange || 'dark_pool',
        darkPoolVolume: parseInt(item.off_vol || item.dark_volume || 0),
        litVolume: parseInt(item.lit_vol || item.lit_volume || 0),
        darkPoolPercent: parseFloat(item.dark_percent || 0)
      }));
    } catch (error: any) {
      console.error('Dark pool error:', error.message);
      return [];
    }
  }

  /**
   * Get market-wide options overview
   */
  async getMarketOverview(): Promise<MarketOverview | null> {
    try {
      const response = await this.fetchAPI('/api/market/overview');
      const data = response.data || response;

      return {
        totalCallVolume: parseInt(data.total_call_volume || 0),
        totalPutVolume: parseInt(data.total_put_volume || 0),
        putCallRatio: parseFloat(data.put_call_ratio || 0),
        totalPremium: parseFloat(data.total_premium || 0),
        bullishFlows: parseInt(data.bullish_flows || 0),
        bearishFlows: parseInt(data.bearish_flows || 0),
        topTickers: (data.top_tickers || []).map((t: any) => ({
          ticker: t.ticker,
          volume: parseInt(t.volume || 0),
          premium: parseFloat(t.premium || 0)
        }))
      };
    } catch (error: any) {
      console.error('Market overview error:', error.message);
      return null;
    }
  }

  /**
   * Get whale trades (large institutional orders)
   */
  async getWhaleTrades(params: {
    ticker?: string;
    minPremium?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      const queryParams: Record<string, string> = {
        min_premium: (params.minPremium || 100000).toString(),
        limit: (params.limit || 50).toString()
      };
      if (params.ticker) queryParams.ticker = params.ticker;

      const response = await this.fetchAPI('/api/flow/whale', queryParams);
      return response.data || [];
    } catch (error: any) {
      console.error('Whale trades error:', error.message);
      return [];
    }
  }

  /**
   * Get stock quote and basic info
   */
  async getStockQuote(ticker: string): Promise<any> {
    try {
      const response = await this.fetchAPI(`/api/stock/${ticker}/quote`);
      return response.data || response;
    } catch (error: any) {
      console.error('Stock quote error:', error.message);
      return null;
    }
  }

  /**
   * Generate trading signals based on options flow
   */
  async generateFlowSignals(ticker?: string): Promise<{
    signals: Array<{
      ticker: string;
      direction: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
      reason: string;
      premium: number;
    }>;
    summary: {
      bullishCount: number;
      bearishCount: number;
      totalPremium: number;
      topBullish: string[];
      topBearish: string[];
    };
  }> {
    try {
      const flows = await this.getFlowAlerts({ ticker, minPremium: 50000, limit: 100 });
      
      const tickerMap = new Map<string, {
        bullishPremium: number;
        bearishPremium: number;
        flows: FlowAlert[];
      }>();

      for (const flow of flows) {
        if (!tickerMap.has(flow.ticker)) {
          tickerMap.set(flow.ticker, { bullishPremium: 0, bearishPremium: 0, flows: [] });
        }
        const entry = tickerMap.get(flow.ticker)!;
        entry.flows.push(flow);
        
        if (flow.optionType === 'call' || flow.sentiment === 'bullish') {
          entry.bullishPremium += flow.premium;
        } else {
          entry.bearishPremium += flow.premium;
        }
      }

      const signals: Array<{
        ticker: string;
        direction: 'bullish' | 'bearish' | 'neutral';
        confidence: number;
        reason: string;
        premium: number;
      }> = [];

      let bullishCount = 0;
      let bearishCount = 0;
      let totalPremium = 0;
      const bullishTickers: Array<{ticker: string; premium: number}> = [];
      const bearishTickers: Array<{ticker: string; premium: number}> = [];

      for (const [tkr, data] of Array.from(tickerMap.entries())) {
        const total = data.bullishPremium + data.bearishPremium;
        totalPremium += total;
        
        const bullishRatio = total > 0 ? data.bullishPremium / total : 0.5;
        
        let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        let confidence = 0.5;
        let reason = '';

        if (bullishRatio > 0.65) {
          direction = 'bullish';
          confidence = Math.min(0.9, 0.5 + bullishRatio * 0.4);
          reason = `Strong call buying: $${(data.bullishPremium / 1000).toFixed(0)}K premium`;
          bullishCount++;
          bullishTickers.push({ ticker: tkr, premium: data.bullishPremium });
        } else if (bullishRatio < 0.35) {
          direction = 'bearish';
          confidence = Math.min(0.9, 0.5 + (1 - bullishRatio) * 0.4);
          reason = `Heavy put buying: $${(data.bearishPremium / 1000).toFixed(0)}K premium`;
          bearishCount++;
          bearishTickers.push({ ticker: tkr, premium: data.bearishPremium });
        } else {
          reason = 'Mixed options flow';
        }

        signals.push({
          ticker: tkr,
          direction,
          confidence,
          reason,
          premium: total
        });
      }

      return {
        signals: signals.sort((a, b) => b.premium - a.premium),
        summary: {
          bullishCount,
          bearishCount,
          totalPremium,
          topBullish: bullishTickers.sort((a, b) => b.premium - a.premium).slice(0, 5).map(t => t.ticker),
          topBearish: bearishTickers.sort((a, b) => b.premium - a.premium).slice(0, 5).map(t => t.ticker)
        }
      };
    } catch (error: any) {
      console.error('Flow signals error:', error.message);
      return {
        signals: [],
        summary: {
          bullishCount: 0,
          bearishCount: 0,
          totalPremium: 0,
          topBullish: [],
          topBearish: []
        }
      };
    }
  }

  /**
   * Check if API is configured and working
   */
  async healthCheck(): Promise<{
    configured: boolean;
    connected: boolean;
    error?: string;
  }> {
    if (!this.apiKey) {
      return { configured: false, connected: false, error: 'API key not configured' };
    }

    try {
      await this.fetchAPI('/api/market/overview');
      return { configured: true, connected: true };
    } catch (error: any) {
      return { configured: true, connected: false, error: error.message };
    }
  }
}

export const unusualWhalesService = new UnusualWhalesService();
