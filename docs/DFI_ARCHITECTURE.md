# Hibrit 'Dream Fear Index' (DFI) Mimarisi

**Kantitatif ve Temel Verilerin Entegrasyonu, Davranışsal Proksiler ve Backtest Metodolojileri**

Versiyon: 1.0  
Modül: Dream Fear Index (DFI)  
Odak: Quantamental Analiz, Veri Heterojenliği, Sinyal Füzyonu

---

## Yönetici Özeti

Finansal piyasaların analizi, tarihsel olarak iki ana disiplin arasında kesin bir ayrıma tabi tutulmuştur: piyasa fiyatı ve hacim verilerine dayanan teknik/kantitatif analiz ve ekonomik göstergeler ile şirket finansallarına odaklanan temel analiz. Ancak son yıllarda, hesaplama gücündeki artış ve alternatif veri kaynaklarının (büyük veri) erişilebilirliği, bu iki disiplini birleştiren **"Quantamental"** (Kantitatif ve Temel) yaklaşımın yükselişine zemin hazırlamıştır.

Bu rapor, piyasa psikolojisinin iki zıt kutbu olan spekülatif coşku ("Rüya") ve fizyolojik panik ("Korku") durumlarını ölçmek ve ticari bir stratejiye dönüştürmek amacıyla tasarlanan hibrit bir **"Dream Fear Index" (DFI)** sisteminin mimarisini detaylandırmaktadır.

---

## 1. Temel Mühendislik Zorluğu: Veri Heterojenliği

Bu hibrit yapının inşasında karşılaşılan en büyük mühendislik zorluğu **veri heterojenliği** sorunudur:

| Veri Tipi | Frekans | Örnek |
|-----------|---------|-------|
| Opsiyon Akışı | Mikrosaniye (tick data) | Unusual Whales API |
| Sosyal Medya | Dakika/Saat | Twitter sentiment |
| Makroekonomik | Aylık/Çeyreklik | GSYİH, Enflasyon, FRED |
| Rüya Verileri | Günlük | DreamBank, Kullanıcı girişi |

Bu farklı frekanslardaki verilerin matematiksel olarak tek bir modelde birleştirilmesi, modern algoritmik ticaretin en karmaşık problemlerinden biridir.

---

## 2. Çözüm Mimarisi

### 2.1. MIDAS (Mixed Data Sampling) Regresyonu

Farklı frekanslardaki verileri birleştirmek için MIDAS regresyonu kullanılır:

```typescript
interface MIDASInput {
  highFrequency: number[];    // Günlük/saatlik veriler
  lowFrequency: number[];     // Aylık/çeyreklik veriler
  weights: number[];          // Decay ağırlıkları
}

function midasRegression(input: MIDASInput): number {
  // Almon lag polynomial ağırlıklandırması
  const n = input.highFrequency.length;
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < n; i++) {
    // Üstel decay: yakın veriler daha ağır
    const weight = Math.exp(-0.1 * i);
    weightedSum += input.highFrequency[n - 1 - i] * weight;
    totalWeight += weight;
  }
  
  const highFreqComponent = weightedSum / totalWeight;
  const lowFreqComponent = input.lowFrequency[input.lowFrequency.length - 1];
  
  // Birleşik sinyal
  return 0.7 * highFreqComponent + 0.3 * lowFreqComponent;
}
```

### 2.2. Markov Rejim Değişim (MRS) Modeli

Piyasa rejimlerinin (volatilite durumlarının) dinamik tespiti için MRS modeli:

```typescript
type MarketRegime = 'low_volatility' | 'high_volatility' | 'crisis' | 'euphoria';

interface MRSState {
  currentRegime: MarketRegime;
  transitionProbability: number;
  regimeDuration: number;
  volatility: number;
}

function detectRegime(volatilityHistory: number[]): MRSState {
  const recentVol = volatilityHistory.slice(-20);
  const avgVol = recentVol.reduce((a, b) => a + b, 0) / recentVol.length;
  const historicalAvg = volatilityHistory.reduce((a, b) => a + b, 0) / volatilityHistory.length;
  
  let regime: MarketRegime;
  let transitionProb: number;
  
  if (avgVol < historicalAvg * 0.7) {
    regime = 'low_volatility';
    transitionProb = 0.15; // Düşük volatilite kalıcı değil
  } else if (avgVol > historicalAvg * 2.0) {
    regime = 'crisis';
    transitionProb = 0.4; // Kriz geçici
  } else if (avgVol > historicalAvg * 1.3) {
    regime = 'high_volatility';
    transitionProb = 0.25;
  } else {
    regime = 'euphoria';
    transitionProb = 0.2;
  }
  
  return {
    currentRegime: regime,
    transitionProbability: transitionProb,
    regimeDuration: calculateRegimeDuration(volatilityHistory, avgVol),
    volatility: avgVol
  };
}

function calculateRegimeDuration(history: number[], currentVol: number): number {
  let duration = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (Math.abs(history[i] - currentVol) / currentVol < 0.2) {
      duration++;
    } else {
      break;
    }
  }
  return duration;
}
```

### 2.3. Kalman Filtresi: Gürültülü Sinyal Füzyonu

```typescript
interface KalmanState {
  estimate: number;
  errorCovariance: number;
}

class KalmanFilter {
  private state: KalmanState;
  private processNoise: number;
  private measurementNoise: number;
  
  constructor(initialEstimate: number = 0) {
    this.state = {
      estimate: initialEstimate,
      errorCovariance: 1.0
    };
    this.processNoise = 0.01;
    this.measurementNoise = 0.1;
  }
  
  update(measurement: number): number {
    // Prediction step
    const predictedEstimate = this.state.estimate;
    const predictedCovariance = this.state.errorCovariance + this.processNoise;
    
    // Update step
    const kalmanGain = predictedCovariance / 
      (predictedCovariance + this.measurementNoise);
    
    this.state.estimate = predictedEstimate + 
      kalmanGain * (measurement - predictedEstimate);
    this.state.errorCovariance = (1 - kalmanGain) * predictedCovariance;
    
    return this.state.estimate;
  }
  
  getState(): KalmanState {
    return { ...this.state };
  }
}

// Çoklu sinyal füzyonu
function fuseSignals(signals: { value: number; confidence: number }[]): number {
  const kalman = new KalmanFilter();
  
  // Güven ağırlıklı sıralama
  const sortedSignals = signals.sort((a, b) => b.confidence - a.confidence);
  
  let fusedValue = 0;
  for (const signal of sortedSignals) {
    // Yüksek güvenli sinyaller daha düşük noise ile
    kalman['measurementNoise'] = 0.2 - signal.confidence * 0.15;
    fusedValue = kalman.update(signal.value);
  }
  
  return fusedValue;
}
```

---

## 3. Davranışsal Proksiler

### 3.1. "Korku" Bileşeni: Google Trends Uykusuzluk Aramaları

Nörobiyolojik temeller:

```typescript
interface InsomniaTrendData {
  keyword: string;
  searchVolume: number;
  weekOverWeek: number;
  region: string;
}

const FEAR_SEARCH_TERMS = [
  'insomnia',
  'cant sleep',
  'anxiety at night',
  'market crash',
  'recession coming',
  'stock market fear',
  // Türkçe
  'uyuyamıyorum',
  'gece kabusu',
  'ekonomik kriz',
  'borsa düşüşü'
];

function calculateFearFromSearchTrends(trends: InsomniaTrendData[]): number {
  const fearScore = trends
    .filter(t => FEAR_SEARCH_TERMS.some(term => 
      t.keyword.toLowerCase().includes(term.toLowerCase())
    ))
    .reduce((sum, t) => {
      // Haftalık artış daha önemli
      const weeklyMultiplier = t.weekOverWeek > 50 ? 2.0 : 
                               t.weekOverWeek > 20 ? 1.5 : 1.0;
      return sum + (t.searchVolume / 100) * weeklyMultiplier;
    }, 0);
  
  return Math.min(1.0, fearScore / 10);
}
```

### 3.2. "Rüya" Bileşeni: Balina Aktivitesi ve Gama Maruziyeti

```typescript
interface GammaExposure {
  ticker: string;
  netGamma: number;         // Pozitif = dealer long gamma
  gammaFlip: number;        // Flip seviyesi
  currentPrice: number;
  zeroGammaLevel: number;   // Gamma nötr seviye
}

function analyzeGammaExposure(exposure: GammaExposure): {
  signal: 'bullish' | 'bearish' | 'neutral';
  magnetLevel: number;
  volatilityExpectation: 'low' | 'high';
} {
  const priceVsFlip = exposure.currentPrice / exposure.gammaFlip;
  
  let signal: 'bullish' | 'bearish' | 'neutral';
  let volExpectation: 'low' | 'high';
  
  if (exposure.netGamma > 0) {
    // Dealer long gamma = düşük volatilite beklentisi
    volExpectation = 'low';
    signal = priceVsFlip > 1 ? 'bullish' : 'bearish';
  } else {
    // Dealer short gamma = yüksek volatilite beklentisi
    volExpectation = 'high';
    // Gamma squeeze potansiyeli
    signal = exposure.currentPrice > exposure.zeroGammaLevel ? 'bullish' : 'bearish';
  }
  
  return {
    signal,
    magnetLevel: exposure.gammaFlip,
    volatilityExpectation: volExpectation
  };
}

// Balina aktivitesi analizi
interface WhaleTransaction {
  ticker: string;
  size: number;           // Kontrat sayısı
  premium: number;        // Toplam prim ($)
  type: 'call' | 'put';
  side: 'buy' | 'sell';
  expiration: Date;
  strike: number;
}

function classifyWhaleIntent(txs: WhaleTransaction[]): {
  netBullishPremium: number;
  netBearishPremium: number;
  conviction: number;
  topPlays: string[];
} {
  const bullishPremium = txs
    .filter(t => 
      (t.type === 'call' && t.side === 'buy') ||
      (t.type === 'put' && t.side === 'sell')
    )
    .reduce((sum, t) => sum + t.premium, 0);
  
  const bearishPremium = txs
    .filter(t => 
      (t.type === 'put' && t.side === 'buy') ||
      (t.type === 'call' && t.side === 'sell')
    )
    .reduce((sum, t) => sum + t.premium, 0);
  
  const total = bullishPremium + bearishPremium;
  const conviction = total > 0 ? Math.abs(bullishPremium - bearishPremium) / total : 0;
  
  // En büyük işlemleri bul
  const topPlays = txs
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 5)
    .map(t => `${t.ticker} ${t.type.toUpperCase()} $${t.strike} ${t.side}`);
  
  return {
    netBullishPremium: bullishPremium,
    netBearishPremium: bearishPremium,
    conviction,
    topPlays
  };
}
```

---

## 4. Jung'un Kolektif Bilinçdışı ve Piyasa

Carl Jung'un "Kolektif Bilinçdışı" teorisinden yola çıkarak, piyasa katılımcılarının rasyonel olmayan davranışlarını yakalamak için somut proksiler:

### 4.1. Arketipsel Piyasa Döngüleri

```typescript
type ArchetypalPhase = 
  | 'accumulation'    // Wise Old Man - Sabırlı birikim
  | 'markup'          // Hero - Yükseliş macerası
  | 'distribution'    // Trickster - Dağıtım aldatmacası
  | 'markdown'        // Shadow - Düşüş korkusu
  | 'capitulation';   // Death/Rebirth - Teslimiyet ve yeniden doğuş

interface ArchetypalAnalysis {
  currentPhase: ArchetypalPhase;
  phaseStrength: number;
  nextPhaseProbability: number;
  collectiveEmotions: string[];
}

function identifyArchetypalPhase(
  priceAction: number[],
  volume: number[],
  sentiment: number[]
): ArchetypalAnalysis {
  const priceChange = (priceAction[priceAction.length - 1] - priceAction[0]) / priceAction[0];
  const volumeTrend = volume.slice(-5).reduce((a, b) => a + b, 0) / 
                      volume.slice(0, 5).reduce((a, b) => a + b, 0);
  const avgSentiment = sentiment.reduce((a, b) => a + b, 0) / sentiment.length;
  
  let phase: ArchetypalPhase;
  let emotions: string[];
  
  if (priceChange < -0.2 && avgSentiment < -0.5) {
    phase = 'capitulation';
    emotions = ['despair', 'surrender', 'rebirth'];
  } else if (priceChange < -0.1 && volumeTrend > 1.2) {
    phase = 'markdown';
    emotions = ['fear', 'panic', 'denial'];
  } else if (priceChange > 0 && priceChange < 0.1 && volumeTrend < 0.8) {
    phase = 'accumulation';
    emotions = ['patience', 'skepticism', 'hope'];
  } else if (priceChange > 0.1 && avgSentiment > 0.3) {
    phase = 'markup';
    emotions = ['excitement', 'greed', 'FOMO'];
  } else {
    phase = 'distribution';
    emotions = ['euphoria', 'complacency', 'overconfidence'];
  }
  
  return {
    currentPhase: phase,
    phaseStrength: Math.abs(priceChange) * volumeTrend,
    nextPhaseProbability: calculateTransitionProb(phase),
    collectiveEmotions: emotions
  };
}

function calculateTransitionProb(currentPhase: ArchetypalPhase): number {
  // Tarihsel ortalama faz süreleri
  const avgDurations: Record<ArchetypalPhase, number> = {
    'accumulation': 45,      // gün
    'markup': 120,
    'distribution': 30,
    'markdown': 60,
    'capitulation': 10
  };
  
  // Faz ne kadar uzun sürerse, geçiş olasılığı o kadar artar
  return 1 / avgDurations[currentPhase];
}
```

---

## 5. Backtest Metodolojisi

### 5.1. Walk-Forward Validation

```typescript
interface BacktestConfig {
  trainingWindow: number;     // Eğitim penceresi (gün)
  testWindow: number;         // Test penceresi (gün)
  stepSize: number;           // Kayma miktarı
  startDate: Date;
  endDate: Date;
}

interface BacktestResult {
  period: { start: Date; end: Date };
  accuracy: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  winRate: number;
}

async function walkForwardBacktest(
  config: BacktestConfig,
  signalGenerator: (data: any) => number
): Promise<BacktestResult[]> {
  const results: BacktestResult[] = [];
  let currentStart = config.startDate;
  
  while (currentStart < config.endDate) {
    const trainEnd = new Date(currentStart);
    trainEnd.setDate(trainEnd.getDate() + config.trainingWindow);
    
    const testEnd = new Date(trainEnd);
    testEnd.setDate(testEnd.getDate() + config.testWindow);
    
    if (testEnd > config.endDate) break;
    
    // Bu pencere için backtest yap
    const result = await runSingleBacktest(trainEnd, testEnd, signalGenerator);
    results.push(result);
    
    // Pencereyi kaydır
    currentStart = new Date(currentStart);
    currentStart.setDate(currentStart.getDate() + config.stepSize);
  }
  
  return results;
}
```

### 5.2. Monte Carlo Simülasyonu

```typescript
interface MonteCarloConfig {
  numSimulations: number;
  confidenceLevel: number;    // 0.95 = 95%
}

interface MonteCarloResult {
  expectedReturn: number;
  valueAtRisk: number;        // VaR at confidence level
  conditionalVaR: number;     // Expected Shortfall
  worstCase: number;
  bestCase: number;
  distribution: number[];
}

function monteCarloSimulation(
  historicalReturns: number[],
  holdingPeriod: number,
  config: MonteCarloConfig
): MonteCarloResult {
  const simResults: number[] = [];
  
  for (let sim = 0; sim < config.numSimulations; sim++) {
    let portfolioValue = 1.0;
    
    for (let day = 0; day < holdingPeriod; day++) {
      // Random return from historical distribution
      const randomIndex = Math.floor(Math.random() * historicalReturns.length);
      const dailyReturn = historicalReturns[randomIndex];
      portfolioValue *= (1 + dailyReturn);
    }
    
    simResults.push(portfolioValue - 1); // Net return
  }
  
  // Sonuçları sırala
  simResults.sort((a, b) => a - b);
  
  const varIndex = Math.floor((1 - config.confidenceLevel) * config.numSimulations);
  const var95 = simResults[varIndex];
  
  // Conditional VaR (Expected Shortfall)
  const tailLosses = simResults.slice(0, varIndex);
  const cvar = tailLosses.reduce((a, b) => a + b, 0) / tailLosses.length;
  
  return {
    expectedReturn: simResults.reduce((a, b) => a + b, 0) / simResults.length,
    valueAtRisk: var95,
    conditionalVaR: cvar,
    worstCase: simResults[0],
    bestCase: simResults[simResults.length - 1],
    distribution: simResults
  };
}
```

---

## 6. DFI Birleşik Hesaplama

### 6.1. Final Index Formülü

```typescript
interface DFIComponents {
  // Korku bileşenleri
  insomniaSearches: number;       // Google Trends
  vixLevel: number;               // VIX endeksi
  putCallRatio: number;           // Options P/C ratio
  nightOwlActivity: number;       // SAM Night Owl
  
  // Rüya bileşenleri  
  whaleNetBullish: number;        // Balina net yönü
  gammaExposure: number;          // Dealer gamma
  socialEuphoria: number;         // Sosyal medya coşkusu
  dreamHopeIndex: number;         // Rüya umut endeksi
  
  // Rejim
  marketRegime: MarketRegime;
}

function calculateDreamFearIndex(components: DFIComponents): {
  dfi: number;                    // -100 (extreme fear) to +100 (extreme dream)
  interpretation: string;
  tradingBias: 'long' | 'short' | 'neutral';
  confidence: number;
} {
  // Korku skoru (0-1)
  const fearScore = (
    components.insomniaSearches * 0.15 +
    (components.vixLevel / 100) * 0.25 +
    Math.min(components.putCallRatio / 2, 1) * 0.25 +
    components.nightOwlActivity * 0.20 +
    (1 - components.dreamHopeIndex) * 0.15
  );
  
  // Rüya skoru (0-1)
  const dreamScore = (
    ((components.whaleNetBullish + 1) / 2) * 0.30 +
    ((components.gammaExposure + 1) / 2) * 0.20 +
    components.socialEuphoria * 0.25 +
    components.dreamHopeIndex * 0.25
  );
  
  // DFI: -100 to +100
  const dfi = (dreamScore - fearScore) * 100;
  
  // Rejim ayarlaması
  const regimeMultiplier = {
    'low_volatility': 0.8,
    'high_volatility': 1.2,
    'crisis': 1.5,
    'euphoria': 0.7
  }[components.marketRegime];
  
  const adjustedDFI = dfi * regimeMultiplier;
  
  // Yorumlama
  let interpretation: string;
  let tradingBias: 'long' | 'short' | 'neutral';
  
  if (adjustedDFI < -50) {
    interpretation = 'EXTREME FEAR - Contrarian BUY zone';
    tradingBias = 'long';
  } else if (adjustedDFI < -20) {
    interpretation = 'FEAR - Accumulation opportunity';
    tradingBias = 'long';
  } else if (adjustedDFI > 50) {
    interpretation = 'EXTREME GREED - Contrarian SELL zone';
    tradingBias = 'short';
  } else if (adjustedDFI > 20) {
    interpretation = 'GREED - Distribution phase';
    tradingBias = 'short';
  } else {
    interpretation = 'NEUTRAL - Wait for signal';
    tradingBias = 'neutral';
  }
  
  // Confidence: bileşenlerin uyumu
  const componentStdev = calculateStdev([
    fearScore, 1 - dreamScore, 
    components.nightOwlActivity, 
    1 - components.whaleNetBullish
  ]);
  const confidence = 1 - componentStdev;
  
  return {
    dfi: Math.round(adjustedDFI),
    interpretation,
    tradingBias,
    confidence
  };
}

function calculateStdev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}
```

---

## 7. API Endpoint'leri

| Endpoint | Metod | Açıklama |
|----------|-------|----------|
| `/api/dfi/current` | GET | Güncel DFI değeri |
| `/api/dfi/components` | GET | Tüm DFI bileşenleri |
| `/api/dfi/history` | GET | Tarihsel DFI verileri |
| `/api/dfi/regime` | GET | Mevcut piyasa rejimi |
| `/api/dfi/backtest` | POST | Backtest simülasyonu |
| `/api/dfi/montecarlo` | POST | Monte Carlo analizi |

---

## 8. Referanslar

1. Ghysels, E., et al. (2004). "MIDAS Regressions: Further Results and New Directions." Econometric Reviews.

2. Hamilton, J.D. (1989). "A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle." Econometrica.

3. Kalman, R.E. (1960). "A New Approach to Linear Filtering and Prediction Problems." ASME Journal.

4. Jung, C.G. (1959). "The Archetypes and the Collective Unconscious." Princeton University Press.

5. Bouchaud, J.P. & Potters, M. (2003). "Theory of Financial Risk and Derivative Pricing." Cambridge University Press.

---

*Bu doküman MERF.AI Dream Fear Index sisteminin teknik mimarisini tanımlar.*  
*Son güncelleme: 7 Aralık 2025*
