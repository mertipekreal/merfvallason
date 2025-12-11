/**
 * Türkçe Duygu Analizi Servisi
 * BERTurk ve Hugging Face modelleri ile Türkçe metin analizi
 * 
 * Desteklenen Modeller:
 * - savasy/bert-base-turkish-sentiment-cased (Ana model)
 * - dbmdz/bert-base-turkish-cased (Genel Türkçe BERT)
 * - akdeniz27/bert-base-turkish-cased-ner (Varlık tanıma)
 * 
 * Türkçe Dil Özellikleri:
 * - Sondan eklemeli (agglutinative) yapı
 * - Morfolojik zenginlik
 * - Esnek söz dizimi
 */

import { HfInference } from "@huggingface/inference";
import { openai } from "../../../openai-client";

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

interface TurkishSentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotionType: 'korku' | 'hirs' | 'belirsizlik' | 'umut' | 'notr';
  emotionTypeEnglish: 'fear' | 'greed' | 'uncertainty' | 'optimism' | 'neutral';
  relevanceScore: number;
  keyPhrases: string[];
  model: string;
  language: 'tr';
}

interface TurkishDataSource {
  id: string;
  name: string;
  type: 'eticaret' | 'sosyal_medya' | 'haber' | 'finans' | 'forum';
  description: string;
  url?: string;
  sampleSize?: number;
  annotationMethod?: string;
}

const TURKISH_DATA_SOURCES: TurkishDataSource[] = [
  {
    id: 'hepsiburada_reviews',
    name: 'Hepsiburada Ürün Yorumları',
    type: 'eticaret',
    description: 'Türkiye\'nin en büyük e-ticaret platformundan ürün yorumları',
    sampleSize: 100000,
    annotationMethod: 'yıldız_bazlı'
  },
  {
    id: 'trendyol_reviews',
    name: 'Trendyol Ürün Yorumları',
    type: 'eticaret',
    description: 'Trendyol e-ticaret platformundan ürün değerlendirmeleri',
    sampleSize: 150000,
    annotationMethod: 'yıldız_bazlı'
  },
  {
    id: 'twitter_tr',
    name: 'Twitter Türkiye',
    type: 'sosyal_medya',
    description: 'Türkçe Twitter paylaşımları ve trend analizleri',
    sampleSize: 500000,
    annotationMethod: 'manuel_ve_otomatik'
  },
  {
    id: 'eksi_sozluk',
    name: 'Ekşi Sözlük',
    type: 'forum',
    description: 'Türkiye\'nin en popüler sözlük platformundan entry\'ler',
    sampleSize: 200000,
    annotationMethod: 'crowdsourced'
  },
  {
    id: 'bist_haberler',
    name: 'BIST Finansal Haberler',
    type: 'finans',
    description: 'Borsa İstanbul ve Türk ekonomisi haberleri',
    sampleSize: 50000,
    annotationMethod: 'uzman_etiketleme'
  },
  {
    id: 'hurriyet_ekonomi',
    name: 'Hürriyet Ekonomi',
    type: 'haber',
    description: 'Ekonomi haberleri ve analizleri',
    sampleSize: 30000,
    annotationMethod: 'yarı_otomatik'
  },
  {
    id: 'bloomberght',
    name: 'BloombergHT',
    type: 'finans',
    description: 'Finansal haberler ve piyasa analizleri',
    sampleSize: 25000,
    annotationMethod: 'uzman_etiketleme'
  },
  {
    id: 'tr_movie_reviews',
    name: 'Türkçe Film Yorumları',
    type: 'sosyal_medya',
    description: 'Beyazperde ve IMDb Türkçe film yorumları',
    sampleSize: 40000,
    annotationMethod: 'yıldız_bazlı'
  }
];

const TURKISH_SENTIMENT_LEXICON = {
  positive: [
    'mükemmel', 'harika', 'süper', 'güzel', 'başarılı', 'olumlu', 'kazanç',
    'yükseliş', 'artış', 'kar', 'büyüme', 'gelişme', 'iyileşme', 'umut',
    'fırsat', 'avantaj', 'pozitif', 'mutlu', 'iyi', 'parlak', 'güçlü',
    'rekor', 'zirve', 'ralli', 'boğa', 'alım', 'talep', 'ivme'
  ],
  negative: [
    'kötü', 'berbat', 'düşüş', 'kayıp', 'zarar', 'risk', 'tehlike',
    'endişe', 'korku', 'panik', 'çöküş', 'kriz', 'durgunluk', 'resesyon',
    'enflasyon', 'devalüasyon', 'iflas', 'batık', 'negatif', 'zayıf',
    'düşük', 'ayı', 'satış', 'baskı', 'gerileme', 'daralma', 'belirsizlik'
  ],
  financial: [
    'borsa', 'hisse', 'dolar', 'euro', 'tl', 'lira', 'faiz', 'enflasyon',
    'merkez bankası', 'tcmb', 'bist', 'spk', 'yatırım', 'portföy', 'fon',
    'tahvil', 'bono', 'altın', 'petrol', 'emtia', 'döviz', 'kur', 'parite'
  ]
};

const TURKISH_MORPHOLOGY_SUFFIXES = [
  'lar', 'ler', 'lık', 'lik', 'luk', 'lük',
  'cı', 'ci', 'cu', 'cü', 'çı', 'çi', 'çu', 'çü',
  'sız', 'siz', 'suz', 'süz',
  'lı', 'li', 'lu', 'lü',
  'ca', 'ce', 'ça', 'çe',
  'mak', 'mek', 'yor', 'iyor', 'acak', 'ecek',
  'mış', 'miş', 'muş', 'müş',
  'dı', 'di', 'du', 'dü', 'tı', 'ti', 'tu', 'tü'
];

class TurkishSentimentService {
  private hf: HfInference | null = null;
  private cache: Map<string, { result: TurkishSentimentResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor() {
    if (HUGGINGFACE_API_KEY) {
      this.hf = new HfInference(HUGGINGFACE_API_KEY);
      console.log('🇹🇷 Türkçe Duygu Analizi Servisi başlatıldı (Hugging Face)');
    } else {
      console.log('🇹🇷 Türkçe Duygu Analizi Servisi başlatıldı (OpenAI fallback)');
    }
  }

  private normalizeText(text: string): string {
    let normalized = text.toLowerCase().trim();
    normalized = normalized
      .replace(/[^\wığüşöçİĞÜŞÖÇ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized;
  }

  private extractStemApprox(word: string): string {
    let stem = word.toLowerCase();
    for (const suffix of TURKISH_MORPHOLOGY_SUFFIXES) {
      if (stem.endsWith(suffix) && stem.length > suffix.length + 2) {
        stem = stem.slice(0, -suffix.length);
        break;
      }
    }
    return stem;
  }

  private lexiconBasedScore(text: string): { positive: number; negative: number; financial: number } {
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    let financialCount = 0;

    for (const word of words) {
      const stem = this.extractStemApprox(word);
      
      if (TURKISH_SENTIMENT_LEXICON.positive.some(p => word.includes(p) || stem.includes(p))) {
        positiveCount++;
      }
      if (TURKISH_SENTIMENT_LEXICON.negative.some(n => word.includes(n) || stem.includes(n))) {
        negativeCount++;
      }
      if (TURKISH_SENTIMENT_LEXICON.financial.some(f => word.includes(f) || stem.includes(f))) {
        financialCount++;
      }
    }

    const total = positiveCount + negativeCount || 1;
    return {
      positive: positiveCount / total,
      negative: negativeCount / total,
      financial: financialCount / words.length
    };
  }

  async analyzeWithBERTurk(text: string): Promise<TurkishSentimentResult | null> {
    if (!this.hf) return null;

    try {
      const rawResult = await this.hf.textClassification({
        model: 'savasy/bert-base-turkish-sentiment-cased',
        inputs: text,
      });

      if (!rawResult) return null;
      
      const result = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
      if (!result || result.length === 0) return null;

      const labelMap: Record<string, 'positive' | 'negative' | 'neutral'> = {
        'label_0': 'negative',
        'label_1': 'neutral', 
        'label_2': 'positive',
        'LABEL_0': 'negative',
        'LABEL_1': 'neutral', 
        'LABEL_2': 'positive',
        'negative': 'negative',
        'neutral': 'neutral',
        'positive': 'positive',
        'olumsuz': 'negative',
        'notr': 'neutral',
        'olumlu': 'positive',
      };

      const aggregatedScores: Record<'positive' | 'negative' | 'neutral', number> = {
        positive: 0,
        negative: 0,
        neutral: 0,
      };

      for (const entry of result) {
        if (!entry || typeof entry.label !== 'string' || typeof entry.score !== 'number') continue;
        const mappedSentiment = labelMap[entry.label] || labelMap[entry.label.toLowerCase()];
        if (mappedSentiment) {
          aggregatedScores[mappedSentiment] += Math.max(0, entry.score);
        }
      }

      const totalScore = aggregatedScores.positive + aggregatedScores.negative + aggregatedScores.neutral;
      if (totalScore <= 0.001) {
        return null;
      }

      const scores = {
        positive: aggregatedScores.positive / totalScore,
        negative: aggregatedScores.negative / totalScore,
        neutral: aggregatedScores.neutral / totalScore,
      };

      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      let maxScore = scores.neutral;
      if (scores.positive > maxScore) {
        sentiment = 'positive';
        maxScore = scores.positive;
      }
      if (scores.negative > maxScore) {
        sentiment = 'negative';
        maxScore = scores.negative;
      }

      const confidence = Math.min(Math.max(maxScore, 0), 1);

      const lexiconScores = this.lexiconBasedScore(text);

      let emotionType: TurkishSentimentResult['emotionType'] = 'notr';
      let emotionTypeEnglish: TurkishSentimentResult['emotionTypeEnglish'] = 'neutral';

      if (sentiment === 'negative') {
        if (text.includes('korku') || text.includes('panik') || text.includes('endişe')) {
          emotionType = 'korku';
          emotionTypeEnglish = 'fear';
        } else {
          emotionType = 'belirsizlik';
          emotionTypeEnglish = 'uncertainty';
        }
      } else if (sentiment === 'positive') {
        if (text.includes('fırsat') || text.includes('kazanç') || text.includes('kar')) {
          emotionType = 'hirs';
          emotionTypeEnglish = 'greed';
        } else {
          emotionType = 'umut';
          emotionTypeEnglish = 'optimism';
        }
      }

      return {
        sentiment,
        confidence,
        scores,
        emotionType,
        emotionTypeEnglish,
        relevanceScore: lexiconScores.financial,
        keyPhrases: this.extractKeyPhrases(text),
        model: 'berturk',
        language: 'tr',
      };
    } catch (error: any) {
      console.error('[TurkishSentiment] BERTurk error:', error.message);
      return null;
    }
  }

  async analyzeWithOpenAI(text: string, symbol?: string): Promise<TurkishSentimentResult> {
    try {
      const prompt = `Sen bir Türkçe finansal duygu analiz uzmanısın. Aşağıdaki Türkçe metni analiz et.

Metin: "${text}"
${symbol ? `İlgili Sembol: ${symbol}` : ''}

Sadece JSON formatında yanıt ver:
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": 0.0-1.0,
  "scores": {
    "positive": 0.0-1.0,
    "negative": 0.0-1.0,
    "neutral": 0.0-1.0
  },
  "emotionType": "korku" | "hirs" | "belirsizlik" | "umut" | "notr",
  "relevanceScore": 0.0-1.0 (finansal konuyla ilgililik),
  "keyPhrases": ["ifade1", "ifade2"] (max 5 anahtar ifade)
}

Dikkat edilecekler:
- Türkçe morfolojik yapıyı dikkate al (ekler, çekimler)
- Finansal terimler ve borsa jargonunu tanı
- Türk ekonomisi ve BIST bağlamını anla
- Duygu durumunu doğru tespit et (korku, hırs, belirsizlik, umut)`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {};
      }

      const validSentiments = ['positive', 'negative', 'neutral'];
      const sentiment = validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'neutral';
      const confidence = typeof parsed.confidence === 'number' ? Math.min(Math.max(parsed.confidence, 0), 1) : 0.5;
      
      let positiveScore = typeof parsed.scores?.positive === 'number' && !isNaN(parsed.scores.positive) ? Math.max(parsed.scores.positive, 0) : 0.33;
      let negativeScore = typeof parsed.scores?.negative === 'number' && !isNaN(parsed.scores.negative) ? Math.max(parsed.scores.negative, 0) : 0.33;
      let neutralScore = typeof parsed.scores?.neutral === 'number' && !isNaN(parsed.scores.neutral) ? Math.max(parsed.scores.neutral, 0) : 0.34;
      
      const total = positiveScore + negativeScore + neutralScore;
      if (total > 0.001 && Math.abs(total - 1) > 0.01) {
        positiveScore = positiveScore / total;
        negativeScore = negativeScore / total;
        neutralScore = neutralScore / total;
      } else if (total <= 0.001) {
        positiveScore = 0.33;
        negativeScore = 0.33;
        neutralScore = 0.34;
      }

      const emotionTypeEnglishMap: Record<string, TurkishSentimentResult['emotionTypeEnglish']> = {
        'korku': 'fear',
        'hirs': 'greed',
        'belirsizlik': 'uncertainty',
        'umut': 'optimism',
        'notr': 'neutral',
      };

      const validEmotions = ['korku', 'hirs', 'belirsizlik', 'umut', 'notr'] as const;
      const emotionType: TurkishSentimentResult['emotionType'] = validEmotions.includes(parsed.emotionType) ? parsed.emotionType : 'notr';
      const emotionTypeEnglish = emotionTypeEnglishMap[emotionType];
      const relevanceScore = typeof parsed.relevanceScore === 'number' && !isNaN(parsed.relevanceScore) ? Math.min(Math.max(parsed.relevanceScore, 0), 1) : 0.5;
      const keyPhrases = Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases.slice(0, 5).filter((p: any) => typeof p === 'string') : [];

      return {
        sentiment,
        confidence,
        scores: {
          positive: positiveScore,
          negative: negativeScore,
          neutral: neutralScore,
        },
        emotionType,
        emotionTypeEnglish,
        relevanceScore,
        keyPhrases,
        model: 'openai',
        language: 'tr',
      };
    } catch (error: any) {
      console.error('[TurkishSentiment] OpenAI error:', error.message);
      const lexiconScores = this.lexiconBasedScore(text);
      
      return {
        sentiment: lexiconScores.positive > lexiconScores.negative ? 'positive' : 
                   lexiconScores.negative > lexiconScores.positive ? 'negative' : 'neutral',
        confidence: 0.3,
        scores: {
          positive: lexiconScores.positive,
          negative: lexiconScores.negative,
          neutral: 1 - lexiconScores.positive - lexiconScores.negative,
        },
        emotionType: 'notr',
        emotionTypeEnglish: 'neutral',
        relevanceScore: lexiconScores.financial,
        keyPhrases: [],
        model: 'lexicon',
        language: 'tr',
      };
    }
  }

  async analyze(text: string, symbol?: string): Promise<TurkishSentimentResult> {
    const cacheKey = `${text.slice(0, 100)}-${symbol || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    const bertResult = await this.analyzeWithBERTurk(text);
    
    if (bertResult && bertResult.confidence > 0.7) {
      this.cache.set(cacheKey, { result: bertResult, timestamp: Date.now() });
      return bertResult;
    }

    const openaiResult = await this.analyzeWithOpenAI(text, symbol);

    if (bertResult) {
      const combined: TurkishSentimentResult = {
        sentiment: bertResult.confidence > openaiResult.confidence ? bertResult.sentiment : openaiResult.sentiment,
        confidence: (bertResult.confidence + openaiResult.confidence) / 2,
        scores: {
          positive: (bertResult.scores.positive + openaiResult.scores.positive) / 2,
          negative: (bertResult.scores.negative + openaiResult.scores.negative) / 2,
          neutral: (bertResult.scores.neutral + openaiResult.scores.neutral) / 2,
        },
        emotionType: openaiResult.emotionType,
        emotionTypeEnglish: openaiResult.emotionTypeEnglish,
        relevanceScore: openaiResult.relevanceScore,
        keyPhrases: Array.from(new Set([...bertResult.keyPhrases, ...openaiResult.keyPhrases])).slice(0, 5),
        model: 'hybrid',
        language: 'tr',
      };
      this.cache.set(cacheKey, { result: combined, timestamp: Date.now() });
      return combined;
    }

    this.cache.set(cacheKey, { result: openaiResult, timestamp: Date.now() });
    return openaiResult;
  }

  async analyzeBatch(texts: string[], symbol?: string): Promise<TurkishSentimentResult[]> {
    const results = await Promise.all(
      texts.map(text => this.analyze(text, symbol))
    );
    return results;
  }

  private extractKeyPhrases(text: string): string[] {
    const words = text.split(/\s+/);
    const phrases: string[] = [];
    
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      const allFinancial = TURKISH_SENTIMENT_LEXICON.financial;
      const allSentiment = [...TURKISH_SENTIMENT_LEXICON.positive, ...TURKISH_SENTIMENT_LEXICON.negative];
      
      if (allFinancial.some(f => bigram.toLowerCase().includes(f)) ||
          allSentiment.some(s => bigram.toLowerCase().includes(s))) {
        phrases.push(bigram);
      }
    }
    
    return phrases.slice(0, 5);
  }

  getDataSources(): TurkishDataSource[] {
    return TURKISH_DATA_SOURCES;
  }

  getDataSourceById(id: string): TurkishDataSource | undefined {
    return TURKISH_DATA_SOURCES.find(ds => ds.id === id);
  }

  getDataSourcesByType(type: TurkishDataSource['type']): TurkishDataSource[] {
    return TURKISH_DATA_SOURCES.filter(ds => ds.type === type);
  }

  getSentimentLexicon(): typeof TURKISH_SENTIMENT_LEXICON {
    return TURKISH_SENTIMENT_LEXICON;
  }

  async analyzeBISTNews(headlines: string[], symbol: string): Promise<{
    results: TurkishSentimentResult[];
    aggregate: {
      overallSentiment: number;
      positiveRatio: number;
      negativeRatio: number;
      avgConfidence: number;
      dominantEmotion: string;
    };
  }> {
    const results = await this.analyzeBatch(headlines, symbol);

    const positiveCount = results.filter(r => r.sentiment === 'positive').length;
    const negativeCount = results.filter(r => r.sentiment === 'negative').length;
    const total = results.length || 1;

    const emotionCounts: Record<string, number> = {};
    for (const r of results) {
      emotionCounts[r.emotionType] = (emotionCounts[r.emotionType] || 0) + 1;
    }
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'notr';

    return {
      results,
      aggregate: {
        overallSentiment: (positiveCount - negativeCount) / total,
        positiveRatio: positiveCount / total,
        negativeRatio: negativeCount / total,
        avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / total,
        dominantEmotion,
      },
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    bertAvailable: boolean;
    openaiAvailable: boolean;
    lexiconSize: number;
    dataSources: number;
  }> {
    let bertAvailable = false;
    let openaiAvailable = false;

    try {
      const testText = "Borsa bugün yükseldi, yatırımcılar mutlu";
      
      if (this.hf) {
        const bertResult = await this.analyzeWithBERTurk(testText);
        bertAvailable = bertResult !== null && bertResult.confidence > 0;
      }

      const openaiResult = await this.analyzeWithOpenAI(testText);
      openaiAvailable = openaiResult.confidence > 0;

      return {
        status: bertAvailable || openaiAvailable ? 'healthy' : 'degraded',
        bertAvailable,
        openaiAvailable,
        lexiconSize: TURKISH_SENTIMENT_LEXICON.positive.length + 
                     TURKISH_SENTIMENT_LEXICON.negative.length +
                     TURKISH_SENTIMENT_LEXICON.financial.length,
        dataSources: TURKISH_DATA_SOURCES.length,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        bertAvailable: false,
        openaiAvailable: false,
        lexiconSize: 0,
        dataSources: 0,
      };
    }
  }
}

export const turkishSentimentService = new TurkishSentimentService();
export { TURKISH_DATA_SOURCES, TURKISH_SENTIMENT_LEXICON };
export type { TurkishSentimentResult, TurkishDataSource };
