/**
 * Dijital Duygu Pusulasi (Digital Emotion Compass)
 * Financial sentiment analysis using OpenAI/Gemini
 * 
 * Provides:
 * - Text sentiment analysis (positive/negative/neutral)
 * - Emotion type detection (fear, greed, uncertainty, optimism)
 * - Symbol-specific sentiment aggregation
 * - Fear/Greed index calculation
 */

import { openai } from "../../../openai-client";
import { db } from "../../../db";
import { emotionSources, emotionSignals, emotionAggregates } from "@shared/schema";
import type { InsertEmotionSignal, InsertEmotionAggregate, EmotionSignal } from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { turkishSentimentService, TURKISH_DATA_SOURCES, type TurkishSentimentResult, type TurkishDataSource } from "./turkish-sentiment-service";
import { detectLanguage } from "./turkish-nlp-utils";

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotionType: 'fear' | 'greed' | 'uncertainty' | 'optimism' | 'neutral';
  relevanceScore: number;
  keyPhrases: string[];
}

interface EmotionAggregateResult {
  symbol: string;
  timeframe: string;
  overallSentiment: number;
  signalCount: number;
  positiveRatio: number;
  negativeRatio: number;
  neutralRatio: number;
  avgConfidence: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  fearGreedIndex: number;
  topSources: string[];
  keyPhrases: string[];
}

class EmotionCompassService {
  private cache: Map<string, { result: SentimentResult; timestamp: number }> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('🧭 Emotion Compass Service initialized');
  }

  async analyzeText(text: string, symbol?: string): Promise<SentimentResult> {
    const cacheKey = `${text.slice(0, 100)}-${symbol || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    try {
      const prompt = `You are a financial sentiment analyzer. Analyze the following text for market sentiment.

Text: "${text}"
${symbol ? `Related Symbol: ${symbol}` : ''}

Respond in JSON format only:
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.0-1.0,
  "scores": {
    "positive": 0.0-1.0,
    "negative": 0.0-1.0,
    "neutral": 0.0-1.0
  },
  "emotionType": "fear" | "greed" | "uncertainty" | "optimism" | "neutral",
  "relevanceScore": 0.0-1.0 (how relevant to financial markets),
  "keyPhrases": ["phrase1", "phrase2"] (max 5 key phrases)
}

Consider:
- Market sentiment indicators (bullish/bearish language)
- Emotional undertones (fear, greed, uncertainty, optimism)
- Financial relevance (is this about markets/stocks/economy?)
- Confidence based on clarity of sentiment`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      const result: SentimentResult = {
        sentiment: parsed.sentiment || 'neutral',
        confidence: parsed.confidence || 0.5,
        scores: {
          positive: parsed.scores?.positive || 0.33,
          negative: parsed.scores?.negative || 0.33,
          neutral: parsed.scores?.neutral || 0.34,
        },
        emotionType: parsed.emotionType || 'neutral',
        relevanceScore: parsed.relevanceScore || 0.5,
        keyPhrases: parsed.keyPhrases || [],
      };

      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error: any) {
      console.error('[EmotionCompass] Analysis error:', error.message);
      return {
        sentiment: 'neutral',
        confidence: 0,
        scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
        emotionType: 'neutral',
        relevanceScore: 0,
        keyPhrases: [],
      };
    }
  }

  async analyzeBatch(texts: string[], symbol?: string): Promise<SentimentResult[]> {
    const results = await Promise.all(
      texts.map(text => this.analyzeText(text, symbol))
    );
    return results;
  }

  async analyzeAndStore(
    text: string,
    symbol: string,
    sourceId?: number,
    model: string = 'openai'
  ): Promise<EmotionSignal | null> {
    try {
      const result = await this.analyzeText(text, symbol);

      const signal: InsertEmotionSignal = {
        sourceId: sourceId || null,
        symbol,
        rawText: text.slice(0, 1000),
        sentiment: result.sentiment,
        confidence: result.confidence,
        positiveScore: result.scores.positive,
        negativeScore: result.scores.negative,
        neutralScore: result.scores.neutral,
        model,
        relevanceScore: result.relevanceScore,
        emotionType: result.emotionType,
        metadata: { keyPhrases: result.keyPhrases },
      };

      const [inserted] = await db!.insert(emotionSignals).values(signal).returning();
      return inserted;
    } catch (error: any) {
      console.error('[EmotionCompass] Store error:', error.message);
      return null;
    }
  }

  async calculateAggregate(
    symbol: string,
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
  ): Promise<EmotionAggregateResult | null> {
    try {
      const timeframeHours: Record<string, number> = {
        '1h': 1,
        '4h': 4,
        '1d': 24,
        '1w': 168,
      };

      const hoursAgo = timeframeHours[timeframe];
      const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      const signals = await db!
        .select()
        .from(emotionSignals)
        .where(
          and(
            eq(emotionSignals.symbol, symbol),
            gte(emotionSignals.timestamp, cutoffTime)
          )
        )
        .orderBy(desc(emotionSignals.timestamp));

      if (signals.length === 0) {
        return null;
      }

      const positiveCount = signals.filter(s => s.sentiment === 'positive').length;
      const negativeCount = signals.filter(s => s.sentiment === 'negative').length;
      const neutralCount = signals.filter(s => s.sentiment === 'neutral').length;
      const total = signals.length;

      const positiveRatio = positiveCount / total;
      const negativeRatio = negativeCount / total;
      const neutralRatio = neutralCount / total;

      const overallSentiment = positiveRatio - negativeRatio;

      const avgConfidence = signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / total;

      const fearCount = signals.filter(s => s.emotionType === 'fear').length;
      const greedCount = signals.filter(s => s.emotionType === 'greed').length;
      const fearGreedIndex = ((greedCount - fearCount) / total + 1) * 50;

      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
      if (signals.length >= 4) {
        const recentHalf = signals.slice(0, Math.floor(signals.length / 2));
        const olderHalf = signals.slice(Math.floor(signals.length / 2));
        
        const recentPositive = recentHalf.filter(s => s.sentiment === 'positive').length / recentHalf.length;
        const olderPositive = olderHalf.filter(s => s.sentiment === 'positive').length / olderHalf.length;
        
        if (recentPositive > olderPositive + 0.1) {
          trendDirection = 'improving';
        } else if (recentPositive < olderPositive - 0.1) {
          trendDirection = 'declining';
        }
      }

      const keyPhrases = signals
        .flatMap(s => (s.metadata as any)?.keyPhrases || [])
        .slice(0, 10);

      const aggregate: EmotionAggregateResult = {
        symbol,
        timeframe,
        overallSentiment,
        signalCount: total,
        positiveRatio,
        negativeRatio,
        neutralRatio,
        avgConfidence,
        trendDirection,
        fearGreedIndex,
        topSources: [],
        keyPhrases: Array.from(new Set(keyPhrases)),
      };

      const insertData: InsertEmotionAggregate = {
        symbol,
        timeframe,
        overallSentiment,
        signalCount: total,
        positiveRatio,
        negativeRatio,
        neutralRatio,
        avgConfidence,
        trendDirection,
        fearGreedIndex,
        topSources: [],
        keyPhrases: Array.from(new Set(keyPhrases)),
      };

      await db!.insert(emotionAggregates).values([insertData]);

      return aggregate;
    } catch (error: any) {
      console.error('[EmotionCompass] Aggregate error:', error.message);
      return null;
    }
  }

  async getLatestAggregate(
    symbol: string,
    timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
  ): Promise<EmotionAggregateResult | null> {
    try {
      const [latest] = await db!
        .select()
        .from(emotionAggregates)
        .where(
          and(
            eq(emotionAggregates.symbol, symbol),
            eq(emotionAggregates.timeframe, timeframe)
          )
        )
        .orderBy(desc(emotionAggregates.calculatedAt))
        .limit(1);

      if (!latest) {
        return null;
      }

      return {
        symbol: latest.symbol,
        timeframe: latest.timeframe,
        overallSentiment: latest.overallSentiment || 0,
        signalCount: latest.signalCount || 0,
        positiveRatio: latest.positiveRatio || 0,
        negativeRatio: latest.negativeRatio || 0,
        neutralRatio: latest.neutralRatio || 0,
        avgConfidence: latest.avgConfidence || 0,
        trendDirection: (latest.trendDirection as 'improving' | 'declining' | 'stable') || 'stable',
        fearGreedIndex: latest.fearGreedIndex || 50,
        topSources: (latest.topSources as string[]) || [],
        keyPhrases: (latest.keyPhrases as string[]) || [],
      };
    } catch (error: any) {
      console.error('[EmotionCompass] Get aggregate error:', error.message);
      return null;
    }
  }

  async getRecentSignals(symbol: string, limit: number = 20): Promise<EmotionSignal[]> {
    try {
      return await db!
        .select()
        .from(emotionSignals)
        .where(eq(emotionSignals.symbol, symbol))
        .orderBy(desc(emotionSignals.timestamp))
        .limit(limit);
    } catch (error: any) {
      console.error('[EmotionCompass] Get signals error:', error.message);
      return [];
    }
  }

  async getEmotionScore(symbol: string): Promise<{
    score: number;
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    signalCount: number;
    fearGreedIndex: number;
  }> {
    const aggregate = await this.getLatestAggregate(symbol, '1d');
    
    if (!aggregate || aggregate.signalCount < 3) {
      return {
        score: 0,
        direction: 'neutral',
        confidence: 0,
        signalCount: 0,
        fearGreedIndex: 50,
      };
    }

    const score = aggregate.overallSentiment * 100;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    if (score > 20) direction = 'bullish';
    else if (score < -20) direction = 'bearish';

    return {
      score,
      direction,
      confidence: aggregate.avgConfidence,
      signalCount: aggregate.signalCount,
      fearGreedIndex: aggregate.fearGreedIndex,
    };
  }

  async analyzeNewsHeadlines(headlines: string[], symbol: string): Promise<{
    signals: EmotionSignal[];
    aggregate: EmotionAggregateResult | null;
  }> {
    const signals: EmotionSignal[] = [];

    for (const headline of headlines) {
      const signal = await this.analyzeAndStore(headline, symbol, undefined, 'openai');
      if (signal) {
        signals.push(signal);
      }
    }

    const aggregate = await this.calculateAggregate(symbol, '1d');

    return { signals, aggregate };
  }

  async analyzeTextAuto(text: string, symbol?: string): Promise<SentimentResult | TurkishSentimentResult> {
    try {
      const language = detectLanguage(text);
      
      if (language === 'tr') {
        return await turkishSentimentService.analyze(text, symbol);
      }
      
      return await this.analyzeText(text, symbol);
    } catch (error: any) {
      console.error('[EmotionCompass] analyzeTextAuto error:', error.message);
      return {
        sentiment: 'neutral',
        confidence: 0,
        scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
        emotionType: 'neutral',
        relevanceScore: 0,
        keyPhrases: [],
      };
    }
  }

  async analyzeTurkish(text: string, symbol?: string): Promise<TurkishSentimentResult> {
    try {
      return await turkishSentimentService.analyze(text, symbol);
    } catch (error: any) {
      console.error('[EmotionCompass] analyzeTurkish error:', error.message);
      return {
        sentiment: 'neutral',
        confidence: 0,
        scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
        emotionType: 'notr',
        emotionTypeEnglish: 'neutral',
        relevanceScore: 0,
        keyPhrases: [],
        model: 'error',
        language: 'tr',
      };
    }
  }

  async analyzeTurkishBatch(texts: string[], symbol?: string): Promise<TurkishSentimentResult[]> {
    try {
      const limitedTexts = texts.slice(0, 20);
      return await turkishSentimentService.analyzeBatch(limitedTexts, symbol);
    } catch (error: any) {
      console.error('[EmotionCompass] analyzeTurkishBatch error:', error.message);
      return [];
    }
  }

  async analyzeBISTNews(headlines: string[], symbol: string) {
    try {
      const limitedHeadlines = headlines.slice(0, 50);
      return await turkishSentimentService.analyzeBISTNews(limitedHeadlines, symbol);
    } catch (error: any) {
      console.error('[EmotionCompass] analyzeBISTNews error:', error.message);
      return {
        results: [],
        aggregate: {
          overallSentiment: 0,
          positiveRatio: 0,
          negativeRatio: 0,
          avgConfidence: 0,
          dominantEmotion: 'notr',
        },
      };
    }
  }

  getTurkishDataSources(): TurkishDataSource[] {
    return TURKISH_DATA_SOURCES;
  }

  getTurkishDataSourcesByType(type: TurkishDataSource['type']): TurkishDataSource[] {
    return TURKISH_DATA_SOURCES.filter(ds => ds.type === type);
  }

  private turkishHealthCache: { result: any; timestamp: number } | null = null;
  private readonly HEALTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async turkishHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    bertAvailable: boolean;
    openaiAvailable: boolean;
    lexiconSize: number;
    dataSources: number;
  }> {
    const defaultUnhealthy = {
      status: 'unhealthy' as const,
      bertAvailable: false,
      openaiAvailable: false,
      lexiconSize: 0,
      dataSources: 0,
    };

    if (this.turkishHealthCache && Date.now() - this.turkishHealthCache.timestamp < this.HEALTH_CACHE_TTL) {
      return this.turkishHealthCache.result;
    }
    
    try {
      const result = await turkishSentimentService.healthCheck();
      const normalizedResult = {
        status: result.status || 'unhealthy',
        bertAvailable: result.bertAvailable ?? false,
        openaiAvailable: result.openaiAvailable ?? false,
        lexiconSize: result.lexiconSize ?? 0,
        dataSources: result.dataSources ?? 0,
      };
      this.turkishHealthCache = { result: normalizedResult, timestamp: Date.now() };
      return normalizedResult;
    } catch (error: any) {
      console.error('[EmotionCompass] turkishHealthCheck error:', error.message);
      this.turkishHealthCache = { result: defaultUnhealthy, timestamp: Date.now() };
      return defaultUnhealthy;
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    openaiConnected: boolean;
    recentSignals: number;
    turkishSupport?: boolean;
    message?: string;
  }> {
    try {
      const testResult = await this.analyzeText("Stock market shows mixed signals today", "SPY");
      const openaiConnected = testResult.confidence > 0;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSignals = await db!
        .select({ count: sql<number>`count(*)` })
        .from(emotionSignals)
        .where(gte(emotionSignals.timestamp, oneDayAgo));

      const signalCount = Number(recentSignals[0]?.count) || 0;

      const turkishHealth = await this.turkishHealthCheck();

      return {
        status: openaiConnected ? 'healthy' : 'degraded',
        openaiConnected,
        recentSignals: signalCount,
        turkishSupport: turkishHealth.status === 'healthy',
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        openaiConnected: false,
        recentSignals: 0,
        turkishSupport: false,
        message: error.message,
      };
    }
  }
}

export const emotionCompassService = new EmotionCompassService();
export { turkishSentimentService, TURKISH_DATA_SOURCES };
