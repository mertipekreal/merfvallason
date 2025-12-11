/**
 * NASDAQ Sinyal Avcisi - Signal Scorer Service
 * Scores and ranks market signals for prediction integration
 * 
 * Provides:
 * - Signal quality scoring based on premium, volume, and timing
 * - Fusion of multiple signal types into composite scores
 * - Backtesting of signal accuracy
 * - Integration with prediction engine
 */

import { db } from "../../../db";
import { marketSignalsV2, signalScores, fusedSignals, signalBacktests } from "@shared/schema";
import type { InsertSignalScore, SignalScore, InsertFusedSignal, FusedSignal, InsertSignalBacktest } from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { signalHarvesterService } from "./signal-harvester-service";

interface SignalScoringResult {
  signalId: number;
  strength: number;
  probability: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  timeHorizon: 'intraday' | 'swing' | 'position';
  expectedMove: number;
  recommendation: string;
}

interface FusedSignalResult {
  symbol: string;
  overallDirection: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;
  signalCount: number;
  components: {
    orderFlow: number;
    darkPool: number;
    options: number;
    emotion: number;
    technical: number;
    economic: number;
  };
  regime: 'risk_on' | 'risk_off' | 'neutral';
}

class SignalScorerService {
  private readonly SIGNAL_WEIGHTS = {
    options: 0.30,
    orderFlow: 0.25,
    darkPool: 0.25,
    emotion: 0.10,
    technical: 0.05,
    economic: 0.05,
  };

  constructor() {
    console.log('📊 Signal Scorer Service initialized');
  }

  /**
   * Score individual signal quality
   */
  scoreSignal(signal: {
    id: number;
    signalType: string;
    premium?: number | null;
    volume?: number | null;
    direction?: string | null;
    unusual?: boolean | null;
    whale?: boolean | null;
    rawData?: any;
    timestamp?: Date | null;
  }): SignalScoringResult {
    const premium = signal.premium || 0;
    const volume = signal.volume || 0;
    const rawData = signal.rawData || {};
    const internalStrength = rawData.strength || 0.5;

    let strength = 50;
    if (signal.signalType === 'options_flow' || signal.signalType === 'whale_trade') {
      if (premium > 500000) strength = 90;
      else if (premium > 250000) strength = 75;
      else if (premium > 100000) strength = 60;
      else if (premium > 50000) strength = 45;
      else strength = 30;
    } else if (signal.signalType === 'dark_pool') {
      strength = Math.min(90, 30 + (premium / 100000));
    }

    if (signal.unusual) strength += 5;
    if (signal.whale) strength += 10;
    strength = Math.min(100, strength);

    let probability = 0.5;
    if (signal.direction === 'bullish' || signal.direction === 'bearish') {
      probability = 0.55 + (internalStrength * 0.25);
    }

    const confidence = Math.min(1, internalStrength + (signal.whale ? 0.15 : 0) + (signal.unusual ? 0.05 : 0));

    let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
    if (strength > 80) riskLevel = 'extreme';
    else if (strength > 65) riskLevel = 'high';
    else if (strength > 45) riskLevel = 'medium';
    else riskLevel = 'low';

    let timeHorizon: 'intraday' | 'swing' | 'position' = 'swing';
    if (signal.signalType === 'options_flow') {
      const expiry = rawData.expiry;
      if (expiry) {
        const daysToExpiry = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= 7) timeHorizon = 'intraday';
        else if (daysToExpiry <= 30) timeHorizon = 'swing';
        else timeHorizon = 'position';
      }
    }

    const expectedMove = signal.direction === 'bullish' ? (strength / 50) : 
                         signal.direction === 'bearish' ? -(strength / 50) : 0;

    let recommendation = 'hold';
    if (signal.direction === 'bullish' && strength > 70) recommendation = 'strong_buy';
    else if (signal.direction === 'bullish' && strength > 50) recommendation = 'buy';
    else if (signal.direction === 'bearish' && strength > 70) recommendation = 'strong_sell';
    else if (signal.direction === 'bearish' && strength > 50) recommendation = 'sell';

    return {
      signalId: signal.id,
      strength,
      probability,
      confidence,
      riskLevel,
      timeHorizon,
      expectedMove,
      recommendation,
    };
  }

  /**
   * Score and store signals for a symbol
   */
  async scoreRecentSignals(symbol: string, hoursBack: number = 24): Promise<SignalScore[]> {
    try {
      if (!db) {
        console.error('[SignalScorer] Database not initialized');
        return [];
      }

      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const signals = await db
        .select()
        .from(marketSignalsV2)
        .where(
          and(
            eq(marketSignalsV2.symbol, symbol),
            gte(marketSignalsV2.timestamp, cutoffTime)
          )
        )
        .orderBy(desc(marketSignalsV2.timestamp));

      if (signals.length === 0) {
        return [];
      }

      const scoredSignals: InsertSignalScore[] = signals.map(signal => {
        const scoring = this.scoreSignal({
          id: signal.id,
          signalType: signal.signalType,
          premium: signal.premium,
          volume: signal.volume,
          direction: signal.direction,
          unusual: signal.unusual,
          whale: signal.whale,
          rawData: signal.rawData,
          timestamp: signal.timestamp,
        });

        return {
          signalId: signal.id,
          symbol,
          strength: scoring.strength,
          probability: scoring.probability,
          confidence: scoring.confidence,
          riskLevel: scoring.riskLevel,
          timeHorizon: scoring.timeHorizon,
          expectedMove: scoring.expectedMove,
          recommendation: scoring.recommendation,
          components: {
            orderFlow: signal.signalType === 'options_flow' ? scoring.strength : 0,
            darkPool: signal.signalType === 'dark_pool' ? scoring.strength : 0,
            options: signal.signalType === 'options_flow' || signal.signalType === 'whale_trade' ? scoring.strength : 0,
            technical: 0,
            emotion: 0,
          },
        };
      });

      const inserted = await db.insert(signalScores).values(scoredSignals).returning();
      return inserted;
    } catch (error: any) {
      console.error('[SignalScorer] Score signals error:', error.message);
      return [];
    }
  }

  /**
   * Create fused signal from multiple signal types
   */
  async createFusedSignal(symbol: string, emotionScore?: number, technicalScore?: number, economicScore?: number): Promise<FusedSignal | null> {
    try {
      const summary = await signalHarvesterService.getSignalSummary(symbol, 24);

      if (summary.totalSignals < 3) {
        return null;
      }

      let optionsScore = 0;
      let orderFlowScore = 0;
      let darkPoolScore = 0;

      const recentSignals = await signalHarvesterService.getRecentSignals(symbol, 100);
      const signalIds: number[] = recentSignals.map(s => s.id);

      const optionsSignals = recentSignals.filter(s => s.signalType === 'options_flow');
      if (optionsSignals.length > 0) {
        const bullish = optionsSignals.filter(s => s.direction === 'bullish').length;
        const bearish = optionsSignals.filter(s => s.direction === 'bearish').length;
        optionsScore = ((bullish - bearish) / optionsSignals.length) * 100;
      }

      const whaleSignals = recentSignals.filter(s => s.signalType === 'whale_trade');
      if (whaleSignals.length > 0) {
        const bullish = whaleSignals.filter(s => s.direction === 'bullish').length;
        const bearish = whaleSignals.filter(s => s.direction === 'bearish').length;
        orderFlowScore = ((bullish - bearish) / whaleSignals.length) * 100;
      }

      const darkPoolSignals = recentSignals.filter(s => s.signalType === 'dark_pool');
      if (darkPoolSignals.length > 0) {
        const bullish = darkPoolSignals.filter(s => s.direction === 'bullish').length;
        const bearish = darkPoolSignals.filter(s => s.direction === 'bearish').length;
        darkPoolScore = ((bullish - bearish) / darkPoolSignals.length) * 100;
      }

      const emScore = emotionScore !== undefined ? emotionScore : 0;
      const techScore = technicalScore !== undefined ? technicalScore : 0;
      const econScore = economicScore !== undefined ? economicScore : 0;

      const compositeScore = (
        optionsScore * this.SIGNAL_WEIGHTS.options +
        orderFlowScore * this.SIGNAL_WEIGHTS.orderFlow +
        darkPoolScore * this.SIGNAL_WEIGHTS.darkPool +
        emScore * this.SIGNAL_WEIGHTS.emotion +
        techScore * this.SIGNAL_WEIGHTS.technical +
        econScore * this.SIGNAL_WEIGHTS.economic
      );

      let overallDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (compositeScore > 15) overallDirection = 'bullish';
      else if (compositeScore < -15) overallDirection = 'bearish';

      const confidenceScore = Math.min(1, (summary.totalSignals / 20) * summary.avgStrength);

      let regime: 'risk_on' | 'risk_off' | 'neutral' = 'neutral';
      if (compositeScore > 25 && confidenceScore > 0.6) regime = 'risk_on';
      else if (compositeScore < -25 && confidenceScore > 0.6) regime = 'risk_off';

      let recommendation = 'Hold - Wait for clearer signals';
      if (overallDirection === 'bullish' && confidenceScore > 0.7) {
        recommendation = 'Consider bullish positions. Strong institutional buying detected.';
      } else if (overallDirection === 'bearish' && confidenceScore > 0.7) {
        recommendation = 'Consider hedging or bearish positions. Institutional selling detected.';
      }

      const fusedData = {
        symbol,
        overallDirection,
        confidenceScore,
        signalIds: signalIds.length > 0 ? signalIds : null,
        regime,
        recommendation,
        components: {
          orderFlow: orderFlowScore,
          darkPool: darkPoolScore,
          options: optionsScore,
          emotion: emScore,
          technical: techScore,
          economic: econScore,
        },
      };

      if (!db) {
        console.error('[SignalScorer] Database not initialized');
        return null;
      }

      const [inserted] = await db.insert(fusedSignals).values([fusedData]).returning();
      return inserted;
    } catch (error: any) {
      console.error('[SignalScorer] Fused signal error:', error.message);
      return null;
    }
  }

  /**
   * Get latest fused signal for prediction engine
   */
  async getLatestFusedSignal(symbol: string): Promise<FusedSignal | null> {
    try {
      if (!db) {
        console.error('[SignalScorer] Database not initialized');
        return null;
      }

      const [latest] = await db
        .select()
        .from(fusedSignals)
        .where(eq(fusedSignals.symbol, symbol))
        .orderBy(desc(fusedSignals.createdAt))
        .limit(1);

      return latest || null;
    } catch (error: any) {
      console.error('[SignalScorer] Get fused signal error:', error.message);
      return null;
    }
  }

  /**
   * Record backtest results for a signal type
   */
  async recordBacktestResult(params: {
    signalType: string;
    symbol: string;
    testPeriod: '1m' | '3m' | '6m' | '1y';
    startDate: Date;
    endDate: Date;
    accuracy: number;
    profitFactor: number;
    sharpeRatio: number;
    totalSignals: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
  }): Promise<void> {
    try {
      const backtest: InsertSignalBacktest = {
        signalType: params.signalType,
        symbol: params.symbol,
        testPeriod: params.testPeriod,
        startDate: params.startDate,
        endDate: params.endDate,
        accuracy: params.accuracy,
        profitFactor: params.profitFactor,
        sharpeRatio: params.sharpeRatio,
        totalSignals: params.totalSignals,
        winRate: params.winRate,
        avgWin: params.avgWin,
        avgLoss: params.avgLoss,
        maxDrawdown: params.maxDrawdown,
      };

      if (!db) {
        console.error('[SignalScorer] Database not initialized');
        return;
      }

      await db.insert(signalBacktests).values(backtest);
    } catch (error: any) {
      console.error('[SignalScorer] Record backtest error:', error.message);
    }
  }

  /**
   * Get backtest results for a signal type
   */
  async getBacktestResults(signalType?: string, symbol?: string): Promise<{
    backtests: Array<{
      signalType: string;
      symbol: string | null;
      testPeriod: string | null;
      accuracy: number | null;
      profitFactor: number | null;
      sharpeRatio: number | null;
      winRate: number | null;
    }>;
    avgAccuracy: number;
    avgWinRate: number;
  }> {
    try {
      const conditions = [];
      if (signalType) {
        conditions.push(eq(signalBacktests.signalType, signalType));
      }
      if (symbol) {
        conditions.push(eq(signalBacktests.symbol, symbol));
      }

      if (!db) {
        console.error('[SignalScorer] Database not initialized');
        return { backtests: [], avgAccuracy: 0, avgWinRate: 0 };
      }

      const backtests = await db
        .select()
        .from(signalBacktests)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(signalBacktests.createdAt))
        .limit(50);

      if (backtests.length === 0) {
        return {
          backtests: [],
          avgAccuracy: 0,
          avgWinRate: 0,
        };
      }

      const avgAccuracy = backtests.reduce((sum, b) => sum + (b.accuracy || 0), 0) / backtests.length;
      const avgWinRate = backtests.reduce((sum, b) => sum + (b.winRate || 0), 0) / backtests.length;

      return {
        backtests: backtests.map(b => ({
          signalType: b.signalType,
          symbol: b.symbol,
          testPeriod: b.testPeriod,
          accuracy: b.accuracy,
          profitFactor: b.profitFactor,
          sharpeRatio: b.sharpeRatio,
          winRate: b.winRate,
        })),
        avgAccuracy,
        avgWinRate,
      };
    } catch (error: any) {
      console.error('[SignalScorer] Get backtests error:', error.message);
      return {
        backtests: [],
        avgAccuracy: 0,
        avgWinRate: 0,
      };
    }
  }

  /**
   * Get microstructure score for prediction engine integration
   */
  async getMicrostructureScore(symbol: string): Promise<{
    score: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  }> {
    const fused = await this.getLatestFusedSignal(symbol);
    
    if (!fused) {
      const harvesterScore = await signalHarvesterService.getMicrostructureScore(symbol);
      return {
        score: harvesterScore.score,
        direction: harvesterScore.direction,
        confidence: harvesterScore.confidence,
      };
    }

    const components = fused.components || { orderFlow: 0, darkPool: 0, options: 0, emotion: 0, technical: 0, economic: 0 };
    const compositeScore = (
      (components.options || 0) * this.SIGNAL_WEIGHTS.options +
      (components.orderFlow || 0) * this.SIGNAL_WEIGHTS.orderFlow +
      (components.darkPool || 0) * this.SIGNAL_WEIGHTS.darkPool +
      (components.emotion || 0) * this.SIGNAL_WEIGHTS.emotion +
      (components.technical || 0) * this.SIGNAL_WEIGHTS.technical +
      (components.economic || 0) * this.SIGNAL_WEIGHTS.economic
    );

    return {
      score: compositeScore,
      direction: (fused.overallDirection as 'bullish' | 'bearish' | 'neutral') || 'neutral',
      confidence: fused.confidenceScore || 0,
    };
  }

  /**
   * Get recent signal scores (read-only, no inserts)
   */
  async getRecentScores(symbol: string, hoursBack: number = 24): Promise<SignalScore[]> {
    try {
      if (!db) {
        console.error('[SignalScorer] Database not initialized');
        return [];
      }

      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const scores = await db
        .select()
        .from(signalScores)
        .where(
          and(
            eq(signalScores.symbol, symbol),
            gte(signalScores.calculatedAt, cutoffTime)
          )
        )
        .orderBy(desc(signalScores.calculatedAt))
        .limit(100);

      return scores;
    } catch (error: any) {
      console.error('[SignalScorer] Get scores error:', error.message);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    recentScores: number;
    recentFusions: number;
    harvesterStatus: string;
  }> {
    try {
      const harvesterHealth = await signalHarvesterService.healthCheck();

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (!db) {
        console.error('[SignalScorer] Database not initialized');
        return { status: 'unhealthy', recentScores: 0, recentFusions: 0, harvesterStatus: 'unknown' };
      }

      const [scoresResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(signalScores)
        .where(gte(signalScores.calculatedAt, oneDayAgo));

      const [fusionsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(fusedSignals)
        .where(gte(fusedSignals.createdAt, oneDayAgo));

      const recentScores = Number(scoresResult?.count) || 0;
      const recentFusions = Number(fusionsResult?.count) || 0;

      return {
        status: harvesterHealth.status === 'healthy' ? 'healthy' : 'degraded',
        recentScores,
        recentFusions,
        harvesterStatus: harvesterHealth.status,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        recentScores: 0,
        recentFusions: 0,
        harvesterStatus: 'unknown',
      };
    }
  }
}

export const signalScorerService = new SignalScorerService();
