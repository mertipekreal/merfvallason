/**
 * NASDAQ Sinyal Avcisi - Signal Harvester Service
 * Harvests market microstructure signals from Unusual Whales API
 * 
 * Collects and stores:
 * - Options flow (unusual activity, large orders)
 * - Dark pool trades (off-lit volume)
 * - Whale trades (institutional orders)
 * - Order imbalances
 */

import { db } from "../../../db";
import { marketSignalsV2 } from "@shared/schema";
import type { InsertMarketSignalV2, MarketSignalV2 } from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { unusualWhalesService } from "./unusual-whales-service";

const safeNumber = (val: any, fallback = 0): number => {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? fallback : num;
};

interface HarvestResult {
  success: boolean;
  signalType: string;
  count: number;
  signals: MarketSignalV2[];
  error?: string;
}

interface HarvestAllResult {
  symbol: string;
  totalSignals: number;
  results: {
    optionsFlow: HarvestResult;
    darkPool: HarvestResult;
    whaleTrades: HarvestResult;
  };
  timestamp: Date;
}

class SignalHarvesterService {
  constructor() {
    console.log('🎯 Signal Harvester Service initialized');
  }

  /**
   * Harvest options flow signals from Unusual Whales API
   */
  async harvestOptionsFlow(symbol: string): Promise<HarvestResult> {
    try {
      const flowAlerts = await unusualWhalesService.getFlowAlerts({
        ticker: symbol,
        minPremium: 25000,
        limit: 50,
      });

      if (flowAlerts.length === 0) {
        return {
          success: true,
          signalType: 'options_flow',
          count: 0,
          signals: [],
        };
      }

      const signals: InsertMarketSignalV2[] = flowAlerts.map(flow => {
        let direction: string = 'neutral';
        if (flow.sentiment === 'bullish' || flow.optionType === 'call') {
          direction = 'bullish';
        } else if (flow.sentiment === 'bearish' || flow.optionType === 'put') {
          direction = 'bearish';
        }

        return {
          symbol,
          signalType: 'options_flow',
          direction,
          source: 'unusual_whales',
          premium: flow.premium,
          volume: flow.volume,
          openInterest: flow.openInterest,
          strike: flow.strike,
          expiry: flow.expiry ? new Date(flow.expiry) : null,
          optionType: flow.optionType,
          unusual: true,
          whale: flow.premium > 100000,
          rawData: {
            impliedVolatility: flow.impliedVolatility,
            delta: flow.delta,
            alertType: flow.alertType,
            sentiment: flow.sentiment,
            originalTimestamp: flow.timestamp,
            strength: Math.min(1, flow.premium / 500000),
          },
        };
      });

      if (!db) {
        console.error('[SignalHarvester] Database not initialized');
        return { success: false, signalType: 'options_flow', count: 0, signals: [], error: 'Database not initialized' };
      }

      const inserted = await db.insert(marketSignalsV2).values(signals).returning();

      return {
        success: true,
        signalType: 'options_flow',
        count: inserted.length,
        signals: inserted,
      };
    } catch (error: any) {
      console.error('[SignalHarvester] Options flow error:', error.message);
      return {
        success: false,
        signalType: 'options_flow',
        count: 0,
        signals: [],
        error: error.message,
      };
    }
  }

  /**
   * Harvest dark pool signals from Unusual Whales API
   */
  async harvestDarkPool(symbol: string): Promise<HarvestResult> {
    try {
      const darkPoolTrades = await unusualWhalesService.getDarkPoolVolume(symbol);

      if (darkPoolTrades.length === 0) {
        return {
          success: true,
          signalType: 'dark_pool',
          count: 0,
          signals: [],
        };
      }

      const signals: InsertMarketSignalV2[] = darkPoolTrades.map(trade => {
        const darkPoolPercent = safeNumber(trade.darkPoolPercent, 40);
        let direction: string = 'neutral';
        if (darkPoolPercent > 50) {
          direction = 'bearish';
        } else if (darkPoolPercent < 30) {
          direction = 'bullish';
        }

        const price = safeNumber(trade.price);
        const size = safeNumber(trade.size);
        const premium = price * size;
        const darkPoolVolume = safeNumber(trade.darkPoolVolume);

        return {
          symbol,
          signalType: 'dark_pool',
          direction,
          source: 'unusual_whales',
          premium: isNaN(premium) ? 0 : premium,
          volume: size,
          darkPoolPercent,
          rawData: {
            price,
            exchange: trade.exchange,
            darkPoolVolume,
            litVolume: safeNumber(trade.litVolume),
            originalTimestamp: trade.timestamp,
            strength: Math.min(1, darkPoolVolume / 10000000),
          },
        };
      });

      if (!db) {
        console.error('[SignalHarvester] Database not initialized');
        return { success: false, signalType: 'dark_pool', count: 0, signals: [], error: 'Database not initialized' };
      }

      const inserted = await db.insert(marketSignalsV2).values(signals).returning();

      return {
        success: true,
        signalType: 'dark_pool',
        count: inserted.length,
        signals: inserted,
      };
    } catch (error: any) {
      console.error('[SignalHarvester] Dark pool error:', error.message);
      return {
        success: false,
        signalType: 'dark_pool',
        count: 0,
        signals: [],
        error: error.message,
      };
    }
  }

  /**
   * Harvest whale trade signals from Unusual Whales API
   */
  async harvestWhaleTrades(symbol: string): Promise<HarvestResult> {
    try {
      const whaleTrades = await unusualWhalesService.getWhaleTrades({
        ticker: symbol,
        minPremium: 100000,
        limit: 30,
      });

      if (whaleTrades.length === 0) {
        return {
          success: true,
          signalType: 'whale_trade',
          count: 0,
          signals: [],
        };
      }

      const signals: InsertMarketSignalV2[] = whaleTrades.map((trade: any) => {
        let direction: string = 'neutral';
        if (trade.sentiment === 'bullish' || trade.option_type === 'call' || trade.type === 'call') {
          direction = 'bullish';
        } else if (trade.sentiment === 'bearish' || trade.option_type === 'put' || trade.type === 'put') {
          direction = 'bearish';
        }

        const premium = parseFloat(trade.premium || 0);
        const strike = parseFloat(trade.strike || 0);

        return {
          symbol,
          signalType: 'whale_trade',
          direction,
          source: 'unusual_whales',
          premium: isNaN(premium) ? 0 : premium,
          volume: safeNumber(trade.volume, 0),
          strike: isNaN(strike) ? null : strike || null,
          expiry: trade.expiry ? new Date(trade.expiry) : null,
          optionType: trade.option_type || trade.type || null,
          unusual: true,
          whale: true,
          rawData: {
            sentiment: trade.sentiment,
            originalData: trade,
            strength: Math.min(1, (isNaN(premium) ? 0 : premium) / 1000000),
          },
        };
      });

      if (!db) {
        console.error('[SignalHarvester] Database not initialized');
        return { success: false, signalType: 'whale_trade', count: 0, signals: [], error: 'Database not initialized' };
      }

      const inserted = await db.insert(marketSignalsV2).values(signals).returning();

      return {
        success: true,
        signalType: 'whale_trade',
        count: inserted.length,
        signals: inserted,
      };
    } catch (error: any) {
      console.error('[SignalHarvester] Whale trades error:', error.message);
      return {
        success: false,
        signalType: 'whale_trade',
        count: 0,
        signals: [],
        error: error.message,
      };
    }
  }

  /**
   * Harvest all signal types for a symbol
   */
  async harvestAll(symbol: string): Promise<HarvestAllResult> {
    console.log(`[SignalHarvester] Harvesting all signals for ${symbol}...`);

    const [optionsFlow, darkPool, whaleTrades] = await Promise.all([
      this.harvestOptionsFlow(symbol),
      this.harvestDarkPool(symbol),
      this.harvestWhaleTrades(symbol),
    ]);

    const totalSignals = optionsFlow.count + darkPool.count + whaleTrades.count;

    console.log(`[SignalHarvester] Harvested ${totalSignals} signals for ${symbol}`);

    return {
      symbol,
      totalSignals,
      results: {
        optionsFlow,
        darkPool,
        whaleTrades,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get recent signals from database
   */
  async getRecentSignals(
    symbol: string,
    limit: number = 50,
    signalType?: 'options_flow' | 'dark_pool' | 'whale_trade' | 'order_imbalance'
  ): Promise<MarketSignalV2[]> {
    try {
      if (!db) {
        console.error('[SignalHarvester] Database not initialized');
        return [];
      }

      const conditions = [eq(marketSignalsV2.symbol, symbol)];
      
      if (signalType) {
        conditions.push(eq(marketSignalsV2.signalType, signalType));
      }

      return await db
        .select()
        .from(marketSignalsV2)
        .where(and(...conditions))
        .orderBy(desc(marketSignalsV2.timestamp))
        .limit(limit);
    } catch (error: any) {
      console.error('[SignalHarvester] Get signals error:', error.message);
      return [];
    }
  }

  /**
   * Get signal summary for a symbol
   */
  async getSignalSummary(symbol: string, hoursBack: number = 24): Promise<{
    symbol: string;
    totalSignals: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    avgStrength: number;
    totalPremium: number;
    signalTypes: Record<string, number>;
    netDirection: 'bullish' | 'bearish' | 'neutral';
  }> {
    try {
      if (!db) {
        console.error('[SignalHarvester] Database not initialized');
        return {
          symbol,
          totalSignals: 0,
          bullishCount: 0,
          bearishCount: 0,
          neutralCount: 0,
          avgStrength: 0,
          totalPremium: 0,
          signalTypes: {},
          netDirection: 'neutral',
        };
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
        );

      if (signals.length === 0) {
        return {
          symbol,
          totalSignals: 0,
          bullishCount: 0,
          bearishCount: 0,
          neutralCount: 0,
          avgStrength: 0,
          totalPremium: 0,
          signalTypes: {},
          netDirection: 'neutral',
        };
      }

      const bullishCount = signals.filter(s => s.direction === 'bullish').length;
      const bearishCount = signals.filter(s => s.direction === 'bearish').length;
      const neutralCount = signals.filter(s => s.direction === 'neutral').length;

      const strengths = signals.map(s => {
        const rawData = s.rawData as any;
        return rawData?.strength || 0;
      });
      const avgStrength = strengths.reduce((sum, s) => sum + s, 0) / signals.length;
      const totalPremium = signals.reduce((sum, s) => sum + (s.premium || 0), 0);

      const signalTypes: Record<string, number> = {};
      for (const signal of signals) {
        signalTypes[signal.signalType] = (signalTypes[signal.signalType] || 0) + 1;
      }

      let netDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (bullishCount > bearishCount * 1.5) {
        netDirection = 'bullish';
      } else if (bearishCount > bullishCount * 1.5) {
        netDirection = 'bearish';
      }

      return {
        symbol,
        totalSignals: signals.length,
        bullishCount,
        bearishCount,
        neutralCount,
        avgStrength,
        totalPremium,
        signalTypes,
        netDirection,
      };
    } catch (error: any) {
      console.error('[SignalHarvester] Summary error:', error.message);
      return {
        symbol,
        totalSignals: 0,
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        avgStrength: 0,
        totalPremium: 0,
        signalTypes: {},
        netDirection: 'neutral',
      };
    }
  }

  /**
   * Get microstructure score for prediction engine
   */
  async getMicrostructureScore(symbol: string): Promise<{
    score: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    signalCount: number;
    components: {
      optionsFlow: number;
      darkPool: number;
      whaleTrades: number;
    };
  }> {
    const summary = await this.getSignalSummary(symbol, 24);

    if (summary.totalSignals < 3) {
      return {
        score: 0,
        direction: 'neutral',
        confidence: 0,
        signalCount: 0,
        components: {
          optionsFlow: 0,
          darkPool: 0,
          whaleTrades: 0,
        },
      };
    }

    const bullishRatio = summary.bullishCount / summary.totalSignals;
    const bearishRatio = summary.bearishCount / summary.totalSignals;
    
    const score = (bullishRatio - bearishRatio) * 100;
    
    const confidence = Math.min(1, summary.avgStrength * (summary.totalSignals / 10));

    return {
      score,
      direction: summary.netDirection,
      confidence,
      signalCount: summary.totalSignals,
      components: {
        optionsFlow: summary.signalTypes['options_flow'] || 0,
        darkPool: summary.signalTypes['dark_pool'] || 0,
        whaleTrades: summary.signalTypes['whale_trade'] || 0,
      },
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    unusualWhalesConnected: boolean;
    recentSignals: number;
    message?: string;
  }> {
    try {
      if (!db) {
        console.error('[SignalHarvester] Database not initialized');
        return {
          status: 'unhealthy',
          unusualWhalesConnected: false,
          recentSignals: 0,
          message: 'Database not initialized',
        };
      }

      const uwHealth = await unusualWhalesService.healthCheck();

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSignals = await db
        .select({ count: sql<number>`count(*)` })
        .from(marketSignalsV2)
        .where(gte(marketSignalsV2.timestamp, oneDayAgo));

      const signalCount = Number(recentSignals[0]?.count) || 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!uwHealth.connected) {
        status = 'degraded';
      }
      if (!uwHealth.configured) {
        status = 'unhealthy';
      }

      return {
        status,
        unusualWhalesConnected: uwHealth.connected,
        recentSignals: signalCount,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        unusualWhalesConnected: false,
        recentSignals: 0,
        message: error.message,
      };
    }
  }
}

export const signalHarvesterService = new SignalHarvesterService();
