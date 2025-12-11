/**
 * Stock Bot Service
 * Pure TypeScript/Node.js stock analysis using Yahoo Finance API directly
 * Implements RSI calculation and stock analysis without external dependencies
 */

export interface StockAnalysisRequest {
  symbol: string;
  period?: string;
  interval?: string;
}

export interface StockAnalysisResult {
  symbol: string;
  price: number;
  currency: string;
  change_percent: number;
  rsi: number;
  recommendation: string;
  period: string;
  data_points: number;
}

export interface StockServiceHealth {
  status: string;
  service: string;
}

/**
 * Calculate RSI using Wilder's smoothing method (pure TypeScript)
 */
function calculateRSI(closes: number[], window: number = 14): number {
  if (closes.length < window + 1) {
    return 50;
  }

  const deltas: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    deltas.push(closes[i] - closes[i - 1]);
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (const d of deltas) {
    if (d > 0) {
      gains.push(d);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(d));
    }
  }

  if (gains.length < window) {
    return 50;
  }

  let avgGain = gains.slice(0, window).reduce((a, b) => a + b, 0) / window;
  let avgLoss = losses.slice(0, window).reduce((a, b) => a + b, 0) / window;

  for (let i = window; i < gains.length; i++) {
    avgGain = (avgGain * (window - 1) + gains[i]) / window;
    avgLoss = (avgLoss * (window - 1) + losses[i]) / window;
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi * 100) / 100;
}

/**
 * Convert period string to seconds
 */
function getPeriodSeconds(period: string): number {
  const periodMap: Record<string, number> = {
    '1d': 86400,
    '5d': 5 * 86400,
    '1mo': 30 * 86400,
    '3mo': 90 * 86400,
    '6mo': 180 * 86400,
    '1y': 365 * 86400,
    '2y': 2 * 365 * 86400,
    '5y': 5 * 365 * 86400,
    '10y': 10 * 365 * 86400,
    'max': 50 * 365 * 86400
  };
  return periodMap[period] || 30 * 86400;
}

/**
 * Fetch stock data from Yahoo Finance API
 */
async function fetchYahooData(
  symbol: string,
  period: string = '1mo',
  interval: string = '1d'
): Promise<{ symbol: string; closes: number[]; currency: string; price: number }> {
  const periodSeconds = getPeriodSeconds(period);
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - periodSeconds;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${startTime}&period2=${endTime}&interval=${interval}&includePrePost=false&events=div,splits`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const data = await response.json() as any;

  if (!data.chart?.result?.[0]) {
    throw new Error(`${symbol} için veri bulunamadı.`);
  }

  const result = data.chart.result[0];
  const quote = result.indicators?.quote?.[0];

  if (!quote?.close) {
    throw new Error(`${symbol} için fiyat verisi bulunamadı.`);
  }

  const closes: number[] = quote.close.filter((c: number | null) => c !== null);

  if (closes.length === 0) {
    throw new Error(`${symbol} için kapanış verisi bulunamadı.`);
  }

  return {
    symbol: result.meta.symbol,
    closes,
    currency: result.meta.currency || 'TRY',
    price: result.meta.regularMarketPrice || closes[closes.length - 1]
  };
}

/**
 * Check service health (always healthy since pure TypeScript)
 */
export async function checkStockServiceHealth(): Promise<StockServiceHealth> {
  return { status: 'healthy', service: 'Merf Stock Engine (Native)' };
}

/**
 * Analyze a stock symbol
 */
export async function analyzeStock(request: StockAnalysisRequest): Promise<StockAnalysisResult> {
  const { symbol: rawSymbol, period = '1mo', interval = '1d' } = request;

  let symbol = rawSymbol.toUpperCase();
  if (symbol.length <= 5 && !symbol.endsWith('.IS') && !symbol.includes('USD')) {
    symbol += '.IS';
  }

  console.log(`[StockBot] Analyzing ${symbol} (period: ${period}, interval: ${interval})`);

  try {
    const data = await fetchYahooData(symbol, period, interval);
    const closes = data.closes;
    const currentPrice = closes[closes.length - 1];
    const startPrice = closes[0];
    const changePct = ((currentPrice - startPrice) / startPrice) * 100;
    const rsi = calculateRSI(closes, 14);

    let recommendation = 'NÖTR';
    if (rsi < 30) {
      recommendation = 'AL (Aşırı Satım)';
    } else if (rsi > 70) {
      recommendation = 'SAT (Aşırı Alım)';
    }

    const result: StockAnalysisResult = {
      symbol: data.symbol,
      price: Math.round(currentPrice * 100) / 100,
      currency: data.currency,
      change_percent: Math.round(changePct * 100) / 100,
      rsi,
      recommendation,
      period,
      data_points: closes.length
    };

    console.log(`[StockBot] Analysis complete: ${result.symbol} = ${result.price} (RSI: ${result.rsi})`);
    return result;
  } catch (error: any) {
    console.error('[StockBot] Analysis failed:', error.message);
    throw new Error(`Hisse analizi başarısız: ${error.message}`);
  }
}

/**
 * Analyze multiple stocks in parallel
 */
export async function analyzeMultipleStocks(
  symbols: string[],
  period: string = '1mo'
): Promise<{ results: StockAnalysisResult[]; errors: { symbol: string; error: string }[] }> {
  const results: StockAnalysisResult[] = [];
  const errors: { symbol: string; error: string }[] = [];

  const promises = symbols.map(async (symbol) => {
    try {
      const result = await analyzeStock({ symbol, period });
      results.push(result);
    } catch (error: any) {
      errors.push({ symbol, error: error.message });
    }
  });

  await Promise.all(promises);

  return { results, errors };
}

/**
 * Get stock recommendation text in Turkish (no emojis per design guidelines)
 */
export function getRecommendationText(result: StockAnalysisResult): string {
  const direction = result.change_percent >= 0 ? '[YUKARI]' : '[ASAGI]';
  const rsiStatus = result.rsi < 30 ? 'Asiri Satim' : result.rsi > 70 ? 'Asiri Alim' : 'Normal';

  return `
${direction} **${result.symbol}**
Fiyat: ${result.price} ${result.currency}
Degisim: %${result.change_percent.toFixed(2)}
RSI(14): ${result.rsi.toFixed(1)} (${rsiStatus})
Oneri: ${result.recommendation}
Donem: ${result.period} (${result.data_points} veri noktasi)
`.trim();
}

export default {
  checkStockServiceHealth,
  analyzeStock,
  analyzeMultipleStocks,
  getRecommendationText
};
