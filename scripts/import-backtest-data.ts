import { db } from '../server/db';
import { stockPriceData } from '../shared/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';

const FRED_BASE_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv';

interface YahooBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePercent?: number;
}

async function fetchNasdaqFromFRED(from: string, to: string): Promise<YahooBar[]> {
  const url = `${FRED_BASE_URL}?id=NASDAQCOM&cosd=${from}&coed=${to}`;
  
  console.log(`📊 Fetching FRED data: ${from} to ${to}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API error: ${response.status}`);
  }
  
  const csvText = await response.text();
  const lines = csvText.trim().split('\n').slice(1);
  
  const bars: YahooBar[] = [];
  let prevClose = 0;
  
  for (const line of lines) {
    const [dateStr, valueStr] = line.split(',');
    if (dateStr && valueStr && valueStr !== '.') {
      const value = parseFloat(valueStr);
      if (!isNaN(value)) {
        const changePercent = prevClose > 0 ? ((value - prevClose) / prevClose) * 100 : 0;
        bars.push({
          date: new Date(dateStr),
          open: value,
          high: value,
          low: value,
          close: value,
          volume: 0,
          changePercent
        });
        prevClose = value;
      }
    }
  }
  
  console.log(`✅ FRED: Fetched ${bars.length} Nasdaq bars`);
  return bars;
}

async function importHistoricalData(from: string, to: string): Promise<{ imported: number }> {
  const bars = await fetchNasdaqFromFRED(from, to);
  
  if (bars.length === 0) {
    console.log('❌ No data fetched');
    return { imported: 0 };
  }

  let imported = 0;
  
  for (const bar of bars) {
    try {
      const existing = await db!.select()
        .from(stockPriceData)
        .where(and(
          eq(stockPriceData.symbol, 'IXIC'),
          eq(stockPriceData.timestamp, bar.date)
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
          changePercent: bar.changePercent || 0
        });
        imported++;
      }
    } catch (e: any) {
      console.error(`Error inserting ${bar.date}:`, e.message);
    }
  }
  
  console.log(`✅ Imported ${imported} new records`);
  return { imported };
}

async function main() {
  console.log('🚀 Starting Historical Data Import (2022-2024)');
  console.log('================================================');
  
  const result = await importHistoricalData('2022-01-01', '2024-12-01');
  
  console.log('================================================');
  console.log(`📊 Total imported: ${result.imported} records`);
  
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
