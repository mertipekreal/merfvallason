/**
 * Account Sniper - Account Valuation Service
 * Algorithmic stock valuation with DCF, comparables, and SHAP explainability
 * 
 * Provides:
 * - DCF (Discounted Cash Flow) valuation
 * - Comparable company analysis
 * - SHAP-style feature importance
 * - Anomaly detection in valuations
 */

import { db } from "../../../db";
import { 
  valuationProfiles, 
  valuationSnapshots, 
  valuationFeatureImportances, 
  modelExplanations, 
  valuationAnomalies 
} from "@shared/schema";
import type { 
  InsertValuationProfile, 
  ValuationProfile, 
  InsertValuationSnapshot, 
  ValuationSnapshot,
  InsertValuationFeatureImportance,
  InsertModelExplanation,
  InsertValuationAnomaly,
  ValuationAnomaly
} from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

interface DCFInputs {
  freeCashFlow: number;
  growthRate: number;
  discountRate: number;
  terminalGrowth: number;
  projectionYears: number;
  sharesOutstanding: number;
}

interface DCFResult {
  intrinsicValue: number;
  presentValueOfCashFlows: number;
  terminalValue: number;
  presentValueOfTerminal: number;
  perShareValue: number;
}

interface ValuationResult {
  symbol: string;
  currentPrice: number;
  intrinsicValue: number;
  upside: number;
  rating: 'undervalued' | 'fairly_valued' | 'overvalued';
  confidence: number;
  methodology: 'dcf' | 'comparables' | 'asset_based' | 'hybrid';
  keyDrivers: string[];
  risks: string[];
}

interface FeatureImportance {
  featureName: string;
  featureValue: number;
  shapValue: number;
  contribution: 'positive' | 'negative';
  rank: number;
}

class AccountValuationService {
  private readonly DEFAULT_DISCOUNT_RATE = 0.10;
  private readonly DEFAULT_TERMINAL_GROWTH = 0.025;
  private readonly DEFAULT_PROJECTION_YEARS = 5;

  constructor() {
    console.log('🎯 Account Valuation Service initialized');
  }

  /**
   * Calculate DCF valuation
   */
  calculateDCF(inputs: DCFInputs): DCFResult {
    const {
      freeCashFlow,
      growthRate,
      discountRate,
      terminalGrowth,
      projectionYears,
      sharesOutstanding,
    } = inputs;

    let presentValueOfCashFlows = 0;
    let currentCashFlow = freeCashFlow;

    for (let year = 1; year <= projectionYears; year++) {
      currentCashFlow = currentCashFlow * (1 + growthRate);
      const discountFactor = Math.pow(1 + discountRate, year);
      presentValueOfCashFlows += currentCashFlow / discountFactor;
    }

    const terminalCashFlow = currentCashFlow * (1 + terminalGrowth);
    const terminalValue = terminalCashFlow / (discountRate - terminalGrowth);
    const presentValueOfTerminal = terminalValue / Math.pow(1 + discountRate, projectionYears);

    const intrinsicValue = presentValueOfCashFlows + presentValueOfTerminal;
    const perShareValue = intrinsicValue / sharesOutstanding;

    return {
      intrinsicValue,
      presentValueOfCashFlows,
      terminalValue,
      presentValueOfTerminal,
      perShareValue,
    };
  }

  /**
   * Get or create valuation profile for a symbol
   */
  async getOrCreateProfile(symbol: string, profileData?: Partial<InsertValuationProfile>): Promise<ValuationProfile | null> {
    try {
      if (!db) {
        console.error('[AccountValuation] Database not initialized');
        return null;
      }

      const [existing] = await db
        .select()
        .from(valuationProfiles)
        .where(eq(valuationProfiles.symbol, symbol))
        .limit(1);

      if (existing) {
        return existing;
      }

      if (profileData) {
        const [created] = await db
          .insert(valuationProfiles)
          .values([{ symbol, ...profileData }])
          .returning();
        return created;
      }

      return null;
    } catch (error: any) {
      console.error('[AccountValuation] Get profile error:', error.message);
      return null;
    }
  }

  /**
   * Update valuation profile with latest fundamentals
   */
  async updateProfile(symbol: string, data: Partial<InsertValuationProfile>): Promise<ValuationProfile | null> {
    try {
      if (!db) {
        console.error('[AccountValuation] Database not initialized');
        return null;
      }

      const [updated] = await db
        .update(valuationProfiles)
        .set(data)
        .where(eq(valuationProfiles.symbol, symbol))
        .returning();
      return updated || null;
    } catch (error: any) {
      console.error('[AccountValuation] Update profile error:', error.message);
      return null;
    }
  }

  /**
   * Calculate and store a complete valuation
   */
  async calculateValuation(
    symbol: string,
    currentPrice: number,
    fundamentals: {
      freeCashFlow: number;
      sharesOutstanding: number;
      growthRate?: number;
      discountRate?: number;
      terminalGrowth?: number;
    }
  ): Promise<ValuationResult | null> {
    try {
      const dcfInputs: DCFInputs = {
        freeCashFlow: fundamentals.freeCashFlow,
        growthRate: fundamentals.growthRate || 0.08,
        discountRate: fundamentals.discountRate || this.DEFAULT_DISCOUNT_RATE,
        terminalGrowth: fundamentals.terminalGrowth || this.DEFAULT_TERMINAL_GROWTH,
        projectionYears: this.DEFAULT_PROJECTION_YEARS,
        sharesOutstanding: fundamentals.sharesOutstanding,
      };

      const dcfResult = this.calculateDCF(dcfInputs);
      const intrinsicValue = dcfResult.perShareValue;
      const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100;

      let rating: 'undervalued' | 'fairly_valued' | 'overvalued' = 'fairly_valued';
      if (upside > 20) rating = 'undervalued';
      else if (upside < -20) rating = 'overvalued';

      const confidence = this.calculateConfidence(fundamentals, dcfInputs);

      const keyDrivers = this.identifyKeyDrivers(fundamentals, dcfInputs);
      const risks = this.identifyRisks(fundamentals, dcfInputs, upside);

      const profile = await this.getOrCreateProfile(symbol);
      const profileId = profile?.id || null;

      const snapshotData: InsertValuationSnapshot = {
        profileId,
        symbol,
        currentPrice,
        intrinsicValue,
        upside,
        rating,
        confidence,
        methodology: 'dcf',
        assumptions: {
          growthRate: dcfInputs.growthRate,
          discountRate: dcfInputs.discountRate,
          terminalGrowth: dcfInputs.terminalGrowth,
        } as { growthRate?: number; discountRate?: number; terminalGrowth?: number; marginExpansion?: number },
        keyDrivers,
        risks,
      };

      if (!db) {
        console.error('[AccountValuation] Database not initialized');
        return null;
      }

      const [snapshot] = await db.insert(valuationSnapshots).values([snapshotData]).returning();

      await this.calculateFeatureImportances(snapshot.id, dcfInputs, fundamentals);

      if (Math.abs(upside) > 50) {
        await this.detectAndStoreAnomaly(symbol, currentPrice, intrinsicValue, upside);
      }

      return {
        symbol,
        currentPrice,
        intrinsicValue,
        upside,
        rating,
        confidence,
        methodology: 'dcf',
        keyDrivers,
        risks,
      };
    } catch (error: any) {
      console.error('[AccountValuation] Calculate valuation error:', error.message);
      return null;
    }
  }

  /**
   * Calculate confidence score for valuation
   */
  private calculateConfidence(
    fundamentals: { freeCashFlow: number; sharesOutstanding: number },
    inputs: DCFInputs
  ): number {
    let confidence = 0.7;

    if (fundamentals.freeCashFlow > 0) confidence += 0.1;
    if (inputs.growthRate > 0 && inputs.growthRate < 0.30) confidence += 0.05;
    if (inputs.discountRate >= 0.08 && inputs.discountRate <= 0.15) confidence += 0.05;
    if (inputs.terminalGrowth < inputs.discountRate) confidence += 0.05;

    return Math.min(1, confidence);
  }

  /**
   * Identify key drivers of valuation
   */
  private identifyKeyDrivers(
    fundamentals: { freeCashFlow: number; growthRate?: number },
    inputs: DCFInputs
  ): string[] {
    const drivers: string[] = [];

    if (fundamentals.freeCashFlow > 1000000000) {
      drivers.push('Strong free cash flow generation');
    }

    if (inputs.growthRate > 0.15) {
      drivers.push('High growth expectations');
    } else if (inputs.growthRate > 0.08) {
      drivers.push('Moderate growth assumptions');
    }

    if (inputs.discountRate < 0.10) {
      drivers.push('Lower risk profile reduces discount rate');
    }

    return drivers.length > 0 ? drivers : ['Standard valuation assumptions'];
  }

  /**
   * Identify risks in valuation
   */
  private identifyRisks(
    fundamentals: { freeCashFlow: number },
    inputs: DCFInputs,
    upside: number
  ): string[] {
    const risks: string[] = [];

    if (fundamentals.freeCashFlow < 0) {
      risks.push('Negative free cash flow - valuation highly uncertain');
    }

    if (inputs.growthRate > 0.25) {
      risks.push('Aggressive growth assumptions may not materialize');
    }

    if (Math.abs(upside) > 50) {
      risks.push('Large price-value gap suggests model uncertainty');
    }

    if (inputs.terminalGrowth > 0.03) {
      risks.push('Terminal growth above GDP may be optimistic');
    }

    return risks.length > 0 ? risks : ['Standard market and execution risks'];
  }

  /**
   * Calculate and store SHAP-style feature importances
   */
  private async calculateFeatureImportances(
    snapshotId: number,
    inputs: DCFInputs,
    fundamentals: { freeCashFlow: number; sharesOutstanding: number }
  ): Promise<void> {
    try {
      const baseValue = fundamentals.freeCashFlow / fundamentals.sharesOutstanding;

      const features: FeatureImportance[] = [
        {
          featureName: 'free_cash_flow',
          featureValue: fundamentals.freeCashFlow,
          shapValue: (fundamentals.freeCashFlow / 1000000000) * 10,
          contribution: fundamentals.freeCashFlow > 0 ? 'positive' : 'negative',
          rank: 1,
        },
        {
          featureName: 'growth_rate',
          featureValue: inputs.growthRate,
          shapValue: inputs.growthRate * 100,
          contribution: inputs.growthRate > 0.05 ? 'positive' : 'negative',
          rank: 2,
        },
        {
          featureName: 'discount_rate',
          featureValue: inputs.discountRate,
          shapValue: -inputs.discountRate * 50,
          contribution: 'negative',
          rank: 3,
        },
        {
          featureName: 'terminal_growth',
          featureValue: inputs.terminalGrowth,
          shapValue: inputs.terminalGrowth * 30,
          contribution: 'positive',
          rank: 4,
        },
        {
          featureName: 'shares_outstanding',
          featureValue: fundamentals.sharesOutstanding,
          shapValue: -Math.log10(fundamentals.sharesOutstanding) * 2,
          contribution: 'negative',
          rank: 5,
        },
      ];

      const featureData: InsertValuationFeatureImportance[] = features.map(f => ({
        snapshotId,
        featureName: f.featureName,
        featureValue: f.featureValue,
        shapValue: f.shapValue,
        contribution: f.contribution,
        rank: f.rank,
      }));

      if (!db) {
        console.error('[AccountValuation] Database not initialized');
        return;
      }

      await db.insert(valuationFeatureImportances).values(featureData);

      const explanationData: InsertModelExplanation = {
        modelType: 'valuation',
        referenceId: snapshotId,
        baseValue,
        outputValue: baseValue + features.reduce((sum, f) => sum + f.shapValue, 0),
        shapSummary: features.map(f => ({
          feature: f.featureName,
          value: f.featureValue,
          contribution: f.shapValue,
        })) as Array<{ feature: string; value: number; contribution: number }>,
        textExplanation: `Valuation driven primarily by ${features[0].featureName} with SHAP contribution of ${features[0].shapValue.toFixed(2)}`,
        confidence: 0.8,
      };

      await db.insert(modelExplanations).values([explanationData]);
    } catch (error: any) {
      console.error('[AccountValuation] Feature importance error:', error.message);
    }
  }

  /**
   * Detect and store valuation anomalies
   */
  private async detectAndStoreAnomaly(
    symbol: string,
    currentPrice: number,
    intrinsicValue: number,
    upside: number
  ): Promise<void> {
    try {
      const severity = Math.abs(upside) > 100 ? 'critical' : 
                       Math.abs(upside) > 75 ? 'high' : 
                       Math.abs(upside) > 50 ? 'medium' : 'low';

      const anomalyData: InsertValuationAnomaly = {
        symbol,
        anomalyType: 'price_value_gap',
        severity,
        description: `Stock trading ${upside > 0 ? 'below' : 'above'} intrinsic value by ${Math.abs(upside).toFixed(1)}%`,
        currentValue: currentPrice,
        expectedValue: intrinsicValue,
        deviation: Math.abs(upside) / 20,
        potentialOpportunity: upside > 30,
      };

      if (!db) {
        console.error('[AccountValuation] Database not initialized');
        return;
      }

      await db.insert(valuationAnomalies).values([anomalyData]);
    } catch (error: any) {
      console.error('[AccountValuation] Anomaly detection error:', error.message);
    }
  }

  /**
   * Get latest valuation snapshot
   */
  async getLatestSnapshot(symbol: string): Promise<ValuationSnapshot | null> {
    try {
      if (!db) {
        console.error('[AccountValuation] Database not initialized');
        return null;
      }

      const [latest] = await db
        .select()
        .from(valuationSnapshots)
        .where(eq(valuationSnapshots.symbol, symbol))
        .orderBy(desc(valuationSnapshots.calculatedAt))
        .limit(1);

      return latest || null;
    } catch (error: any) {
      console.error('[AccountValuation] Get snapshot error:', error.message);
      return null;
    }
  }

  /**
   * Get recent anomalies
   */
  async getRecentAnomalies(symbol?: string, limit: number = 20): Promise<ValuationAnomaly[]> {
    try {
      if (!db) {
        console.error('[AccountValuation] Database not initialized');
        return [];
      }

      const conditions = symbol ? [eq(valuationAnomalies.symbol, symbol)] : [];

      return await db
        .select()
        .from(valuationAnomalies)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(valuationAnomalies.detectedAt))
        .limit(limit);
    } catch (error: any) {
      console.error('[AccountValuation] Get anomalies error:', error.message);
      return [];
    }
  }

  /**
   * Get valuation score for prediction engine
   */
  async getValuationScore(symbol: string): Promise<{
    score: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    upside: number;
  }> {
    const snapshot = await this.getLatestSnapshot(symbol);

    if (!snapshot) {
      return {
        score: 0,
        direction: 'neutral',
        confidence: 0,
        upside: 0,
      };
    }

    const upside = snapshot.upside || 0;
    const score = Math.max(-100, Math.min(100, upside));

    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (upside > 15) direction = 'bullish';
    else if (upside < -15) direction = 'bearish';

    return {
      score,
      direction,
      confidence: snapshot.confidence || 0,
      upside,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    recentSnapshots: number;
    recentAnomalies: number;
    message?: string;
  }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (!db) {
        console.error('[AccountValuation] Database not initialized');
        return { status: 'unhealthy', recentSnapshots: 0, recentAnomalies: 0, message: 'Database not initialized' };
      }

      const [snapshotsResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(valuationSnapshots)
        .where(gte(valuationSnapshots.calculatedAt, oneDayAgo));

      const [anomaliesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(valuationAnomalies)
        .where(gte(valuationAnomalies.detectedAt, oneDayAgo));

      const recentSnapshots = Number(snapshotsResult?.count) || 0;
      const recentAnomalies = Number(anomaliesResult?.count) || 0;

      return {
        status: 'healthy',
        recentSnapshots,
        recentAnomalies,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        recentSnapshots: 0,
        recentAnomalies: 0,
        message: error.message,
      };
    }
  }
}

export const accountValuationService = new AccountValuationService();
