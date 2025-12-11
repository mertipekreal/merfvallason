import { db } from '../../../db';
import { stockPriceData } from '@shared/schema';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const FRED_BASE_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv';

interface YahooBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class HistoricalDataService {
  
  async fetchNasdaqFromFRED(from: string, to: string): Promise<YahooBar[]> {
    const url = `${FRED_BASE_URL}?id=NASDAQCOM&cosd=${from}&coed=${to}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FRED API error: ${response.status}`);
      }
      
      const csvText = await response.text();
      const lines = csvText.trim().split('\n').slice(1);
      
      const bars: YahooBar[] = [];
      
      for (const line of lines) {
        const [dateStr, valueStr] = line.split(',');
        if (dateStr && valueStr && valueStr !== '.') {
          const value = parseFloat(valueStr);
          if (!isNaN(value)) {
            bars.push({
              date: new Date(dateStr),
              open: value,
              high: value,
              low: value,
              close: value,
              volume: 0
            });
          }
        }
      }
      
      console.log(`📊 FRED: Fetched ${bars.length} Nasdaq bars from ${from} to ${to}`);
      return bars;
    } catch (error: any) {
      console.error('FRED fetch error:', error.message);
      throw error;
    }
  }

  async fetchYahooFinanceOHLCV(symbol: string, from: string, to: string): Promise<YahooBar[]> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const period1 = Math.floor(fromDate.getTime() / 1000);
    const period2 = Math.floor(toDate.getTime() / 1000);
    
    const yahooSymbol = symbol === 'IXIC' ? '%5EIXIC' : symbol;
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${yahooSymbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        console.log(`Yahoo Finance returned ${response.status}, falling back to FRED...`);
        return await this.fetchNasdaqFromFRED(from, to);
      }
      
      const csvText = await response.text();
      const lines = csvText.trim().split('\n').slice(1);
      
      const bars: YahooBar[] = [];
      
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 6) {
          const [dateStr, open, high, low, close, , volume] = parts;
          
          if (open !== 'null' && close !== 'null') {
            bars.push({
              date: new Date(dateStr),
              open: parseFloat(open),
              high: parseFloat(high),
              low: parseFloat(low),
              close: parseFloat(close),
              volume: parseInt(volume) || 0
            });
          }
        }
      }
      
      console.log(`📊 Yahoo: Fetched ${bars.length} bars for ${symbol} from ${from} to ${to}`);
      return bars;
    } catch (error: any) {
      console.error('Yahoo fetch error:', error.message);
      console.log('Falling back to FRED...');
      return await this.fetchNasdaqFromFRED(from, to);
    }
  }

  async importHistoricalNasdaq(from: string, to: string): Promise<{ imported: number }> {
    const bars = await this.fetchYahooFinanceOHLCV('IXIC', from, to);
    
    if (bars.length === 0) {
      return { imported: 0 };
    }

    let imported = 0;
    for (const bar of bars) {
      try {
        const existing = await db!.select()
          .from(stockPriceData)
          .where(and(
            eq(stockPriceData.symbol, 'IXIC'),
            eq(stockPriceData.timestamp, bar.date),
            eq(stockPriceData.timeframe, '1d')
          ))
          .limit(1);

        if (existing.length === 0) {
          await db!.insert(stockPriceData).values({
            id: uuidv4(),
            symbol: 'IXIC',
            timestamp: bar.date,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            volume: bar.volume,
            timeframe: '1d'
          });
          imported++;
        }
      } catch (error: any) {
        console.error('Error inserting historical bar:', error.message);
      }
    }

    console.log(`✅ Imported ${imported} historical Nasdaq bars`);
    return { imported };
  }

  async getNasdaqDataForDate(date: string): Promise<{
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  } | null> {
    const targetDate = new Date(date);
    
    const result = await db!.select()
      .from(stockPriceData)
      .where(and(
        eq(stockPriceData.symbol, 'IXIC'),
        eq(stockPriceData.timeframe, '1d'),
        eq(stockPriceData.timestamp, targetDate)
      ))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const bar = result[0];
    
    const previousDay = new Date(targetDate);
    previousDay.setDate(previousDay.getDate() - 1);
    
    const prevResult = await db!.select()
      .from(stockPriceData)
      .where(and(
        eq(stockPriceData.symbol, 'IXIC'),
        eq(stockPriceData.timeframe, '1d'),
        lte(stockPriceData.timestamp, previousDay)
      ))
      .orderBy(desc(stockPriceData.timestamp))
      .limit(1);
    
    let change = bar.close - bar.open;
    let changePercent = bar.open !== 0 ? (change / bar.open) * 100 : 0;
    
    if (bar.open === bar.close && prevResult.length > 0) {
      const prevBar = prevResult[0];
      change = bar.close - prevBar.close;
      changePercent = prevBar.close !== 0 ? (change / prevBar.close) * 100 : 0;
    }

    return {
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      change,
      changePercent
    };
  }

  async getNasdaqDataRange(from: string, to: string): Promise<Array<{
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePercent: number;
  }>> {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const results = await db!.select()
      .from(stockPriceData)
      .where(and(
        eq(stockPriceData.symbol, 'IXIC'),
        eq(stockPriceData.timeframe, '1d'),
        gte(stockPriceData.timestamp, fromDate),
        lte(stockPriceData.timestamp, toDate)
      ))
      .orderBy(asc(stockPriceData.timestamp));

    return results.map(bar => ({
      date: bar.timestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      change: bar.close - bar.open,
      changePercent: ((bar.close - bar.open) / bar.open) * 100
    }));
  }

  async detectFVGGaps(from: string, to: string, threshold: number = 1.5): Promise<Array<{
    date: Date;
    gapType: 'bullish' | 'bearish';
    gapSize: number;
    gapPercent: number;
    previousClose: number;
    currentOpen: number;
  }>> {
    const data = await this.getNasdaqDataRange(from, to);
    const gaps: Array<{
      date: Date;
      gapType: 'bullish' | 'bearish';
      gapSize: number;
      gapPercent: number;
      previousClose: number;
      currentOpen: number;
    }> = [];

    for (let i = 1; i < data.length; i++) {
      const previous = data[i - 1];
      const current = data[i];
      
      const gapSize = current.open - previous.close;
      const gapPercent = Math.abs((gapSize / previous.close) * 100);

      if (gapPercent >= threshold) {
        gaps.push({
          date: current.date,
          gapType: gapSize > 0 ? 'bullish' : 'bearish',
          gapSize: Math.abs(gapSize),
          gapPercent,
          previousClose: previous.close,
          currentOpen: current.open
        });
      }
    }

    console.log(`🔍 Found ${gaps.length} FVG gaps (threshold: ${threshold}%) from ${from} to ${to}`);
    return gaps;
  }

  async detectMarketCrashes(from: string, to: string, dropThreshold: number = -3): Promise<Array<{
    date: Date;
    dropPercent: number;
    open: number;
    close: number;
    volume: number;
  }>> {
    const data = await this.getNasdaqDataRange(from, to);
    const crashes: Array<{
      date: Date;
      dropPercent: number;
      open: number;
      close: number;
      volume: number;
    }> = [];

    for (const bar of data) {
      if (bar.changePercent <= dropThreshold) {
        crashes.push({
          date: bar.date,
          dropPercent: bar.changePercent,
          open: bar.open,
          close: bar.close,
          volume: 0
        });
      }
    }

    console.log(`💥 Found ${crashes.length} market crashes (>${Math.abs(dropThreshold)}% drop) from ${from} to ${to}`);
    return crashes;
  }
}

export const historicalDataService = new HistoricalDataService();
