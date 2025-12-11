# Dijital Duygu Pusulasi, NASDAQ Sinyal Avcisi ve Account Sniper
## Entegre Finansal Istihbarat ve Algoritmik Degerleme Mimarisi (v2.0)

### Merf.ai v3.5 Entegrasyon Plani

---

## 1. Genel Bakis

Bu dokuman, uc ana modulu Merf.ai platformuna entegre etmek icin tasarlanmis kapsamli bir mimari plandir:

| Modul | Amac | Oncelik |
|-------|------|---------|
| **Dijital Duygu Pusulasi** | FinBERT ile finansal metin duygu analizi | 1 (Yuksek) |
| **NASDAQ Sinyal Avcisi** | Piyasa mikro yapisi ve sinyal tespiti | 2 (Orta) |
| **Account Sniper** | Algoritmik hesap/sirket degerleme | 3 (Dusuk) |

---

## 2. Sistem Mimarisi

```
                                    +------------------+
                                    |   Frontend UI    |
                                    |  (React + Vite)  |
                                    +--------+---------+
                                             |
                                    +--------v---------+
                                    |  Express Gateway |
                                    |  /api/market/*   |
                                    +--------+---------+
                                             |
          +----------------------------------+----------------------------------+
          |                                  |                                  |
+---------v----------+          +-----------v-----------+          +-----------v-----------+
|  Dijital Duygu     |          |  NASDAQ Sinyal        |          |  Account Sniper       |
|  Pusulasi          |          |  Avcisi               |          |                       |
+--------------------+          +-----------------------+          +-----------------------+
| emotion-compass    |          | signal-harvester      |          | account-valuation     |
| visual-affect      |          | signal-scorer         |          | account-risk          |
| trader-biometrics  |          | microstructure        |          | account-insight       |
+--------+-----------+          +-----------+-----------+          +-----------+-----------+
         |                                  |                                  |
         +----------------------------------+----------------------------------+
                                            |
                              +-------------v--------------+
                              |   Feature Engineering      |
                              |   (Unified Feature Vector) |
                              +-------------+--------------+
                                            |
                              +-------------v--------------+
                              |   Prediction Engine        |
                              |   (4-Layer Model)          |
                              +----------------------------+
```

---

## 3. Dijital Duygu Pusulasi (Digital Emotion Compass)

### 3.1 Servis Yapisi

```typescript
// server/domains/market/services/emotion-compass-service.ts
interface EmotionCompassService {
  // FinBERT tabanli metin analizi
  analyzeText(text: string): Promise<SentimentResult>;
  analyzeBatch(texts: string[]): Promise<SentimentResult[]>;
  
  // Kaynak bazli analiz
  analyzeNewsHeadlines(source: string): Promise<EmotionSignal[]>;
  analyzeSocialMedia(platform: string, query: string): Promise<EmotionSignal[]>;
  
  // Agregasyon
  getEmotionAggregate(symbol: string, timeframe: string): Promise<EmotionAggregate>;
}

interface SentimentResult {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

interface EmotionSignal {
  source: string;
  timestamp: Date;
  sentiment: SentimentResult;
  relevantSymbols: string[];
  weight: number; // Kaynak guvenilirligi
}

interface EmotionAggregate {
  symbol: string;
  timeframe: string;
  overallSentiment: number; // -1 to +1
  signalCount: number;
  topSources: string[];
  trendDirection: 'improving' | 'declining' | 'stable';
}
```

### 3.2 FinBERT Entegrasyonu

**Secenek A: Hugging Face Inference API (Onerilen - Baslangic)**
```typescript
// Hugging Face Inference ile FinBERT
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

async function analyzeFinancialSentiment(text: string) {
  const result = await hf.textClassification({
    model: 'ProsusAI/finbert',
    inputs: text
  });
  return result;
}
```

**Secenek B: Lokal Python Worker (Ileri Asama)**
```python
# script/finbert_worker.py
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

model = AutoModelForSequenceClassification.from_pretrained('ProsusAI/finbert')
tokenizer = AutoTokenizer.from_pretrained('ProsusAI/finbert')

def analyze_sentiment(text: str):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    outputs = model(**inputs)
    probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    return {
        'positive': probs[0][0].item(),
        'negative': probs[0][1].item(),
        'neutral': probs[0][2].item()
    }
```

### 3.3 Veritabani Semalari

```typescript
// shared/schema.ts'e eklenecek

// Duygu kaynaklari
export const emotionSources = pgTable('emotion_sources', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'news', 'social', 'analyst'
  reliability: real('reliability').default(0.5),
  lastScraped: timestamp('last_scraped'),
  isActive: boolean('is_active').default(true),
});

// Ham duygu sinyalleri
export const emotionSignals = pgTable('emotion_signals', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').references(() => emotionSources.id),
  symbol: text('symbol'),
  rawText: text('raw_text'),
  sentiment: text('sentiment'), // 'positive', 'negative', 'neutral'
  confidence: real('confidence'),
  positiveScore: real('positive_score'),
  negativeScore: real('negative_score'),
  neutralScore: real('neutral_score'),
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: jsonb('metadata'),
});

// Agregat duygu metrikleri
export const emotionAggregates = pgTable('emotion_aggregates', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(), // '1h', '4h', '1d', '1w'
  overallSentiment: real('overall_sentiment'), // -1 to +1
  signalCount: integer('signal_count'),
  positiveRatio: real('positive_ratio'),
  negativeRatio: real('negative_ratio'),
  trendDirection: text('trend_direction'),
  calculatedAt: timestamp('calculated_at').defaultNow(),
});
```

---

## 4. NASDAQ Sinyal Avcisi (Signal Hunter)

### 4.1 Servis Yapisi

```typescript
// server/domains/market/services/signal-harvester-service.ts
interface SignalHarvesterService {
  // Sinyal toplama
  harvestOrderFlow(symbol: string): Promise<OrderFlowSignal[]>;
  harvestDarkPool(symbol: string): Promise<DarkPoolSignal[]>;
  harvestOptionsFlow(symbol: string): Promise<OptionsFlowSignal[]>;
  
  // Mikro yapi analizi
  detectMarketStructureShift(symbol: string): Promise<MSSSignal | null>;
  detectFairValueGap(symbol: string): Promise<FVGSignal[]>;
  detectLiquidityVoid(symbol: string): Promise<LiquiditySignal[]>;
}

// server/domains/market/services/signal-scorer-service.ts
interface SignalScorerService {
  // Sinyal skorlama
  scoreSignal(signal: RawSignal): Promise<ScoredSignal>;
  scoreSignalBatch(signals: RawSignal[]): Promise<ScoredSignal[]>;
  
  // Rejim tespiti
  detectMarketRegime(): Promise<MarketRegime>;
  
  // Fuzyonlanmis sinyal
  getFusedSignal(symbol: string): Promise<FusedSignal>;
}

interface ScoredSignal {
  id: string;
  type: string;
  symbol: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  probability: number; // 0-1
  timeHorizon: string;
  riskLevel: 'low' | 'medium' | 'high';
  sources: string[];
  explanation: string;
}

interface FusedSignal {
  symbol: string;
  timestamp: Date;
  overallDirection: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;
  components: {
    orderFlow: number;
    darkPool: number;
    options: number;
    emotion: number;
    technical: number;
  };
  recommendation: string;
}
```

### 4.2 Mevcut Servislerle Entegrasyon

```typescript
// prediction-engine-service.ts guncelleme
interface PredictionWeights {
  hardData: number;      // 0.30 (mevcut)
  technical: number;     // 0.25 (mevcut)
  sam: number;           // 0.25 (mevcut)
  economic: number;      // 0.10 (azaltildi)
  emotion: number;       // 0.05 (yeni - Duygu Pusulasi)
  microstructure: number; // 0.05 (yeni - Sinyal Avcisi)
}
```

### 4.3 Veritabani Semalari

```typescript
// shared/schema.ts'e eklenecek

// Ham piyasa sinyalleri
export const marketSignals = pgTable('market_signals', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull(),
  signalType: text('signal_type').notNull(), // 'order_flow', 'dark_pool', 'options', 'mss', 'fvg'
  direction: text('direction'), // 'bullish', 'bearish', 'neutral'
  rawData: jsonb('raw_data'),
  source: text('source'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Skorlanmis sinyaller
export const signalScores = pgTable('signal_scores', {
  id: serial('id').primaryKey(),
  signalId: integer('signal_id').references(() => marketSignals.id),
  symbol: text('symbol').notNull(),
  strength: real('strength'), // 0-100
  probability: real('probability'), // 0-1
  riskLevel: text('risk_level'),
  timeHorizon: text('time_horizon'),
  explanation: text('explanation'),
  calculatedAt: timestamp('calculated_at').defaultNow(),
});

// Sinyal backtest sonuclari
export const signalBacktests = pgTable('signal_backtests', {
  id: serial('id').primaryKey(),
  signalType: text('signal_type').notNull(),
  symbol: text('symbol'),
  testPeriod: text('test_period'),
  accuracy: real('accuracy'),
  profitFactor: real('profit_factor'),
  sharpeRatio: real('sharpe_ratio'),
  totalSignals: integer('total_signals'),
  winRate: real('win_rate'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 5. Account Sniper (Algoritmik Degerleme)

### 5.1 Servis Yapisi

```typescript
// server/domains/valuation/services/account-valuation-service.ts
interface AccountValuationService {
  // Sirket degerleme
  calculateIntrinsicValue(symbol: string): Promise<ValuationResult>;
  calculateDCF(symbol: string, assumptions: DCFAssumptions): Promise<DCFResult>;
  calculateComparables(symbol: string): Promise<ComparableResult>;
  
  // Anomali tespiti
  detectValuationAnomalies(symbol: string): Promise<Anomaly[]>;
  
  // Coklu sirket tarama
  screenStocks(criteria: ScreeningCriteria): Promise<ScreeningResult[]>;
}

// server/domains/valuation/services/account-insight-service.ts
interface AccountInsightService {
  // SHAP aciklamalari
  explainValuation(valuationId: number): Promise<SHAPExplanation>;
  getFeatureImportance(symbol: string): Promise<FeatureImportance[]>;
  
  // Ozet raporlama
  generateInsightReport(symbol: string): Promise<InsightReport>;
}

interface ValuationResult {
  symbol: string;
  currentPrice: number;
  intrinsicValue: number;
  upside: number; // Yuzde
  rating: 'undervalued' | 'fairly_valued' | 'overvalued';
  confidence: number;
  methodology: string;
  keyDrivers: string[];
  lastUpdated: Date;
}

interface SHAPExplanation {
  valuationId: number;
  baseValue: number;
  outputValue: number;
  features: {
    name: string;
    value: number;
    contribution: number; // SHAP degeri
    direction: 'positive' | 'negative';
  }[];
  summary: string;
}
```

### 5.2 Veritabani Semalari

```typescript
// shared/schema.ts'e eklenecek

// Degerleme profilleri
export const valuationProfiles = pgTable('valuation_profiles', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull().unique(),
  companyName: text('company_name'),
  sector: text('sector'),
  industry: text('industry'),
  marketCap: real('market_cap'),
  lastUpdated: timestamp('last_updated'),
});

// Degerleme snapshot'lari
export const valuationSnapshots = pgTable('valuation_snapshots', {
  id: serial('id').primaryKey(),
  profileId: integer('profile_id').references(() => valuationProfiles.id),
  currentPrice: real('current_price'),
  intrinsicValue: real('intrinsic_value'),
  upside: real('upside'),
  rating: text('rating'),
  confidence: real('confidence'),
  methodology: text('methodology'),
  keyDrivers: jsonb('key_drivers'),
  calculatedAt: timestamp('calculated_at').defaultNow(),
});

// SHAP ozellik onemliligi
export const valuationFeatureImportances = pgTable('valuation_feature_importances', {
  id: serial('id').primaryKey(),
  snapshotId: integer('snapshot_id').references(() => valuationSnapshots.id),
  featureName: text('feature_name').notNull(),
  featureValue: real('feature_value'),
  shapValue: real('shap_value'),
  contribution: text('contribution'), // 'positive', 'negative'
});

// Model aciklamalari
export const modelExplanations = pgTable('model_explanations', {
  id: serial('id').primaryKey(),
  modelType: text('model_type').notNull(), // 'prediction', 'valuation', 'signal'
  referenceId: integer('reference_id'), // Ilgili kayit ID
  baseValue: real('base_value'),
  outputValue: real('output_value'),
  shapSummary: jsonb('shap_summary'),
  textExplanation: text('text_explanation'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 6. BullMQ Job Kuyruk Yapisi

```typescript
// server/jobs/financial-intelligence-jobs.ts

// Duygu Pusulasi job'lari
export const EMOTION_JOBS = {
  ANALYZE_NEWS: 'emotion:analyze:news',
  ANALYZE_SOCIAL: 'emotion:analyze:social',
  AGGREGATE_EMOTIONS: 'emotion:aggregate',
  BATCH_PROCESS: 'emotion:batch',
};

// Sinyal Avcisi job'lari
export const SIGNAL_JOBS = {
  HARVEST_ORDER_FLOW: 'signals:harvest:orderflow',
  HARVEST_DARK_POOL: 'signals:harvest:darkpool',
  HARVEST_OPTIONS: 'signals:harvest:options',
  SCORE_SIGNALS: 'signals:score',
  FUSE_SIGNALS: 'signals:fuse',
  BACKTEST: 'signals:backtest',
};

// Account Sniper job'lari
export const VALUATION_JOBS = {
  CALCULATE_VALUE: 'valuation:calculate',
  SCREEN_STOCKS: 'valuation:screen',
  DETECT_ANOMALIES: 'valuation:anomalies',
  GENERATE_SHAP: 'valuation:shap',
};
```

---

## 7. API Endpoint Yapisi

```typescript
// Duygu Pusulasi API
POST /api/market/emotion/analyze         // Metin analizi
GET  /api/market/emotion/:symbol         // Sembol duygu durumu
GET  /api/market/emotion/aggregate       // Toplu duygu metrikleri
POST /api/market/emotion/batch           // Toplu analiz

// Sinyal Avcisi API
GET  /api/market/signals/:symbol         // Sembol sinyalleri
GET  /api/market/signals/:symbol/scored  // Skorlanmis sinyaller
GET  /api/market/signals/:symbol/fused   // Fuzyonlanmis sinyal
GET  /api/market/regime                  // Piyasa rejimi

// Account Sniper API
GET  /api/valuation/:symbol              // Sirket degerleme
GET  /api/valuation/:symbol/explain      // SHAP aciklamasi
POST /api/valuation/screen               // Hisse tarama
GET  /api/valuation/:symbol/anomalies    // Anomali tespiti
```

---

## 8. Uygulama Asamalari ve Zaman Cizelgesi

### Asama 1: Altyapi (1-2 hafta)
- [ ] Veritabani tablolarini olustur (emotion_*, signal_*, valuation_*)
- [ ] BullMQ job turlerini tanimla
- [ ] Temel servis iskeletlerini olustur
- [ ] API route yapisini kur

### Asama 2: Dijital Duygu Pusulasi MVP (2-3 hafta)
- [ ] FinBERT entegrasyonu (Hugging Face API)
- [ ] emotion-compass-service implementasyonu
- [ ] Haber ve sosyal medya kaynak entegrasyonu
- [ ] Duygu agregasyon mantigi
- [ ] Feature Engineering'e emotion layer ekleme

### Asama 3: NASDAQ Sinyal Avcisi (3-4 hafta)
- [ ] signal-harvester-service implementasyonu
- [ ] Mevcut Unusual Whales/Polygon entegrasyonu
- [ ] signal-scorer-service implementasyonu
- [ ] Rejim tespit algoritmasi
- [ ] Prediction Engine'e microstructure layer ekleme

### Asama 4: Account Sniper (2-3 hafta)
- [ ] account-valuation-service implementasyonu
- [ ] DCF ve karsilastirmali degerleme modulleri
- [ ] SHAP entegrasyonu (Python worker)
- [ ] account-insight-service implementasyonu

### Asama 5: Optimizasyon (Opsiyonel, 2+ hafta)
- [ ] Rust/Python hibrit mimari (performans gerekirse)
- [ ] GPU inference optimizasyonu
- [ ] TLS parmak izi gizleme (yasal degerlendirme sonrasi)

---

## 9. Teknik Riskler ve Cozumler

| Risk | Etki | Cozum |
|------|------|-------|
| GPU eksikligi (FinBERT) | Yuksek | Hugging Face API veya distil model kullan |
| Gercek zamanli veri lisanslari | Orta | 15dk gecikmeli verilerle basla |
| JA3 Spoofing yasal riski | Yuksek | Temel planda devre disi, izole test ortami |
| Rust/Python karmasikligi | Orta | Sadece Python worker ile basla |
| SHAP hesaplama maliyeti | Dusuk | Batch isleme ve cache stratejisi |

---

## 10. Mevcut Servis Baglantilari

```
+---------------------------+
|   Mevcut Market Domain    |
+---------------------------+
|                           |
| prediction-engine ----+---|---> Yeni emotion & microstructure weights
| technical-analysis ---|---|---> signal-scorer ile veri paylasimi
| fred-service ---------|---|---> Ekonomik rejim signal-scorer'a beslenir
| sam-analysis ---------|---|---> Duygu pusulasi ile sentiment fuzyon
| stock-bot-service ----+---|---> Sinyal sonuclari ile alarm uretimi
|                           |
+---------------------------+

+---------------------------+
|   Mevcut Core Domain      |
+---------------------------+
|                           |
| scraping-service ---------|---> emotion-compass kaynak verisi
| ai-chat-service ----------|---> Degerleme/sinyal sonuclari chat'e
| automation-service -------|---> Otomatik sinyal bildirimleri
|                           |
+---------------------------+
```

---

## 11. Sonuc

Bu mimari plan, Merf.ai platformuna uc guclu finansal istihbarat modulunu entegre etmek icin kapsamli bir yol haritasi sunmaktadir. Asamali yaklasim, riskleri minimize ederken deger uretmeye hizli baslamayi saglar.

**Baslangic Onerisi**: Dijital Duygu Pusulasi MVP ile baslayin - FinBERT entegrasyonu Hugging Face API kullanarak hizlica kurulabilir ve mevcut prediction-engine'e yeni bir duygu katmani ekler.
