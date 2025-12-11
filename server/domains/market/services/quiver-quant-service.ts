/**
 * Quiver Quant API Service
 * Congress Trading, Insider Trading, 13F Institutional Holdings
 * 
 * Provides alternative data for stock market prediction:
 * - Congress member stock trades (STOCK Act filings)
 * - Insider trading (SEC Form 4)
 * - 13F institutional holdings
 * - Government contracts
 */

const API_BASE = 'https://api.quiverquant.com/beta';

interface CongressTrade {
  ticker: string;
  politician: string;
  party: string;
  chamber: string; // House or Senate
  transactionType: 'buy' | 'sell' | 'exchange';
  amount: string; // Range like "$1,001 - $15,000"
  transactionDate: string;
  filingDate: string;
  description?: string;
}

interface InsiderTrade {
  ticker: string;
  name: string;
  title: string;
  transactionType: 'buy' | 'sell';
  shares: number;
  pricePerShare: number;
  totalValue: number;
  transactionDate: string;
  filingDate: string;
}

interface InstitutionalHolding {
  ticker: string;
  institution: string;
  shares: number;
  value: number;
  percentOfPortfolio: number;
  changeInShares: number;
  filingDate: string;
}

interface GovernmentContract {
  ticker: string;
  agency: string;
  amount: number;
  description: string;
  awardDate: string;
}

class QuiverQuantService {
  private apiKey: string | undefined;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 30 * 60 * 1000; // 30 minutes (data updates daily)

  constructor() {
    this.apiKey = process.env.QUIVER_QUANT_API_KEY;
    if (this.apiKey) {
      console.log('📊 Quiver Quant API initialized');
    } else {
      console.log('⚠️ Quiver Quant API key not configured');
    }
  }

  private async fetchAPI(endpoint: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Quiver Quant API key not configured');
    }

    const url = `${API_BASE}${endpoint}`;
    
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Quiver Quant API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    this.cache.set(url, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Get recent Congress member stock trades
   */
  async getCongressTrades(ticker?: string): Promise<CongressTrade[]> {
    try {
      const endpoint = ticker 
        ? `/congresstrading/${ticker}`
        : '/congresstrading';
      
      const data = await this.fetchAPI(endpoint);
      
      return (Array.isArray(data) ? data : []).map((item: any) => ({
        ticker: item.Ticker || item.ticker,
        politician: item.Representative || item.politician,
        party: item.Party || item.party,
        chamber: item.House || item.chamber,
        transactionType: (item.Transaction || item.transaction || '').toLowerCase().includes('purchase') ? 'buy' : 'sell',
        amount: item.Range || item.amount,
        transactionDate: item.TransactionDate || item.transaction_date,
        filingDate: item.ReportDate || item.filing_date,
        description: item.Description || item.description
      }));
    } catch (error: any) {
      console.error('Congress trades error:', error.message);
      return [];
    }
  }

  /**
   * Get insider trading data (SEC Form 4)
   */
  async getInsiderTrades(ticker?: string): Promise<InsiderTrade[]> {
    try {
      const endpoint = ticker 
        ? `/insiders/${ticker}`
        : '/insiders';
      
      const data = await this.fetchAPI(endpoint);
      
      return (Array.isArray(data) ? data : []).map((item: any) => ({
        ticker: item.Ticker || item.ticker,
        name: item.Name || item.name,
        title: item.Title || item.title,
        transactionType: (item.AcquiredDisposed || item.transaction || '').includes('A') ? 'buy' : 'sell',
        shares: parseInt(item.Shares || item.shares || 0),
        pricePerShare: parseFloat(item.Price || item.price || 0),
        totalValue: parseFloat(item.Value || item.value || 0),
        transactionDate: item.TransactionDate || item.transaction_date,
        filingDate: item.FilingDate || item.filing_date
      }));
    } catch (error: any) {
      console.error('Insider trades error:', error.message);
      return [];
    }
  }

  /**
   * Get 13F institutional holdings
   */
  async getInstitutionalHoldings(ticker?: string): Promise<InstitutionalHolding[]> {
    try {
      const endpoint = ticker 
        ? `/sec13f/${ticker}`
        : '/sec13f';
      
      const data = await this.fetchAPI(endpoint);
      
      return (Array.isArray(data) ? data : []).map((item: any) => ({
        ticker: item.Ticker || item.ticker,
        institution: item.Institution || item.institution,
        shares: parseInt(item.Shares || item.shares || 0),
        value: parseFloat(item.Value || item.value || 0),
        percentOfPortfolio: parseFloat(item.PercentOfPortfolio || item.percent || 0),
        changeInShares: parseInt(item.ChangeInShares || item.change || 0),
        filingDate: item.FilingDate || item.filing_date
      }));
    } catch (error: any) {
      console.error('Institutional holdings error:', error.message);
      return [];
    }
  }

  /**
   * Get government contracts awarded to public companies
   */
  async getGovernmentContracts(ticker?: string): Promise<GovernmentContract[]> {
    try {
      const endpoint = ticker 
        ? `/govcontracts/${ticker}`
        : '/govcontracts';
      
      const data = await this.fetchAPI(endpoint);
      
      return (Array.isArray(data) ? data : []).map((item: any) => ({
        ticker: item.Ticker || item.ticker,
        agency: item.Agency || item.agency,
        amount: parseFloat(item.Amount || item.amount || 0),
        description: item.Description || item.description,
        awardDate: item.Date || item.award_date
      }));
    } catch (error: any) {
      console.error('Government contracts error:', error.message);
      return [];
    }
  }

  /**
   * Generate trading signals based on political/insider activity
   */
  async generateSignals(ticker?: string): Promise<{
    signals: Array<{
      ticker: string;
      signalType: 'congress_buy' | 'congress_sell' | 'insider_buy' | 'insider_sell' | 'institutional';
      direction: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
      source: string;
      details: string;
    }>;
    summary: {
      congressBuys: number;
      congressSells: number;
      insiderBuys: number;
      insiderSells: number;
      netDirection: 'bullish' | 'bearish' | 'neutral';
    };
  }> {
    try {
      const [congressTrades, insiderTrades] = await Promise.all([
        this.getCongressTrades(ticker),
        this.getInsiderTrades(ticker)
      ]);

      const signals: Array<{
        ticker: string;
        signalType: 'congress_buy' | 'congress_sell' | 'insider_buy' | 'insider_sell' | 'institutional';
        direction: 'bullish' | 'bearish' | 'neutral';
        confidence: number;
        source: string;
        details: string;
      }> = [];

      let congressBuys = 0, congressSells = 0;
      let insiderBuys = 0, insiderSells = 0;

      // Analyze Congress trades (high signal value)
      for (const trade of congressTrades.slice(0, 20)) {
        if (trade.transactionType === 'buy') {
          congressBuys++;
          signals.push({
            ticker: trade.ticker,
            signalType: 'congress_buy',
            direction: 'bullish',
            confidence: 0.75, // Congress trades are highly informative
            source: `${trade.politician} (${trade.party})`,
            details: `${trade.amount} on ${trade.transactionDate}`
          });
        } else if (trade.transactionType === 'sell') {
          congressSells++;
          signals.push({
            ticker: trade.ticker,
            signalType: 'congress_sell',
            direction: 'bearish',
            confidence: 0.70,
            source: `${trade.politician} (${trade.party})`,
            details: `${trade.amount} on ${trade.transactionDate}`
          });
        }
      }

      // Analyze Insider trades
      for (const trade of insiderTrades.slice(0, 20)) {
        if (trade.transactionType === 'buy') {
          insiderBuys++;
          signals.push({
            ticker: trade.ticker,
            signalType: 'insider_buy',
            direction: 'bullish',
            confidence: 0.65,
            source: `${trade.name} (${trade.title})`,
            details: `${trade.shares} shares @ $${trade.pricePerShare}`
          });
        } else if (trade.transactionType === 'sell') {
          insiderSells++;
          signals.push({
            ticker: trade.ticker,
            signalType: 'insider_sell',
            direction: 'bearish',
            confidence: 0.55, // Insider sells are less informative (could be diversification)
            source: `${trade.name} (${trade.title})`,
            details: `${trade.shares} shares @ $${trade.pricePerShare}`
          });
        }
      }

      // Calculate net direction
      const buySignals = congressBuys * 1.5 + insiderBuys; // Weight Congress higher
      const sellSignals = congressSells * 1.5 + insiderSells;
      
      let netDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (buySignals > sellSignals * 1.3) {
        netDirection = 'bullish';
      } else if (sellSignals > buySignals * 1.3) {
        netDirection = 'bearish';
      }

      return {
        signals: signals.slice(0, 20),
        summary: {
          congressBuys,
          congressSells,
          insiderBuys,
          insiderSells,
          netDirection
        }
      };
    } catch (error: any) {
      console.error('Generate signals error:', error.message);
      return {
        signals: [],
        summary: {
          congressBuys: 0,
          congressSells: 0,
          insiderBuys: 0,
          insiderSells: 0,
          netDirection: 'neutral'
        }
      };
    }
  }

  /**
   * Health check
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
      await this.fetchAPI('/congresstrading');
      return { configured: true, connected: true };
    } catch (error: any) {
      return { configured: true, connected: false, error: error.message };
    }
  }
}

export const quiverQuantService = new QuiverQuantService();
