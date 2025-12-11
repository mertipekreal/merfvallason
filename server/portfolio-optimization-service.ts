/**
 * Portfolio Optimization Service
 * Implements Markowitz Mean-Variance Optimization, Risk Parity, and Equal Weight strategies
 * for the Merf.ai market prediction platform
 */

import { db } from './db';
import { 
  portfolios, 
  portfolioAssets, 
  portfolioRebalances,
  type Portfolio,
  type InsertPortfolio,
  type PortfolioAsset,
  type InsertPortfolioAsset,
  type PortfolioRebalance,
  type InsertPortfolioRebalance
} from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ============================================================================
// MOCK HISTORICAL PRICE DATA (for demonstration)
// ============================================================================

const MOCK_PRICE_DATA: Record<string, number[]> = {
  SPY: [450, 452, 448, 455, 460, 458, 462, 465, 463, 468, 470, 472, 469, 475, 478, 480, 476, 482, 485, 488, 490, 486, 492, 495, 498, 500, 496, 502, 505, 508],
  QQQ: [380, 385, 378, 390, 395, 388, 398, 402, 396, 408, 412, 415, 408, 420, 425, 422, 430, 435, 428, 440, 445, 438, 450, 455, 448, 460, 458, 465, 470, 475],
  AAPL: [175, 178, 172, 180, 183, 177, 185, 188, 182, 190, 193, 195, 188, 198, 202, 195, 205, 208, 200, 212, 215, 208, 218, 222, 215, 225, 220, 228, 232, 235],
  MSFT: [320, 325, 315, 330, 335, 322, 340, 345, 332, 350, 355, 360, 348, 365, 370, 358, 375, 380, 365, 385, 390, 378, 395, 400, 385, 405, 398, 410, 415, 420],
  NVDA: [450, 465, 440, 480, 495, 460, 510, 530, 490, 550, 570, 585, 540, 600, 620, 580, 640, 660, 610, 680, 700, 650, 720, 740, 690, 760, 730, 780, 800, 820],
  TSLA: [250, 260, 240, 270, 280, 255, 290, 300, 270, 310, 320, 305, 330, 340, 310, 350, 360, 325, 370, 380, 345, 390, 400, 360, 410, 420, 380, 430, 440, 450],
};

const ASSET_EXPECTED_RETURNS: Record<string, number> = {
  SPY: 0.10,   // 10% annual expected return
  QQQ: 0.12,   // 12%
  AAPL: 0.15,  // 15%
  MSFT: 0.14,  // 14%
  NVDA: 0.25,  // 25%
  TSLA: 0.20,  // 20%
};

const RISK_FREE_RATE = 0.045; // 4.5% annual risk-free rate

// ============================================================================
// CORE MATH FUNCTIONS
// ============================================================================

/**
 * Calculate log returns from price series
 */
export function calculateReturns(prices: number[]): number[] {
  if (prices.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  return returns;
}

/**
 * Calculate mean of an array
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate covariance between two return series
 */
export function calculateCovariance(returns1: number[], returns2: number[]): number {
  if (returns1.length !== returns2.length || returns1.length < 2) return 0;
  const mean1 = calculateMean(returns1);
  const mean2 = calculateMean(returns2);
  let sum = 0;
  for (let i = 0; i < returns1.length; i++) {
    sum += (returns1[i] - mean1) * (returns2[i] - mean2);
  }
  return sum / (returns1.length - 1);
}

/**
 * Build full covariance matrix from multiple asset returns
 */
export function buildCovarianceMatrix(assetReturns: number[][]): number[][] {
  const n = assetReturns.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      matrix[i][j] = calculateCovariance(assetReturns[i], assetReturns[j]);
    }
  }
  return matrix;
}

/**
 * Calculate portfolio expected return
 */
export function calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
  if (weights.length !== expectedReturns.length) return 0;
  return weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
}

/**
 * Calculate portfolio volatility (standard deviation)
 */
export function calculatePortfolioVolatility(weights: number[], covMatrix: number[][]): number {
  if (weights.length !== covMatrix.length) return 0;
  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance += weights[i] * weights[j] * covMatrix[i][j];
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Calculate Sharpe Ratio
 */
export function calculateSharpeRatio(portfolioReturn: number, volatility: number, riskFreeRate: number = RISK_FREE_RATE): number {
  if (volatility <= 0) return 0;
  return (portfolioReturn - riskFreeRate) / volatility;
}

/**
 * Annualize daily returns (assuming 252 trading days)
 */
export function annualizeReturn(dailyReturn: number): number {
  return dailyReturn * 252;
}

/**
 * Annualize daily volatility
 */
export function annualizeVolatility(dailyVol: number): number {
  return dailyVol * Math.sqrt(252);
}

// ============================================================================
// OPTIMIZATION STRATEGIES
// ============================================================================

export interface AssetData {
  symbol: string;
  expectedReturn: number;
  volatility: number;
  returns?: number[];
}

export interface OptimizationResult {
  weights: Record<string, number>;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

/**
 * Markowitz Mean-Variance Optimization
 * Maximizes Sharpe ratio using iterative search
 */
export function markowitzOptimize(assets: AssetData[], riskFreeRate: number = RISK_FREE_RATE): OptimizationResult {
  const n = assets.length;
  if (n === 0) {
    return { weights: {}, expectedReturn: 0, volatility: 0, sharpeRatio: 0 };
  }
  
  // Get returns for covariance calculation
  const assetReturns = assets.map(a => a.returns || calculateReturns(MOCK_PRICE_DATA[a.symbol] || []));
  const covMatrix = buildCovarianceMatrix(assetReturns);
  const expectedReturns = assets.map(a => a.expectedReturn);
  
  // Annualize covariance matrix (multiply by 252)
  const annualizedCovMatrix = covMatrix.map(row => row.map(val => val * 252));
  
  // Grid search for optimal weights (simple implementation)
  let bestSharpe = -Infinity;
  let bestWeights: number[] = Array(n).fill(1 / n);
  
  const step = 0.05;
  const iterations = Math.pow(Math.floor(1 / step) + 1, Math.min(n, 4));
  
  // For simplicity, use random sampling with constraints
  for (let iter = 0; iter < Math.min(iterations, 10000); iter++) {
    // Generate random weights that sum to 1
    const rawWeights = Array(n).fill(0).map(() => Math.random());
    const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
    const weights = rawWeights.map(w => w / sumWeights);
    
    const portReturn = calculatePortfolioReturn(weights, expectedReturns);
    const portVol = calculatePortfolioVolatility(weights, annualizedCovMatrix);
    const sharpe = calculateSharpeRatio(portReturn, portVol, riskFreeRate);
    
    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = [...weights];
    }
  }
  
  // Local optimization around best found weights
  for (let refine = 0; refine < 1000; refine++) {
    const perturbation = Array(n).fill(0).map(() => (Math.random() - 0.5) * 0.02);
    const newWeights = bestWeights.map((w, i) => Math.max(0, w + perturbation[i]));
    const sumWeights = newWeights.reduce((a, b) => a + b, 0);
    const normalizedWeights = newWeights.map(w => w / sumWeights);
    
    const portReturn = calculatePortfolioReturn(normalizedWeights, expectedReturns);
    const portVol = calculatePortfolioVolatility(normalizedWeights, annualizedCovMatrix);
    const sharpe = calculateSharpeRatio(portReturn, portVol, riskFreeRate);
    
    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = [...normalizedWeights];
    }
  }
  
  const finalReturn = calculatePortfolioReturn(bestWeights, expectedReturns);
  const finalVol = calculatePortfolioVolatility(bestWeights, annualizedCovMatrix);
  
  const weightsRecord: Record<string, number> = {};
  assets.forEach((asset, i) => {
    weightsRecord[asset.symbol] = Math.round(bestWeights[i] * 10000) / 10000;
  });
  
  return {
    weights: weightsRecord,
    expectedReturn: Math.round(finalReturn * 10000) / 10000,
    volatility: Math.round(finalVol * 10000) / 10000,
    sharpeRatio: Math.round(bestSharpe * 1000) / 1000
  };
}

/**
 * Risk Parity Optimization
 * Each asset contributes equally to portfolio risk
 */
export function riskParityOptimize(assets: AssetData[]): OptimizationResult {
  const n = assets.length;
  if (n === 0) {
    return { weights: {}, expectedReturn: 0, volatility: 0, sharpeRatio: 0 };
  }
  
  const assetReturns = assets.map(a => a.returns || calculateReturns(MOCK_PRICE_DATA[a.symbol] || []));
  const covMatrix = buildCovarianceMatrix(assetReturns);
  const annualizedCovMatrix = covMatrix.map(row => row.map(val => val * 252));
  const expectedReturns = assets.map(a => a.expectedReturn);
  
  // Start with inverse volatility weights
  const vols = assets.map(a => a.volatility || 0.2);
  let weights = vols.map(v => 1 / (v || 0.2));
  let sumWeights = weights.reduce((a, b) => a + b, 0);
  weights = weights.map(w => w / sumWeights);
  
  // Iteratively adjust for equal risk contribution
  for (let iter = 0; iter < 100; iter++) {
    const portVol = calculatePortfolioVolatility(weights, annualizedCovMatrix);
    if (portVol === 0) break;
    
    // Calculate marginal risk contributions
    const marginalRC: number[] = [];
    for (let i = 0; i < n; i++) {
      let mc = 0;
      for (let j = 0; j < n; j++) {
        mc += weights[j] * annualizedCovMatrix[i][j];
      }
      marginalRC.push(mc / portVol);
    }
    
    // Risk contribution of each asset
    const riskContributions = weights.map((w, i) => w * marginalRC[i]);
    const targetRC = portVol / n; // Equal risk contribution target
    
    // Adjust weights
    const newWeights = weights.map((w, i) => {
      if (marginalRC[i] === 0) return w;
      return w * Math.pow(targetRC / (riskContributions[i] || targetRC), 0.5);
    });
    
    sumWeights = newWeights.reduce((a, b) => a + b, 0);
    weights = newWeights.map(w => Math.max(0.01, w / sumWeights));
    
    // Normalize again
    sumWeights = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sumWeights);
  }
  
  const finalReturn = calculatePortfolioReturn(weights, expectedReturns);
  const finalVol = calculatePortfolioVolatility(weights, annualizedCovMatrix);
  const sharpe = calculateSharpeRatio(finalReturn, finalVol);
  
  const weightsRecord: Record<string, number> = {};
  assets.forEach((asset, i) => {
    weightsRecord[asset.symbol] = Math.round(weights[i] * 10000) / 10000;
  });
  
  return {
    weights: weightsRecord,
    expectedReturn: Math.round(finalReturn * 10000) / 10000,
    volatility: Math.round(finalVol * 10000) / 10000,
    sharpeRatio: Math.round(sharpe * 1000) / 1000
  };
}

/**
 * Equal Weight Optimization
 * Simple 1/n allocation
 */
export function equalWeightOptimize(assets: AssetData[]): OptimizationResult {
  const n = assets.length;
  if (n === 0) {
    return { weights: {}, expectedReturn: 0, volatility: 0, sharpeRatio: 0 };
  }
  
  const weights = Array(n).fill(1 / n);
  const assetReturns = assets.map(a => a.returns || calculateReturns(MOCK_PRICE_DATA[a.symbol] || []));
  const covMatrix = buildCovarianceMatrix(assetReturns);
  const annualizedCovMatrix = covMatrix.map(row => row.map(val => val * 252));
  const expectedReturns = assets.map(a => a.expectedReturn);
  
  const portReturn = calculatePortfolioReturn(weights, expectedReturns);
  const portVol = calculatePortfolioVolatility(weights, annualizedCovMatrix);
  const sharpe = calculateSharpeRatio(portReturn, portVol);
  
  const weightsRecord: Record<string, number> = {};
  assets.forEach((asset) => {
    weightsRecord[asset.symbol] = Math.round((1 / n) * 10000) / 10000;
  });
  
  return {
    weights: weightsRecord,
    expectedReturn: Math.round(portReturn * 10000) / 10000,
    volatility: Math.round(portVol * 10000) / 10000,
    sharpeRatio: Math.round(sharpe * 1000) / 1000
  };
}

// ============================================================================
// EFFICIENT FRONTIER
// ============================================================================

export interface EfficientFrontierPoint {
  return: number;
  volatility: number;
  sharpeRatio: number;
  weights: Record<string, number>;
}

/**
 * Generate efficient frontier points
 */
export function generateEfficientFrontier(assets: AssetData[], points: number = 20): EfficientFrontierPoint[] {
  const n = assets.length;
  if (n === 0) return [];
  
  const assetReturns = assets.map(a => a.returns || calculateReturns(MOCK_PRICE_DATA[a.symbol] || []));
  const covMatrix = buildCovarianceMatrix(assetReturns);
  const annualizedCovMatrix = covMatrix.map(row => row.map(val => val * 252));
  const expectedReturns = assets.map(a => a.expectedReturn);
  
  const frontier: EfficientFrontierPoint[] = [];
  
  // Find min and max possible returns
  const minReturn = Math.min(...expectedReturns);
  const maxReturn = Math.max(...expectedReturns);
  
  // Generate points along the frontier
  for (let i = 0; i < points; i++) {
    const targetReturn = minReturn + (i / (points - 1)) * (maxReturn - minReturn);
    
    // Find minimum variance portfolio for this target return
    let bestVol = Infinity;
    let bestWeights: number[] = [];
    
    // Random sampling to find portfolio
    for (let iter = 0; iter < 5000; iter++) {
      const rawWeights = Array(n).fill(0).map(() => Math.random());
      const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
      const weights = rawWeights.map(w => w / sumWeights);
      
      const portReturn = calculatePortfolioReturn(weights, expectedReturns);
      
      // Only consider if close to target return
      if (Math.abs(portReturn - targetReturn) < 0.01) {
        const portVol = calculatePortfolioVolatility(weights, annualizedCovMatrix);
        if (portVol < bestVol) {
          bestVol = portVol;
          bestWeights = [...weights];
        }
      }
    }
    
    if (bestWeights.length > 0) {
      const actualReturn = calculatePortfolioReturn(bestWeights, expectedReturns);
      const weightsRecord: Record<string, number> = {};
      assets.forEach((asset, idx) => {
        weightsRecord[asset.symbol] = Math.round(bestWeights[idx] * 10000) / 10000;
      });
      
      frontier.push({
        return: Math.round(actualReturn * 10000) / 10000,
        volatility: Math.round(bestVol * 10000) / 10000,
        sharpeRatio: Math.round(calculateSharpeRatio(actualReturn, bestVol) * 1000) / 1000,
        weights: weightsRecord
      });
    }
  }
  
  // Sort by volatility
  frontier.sort((a, b) => a.volatility - b.volatility);
  
  return frontier;
}

// ============================================================================
// PORTFOLIO MANAGEMENT
// ============================================================================

/**
 * Create a new portfolio
 */
export async function createPortfolio(data: InsertPortfolio): Promise<Portfolio> {
  const database = getDb();
  const id = uuidv4();
  
  const [portfolio] = await database.insert(portfolios).values({
    id,
    ...data,
    currentValue: data.initialCapital,
  }).returning();
  
  return portfolio;
}

/**
 * Get portfolio by ID
 */
export async function getPortfolio(id: string): Promise<Portfolio | null> {
  const database = getDb();
  const [portfolio] = await database.select().from(portfolios).where(eq(portfolios.id, id));
  return portfolio || null;
}

/**
 * Get all portfolios for a user
 */
export async function getUserPortfolios(userId?: string): Promise<Portfolio[]> {
  const database = getDb();
  if (userId) {
    return database.select().from(portfolios).where(eq(portfolios.userId, userId));
  }
  return database.select().from(portfolios);
}

/**
 * Update portfolio
 */
export async function updatePortfolio(id: string, updates: Partial<InsertPortfolio>): Promise<Portfolio | null> {
  const database = getDb();
  const [updated] = await database.update(portfolios)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(portfolios.id, id))
    .returning();
  return updated || null;
}

/**
 * Delete portfolio
 */
export async function deletePortfolio(id: string): Promise<boolean> {
  const database = getDb();
  await database.delete(portfolioAssets).where(eq(portfolioAssets.portfolioId, id));
  await database.delete(portfolioRebalances).where(eq(portfolioRebalances.portfolioId, id));
  const result = await database.delete(portfolios).where(eq(portfolios.id, id));
  return true;
}

/**
 * Add asset to portfolio
 */
export async function addAssetToPortfolio(
  portfolioId: string, 
  symbol: string, 
  allocation: { shares?: number; weight?: number; costBasis?: number }
): Promise<PortfolioAsset> {
  const database = getDb();
  const id = uuidv4();
  
  // Get expected return and volatility from mock data
  const prices = MOCK_PRICE_DATA[symbol] || [];
  const returns = calculateReturns(prices);
  const volatility = annualizeVolatility(calculateStdDev(returns));
  const expectedReturn = ASSET_EXPECTED_RETURNS[symbol] || 0.10;
  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 100;
  
  const [asset] = await database.insert(portfolioAssets).values({
    id,
    portfolioId,
    symbol: symbol.toUpperCase(),
    shares: allocation.shares || 0,
    weight: allocation.weight || 0,
    costBasis: allocation.costBasis,
    currentPrice,
    expectedReturn,
    volatility,
  }).returning();
  
  return asset;
}

/**
 * Get portfolio assets
 */
export async function getPortfolioAssets(portfolioId: string): Promise<PortfolioAsset[]> {
  const database = getDb();
  return database.select().from(portfolioAssets).where(eq(portfolioAssets.portfolioId, portfolioId));
}

/**
 * Update portfolio asset
 */
export async function updatePortfolioAsset(
  assetId: string, 
  updates: Partial<InsertPortfolioAsset>
): Promise<PortfolioAsset | null> {
  const database = getDb();
  const [updated] = await database.update(portfolioAssets)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(portfolioAssets.id, assetId))
    .returning();
  return updated || null;
}

/**
 * Delete portfolio asset
 */
export async function deletePortfolioAsset(assetId: string): Promise<boolean> {
  const database = getDb();
  await database.delete(portfolioAssets).where(eq(portfolioAssets.id, assetId));
  return true;
}

/**
 * Optimize portfolio
 */
export async function optimizePortfolio(
  portfolioId: string, 
  strategy: 'markowitz' | 'risk_parity' | 'equal_weight' = 'markowitz'
): Promise<OptimizationResult> {
  const assets = await getPortfolioAssets(portfolioId);
  
  if (assets.length === 0) {
    throw new Error('Portfolio has no assets');
  }
  
  const assetData: AssetData[] = assets.map(a => ({
    symbol: a.symbol,
    expectedReturn: a.expectedReturn || ASSET_EXPECTED_RETURNS[a.symbol] || 0.10,
    volatility: a.volatility || 0.20,
    returns: calculateReturns(MOCK_PRICE_DATA[a.symbol] || [])
  }));
  
  let result: OptimizationResult;
  
  switch (strategy) {
    case 'markowitz':
      result = markowitzOptimize(assetData);
      break;
    case 'risk_parity':
      result = riskParityOptimize(assetData);
      break;
    case 'equal_weight':
      result = equalWeightOptimize(assetData);
      break;
    default:
      result = markowitzOptimize(assetData);
  }
  
  // Update asset weights in database
  const database = getDb();
  for (const asset of assets) {
    const newWeight = result.weights[asset.symbol] || 0;
    await database.update(portfolioAssets)
      .set({ weight: newWeight, updatedAt: new Date() })
      .where(eq(portfolioAssets.id, asset.id));
  }
  
  // Update portfolio performance
  await database.update(portfolios)
    .set({
      optimizationType: strategy,
      performance: {
        totalReturn: 0,
        annualizedReturn: result.expectedReturn,
        sharpeRatio: result.sharpeRatio,
        maxDrawdown: 0,
        volatility: result.volatility
      },
      updatedAt: new Date()
    })
    .where(eq(portfolios.id, portfolioId));
  
  return result;
}

/**
 * Calculate rebalance trades
 */
export async function calculateRebalanceTrades(portfolioId: string): Promise<{
  symbol: string;
  action: 'buy' | 'sell';
  shares: number;
  value: number;
}[]> {
  const database = getDb();
  const [portfolio] = await database.select().from(portfolios).where(eq(portfolios.id, portfolioId));
  if (!portfolio) throw new Error('Portfolio not found');
  
  const assets = await getPortfolioAssets(portfolioId);
  const totalValue = portfolio.currentValue || portfolio.initialCapital;
  
  const trades: { symbol: string; action: 'buy' | 'sell'; shares: number; value: number }[] = [];
  
  for (const asset of assets) {
    const targetValue = totalValue * (asset.weight || 0);
    const currentValue = (asset.shares || 0) * (asset.currentPrice || 100);
    const difference = targetValue - currentValue;
    
    if (Math.abs(difference) > 10) { // Minimum trade threshold
      const shares = Math.abs(difference / (asset.currentPrice || 100));
      trades.push({
        symbol: asset.symbol,
        action: difference > 0 ? 'buy' : 'sell',
        shares: Math.round(shares * 100) / 100,
        value: Math.round(Math.abs(difference) * 100) / 100
      });
    }
  }
  
  return trades;
}

/**
 * Execute rebalance and record in history
 */
export async function executeRebalance(
  portfolioId: string, 
  strategy: 'markowitz' | 'risk_parity' | 'equal_weight' = 'markowitz',
  reason?: string
): Promise<PortfolioRebalance> {
  const database = getDb();
  
  // Get current weights
  const assets = await getPortfolioAssets(portfolioId);
  const previousWeights: Record<string, number> = {};
  assets.forEach(a => {
    previousWeights[a.symbol] = a.weight || 0;
  });
  
  // Run optimization
  const optimizationResult = await optimizePortfolio(portfolioId, strategy);
  
  // Calculate trades
  const trades = await calculateRebalanceTrades(portfolioId);
  
  // Record rebalance
  const id = uuidv4();
  const [rebalance] = await database.insert(portfolioRebalances).values({
    id,
    portfolioId,
    rebalanceDate: new Date(),
    strategy,
    previousWeights,
    newWeights: optimizationResult.weights,
    trades,
    performanceSnapshot: {
      sharpeRatio: optimizationResult.sharpeRatio,
      volatility: optimizationResult.volatility,
      expectedReturn: optimizationResult.expectedReturn
    },
    reason
  }).returning();
  
  // Update portfolio last rebalanced date
  await database.update(portfolios)
    .set({ lastRebalanced: new Date(), updatedAt: new Date() })
    .where(eq(portfolios.id, portfolioId));
  
  return rebalance;
}

/**
 * Get rebalance history
 */
export async function getRebalanceHistory(portfolioId: string, limit: number = 50): Promise<PortfolioRebalance[]> {
  const database = getDb();
  return database.select()
    .from(portfolioRebalances)
    .where(eq(portfolioRebalances.portfolioId, portfolioId))
    .orderBy(desc(portfolioRebalances.rebalanceDate))
    .limit(limit);
}

/**
 * Get efficient frontier for portfolio assets
 */
export async function getPortfolioEfficientFrontier(portfolioId: string, points: number = 20): Promise<EfficientFrontierPoint[]> {
  const assets = await getPortfolioAssets(portfolioId);
  
  if (assets.length === 0) {
    return [];
  }
  
  const assetData: AssetData[] = assets.map(a => ({
    symbol: a.symbol,
    expectedReturn: a.expectedReturn || ASSET_EXPECTED_RETURNS[a.symbol] || 0.10,
    volatility: a.volatility || 0.20,
    returns: calculateReturns(MOCK_PRICE_DATA[a.symbol] || [])
  }));
  
  return generateEfficientFrontier(assetData, points);
}

// Export service singleton
export const portfolioOptimizationService = {
  calculateReturns,
  calculateMean,
  calculateStdDev,
  calculateCovariance,
  buildCovarianceMatrix,
  calculatePortfolioReturn,
  calculatePortfolioVolatility,
  calculateSharpeRatio,
  markowitzOptimize,
  riskParityOptimize,
  equalWeightOptimize,
  generateEfficientFrontier,
  createPortfolio,
  getPortfolio,
  getUserPortfolios,
  updatePortfolio,
  deletePortfolio,
  addAssetToPortfolio,
  getPortfolioAssets,
  updatePortfolioAsset,
  deletePortfolioAsset,
  optimizePortfolio,
  calculateRebalanceTrades,
  executeRebalance,
  getRebalanceHistory,
  getPortfolioEfficientFrontier,
  MOCK_PRICE_DATA,
  ASSET_EXPECTED_RETURNS,
  RISK_FREE_RATE
};
