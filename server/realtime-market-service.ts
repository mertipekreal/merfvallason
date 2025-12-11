import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

interface RealtimeQuote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  timestamp: number;
  volume: number;
}

interface RealtimeTrade {
  symbol: string;
  price: number;
  size: number;
  timestamp: number;
  conditions: number[];
  exchange: number;
}

interface BenzingaNews {
  id: string;
  title: string;
  content: string;
  author: string;
  created: string;
  updated: string;
  teaser: string;
  url: string;
  channels: string[];
  stocks: Array<{ name: string; ticker: string }>;
  tags: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
}

interface ETFFlow {
  ticker: string;
  name: string;
  date: string;
  netFlow: number;
  aum: number;
  flowPercent: number;
  shares: number;
  avgPrice: number;
}

export class RealtimeMarketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;
  private subscribedSymbols: Set<string> = new Set();
  private latestQuotes: Map<string, RealtimeQuote> = new Map();
  private latestTrades: Map<string, RealtimeTrade> = new Map();
  private newsCache: BenzingaNews[] = [];
  private etfFlowCache: ETFFlow[] = [];
  private isConnected = false;

  constructor() {
    super();
    if (!POLYGON_API_KEY) {
      console.warn('⚠️ POLYGON_API_KEY not set - realtime data disabled');
    }
  }

  isConfigured(): boolean {
    return !!POLYGON_API_KEY;
  }

  async connect(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Polygon API key not configured');
    }

    return new Promise((resolve, reject) => {
      const wsUrl = `wss://socket.polygon.io/stocks`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('🔌 Polygon WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        this.ws?.send(JSON.stringify({
          action: 'auth',
          params: POLYGON_API_KEY
        }));
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const messages = JSON.parse(data.toString());
          
          for (const msg of messages) {
            this.handleMessage(msg);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('🔌 Polygon WebSocket disconnected');
        this.isConnected = false;
        this.attemptReconnect();
      });

      setTimeout(() => {
        if (this.isConnected) {
          resolve();
        }
      }, 3000);
    });
  }

  private handleMessage(msg: any): void {
    switch (msg.ev) {
      case 'status':
        if (msg.status === 'auth_success') {
          console.log('✅ Polygon WebSocket authenticated');
          this.resubscribe();
        } else if (msg.status === 'success') {
          console.log(`📡 Subscribed: ${msg.message}`);
        }
        break;

      case 'Q':
        const quote: RealtimeQuote = {
          symbol: msg.sym,
          price: (msg.bp + msg.ap) / 2,
          bid: msg.bp,
          ask: msg.ap,
          bidSize: msg.bs,
          askSize: msg.as,
          timestamp: msg.t,
          volume: 0
        };
        this.latestQuotes.set(msg.sym, quote);
        this.emit('quote', quote);
        break;

      case 'T':
        const trade: RealtimeTrade = {
          symbol: msg.sym,
          price: msg.p,
          size: msg.s,
          timestamp: msg.t,
          conditions: msg.c || [],
          exchange: msg.x
        };
        this.latestTrades.set(msg.sym, trade);
        this.emit('trade', trade);
        
        this.checkForSignals(trade);
        break;

      case 'A':
        this.emit('aggregate', {
          symbol: msg.sym,
          open: msg.o,
          high: msg.h,
          low: msg.l,
          close: msg.c,
          volume: msg.v,
          vwap: msg.vw,
          timestamp: msg.s
        });
        break;
    }
  }

  private async checkForSignals(trade: RealtimeTrade): Promise<void> {
    const previousTrade = this.latestTrades.get(trade.symbol);
    if (!previousTrade) return;

    const priceChange = ((trade.price - previousTrade.price) / previousTrade.price) * 100;
    
    if (Math.abs(priceChange) > 1) {
      const signal = {
        id: uuidv4(),
        symbol: trade.symbol,
        signalType: priceChange > 0 ? 'bullish_spike' : 'bearish_spike',
        strength: Math.min(100, Math.abs(priceChange) * 20),
        price: trade.price,
        timestamp: new Date(trade.timestamp),
        metadata: {
          priceChange,
          volume: trade.size,
          previousPrice: previousTrade.price
        }
      };

      this.emit('signal', signal);
      console.log(`🚨 Signal detected: ${signal.signalType} for ${signal.symbol} (${signal.strength}%)`);
      
      // Signal storage handled by market-analysis-service for persistence
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private resubscribe(): void {
    if (this.subscribedSymbols.size > 0) {
      const symbols = Array.from(this.subscribedSymbols);
      this.subscribeToSymbols(symbols);
    }
  }

  subscribeToSymbols(symbols: string[]): void {
    if (!this.ws || !this.isConnected) {
      console.warn('WebSocket not connected, queuing subscriptions');
      symbols.forEach(s => this.subscribedSymbols.add(s.toUpperCase()));
      return;
    }

    const subscriptions: string[] = [];
    
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      this.subscribedSymbols.add(upperSymbol);
      subscriptions.push(`Q.${upperSymbol}`);
      subscriptions.push(`T.${upperSymbol}`);
      subscriptions.push(`A.${upperSymbol}`);
    }

    this.ws.send(JSON.stringify({
      action: 'subscribe',
      params: subscriptions.join(',')
    }));

    console.log(`📡 Subscribing to: ${symbols.join(', ')}`);
  }

  unsubscribeFromSymbols(symbols: string[]): void {
    if (!this.ws || !this.isConnected) return;

    const unsubscriptions: string[] = [];
    
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      this.subscribedSymbols.delete(upperSymbol);
      unsubscriptions.push(`Q.${upperSymbol}`);
      unsubscriptions.push(`T.${upperSymbol}`);
      unsubscriptions.push(`A.${upperSymbol}`);
    }

    this.ws.send(JSON.stringify({
      action: 'unsubscribe',
      params: unsubscriptions.join(',')
    }));
  }

  getLatestQuote(symbol: string): RealtimeQuote | undefined {
    return this.latestQuotes.get(symbol.toUpperCase());
  }

  getLatestTrade(symbol: string): RealtimeTrade | undefined {
    return this.latestTrades.get(symbol.toUpperCase());
  }

  getAllQuotes(): Map<string, RealtimeQuote> {
    return this.latestQuotes;
  }

  async fetchBenzingaNews(symbols?: string[], limit: number = 20): Promise<BenzingaNews[]> {
    try {
      let url = `https://api.polygon.io/v2/reference/news?limit=${limit}&apiKey=${POLYGON_API_KEY}`;
      
      if (symbols && symbols.length > 0) {
        url += `&ticker=${symbols.join(',')}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`News API error: ${response.status}`);
      }

      const data = await response.json();
      
      const news: BenzingaNews[] = (data.results || []).map((item: any) => {
        const sentimentScore = this.analyzeSentiment(item.title + ' ' + (item.description || ''));
        
        return {
          id: item.id,
          title: item.title,
          content: item.description || '',
          author: item.author || 'Unknown',
          created: item.published_utc,
          updated: item.published_utc,
          teaser: item.description?.substring(0, 200) || '',
          url: item.article_url,
          channels: item.keywords || [],
          stocks: (item.tickers || []).map((t: string) => ({ name: t, ticker: t })),
          tags: item.keywords || [],
          sentiment: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
          sentimentScore
        };
      });

      this.newsCache = news;
      this.emit('news', news);
      
      return news;
    } catch (error) {
      console.error('Error fetching Benzinga news:', error);
      return [];
    }
  }

  private analyzeSentiment(text: string): number {
    const positiveWords = ['surge', 'rally', 'gain', 'up', 'bullish', 'growth', 'profit', 'beat', 'exceed', 'strong', 'positive', 'upgrade', 'buy', 'outperform'];
    const negativeWords = ['drop', 'fall', 'crash', 'down', 'bearish', 'loss', 'miss', 'weak', 'negative', 'downgrade', 'sell', 'underperform', 'decline', 'plunge'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    for (const word of positiveWords) {
      if (lowerText.includes(word)) score += 0.1;
    }
    
    for (const word of negativeWords) {
      if (lowerText.includes(word)) score -= 0.1;
    }
    
    return Math.max(-1, Math.min(1, score));
  }

  async fetchETFFlows(etfs?: string[]): Promise<ETFFlow[]> {
    try {
      const targetETFs = etfs || ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'ARKK', 'XLF', 'XLE', 'XLK'];
      const flows: ETFFlow[] = [];

      for (const etf of targetETFs) {
        try {
          const url = `https://api.polygon.io/v3/reference/tickers/${etf}?apiKey=${POLYGON_API_KEY}`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            const result = data.results;
            
            if (result) {
              flows.push({
                ticker: etf,
                name: result.name || etf,
                date: new Date().toISOString().split('T')[0],
                netFlow: 0,
                aum: result.market_cap || 0,
                flowPercent: 0,
                shares: result.share_class_shares_outstanding || 0,
                avgPrice: 0
              });
            }
          }
          
          await new Promise(r => setTimeout(r, 150));
        } catch (error) {
          console.error(`Error fetching ETF ${etf}:`, error);
        }
      }

      this.etfFlowCache = flows;
      return flows;
    } catch (error) {
      console.error('Error fetching ETF flows:', error);
      return [];
    }
  }

  async getMarketSnapshot(symbols: string[]): Promise<Map<string, any>> {
    const snapshot = new Map();

    try {
      for (const symbol of symbols) {
        const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol.toUpperCase()}?apiKey=${POLYGON_API_KEY}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.ticker) {
            snapshot.set(symbol.toUpperCase(), {
              symbol: data.ticker.ticker,
              day: data.ticker.day,
              prevDay: data.ticker.prevDay,
              todaysChange: data.ticker.todaysChange,
              todaysChangePerc: data.ticker.todaysChangePerc,
              updated: data.ticker.updated
            });
          }
        }
        
        await new Promise(r => setTimeout(r, 150));
      }
    } catch (error) {
      console.error('Error fetching market snapshot:', error);
    }

    return snapshot;
  }

  async getDarkPoolActivity(symbol: string): Promise<any[]> {
    try {
      const url = `https://api.polygon.io/v3/trades/${symbol.toUpperCase()}?limit=100&apiKey=${POLYGON_API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Dark pool API error: ${response.status}`);
      }

      const data = await response.json();
      
      const darkPoolTrades = (data.results || []).filter((trade: any) => {
        return trade.conditions?.includes(37) || trade.conditions?.includes(38);
      });

      return darkPoolTrades.map((trade: any) => ({
        symbol: symbol.toUpperCase(),
        price: trade.price,
        size: trade.size,
        timestamp: trade.sip_timestamp,
        exchange: trade.exchange,
        conditions: trade.conditions
      }));
    } catch (error) {
      console.error('Error fetching dark pool activity:', error);
      return [];
    }
  }

  getStatus(): {
    connected: boolean;
    subscribedSymbols: string[];
    quoteCount: number;
    tradeCount: number;
    newsCount: number;
  } {
    return {
      connected: this.isConnected,
      subscribedSymbols: Array.from(this.subscribedSymbols),
      quoteCount: this.latestQuotes.size,
      tradeCount: this.latestTrades.size,
      newsCount: this.newsCache.length
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.subscribedSymbols.clear();
      console.log('🔌 Disconnected from Polygon WebSocket');
    }
  }
}

export const realtimeMarketService = new RealtimeMarketService();
