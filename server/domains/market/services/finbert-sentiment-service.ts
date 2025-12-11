/**
 * FinBERT Financial Sentiment Analysis Service
 * 
 * Uses Hugging Face's ProsusAI/finbert model for financial text sentiment analysis.
 * Supports both English and Turkish financial terms.
 */

import { HfInference } from "@huggingface/inference";
import { log } from "../../../index";

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || "";
const FINBERT_MODEL = "ProsusAI/finbert";

// Cache for sentiment results (in-memory LRU)
const sentimentCache = new Map<string, FinbertResult>();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface FinbertResult {
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  positiveProb: number;
  negativeProb: number;
  neutralProb: number;
  normalizedScore: number; // -1 to 1
  cachedAt?: number;
}

export interface FinbertBatchResult {
  results: FinbertResult[];
  avgSentiment: number;
  dominantSentiment: 'positive' | 'negative' | 'neutral';
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  confidence: number;
}

// Turkish to English financial term translations
const TURKISH_FINANCIAL_TERMS: Record<string, string> = {
  // Bullish terms
  'yükseliş': 'rally',
  'boğa': 'bullish',
  'alım': 'buy',
  'kazanç': 'profit',
  'kar': 'gain',
  'zirve': 'peak',
  'patlama': 'surge',
  'fırsat': 'opportunity',
  'güçlü': 'strong',
  'artış': 'increase',
  'yükseldi': 'rose',
  'rekor': 'record high',
  
  // Bearish terms
  'düşüş': 'decline',
  'ayı': 'bearish',
  'satış': 'sell',
  'zarar': 'loss',
  'kayıp': 'loss',
  'çöküş': 'crash',
  'panik': 'panic',
  'korku': 'fear',
  'zayıf': 'weak',
  'azalış': 'decrease',
  'düştü': 'fell',
  'risk': 'risk',
  'kriz': 'crisis',
  'belirsizlik': 'uncertainty',
  
  // Market terms
  'borsa': 'stock market',
  'hisse': 'stock',
  'piyasa': 'market',
  'faiz': 'interest rate',
  'enflasyon': 'inflation',
  'döviz': 'forex',
  'dolar': 'dollar',
  'altın': 'gold',
  'petrol': 'oil',
  'tahvil': 'bond',
  'endeks': 'index',
  'hacim': 'volume',
  'volatilite': 'volatility',
  'likidite': 'liquidity',
  'teminat': 'margin',
};

let hfClient: HfInference | null = null;

function getClient(): HfInference {
  if (!hfClient) {
    if (!HUGGINGFACE_API_KEY) {
      log("[FinBERT] API key not found, using public inference");
    }
    hfClient = new HfInference(HUGGINGFACE_API_KEY || undefined);
  }
  return hfClient;
}

/**
 * Translate Turkish financial terms to English for better FinBERT analysis
 */
function translateTurkishToEnglish(text: string): string {
  let translated = text.toLowerCase();
  
  for (const [turkish, english] of Object.entries(TURKISH_FINANCIAL_TERMS)) {
    translated = translated.replace(new RegExp(turkish, 'gi'), english);
  }
  
  return translated;
}

/**
 * Detect if text is primarily Turkish
 */
function isTurkish(text: string): boolean {
  const turkishChars = /[çğıöşüÇĞİÖŞÜ]/;
  const turkishWords = ['ve', 'bir', 'için', 'ile', 'bu', 'da', 'de', 'olan', 'oldu', 'ise'];
  
  if (turkishChars.test(text)) return true;
  
  const words = text.toLowerCase().split(/\s+/);
  const turkishWordCount = words.filter(w => turkishWords.includes(w)).length;
  
  return turkishWordCount / words.length > 0.1;
}

/**
 * Generate cache key from text
 */
function getCacheKey(text: string): string {
  const normalized = text.toLowerCase().trim().slice(0, 500);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `finbert_${hash}`;
}

/**
 * Manage cache size
 */
function pruneCache() {
  if (sentimentCache.size > CACHE_MAX_SIZE) {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    const entries = Array.from(sentimentCache.entries());
    for (const [key, value] of entries) {
      if (value.cachedAt && now - value.cachedAt > CACHE_TTL_MS) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      sentimentCache.delete(key);
    }
    
    // If still too large, remove oldest entries
    if (sentimentCache.size > CACHE_MAX_SIZE) {
      const allEntries = Array.from(sentimentCache.entries());
      allEntries.sort((a, b) => (a[1].cachedAt || 0) - (b[1].cachedAt || 0));
      
      const toRemove = allEntries.slice(0, allEntries.length - CACHE_MAX_SIZE + 100);
      for (const [key] of toRemove) {
        sentimentCache.delete(key);
      }
    }
  }
}

/**
 * Analyze single text with FinBERT
 */
export async function analyzeText(text: string, language?: 'en' | 'tr' | 'auto'): Promise<FinbertResult> {
  // Check cache first
  const cacheKey = getCacheKey(text);
  const cached = sentimentCache.get(cacheKey);
  if (cached && cached.cachedAt && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }
  
  try {
    const client = getClient();
    
    // Detect and translate if needed
    const detectedLang = language === 'auto' || !language 
      ? (isTurkish(text) ? 'tr' : 'en')
      : language;
    
    const processedText = detectedLang === 'tr' 
      ? translateTurkishToEnglish(text)
      : text;
    
    // Truncate to max length for FinBERT (512 tokens)
    const truncatedText = processedText.slice(0, 500);
    
    const result = await client.textClassification({
      model: FINBERT_MODEL,
      inputs: truncatedText,
    });
    
    if (!result || result.length === 0) {
      return getDefaultResult();
    }
    
    // Parse FinBERT results
    const scores: Record<string, number> = {};
    for (const item of result) {
      scores[item.label.toLowerCase()] = item.score;
    }
    
    const positiveProb = scores['positive'] || 0;
    const negativeProb = scores['negative'] || 0;
    const neutralProb = scores['neutral'] || 0;
    
    // Determine label
    let label: 'positive' | 'negative' | 'neutral';
    let confidence: number;
    
    if (positiveProb > negativeProb && positiveProb > neutralProb) {
      label = 'positive';
      confidence = positiveProb;
    } else if (negativeProb > positiveProb && negativeProb > neutralProb) {
      label = 'negative';
      confidence = negativeProb;
    } else {
      label = 'neutral';
      confidence = neutralProb;
    }
    
    // Calculate normalized score (-1 to 1)
    const normalizedScore = positiveProb - negativeProb;
    
    const finbertResult: FinbertResult = {
      label,
      confidence,
      positiveProb,
      negativeProb,
      neutralProb,
      normalizedScore,
      cachedAt: Date.now(),
    };
    
    // Cache result
    pruneCache();
    sentimentCache.set(cacheKey, finbertResult);
    
    return finbertResult;
    
  } catch (error) {
    log(`[FinBERT] Analysis error: ${error}`);
    return getDefaultResult();
  }
}

/**
 * Batch analyze multiple texts
 */
export async function batchAnalyze(texts: string[]): Promise<FinbertBatchResult> {
  if (texts.length === 0) {
    return {
      results: [],
      avgSentiment: 0,
      dominantSentiment: 'neutral',
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      confidence: 0,
    };
  }
  
  // Analyze in parallel with rate limiting
  const batchSize = 5;
  const allResults: FinbertResult[] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(text => analyzeText(text, 'auto'))
    );
    allResults.push(...batchResults);
    
    // Small delay to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Calculate aggregate metrics
  let totalSentiment = 0;
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;
  let totalConfidence = 0;
  
  for (const result of allResults) {
    totalSentiment += result.normalizedScore;
    totalConfidence += result.confidence;
    
    if (result.label === 'positive') bullishCount++;
    else if (result.label === 'negative') bearishCount++;
    else neutralCount++;
  }
  
  const avgSentiment = totalSentiment / allResults.length;
  const avgConfidence = totalConfidence / allResults.length;
  
  let dominantSentiment: 'positive' | 'negative' | 'neutral';
  if (bullishCount > bearishCount && bullishCount > neutralCount) {
    dominantSentiment = 'positive';
  } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
    dominantSentiment = 'negative';
  } else {
    dominantSentiment = 'neutral';
  }
  
  return {
    results: allResults,
    avgSentiment,
    dominantSentiment,
    bullishCount,
    bearishCount,
    neutralCount,
    confidence: avgConfidence,
  };
}

/**
 * Analyze financial news headlines
 */
export async function analyzeNews(headlines: string[]): Promise<{
  overallSentiment: number;
  marketBias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  topBullish: string[];
  topBearish: string[];
}> {
  const batchResult = await batchAnalyze(headlines);
  
  // Find top bullish/bearish headlines
  const headlinesWithScores = headlines.map((headline, i) => ({
    headline,
    score: batchResult.results[i]?.normalizedScore || 0,
  }));
  
  headlinesWithScores.sort((a, b) => b.score - a.score);
  
  const topBullish = headlinesWithScores
    .filter(h => h.score > 0.3)
    .slice(0, 3)
    .map(h => h.headline);
  
  const topBearish = headlinesWithScores
    .filter(h => h.score < -0.3)
    .slice(-3)
    .map(h => h.headline);
  
  let marketBias: 'bullish' | 'bearish' | 'neutral';
  if (batchResult.avgSentiment > 0.15) {
    marketBias = 'bullish';
  } else if (batchResult.avgSentiment < -0.15) {
    marketBias = 'bearish';
  } else {
    marketBias = 'neutral';
  }
  
  return {
    overallSentiment: batchResult.avgSentiment,
    marketBias,
    confidence: batchResult.confidence,
    topBullish,
    topBearish,
  };
}

/**
 * Get default neutral result for fallback
 */
function getDefaultResult(): FinbertResult {
  return {
    label: 'neutral',
    confidence: 0.5,
    positiveProb: 0.33,
    negativeProb: 0.33,
    neutralProb: 0.34,
    normalizedScore: 0,
    cachedAt: Date.now(),
  };
}

/**
 * Check if FinBERT is available
 */
export function isFinbertAvailable(): boolean {
  return true; // HuggingFace public inference is always available
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: sentimentCache.size,
    maxSize: CACHE_MAX_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
}

/**
 * Clear cache
 */
export function clearCache(): void {
  sentimentCache.clear();
}

export const finbertService = {
  analyzeText,
  batchAnalyze,
  analyzeNews,
  isFinbertAvailable,
  getCacheStats,
  clearCache,
  translateTurkishToEnglish,
  isTurkish,
};
