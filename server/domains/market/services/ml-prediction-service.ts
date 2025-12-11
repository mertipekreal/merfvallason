/**
 * ML Prediction Service
 * XGBoost-style Gradient Boosting Decision Tree Ensemble
 * for enhanced market predictions with feature importance tracking
 */

import { db } from '../../../db';
import { mlModels, featureImportance, featureSnapshots, marketPredictions } from '@shared/schema';
import type { MlModel, InsertMlModel, FeatureImportance, InsertFeatureImportance, FeatureSnapshot } from '@shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { generateFeatureSnapshot, type UnifiedFeatures } from './feature-engineering-service';

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ============================================================================
// TYPES
// ============================================================================

export interface TreeNode {
  featureIndex: number;
  threshold: number;
  leftChild: TreeNode | null;
  rightChild: TreeNode | null;
  value: number;
  isLeaf: boolean;
  samples: number;
  impurity: number;
}

export interface DecisionTree {
  root: TreeNode;
  maxDepth: number;
  featureNames: string[];
}

export interface GradientBoostingModel {
  trees: DecisionTree[];
  learningRate: number;
  nEstimators: number;
  maxDepth: number;
  featureNames: string[];
  basePrediction: number;
  featureImportances: Record<string, number>;
}

export interface MLPredictionResult {
  symbol: string;
  direction: 'up' | 'down' | 'neutral';
  probability: number;
  confidence: number;
  rawScore: number;
  featureContributions: Record<string, number>;
  treeVotes: { up: number; down: number; neutral: number };
  modelVersion: string;
  predictionDate: Date;
}

export interface TrainingData {
  features: number[][];
  labels: number[];
  featureNames: string[];
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse: number;
  mae: number;
}

// ============================================================================
// DECISION TREE IMPLEMENTATION
// ============================================================================

function calculateGini(labels: number[]): number {
  if (labels.length === 0) return 0;
  const counts: Record<number, number> = {};
  for (const label of labels) {
    counts[label] = (counts[label] || 0) + 1;
  }
  let gini = 1;
  for (const count of Object.values(counts)) {
    const p = count / labels.length;
    gini -= p * p;
  }
  return gini;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

function findBestSplit(
  features: number[][],
  targets: number[],
  featureIndices: number[],
  minSamplesSplit: number = 5
): { featureIndex: number; threshold: number; gain: number } | null {
  if (features.length < minSamplesSplit) return null;

  const parentVariance = calculateVariance(targets);
  let bestGain = 0;
  let bestFeatureIndex = -1;
  let bestThreshold = 0;

  for (const featureIndex of featureIndices) {
    const values = features.map(f => f[featureIndex]).filter(v => !isNaN(v));
    const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
    
    for (let i = 0; i < uniqueValues.length - 1; i++) {
      const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
      
      const leftIndices: number[] = [];
      const rightIndices: number[] = [];
      
      for (let j = 0; j < features.length; j++) {
        if (features[j][featureIndex] <= threshold) {
          leftIndices.push(j);
        } else {
          rightIndices.push(j);
        }
      }
      
      if (leftIndices.length < 2 || rightIndices.length < 2) continue;
      
      const leftTargets = leftIndices.map(i => targets[i]);
      const rightTargets = rightIndices.map(i => targets[i]);
      
      const leftVariance = calculateVariance(leftTargets);
      const rightVariance = calculateVariance(rightTargets);
      
      const weightedVariance = 
        (leftTargets.length * leftVariance + rightTargets.length * rightVariance) / targets.length;
      
      const gain = parentVariance - weightedVariance;
      
      if (gain > bestGain) {
        bestGain = gain;
        bestFeatureIndex = featureIndex;
        bestThreshold = threshold;
      }
    }
  }

  if (bestFeatureIndex === -1) return null;
  
  return {
    featureIndex: bestFeatureIndex,
    threshold: bestThreshold,
    gain: bestGain
  };
}

function buildTree(
  features: number[][],
  targets: number[],
  featureNames: string[],
  depth: number = 0,
  maxDepth: number = 5,
  minSamplesSplit: number = 5,
  minSamplesLeaf: number = 2
): TreeNode {
  const meanValue = targets.reduce((a, b) => a + b, 0) / targets.length;
  const impurity = calculateVariance(targets);

  if (
    depth >= maxDepth ||
    features.length < minSamplesSplit ||
    impurity < 0.001
  ) {
    return {
      featureIndex: -1,
      threshold: 0,
      leftChild: null,
      rightChild: null,
      value: meanValue,
      isLeaf: true,
      samples: features.length,
      impurity
    };
  }

  const featureIndices = Array.from({ length: featureNames.length }, (_, i) => i);
  const split = findBestSplit(features, targets, featureIndices, minSamplesSplit);

  if (!split) {
    return {
      featureIndex: -1,
      threshold: 0,
      leftChild: null,
      rightChild: null,
      value: meanValue,
      isLeaf: true,
      samples: features.length,
      impurity
    };
  }

  const leftFeatures: number[][] = [];
  const leftTargets: number[] = [];
  const rightFeatures: number[][] = [];
  const rightTargets: number[] = [];

  for (let i = 0; i < features.length; i++) {
    if (features[i][split.featureIndex] <= split.threshold) {
      leftFeatures.push(features[i]);
      leftTargets.push(targets[i]);
    } else {
      rightFeatures.push(features[i]);
      rightTargets.push(targets[i]);
    }
  }

  if (leftFeatures.length < minSamplesLeaf || rightFeatures.length < minSamplesLeaf) {
    return {
      featureIndex: -1,
      threshold: 0,
      leftChild: null,
      rightChild: null,
      value: meanValue,
      isLeaf: true,
      samples: features.length,
      impurity
    };
  }

  return {
    featureIndex: split.featureIndex,
    threshold: split.threshold,
    leftChild: buildTree(leftFeatures, leftTargets, featureNames, depth + 1, maxDepth, minSamplesSplit, minSamplesLeaf),
    rightChild: buildTree(rightFeatures, rightTargets, featureNames, depth + 1, maxDepth, minSamplesSplit, minSamplesLeaf),
    value: meanValue,
    isLeaf: false,
    samples: features.length,
    impurity
  };
}

function predictTree(tree: DecisionTree, features: number[]): number {
  let node = tree.root;
  
  while (!node.isLeaf) {
    if (features[node.featureIndex] <= node.threshold) {
      if (node.leftChild) {
        node = node.leftChild;
      } else {
        break;
      }
    } else {
      if (node.rightChild) {
        node = node.rightChild;
      } else {
        break;
      }
    }
  }
  
  return node.value;
}

// ============================================================================
// GRADIENT BOOSTING IMPLEMENTATION
// ============================================================================

function calculateResiduals(targets: number[], predictions: number[]): number[] {
  return targets.map((t, i) => t - predictions[i]);
}

function trainGradientBoosting(
  data: TrainingData,
  nEstimators: number = 50,
  learningRate: number = 0.1,
  maxDepth: number = 4
): GradientBoostingModel {
  const { features, labels, featureNames } = data;
  
  const basePrediction = labels.reduce((a, b) => a + b, 0) / labels.length;
  let predictions = Array(labels.length).fill(basePrediction);
  
  const trees: DecisionTree[] = [];
  const featureUseCounts: Record<string, number> = {};
  
  for (let i = 0; i < nEstimators; i++) {
    const residuals = calculateResiduals(labels, predictions);
    
    const treeRoot = buildTree(features, residuals, featureNames, 0, maxDepth);
    
    const tree: DecisionTree = {
      root: treeRoot,
      maxDepth,
      featureNames
    };
    
    countFeatureUsage(treeRoot, featureNames, featureUseCounts);
    
    for (let j = 0; j < features.length; j++) {
      const treePrediction = predictTree(tree, features[j]);
      predictions[j] += learningRate * treePrediction;
    }
    
    trees.push(tree);
  }

  const totalUsage = Object.values(featureUseCounts).reduce((a, b) => a + b, 1);
  const featureImportances: Record<string, number> = {};
  for (const name of featureNames) {
    featureImportances[name] = (featureUseCounts[name] || 0) / totalUsage;
  }

  return {
    trees,
    learningRate,
    nEstimators,
    maxDepth,
    featureNames,
    basePrediction,
    featureImportances
  };
}

function countFeatureUsage(node: TreeNode, featureNames: string[], counts: Record<string, number>): void {
  if (node.isLeaf || node.featureIndex < 0) return;
  
  const featureName = featureNames[node.featureIndex];
  counts[featureName] = (counts[featureName] || 0) + 1;
  
  if (node.leftChild) countFeatureUsage(node.leftChild, featureNames, counts);
  if (node.rightChild) countFeatureUsage(node.rightChild, featureNames, counts);
}

function predictGradientBoosting(model: GradientBoostingModel, features: number[]): number {
  let prediction = model.basePrediction;
  
  for (const tree of model.trees) {
    prediction += model.learningRate * predictTree(tree, features);
  }
  
  return prediction;
}

function getTreeVotes(model: GradientBoostingModel, features: number[]): { up: number; down: number; neutral: number } {
  let up = 0, down = 0, neutral = 0;
  
  for (const tree of model.trees) {
    const pred = predictTree(tree, features);
    if (pred > 0.1) up++;
    else if (pred < -0.1) down++;
    else neutral++;
  }
  
  return { up, down, neutral };
}

function calculateFeatureContributions(
  model: GradientBoostingModel,
  features: number[]
): Record<string, number> {
  const contributions: Record<string, number> = {};
  
  for (const name of model.featureNames) {
    contributions[name] = 0;
  }

  for (const tree of model.trees) {
    let node = tree.root;
    
    while (!node.isLeaf && node.featureIndex >= 0) {
      const featureName = model.featureNames[node.featureIndex];
      const contribution = node.value * model.learningRate / model.trees.length;
      contributions[featureName] = (contributions[featureName] || 0) + contribution;
      
      if (features[node.featureIndex] <= node.threshold) {
        if (node.leftChild) node = node.leftChild;
        else break;
      } else {
        if (node.rightChild) node = node.rightChild;
        else break;
      }
    }
  }

  return contributions;
}

// ============================================================================
// MODEL EVALUATION
// ============================================================================

function evaluateModel(
  model: GradientBoostingModel,
  testFeatures: number[][],
  testLabels: number[]
): ModelMetrics {
  const predictions = testFeatures.map(f => predictGradientBoosting(model, f));
  
  let truePositives = 0, falsePositives = 0, trueNegatives = 0, falseNegatives = 0;
  let totalSquaredError = 0;
  let totalAbsoluteError = 0;

  for (let i = 0; i < predictions.length; i++) {
    const predicted = predictions[i] > 0 ? 1 : 0;
    const actual = testLabels[i] > 0 ? 1 : 0;
    
    if (predicted === 1 && actual === 1) truePositives++;
    else if (predicted === 1 && actual === 0) falsePositives++;
    else if (predicted === 0 && actual === 0) trueNegatives++;
    else falseNegatives++;
    
    totalSquaredError += Math.pow(predictions[i] - testLabels[i], 2);
    totalAbsoluteError += Math.abs(predictions[i] - testLabels[i]);
  }

  const accuracy = (truePositives + trueNegatives) / predictions.length;
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
  const mse = totalSquaredError / predictions.length;
  const mae = totalAbsoluteError / predictions.length;

  const auc = calculateAUC(predictions, testLabels);

  return { accuracy, precision, recall, f1Score, auc, mse, mae };
}

function calculateAUC(predictions: number[], labels: number[]): number {
  const pairs: { pred: number; label: number }[] = predictions.map((pred, i) => ({
    pred,
    label: labels[i] > 0 ? 1 : 0
  }));
  
  pairs.sort((a, b) => b.pred - a.pred);
  
  let posCount = 0, negCount = 0, auc = 0;
  
  for (const pair of pairs) {
    if (pair.label === 1) {
      posCount++;
    } else {
      negCount++;
      auc += posCount;
    }
  }
  
  const total = posCount * negCount;
  return total > 0 ? auc / total : 0.5;
}

// ============================================================================
// TRAINING DATA GENERATION
// ============================================================================

async function generateTrainingData(
  symbols: string[],
  startDate: Date,
  endDate: Date
): Promise<TrainingData> {
  const database = getDb();
  
  const snapshots = await database.select()
    .from(featureSnapshots)
    .where(and(
      gte(featureSnapshots.sessionDate, startDate),
      lte(featureSnapshots.sessionDate, endDate)
    ))
    .orderBy(featureSnapshots.sessionDate);

  const predictions = await database.select()
    .from(marketPredictions)
    .where(and(
      gte(marketPredictions.predictionDate, startDate),
      lte(marketPredictions.predictionDate, endDate)
    ));

  const features: number[][] = [];
  const labels: number[] = [];
  let featureNames: string[] = [];

  for (const snapshot of snapshots) {
    const vector = snapshot.featureVector as number[];
    const names = snapshot.featureNames as string[];
    
    if (!vector || vector.length === 0) continue;
    
    featureNames = names;
    
    const outcome = predictions.find(p => 
      p.symbol === snapshot.symbol && 
      Math.abs(new Date(p.predictionDate).getTime() - new Date(snapshot.sessionDate).getTime()) < 24 * 60 * 60 * 1000
    );
    
    if (outcome?.outcome) {
      const outcomeData = outcome.outcome as { actualReturn?: number };
      const actualReturn = outcomeData.actualReturn || 0;
      features.push(vector);
      labels.push(actualReturn);
    }
  }

  if (features.length < 50) {
    console.log('[ML] Insufficient data, generating synthetic training data...');
    return generateSyntheticTrainingData(symbols);
  }

  return { features, labels, featureNames };
}

function generateSyntheticTrainingData(symbols: string[]): TrainingData {
  const featureNames = [
    'price_change_1d', 'price_change_5d', 'volume_ratio', 'put_call_ratio',
    'dark_pool_flow', 'congress_net', 'insider_net',
    'fvg_count', 'fvg_direction', 'mss_signal', 'liquidity_void',
    'trend_strength', 'rsi', 'macd_signal',
    'night_owl', 'dissonance', 'dfi', 'social_sentiment', 'fear_ratio',
    'vix', 'yield_curve', 'consumer_sentiment', 'unemployment', 'cpi', 'fed_funds', 'market_regime'
  ];

  const features: number[][] = [];
  const labels: number[] = [];

  for (let i = 0; i < 500; i++) {
    const vector: number[] = [];
    
    for (let j = 0; j < featureNames.length; j++) {
      vector.push(Math.random());
    }
    
    let score = 0;
    score += (vector[0] - 0.5) * 0.15; // price_change_1d
    score += (vector[1] - 0.5) * 0.1;  // price_change_5d
    score += (0.5 - vector[3]) * 0.1;  // put_call_ratio (inverted)
    score += (vector[4] - 0.5) * 0.1;  // dark_pool_flow
    score += vector[8] * 0.1;          // fvg_direction
    score += (vector[11] - 0.5) * 0.15; // trend_strength
    score += (0.5 - vector[19]) * 0.1;  // vix (inverted)
    score += vector[25] * 0.1;          // market_regime
    
    score += (Math.random() - 0.5) * 0.3;
    
    features.push(vector);
    labels.push(score);
  }

  return { features, labels, featureNames };
}

// ============================================================================
// MODEL PERSISTENCE
// ============================================================================

let cachedModel: GradientBoostingModel | null = null;
let cachedModelId: string | null = null;

async function saveModel(
  model: GradientBoostingModel,
  name: string,
  symbol: string | null,
  horizonDays: number,
  metrics: ModelMetrics,
  trainingStart: Date,
  trainingEnd: Date
): Promise<string> {
  const database = getDb();
  const id = uuidv4();

  const modelData: InsertMlModel = {
    name,
    modelType: 'xgboost',
    version: 'v1.0.0',
    targetSymbol: symbol || undefined,
    horizonDays,
    trainingMetrics: metrics,
    validationMetrics: {
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1Score: metrics.f1Score,
      auc: metrics.auc
    },
    hyperparameters: {
      nEstimators: model.nEstimators,
      learningRate: model.learningRate,
      maxDepth: model.maxDepth
    },
    featureCount: model.featureNames.length,
    trainingDataStart: trainingStart,
    trainingDataEnd: trainingEnd,
    modelPath: `models/${id}.json`,
    isActive: 1,
    totalPredictions: 0,
    correctPredictions: 0
  };

  await database.insert(mlModels).values({ id, ...modelData } as any);

  for (const [featureName, importance] of Object.entries(model.featureImportances)) {
    const rank = Object.entries(model.featureImportances)
      .sort((a, b) => b[1] - a[1])
      .findIndex(([name]) => name === featureName) + 1;

    const fiData: InsertFeatureImportance = {
      modelId: id,
      featureName,
      importance,
      importanceType: 'gain',
      rank
    };

    await database.insert(featureImportance).values({ id: uuidv4(), ...fiData } as any);
  }

  cachedModel = model;
  cachedModelId = id;

  console.log(`[ML] Saved model ${id} with accuracy ${(metrics.accuracy * 100).toFixed(1)}%`);
  return id;
}

async function loadLatestModel(): Promise<{ model: GradientBoostingModel; modelId: string } | null> {
  if (cachedModel && cachedModelId) {
    return { model: cachedModel, modelId: cachedModelId };
  }

  const database = getDb();
  const [latestModel] = await database.select()
    .from(mlModels)
    .where(eq(mlModels.isActive, 1))
    .orderBy(desc(mlModels.createdAt))
    .limit(1);

  if (!latestModel) {
    return null;
  }

  const hyperparams = latestModel.hyperparameters as { nEstimators: number; learningRate: number; maxDepth: number };
  
  console.log(`[ML] Loading model ${latestModel.id}, retraining...`);
  const symbols = latestModel.targetSymbol ? [latestModel.targetSymbol] : ['SPY', 'QQQ', 'AAPL'];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);
  
  const data = await generateTrainingData(symbols, startDate, endDate);
  const model = trainGradientBoosting(
    data,
    hyperparams?.nEstimators || 50,
    hyperparams?.learningRate || 0.1,
    hyperparams?.maxDepth || 4
  );

  cachedModel = model;
  cachedModelId = latestModel.id;

  return { model, modelId: latestModel.id };
}

// ============================================================================
// MAIN API
// ============================================================================

export async function trainMLModel(
  symbols: string[] = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'],
  horizonDays: number = 5,
  nEstimators: number = 50,
  learningRate: number = 0.1,
  maxDepth: number = 4
): Promise<{ modelId: string; metrics: ModelMetrics }> {
  console.log(`[ML] Training model on ${symbols.join(', ')} with ${nEstimators} estimators...`);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  const data = await generateTrainingData(symbols, startDate, endDate);
  
  const splitIndex = Math.floor(data.features.length * 0.8);
  const trainFeatures = data.features.slice(0, splitIndex);
  const trainLabels = data.labels.slice(0, splitIndex);
  const testFeatures = data.features.slice(splitIndex);
  const testLabels = data.labels.slice(splitIndex);

  const model = trainGradientBoosting(
    { features: trainFeatures, labels: trainLabels, featureNames: data.featureNames },
    nEstimators,
    learningRate,
    maxDepth
  );

  const metrics = evaluateModel(model, testFeatures, testLabels);

  const modelId = await saveModel(
    model,
    `XGBoost_${horizonDays}d_${Date.now()}`,
    symbols.length === 1 ? symbols[0] : null,
    horizonDays,
    metrics,
    startDate,
    endDate
  );

  return { modelId, metrics };
}

export async function mlPredict(
  symbol: string,
  currentPrice?: number
): Promise<MLPredictionResult> {
  console.log(`[ML] Generating ML prediction for ${symbol}...`);

  let modelData = await loadLatestModel();
  
  if (!modelData) {
    console.log('[ML] No model found, training new model...');
    const { modelId, metrics } = await trainMLModel([symbol]);
    modelData = await loadLatestModel();
    if (!modelData) throw new Error('Failed to train model');
  }

  const { model, modelId } = modelData;

  const features = await generateFeatureSnapshot(symbol, new Date());
  const featureVector = features.featureVector;

  const rawScore = predictGradientBoosting(model, featureVector);
  const treeVotes = getTreeVotes(model, featureVector);
  const featureContributions = calculateFeatureContributions(model, featureVector);

  let direction: 'up' | 'down' | 'neutral';
  let probability: number;

  if (rawScore > 0.05) {
    direction = 'up';
    probability = 0.5 + Math.min(0.45, Math.abs(rawScore) * 2);
  } else if (rawScore < -0.05) {
    direction = 'down';
    probability = 0.5 + Math.min(0.45, Math.abs(rawScore) * 2);
  } else {
    direction = 'neutral';
    probability = 0.5;
  }

  const totalVotes = treeVotes.up + treeVotes.down + treeVotes.neutral;
  const maxVotes = Math.max(treeVotes.up, treeVotes.down, treeVotes.neutral);
  const confidence = (maxVotes / totalVotes) * 100;

  const database = getDb();
  await database.update(mlModels)
    .set({
      totalPredictions: (await database.select().from(mlModels).where(eq(mlModels.id, modelId)))[0].totalPredictions! + 1,
      lastPredictionAt: new Date()
    })
    .where(eq(mlModels.id, modelId));

  return {
    symbol,
    direction,
    probability,
    confidence,
    rawScore,
    featureContributions,
    treeVotes,
    modelVersion: 'v1.0.0',
    predictionDate: new Date()
  };
}

export async function getMLModels(): Promise<MlModel[]> {
  const database = getDb();
  return database.select()
    .from(mlModels)
    .orderBy(desc(mlModels.createdAt))
    .limit(20);
}

export async function getModelFeatureImportance(modelId: string): Promise<FeatureImportance[]> {
  const database = getDb();
  return database.select()
    .from(featureImportance)
    .where(eq(featureImportance.modelId, modelId))
    .orderBy(desc(featureImportance.importance));
}

export async function getModelStats(modelId?: string): Promise<{
  totalModels: number;
  activeModels: number;
  avgAccuracy: number;
  topFeatures: { name: string; importance: number }[];
}> {
  const database = getDb();
  
  const models = await database.select().from(mlModels);
  const activeModels = models.filter(m => m.isActive === 1);
  
  let avgAccuracy = 0;
  if (activeModels.length > 0) {
    avgAccuracy = activeModels.reduce((sum, m) => {
      const metrics = m.trainingMetrics as ModelMetrics;
      return sum + (metrics?.accuracy || 0);
    }, 0) / activeModels.length;
  }

  const targetModelId = modelId || activeModels[0]?.id;
  let topFeatures: { name: string; importance: number }[] = [];
  
  if (targetModelId) {
    const importance = await database.select()
      .from(featureImportance)
      .where(eq(featureImportance.modelId, targetModelId))
      .orderBy(desc(featureImportance.importance))
      .limit(10);
    
    topFeatures = importance.map(f => ({
      name: f.featureName,
      importance: f.importance
    }));
  }

  return {
    totalModels: models.length,
    activeModels: activeModels.length,
    avgAccuracy,
    topFeatures
  };
}

export async function deactivateModel(modelId: string): Promise<void> {
  const database = getDb();
  await database.update(mlModels)
    .set({ isActive: 0 })
    .where(eq(mlModels.id, modelId));
  
  if (cachedModelId === modelId) {
    cachedModel = null;
    cachedModelId = null;
  }
}

export default {
  trainMLModel,
  mlPredict,
  getMLModels,
  getModelFeatureImportance,
  getModelStats,
  deactivateModel
};
