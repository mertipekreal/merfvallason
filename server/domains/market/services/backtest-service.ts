import { historicalDataService } from './historical-data-service';
import { dreamBankScraper } from './dreambank-scraper';

interface BacktestResult {
  eventDate: string;
  eventName: string;
  dreamSentiment: number;
  dreamCount: number;
  fearKeywords: string[];
  marketChange: number;
  prediction: 'correct' | 'incorrect' | 'neutral' | 'no_data' | 'insufficient_sample';
  lag: number;
  confidence: number;
}

interface CorrelationResult {
  lagDays: number;
  correlation: number;
  sampleSize: number;
  significanceLevel: string;
}

export class BacktestService {
  
  async testCriticalDate(
    date: string,
    eventName: string,
    lagDays: number[] = [1, 2, 3, 5, 7]
  ): Promise<BacktestResult[]> {
    const results: BacktestResult[] = [];
    const eventDate = new Date(date);
    
    const marketData = await historicalDataService.getNasdaqDataForDate(date);
    
    for (const lag of lagDays) {
      const dreamDate = new Date(eventDate);
      dreamDate.setDate(dreamDate.getDate() - lag);
      const dreamDateStr = dreamDate.toISOString().split('T')[0];
      
      const dreamStats = await dreamBankScraper.getDailySentimentScore(dreamDateStr);
      
      let prediction: 'correct' | 'incorrect' | 'neutral' | 'no_data' | 'insufficient_sample' = 'no_data';
      let confidence = 0;
      
      const MIN_DREAM_SAMPLE = 3;
      
      if (marketData && dreamStats.dreamCount >= MIN_DREAM_SAMPLE) {
        const marketDown = marketData.changePercent < -1;
        const marketUp = marketData.changePercent > 1;
        const sentimentNegative = dreamStats.avgSentiment < -0.2;
        const sentimentPositive = dreamStats.avgSentiment > 0.2;
        
        const sampleSizeBonus = Math.min(30, (dreamStats.dreamCount - MIN_DREAM_SAMPLE) * 5);
        const sentimentStrength = Math.abs(dreamStats.avgSentiment) * 60;
        
        if ((marketDown && sentimentNegative) || (marketUp && sentimentPositive)) {
          prediction = 'correct';
          confidence = Math.min(100, sentimentStrength + sampleSizeBonus + 20);
        } else if ((marketDown && sentimentPositive) || (marketUp && sentimentNegative)) {
          prediction = 'incorrect';
          confidence = Math.min(100, sentimentStrength);
        } else {
          prediction = 'neutral';
          confidence = 50;
        }
      } else if (marketData && dreamStats.dreamCount > 0 && dreamStats.dreamCount < MIN_DREAM_SAMPLE) {
        prediction = 'insufficient_sample';
        confidence = 0;
      }
      
      results.push({
        eventDate: date,
        eventName,
        dreamSentiment: dreamStats.avgSentiment,
        dreamCount: dreamStats.dreamCount,
        fearKeywords: dreamStats.topFearKeywords,
        marketChange: marketData?.changePercent || 0,
        prediction,
        lag,
        confidence
      });
    }
    
    return results;
  }

  async runHistoricalBacktest(events: Array<{ date: string; name: string }>): Promise<{
    results: BacktestResult[];
    summary: {
      totalEvents: number;
      correctPredictions: number;
      incorrectPredictions: number;
      noDataEvents: number;
      accuracy: number;
      bestLag: number;
      avgConfidence: number;
    };
  }> {
    const allResults: BacktestResult[] = [];
    
    for (const event of events) {
      const eventResults = await this.testCriticalDate(event.date, event.name);
      allResults.push(...eventResults);
    }
    
    const lagAccuracy: Record<number, { correct: number; total: number }> = {};
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    for (const result of allResults) {
      if (!lagAccuracy[result.lag]) {
        lagAccuracy[result.lag] = { correct: 0, total: 0 };
      }
      
      if (result.prediction !== 'no_data') {
        lagAccuracy[result.lag].total++;
        if (result.prediction === 'correct') {
          lagAccuracy[result.lag].correct++;
        }
        totalConfidence += result.confidence;
        confidenceCount++;
      }
    }
    
    let bestLag = 3;
    let bestAccuracy = 0;
    for (const [lag, stats] of Object.entries(lagAccuracy)) {
      if (stats.total > 0) {
        const accuracy = stats.correct / stats.total;
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestLag = parseInt(lag);
        }
      }
    }
    
    const correctPredictions = allResults.filter(r => r.prediction === 'correct').length;
    const incorrectPredictions = allResults.filter(r => r.prediction === 'incorrect').length;
    const noDataEvents = allResults.filter(r => r.prediction === 'no_data').length;
    const validPredictions = correctPredictions + incorrectPredictions;
    
    return {
      results: allResults,
      summary: {
        totalEvents: events.length,
        correctPredictions,
        incorrectPredictions,
        noDataEvents,
        accuracy: validPredictions > 0 ? (correctPredictions / validPredictions) * 100 : 0,
        bestLag,
        avgConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0
      }
    };
  }

  async calculateDreamMarketCorrelation(
    from: string,
    to: string,
    maxLag: number = 7
  ): Promise<CorrelationResult[]> {
    const dreamSeries = await dreamBankScraper.getSentimentTimeSeries(from, to);
    const marketSeries = await historicalDataService.getNasdaqDataRange(from, to);
    
    const correlations: CorrelationResult[] = [];
    
    for (let lag = 0; lag <= maxLag; lag++) {
      const pairs: Array<{ sentiment: number; marketChange: number }> = [];
      
      for (const dream of dreamSeries) {
        const dreamDate = new Date(dream.date);
        const marketDate = new Date(dreamDate);
        marketDate.setDate(marketDate.getDate() + lag);
        const marketDateStr = marketDate.toISOString().split('T')[0];
        
        const marketDay = marketSeries.find(m => 
          m.date.toISOString().split('T')[0] === marketDateStr
        );
        
        if (marketDay) {
          pairs.push({
            sentiment: dream.avgSentiment,
            marketChange: marketDay.changePercent
          });
        }
      }
      
      if (pairs.length >= 10) {
        const correlation = this.pearsonCorrelation(
          pairs.map(p => p.sentiment),
          pairs.map(p => p.marketChange)
        );
        
        let significance = 'not_significant';
        if (Math.abs(correlation) > 0.7) significance = 'strong';
        else if (Math.abs(correlation) > 0.4) significance = 'moderate';
        else if (Math.abs(correlation) > 0.2) significance = 'weak';
        
        correlations.push({
          lagDays: lag,
          correlation,
          sampleSize: pairs.length,
          significanceLevel: significance
        });
      }
    }
    
    return correlations;
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  async testFriday13thMiniCrash(): Promise<BacktestResult[]> {
    console.log('🔍 Testing Friday 13th Mini-Crash (October 13, 1989)...');
    
    return await this.testCriticalDate(
      '1989-10-13',
      'Friday 13th Mini-Crash',
      [1, 2, 3, 4, 5, 6, 7]
    );
  }

  async test1992ElectionUncertainty(): Promise<BacktestResult[]> {
    console.log('🔍 Testing 1992 Election Uncertainty (October 1992)...');
    
    const results: BacktestResult[] = [];
    
    const criticalDates = [
      { date: '1992-10-01', name: 'October 1992 Pre-Election' },
      { date: '1992-10-15', name: 'Mid-October 1992' },
      { date: '1992-11-03', name: 'Election Day 1992' },
      { date: '1992-12-01', name: 'December Rally 1992' }
    ];
    
    for (const event of criticalDates) {
      const eventResults = await this.testCriticalDate(event.date, event.name);
      results.push(...eventResults);
    }
    
    return results;
  }

  async run1989To1993Backtest(): Promise<{
    results: BacktestResult[];
    summary: any;
    correlations: CorrelationResult[];
  }> {
    console.log('🚀 Running full 1989-1993 backtest...');
    
    const criticalEvents = [
      { date: '1989-01-03', name: '1989 January Rally Start' },
      { date: '1989-10-13', name: 'Friday 13th Mini-Crash' },
      { date: '1989-11-09', name: 'Berlin Wall Falls' },
      { date: '1990-08-02', name: 'Gulf War Begins (Iraq invades Kuwait)' },
      { date: '1990-10-11', name: '1990 October Low' },
      { date: '1991-01-17', name: 'Desert Storm Begins' },
      { date: '1991-02-28', name: 'Gulf War Ceasefire' },
      { date: '1992-10-01', name: 'Pre-Election Uncertainty' },
      { date: '1992-11-03', name: 'Clinton Elected' },
      { date: '1992-12-31', name: '1992 Year-End Rally' },
      { date: '1993-02-26', name: 'World Trade Center Bombing' }
    ];
    
    const backtestResults = await this.runHistoricalBacktest(criticalEvents);
    
    const correlations = await this.calculateDreamMarketCorrelation(
      '1989-01-01',
      '1993-12-31',
      7
    );
    
    return {
      results: backtestResults.results,
      summary: backtestResults.summary,
      correlations
    };
  }

  // Comprehensive list of major market crises from 1971-2024
  getHistoricalCrisisEvents(): Array<{ date: string; name: string; expectedDrop: number; category: string }> {
    return [
      // 1970s - Oil Crisis Era
      { date: '1973-01-11', name: '1973 Bear Market Start', expectedDrop: -5, category: 'bear_market' },
      { date: '1973-10-17', name: 'OPEC Oil Embargo', expectedDrop: -8, category: 'oil_crisis' },
      { date: '1974-10-03', name: '1974 Bear Market Bottom', expectedDrop: -10, category: 'bear_market' },
      { date: '1974-12-06', name: 'Post-Watergate Recovery', expectedDrop: -3, category: 'political' },
      
      // 1980s
      { date: '1980-03-27', name: 'Silver Thursday (Hunt Brothers)', expectedDrop: -5, category: 'commodity' },
      { date: '1981-09-25', name: 'Volcker Recession Peak', expectedDrop: -6, category: 'recession' },
      { date: '1982-08-12', name: '1982 Bear Market Bottom', expectedDrop: -4, category: 'bear_market' },
      { date: '1987-10-19', name: 'Black Monday', expectedDrop: -22.6, category: 'crash' },
      { date: '1987-10-20', name: 'Black Monday Aftermath', expectedDrop: -5, category: 'crash' },
      { date: '1989-10-13', name: 'Friday 13th Mini-Crash', expectedDrop: -6.9, category: 'crash' },
      { date: '1989-11-09', name: 'Berlin Wall Falls', expectedDrop: 2, category: 'geopolitical' },
      
      // 1990s
      { date: '1990-08-02', name: 'Gulf War Begins (Iraq invades Kuwait)', expectedDrop: -7, category: 'war' },
      { date: '1990-10-11', name: '1990 October Low', expectedDrop: -5, category: 'bear_market' },
      { date: '1991-01-17', name: 'Desert Storm Begins', expectedDrop: -3, category: 'war' },
      { date: '1994-02-04', name: 'Bond Market Massacre Start', expectedDrop: -4, category: 'bond_crisis' },
      { date: '1997-10-27', name: 'Asian Financial Crisis (US Impact)', expectedDrop: -7.2, category: 'crisis' },
      { date: '1998-08-31', name: 'LTCM/Russia Crisis', expectedDrop: -6.8, category: 'crisis' },
      { date: '1998-10-08', name: 'LTCM Bailout Fear Peak', expectedDrop: -5, category: 'crisis' },
      
      // 2000s - Dot-com and Financial Crisis
      { date: '2000-03-10', name: 'Dot-com Bubble Peak', expectedDrop: -4, category: 'bubble' },
      { date: '2000-04-14', name: 'Nasdaq 10% Drop Day', expectedDrop: -10, category: 'bubble' },
      { date: '2000-11-30', name: 'Dot-com Crash Continues', expectedDrop: -5, category: 'bubble' },
      { date: '2001-03-12', name: 'Nasdaq Bear Market', expectedDrop: -6, category: 'bear_market' },
      { date: '2001-09-17', name: 'Post-9/11 Market Reopening', expectedDrop: -7.1, category: 'terrorism' },
      { date: '2001-09-21', name: '9/11 Week Low', expectedDrop: -6.5, category: 'terrorism' },
      { date: '2002-07-23', name: 'WorldCom Fraud/Bear Low', expectedDrop: -5, category: 'fraud' },
      { date: '2002-10-09', name: 'Tech Bubble Bottom', expectedDrop: -3, category: 'bear_market' },
      { date: '2007-08-09', name: 'BNP Paribas Subprime Warning', expectedDrop: -3, category: 'subprime' },
      { date: '2008-03-17', name: 'Bear Stearns Collapse', expectedDrop: -4, category: 'financial_crisis' },
      { date: '2008-09-15', name: 'Lehman Brothers Bankruptcy', expectedDrop: -4.4, category: 'financial_crisis' },
      { date: '2008-09-29', name: 'TARP Rejection Crash', expectedDrop: -7, category: 'financial_crisis' },
      { date: '2008-10-15', name: 'Global Financial Crisis Peak Fear', expectedDrop: -9, category: 'financial_crisis' },
      { date: '2008-11-20', name: 'Financial Crisis Low', expectedDrop: -6.7, category: 'financial_crisis' },
      { date: '2009-03-09', name: 'Market Bottom', expectedDrop: -2, category: 'recovery' },
      
      // 2010s
      { date: '2010-05-06', name: 'Flash Crash', expectedDrop: -9.2, category: 'flash_crash' },
      { date: '2011-08-08', name: 'S&P US Downgrade', expectedDrop: -6.7, category: 'downgrade' },
      { date: '2011-10-03', name: 'European Debt Crisis Fear', expectedDrop: -4, category: 'debt_crisis' },
      { date: '2015-08-24', name: 'China Devaluation Black Monday', expectedDrop: -3.6, category: 'china' },
      { date: '2015-08-25', name: 'China Crash Day 2', expectedDrop: -3.5, category: 'china' },
      { date: '2016-01-20', name: 'Oil Price Crash', expectedDrop: -3, category: 'oil_crisis' },
      { date: '2016-06-24', name: 'Brexit Vote Shock', expectedDrop: -3.4, category: 'political' },
      { date: '2018-02-05', name: 'Volmageddon', expectedDrop: -4.1, category: 'volatility' },
      { date: '2018-02-08', name: 'Correction Continues', expectedDrop: -3.8, category: 'volatility' },
      { date: '2018-10-10', name: 'October 2018 Selloff', expectedDrop: -4.4, category: 'selloff' },
      { date: '2018-12-24', name: 'Christmas Eve Crash', expectedDrop: -2.7, category: 'selloff' },
      
      // 2020s - COVID and Beyond
      { date: '2020-02-24', name: 'COVID Fear Begins', expectedDrop: -3.4, category: 'pandemic' },
      { date: '2020-03-09', name: 'COVID Oil War Crash', expectedDrop: -7.6, category: 'pandemic' },
      { date: '2020-03-12', name: 'COVID Travel Ban Crash', expectedDrop: -9.5, category: 'pandemic' },
      { date: '2020-03-16', name: 'COVID Circuit Breaker Day', expectedDrop: -12, category: 'pandemic' },
      { date: '2020-03-23', name: 'COVID Bottom', expectedDrop: -3, category: 'pandemic' },
      { date: '2021-09-20', name: 'Evergrande Fear', expectedDrop: -1.7, category: 'china' },
      { date: '2022-01-24', name: 'Fed Pivot Fear', expectedDrop: -4, category: 'fed' },
      { date: '2022-05-05', name: 'Fed 50bp Hike Shock', expectedDrop: -5, category: 'fed' },
      { date: '2022-06-13', name: 'Bear Market Confirmed', expectedDrop: -4, category: 'bear_market' },
      { date: '2022-09-13', name: 'Hot CPI Crash', expectedDrop: -5.2, category: 'inflation' },
      { date: '2023-03-10', name: 'SVB Bank Run', expectedDrop: -1.8, category: 'banking' },
      { date: '2023-03-13', name: 'Regional Bank Crisis', expectedDrop: -2, category: 'banking' },
      { date: '2024-08-05', name: 'Yen Carry Trade Unwind', expectedDrop: -3.4, category: 'currency' },
    ];
  }

  async runComprehensiveBacktest1971To2024(): Promise<{
    results: BacktestResult[];
    summary: {
      totalEvents: number;
      correctPredictions: number;
      incorrectPredictions: number;
      neutralPredictions: number;
      noDataEvents: number;
      insufficientSampleEvents: number;
      accuracy: number;
      bestLag: number;
      avgConfidence: number;
      byCategory: Record<string, { correct: number; total: number; accuracy: number }>;
      byDecade: Record<string, { correct: number; total: number; accuracy: number }>;
    };
    correlations: CorrelationResult[];
  }> {
    console.log('🚀 Running comprehensive 1971-2024 backtest with all major market crises...');
    
    const allEvents = this.getHistoricalCrisisEvents();
    console.log(`📊 Testing ${allEvents.length} historical market events...`);
    
    const backtestResults = await this.runHistoricalBacktest(allEvents);
    
    // Calculate accuracy by category
    const byCategory: Record<string, { correct: number; total: number; accuracy: number }> = {};
    const byDecade: Record<string, { correct: number; total: number; accuracy: number }> = {};
    
    for (const event of allEvents) {
      const category = (event as any).category || 'unknown';
      const year = parseInt(event.date.substring(0, 4));
      const decade = `${Math.floor(year / 10) * 10}s`;
      
      if (!byCategory[category]) {
        byCategory[category] = { correct: 0, total: 0, accuracy: 0 };
      }
      if (!byDecade[decade]) {
        byDecade[decade] = { correct: 0, total: 0, accuracy: 0 };
      }
      
      const eventResults = backtestResults.results.filter(r => r.eventDate === event.date);
      for (const result of eventResults) {
        if (result.prediction === 'correct' || result.prediction === 'incorrect') {
          byCategory[category].total++;
          byDecade[decade].total++;
          if (result.prediction === 'correct') {
            byCategory[category].correct++;
            byDecade[decade].correct++;
          }
        }
      }
    }
    
    // Calculate accuracies
    for (const cat of Object.keys(byCategory)) {
      if (byCategory[cat].total > 0) {
        byCategory[cat].accuracy = (byCategory[cat].correct / byCategory[cat].total) * 100;
      }
    }
    for (const dec of Object.keys(byDecade)) {
      if (byDecade[dec].total > 0) {
        byDecade[dec].accuracy = (byDecade[dec].correct / byDecade[dec].total) * 100;
      }
    }
    
    const neutralPredictions = backtestResults.results.filter(r => r.prediction === 'neutral').length;
    const insufficientSampleEvents = backtestResults.results.filter(r => r.prediction === 'insufficient_sample').length;
    
    // Try to calculate correlations for periods with data
    let correlations: CorrelationResult[] = [];
    try {
      correlations = await this.calculateDreamMarketCorrelation('1985-01-01', '2024-12-31', 7);
    } catch (error) {
      console.log('⚠️ Could not calculate correlations - insufficient dream data');
    }
    
    console.log(`✅ Backtest complete: ${backtestResults.summary.accuracy.toFixed(1)}% accuracy`);
    
    return {
      results: backtestResults.results,
      summary: {
        ...backtestResults.summary,
        neutralPredictions,
        insufficientSampleEvents,
        byCategory,
        byDecade
      },
      correlations
    };
  }

  async detectFearSpikesBeforeDrops(
    from: string,
    to: string,
    fearThreshold: number = 3,
    dropThreshold: number = -2,
    maxLagDays: number = 5
  ): Promise<Array<{
    dreamDate: string;
    fearKeywordCount: number;
    topKeywords: string[];
    marketDropDate: string;
    marketDropPercent: number;
    lagDays: number;
    confirmed: boolean;
  }>> {
    const dreamSeries = await dreamBankScraper.getSentimentTimeSeries(from, to);
    const crashes = await historicalDataService.detectMarketCrashes(from, to, dropThreshold);
    
    const matches: Array<{
      dreamDate: string;
      fearKeywordCount: number;
      topKeywords: string[];
      marketDropDate: string;
      marketDropPercent: number;
      lagDays: number;
      confirmed: boolean;
    }> = [];
    
    for (const crash of crashes) {
      const crashDate = crash.date;
      
      for (let lag = 1; lag <= maxLagDays; lag++) {
        const checkDate = new Date(crashDate);
        checkDate.setDate(checkDate.getDate() - lag);
        const checkDateStr = checkDate.toISOString().split('T')[0];
        
        const dreamDay = dreamSeries.find(d => d.date === checkDateStr);
        
        if (dreamDay && dreamDay.fearKeywordCount >= fearThreshold) {
          const dailyStats = await dreamBankScraper.getDailySentimentScore(checkDateStr);
          
          matches.push({
            dreamDate: checkDateStr,
            fearKeywordCount: dreamDay.fearKeywordCount,
            topKeywords: dailyStats.topFearKeywords,
            marketDropDate: crashDate.toISOString().split('T')[0],
            marketDropPercent: crash.dropPercent,
            lagDays: lag,
            confirmed: true
          });
          
          break;
        }
      }
    }
    
    console.log(`✅ Found ${matches.length} fear spike → market drop correlations`);
    return matches;
  }
}

export const backtestService = new BacktestService();
