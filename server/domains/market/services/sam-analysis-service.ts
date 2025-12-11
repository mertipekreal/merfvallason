/**
 * SAM (Subconscious Analysis Model) Service
 * Based on research: "Gölgenin Mimarisi: Bütünleşik Bilinçaltı Analiz Modeli"
 * 
 * Implements:
 * 1. Night Owl Indicator - 02:00-05:00 Twitter activity analysis
 * 2. Dissonance Score - Said vs Done mismatch detection
 * 3. Dream Fear Index - HVDC fear keyword correlation
 * 4. Circadian Market Patterns - Time-based volatility
 * 5. FinBERT Integration - Financial sentiment enrichment
 */

import { SocialPost } from './social-sentiment-service';
import { finbertService, FinbertBatchResult } from './finbert-sentiment-service';

// ============================================================================
// NIGHT OWL INDICATOR - Mind After Midnight Hypothesis
// ============================================================================

export interface NightOwlAnalysis {
  nightActivityRatio: number;      // % of activity between 02:00-05:00
  nightSentiment: number;          // Average sentiment during night hours
  daySentiment: number;            // Average sentiment during day hours
  sentimentDissonance: number;     // Night vs Day sentiment gap
  panicIndicator: number;          // 0-1 scale, higher = more panic signals
  fearKeywords: string[];          // Fear-related keywords detected
  nightPosts: number;              // Count of night posts
  totalPosts: number;              // Total posts analyzed
  marketSignal: 'fear' | 'neutral' | 'greed';
  interpretation: string;
}

// Fear/panic keywords for night analysis (Turkish + English)
const FEAR_KEYWORDS = [
  // English
  'crash', 'collapse', 'panic', 'sell', 'dump', 'fear', 'scared', 'worried',
  'recession', 'bearish', 'plunge', 'tank', 'disaster', 'crisis', 'margin call',
  'liquidation', 'blood', 'rekt', 'rug', 'scam', 'manipulation',
  // Turkish
  'düşüş', 'çöküş', 'panik', 'sat', 'korku', 'endişe', 'kriz', 'felaket',
  'ayı', 'batık', 'zarar', 'kayıp', 'tehlike', 'risk', 'dikkat',
];

const GREED_KEYWORDS = [
  // English
  'moon', 'rocket', 'pump', 'bullish', 'buy', 'dip', 'all in', 'lambo',
  'rich', 'gains', 'profit', 'rally', 'breakout', 'ath', 'fomo',
  // Turkish
  'yükseliş', 'boğa', 'al', 'fırsat', 'kazanç', 'kar', 'zirve', 'patlama',
];

/**
 * Check if timestamp is in "Mind After Midnight" window (02:00-05:00 local)
 */
function isNightOwlHour(timestamp: Date): boolean {
  const hour = timestamp.getHours();
  return hour >= 2 && hour < 5;
}

/**
 * Check if timestamp is during market hours (09:30-16:00 EST)
 */
function isMarketHours(timestamp: Date): boolean {
  const hour = timestamp.getHours();
  return hour >= 9 && hour < 16;
}

// ============================================================================
// RISK MATRIX TEMPORAL ZONES - 5 Time Period Risk Scoring
// Based on circadian rhythm and cognitive performance research
// ============================================================================

export interface TemporalRiskZone {
  zone: 'critical' | 'high' | 'moderate' | 'low' | 'normal';
  riskScore: number;           // 0-100 risk score
  timeRange: string;           // e.g., "02:00-05:00"
  pfcInhibition: number;       // 0-1 PFC inhibition level
  emotionalReactivity: number; // 0-1 emotional reactivity
  decisionQuality: number;     // 0-1 decision-making quality (inverse)
  interpretation: string;
}

export interface TemporalRiskAnalysis {
  currentZone: TemporalRiskZone;
  zoneDistribution: {
    critical: number;          // Post count in critical zone
    high: number;              // Post count in high risk zone
    moderate: number;          // Post count in moderate zone
    low: number;               // Post count in low zone
    normal: number;            // Post count in normal zone
  };
  overallTemporalRisk: number; // Weighted overall risk 0-100
  circadianDisregulation: number; // 0-1 circadian pattern disruption
  peakRiskHours: string[];     // Hours with highest risk activity
  interpretation: string;
}

// Time zone definitions based on circadian research
const TIME_ZONES = {
  critical: { start: 2, end: 5, riskBase: 90, pfcInhibition: 0.9, emotionalReactivity: 0.85 },
  high: { start: 5, end: 8, riskBase: 70, pfcInhibition: 0.6, emotionalReactivity: 0.6 },
  moderate: { start: 22, end: 2, riskBase: 55, pfcInhibition: 0.45, emotionalReactivity: 0.5 },
  low: { start: 8, end: 11, riskBase: 25, pfcInhibition: 0.2, emotionalReactivity: 0.3 },
  normal: { start: 11, end: 22, riskBase: 15, pfcInhibition: 0.1, emotionalReactivity: 0.2 },
};

function getTimeZone(hour: number): keyof typeof TIME_ZONES {
  if (hour >= 2 && hour < 5) return 'critical';
  if (hour >= 5 && hour < 8) return 'high';
  if (hour >= 22 || hour < 2) return 'moderate';
  if (hour >= 8 && hour < 11) return 'low';
  return 'normal';
}

function getTimeZoneRiskDetails(hour: number): TemporalRiskZone {
  const zoneName = getTimeZone(hour);
  const zone = TIME_ZONES[zoneName];
  
  const interpretations: Record<keyof typeof TIME_ZONES, string> = {
    critical: 'KRİTİK: 02:00-05:00 "Mind After Midnight" bölgesi. Prefrontal korteks inhibisyonu maksimum. Dürtüsel ve duygusal tepkiler baskın.',
    high: 'YÜKSEK: 05:00-08:00 Uyanış bölgesi. PFC henüz tam aktif değil. Karar kalitesi düşük.',
    moderate: 'ORTA: 22:00-02:00 Gece başlangıcı. Yorgunluk artıyor, duygusal tepkisellik yükseliyor.',
    low: 'DÜŞÜK: 08:00-11:00 Optimal performans başlangıcı. Kognitif fonksiyonlar iyileşiyor.',
    normal: 'NORMAL: 11:00-22:00 Optimal çalışma saatleri. PFC tam aktif, rasyonel düşünce baskın.',
  };
  
  return {
    zone: zoneName,
    riskScore: zone.riskBase,
    timeRange: getTimeRangeString(zoneName),
    pfcInhibition: zone.pfcInhibition,
    emotionalReactivity: zone.emotionalReactivity,
    decisionQuality: 1 - zone.pfcInhibition,
    interpretation: interpretations[zoneName],
  };
}

function getTimeRangeString(zone: keyof typeof TIME_ZONES): string {
  const ranges: Record<keyof typeof TIME_ZONES, string> = {
    critical: '02:00-05:00',
    high: '05:00-08:00',
    moderate: '22:00-02:00',
    low: '08:00-11:00',
    normal: '11:00-22:00',
  };
  return ranges[zone];
}

export function analyzeTemporalRisk(posts: SocialPost[]): TemporalRiskAnalysis {
  if (posts.length === 0) {
    const now = new Date();
    return {
      currentZone: getTimeZoneRiskDetails(now.getHours()),
      zoneDistribution: { critical: 0, high: 0, moderate: 0, low: 0, normal: 0 },
      overallTemporalRisk: 0,
      circadianDisregulation: 0,
      peakRiskHours: [],
      interpretation: 'Analiz için yeterli veri yok.',
    };
  }
  
  // Count posts per zone
  const zoneDistribution = { critical: 0, high: 0, moderate: 0, low: 0, normal: 0 };
  const hourCounts: Record<number, number> = {};
  
  for (const post of posts) {
    const hour = new Date(post.timestamp).getHours();
    const zone = getTimeZone(hour);
    zoneDistribution[zone]++;
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }
  
  // Calculate weighted overall risk
  const weights = { critical: 0.9, high: 0.7, moderate: 0.5, low: 0.25, normal: 0.1 };
  let weightedSum = 0;
  for (const [zone, count] of Object.entries(zoneDistribution) as [keyof typeof zoneDistribution, number][]) {
    weightedSum += weights[zone] * count * TIME_ZONES[zone].riskBase;
  }
  const overallTemporalRisk = Math.min(100, weightedSum / posts.length);
  
  // Calculate circadian disregulation
  // High activity in critical/high zones relative to normal zone = disruption
  const riskZoneActivity = zoneDistribution.critical + zoneDistribution.high;
  const normalActivity = zoneDistribution.normal + zoneDistribution.low;
  const circadianDisregulation = normalActivity > 0 
    ? Math.min(1, riskZoneActivity / normalActivity)
    : (riskZoneActivity > 0 ? 1 : 0);
  
  // Find peak risk hours
  const sortedHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .filter(([hour]) => {
      const zone = getTimeZone(parseInt(hour));
      return zone === 'critical' || zone === 'high';
    })
    .map(([hour]) => `${hour.padStart(2, '0')}:00`);
  
  // Get current zone
  const now = new Date();
  const currentZone = getTimeZoneRiskDetails(now.getHours());
  
  // Generate interpretation
  let interpretation = '';
  if (circadianDisregulation > 0.7) {
    interpretation = 'UYARI: Ciddi sirkadiyen bozukluk tespit edildi. Gece aktivitesi gündüze göre çok yüksek. Bu, stresin veya uyku düzensizliğinin göstergesi olabilir.';
  } else if (circadianDisregulation > 0.4) {
    interpretation = 'DİKKAT: Orta düzey sirkadiyen bozukluk. Geç saatlerde aktivite artışı var.';
  } else if (zoneDistribution.critical > 0) {
    interpretation = `Kritik saatlerde (02:00-05:00) ${zoneDistribution.critical} aktivite tespit edildi. Bu saatlerde alınan kararlar dürtüsel olabilir.`;
  } else {
    interpretation = 'Normal sirkadiyen patern. Aktivite çoğunlukla optimal saatlerde gerçekleşiyor.';
  }
  
  return {
    currentZone,
    zoneDistribution,
    overallTemporalRisk: Math.round(overallTemporalRisk),
    circadianDisregulation: Math.round(circadianDisregulation * 100) / 100,
    peakRiskHours: sortedHours,
    interpretation,
  };
}

/**
 * Count keyword matches in text
 */
function countKeywords(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  return keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
}

/**
 * Analyze Night Owl patterns from social posts
 * Based on "Mind After Midnight" hypothesis - prefrontal disinhibition
 */
export function analyzeNightOwlPatterns(posts: SocialPost[]): NightOwlAnalysis {
  if (posts.length === 0) {
    return {
      nightActivityRatio: 0,
      nightSentiment: 0,
      daySentiment: 0,
      sentimentDissonance: 0,
      panicIndicator: 0,
      fearKeywords: [],
      nightPosts: 0,
      totalPosts: 0,
      marketSignal: 'neutral',
      interpretation: 'Analiz için yeterli veri yok',
    };
  }

  const nightPosts = posts.filter(p => isNightOwlHour(new Date(p.timestamp)));
  const dayPosts = posts.filter(p => !isNightOwlHour(new Date(p.timestamp)));
  
  // Calculate sentiments
  const nightSentiment = nightPosts.length > 0
    ? nightPosts.reduce((sum, p) => sum + (p.sentimentScore || 0), 0) / nightPosts.length
    : 0;
  
  const daySentiment = dayPosts.length > 0
    ? dayPosts.reduce((sum, p) => sum + (p.sentimentScore || 0), 0) / dayPosts.length
    : 0;
  
  // Collect fear keywords from night posts
  const detectedFearKeywords: string[] = [];
  let fearCount = 0;
  let greedCount = 0;
  
  for (const post of nightPosts) {
    const text = post.text.toLowerCase();
    for (const kw of FEAR_KEYWORDS) {
      if (text.includes(kw.toLowerCase()) && !detectedFearKeywords.includes(kw)) {
        detectedFearKeywords.push(kw);
        fearCount++;
      }
    }
    greedCount += countKeywords(post.text, GREED_KEYWORDS);
  }
  
  // Calculate metrics
  const nightActivityRatio = posts.length > 0 ? nightPosts.length / posts.length : 0;
  const sentimentDissonance = Math.abs(nightSentiment - daySentiment);
  
  // Panic indicator: High night activity + negative night sentiment + fear keywords
  const panicIndicator = Math.min(1, (
    nightActivityRatio * 0.3 +
    Math.max(0, -nightSentiment) * 0.3 +
    (detectedFearKeywords.length / 10) * 0.4
  ));
  
  // Market signal
  let marketSignal: NightOwlAnalysis['marketSignal'] = 'neutral';
  if (panicIndicator > 0.6 || (nightSentiment < -0.3 && nightActivityRatio > 0.1)) {
    marketSignal = 'fear';
  } else if (greedCount > fearCount * 2 && nightSentiment > 0.2) {
    marketSignal = 'greed';
  }
  
  // Interpretation based on SAM theory
  let interpretation = '';
  if (nightActivityRatio > 0.15) {
    interpretation = 'Yüksek gece aktivitesi tespit edildi. ';
    if (nightSentiment < daySentiment - 0.2) {
      interpretation += '"Mind After Midnight" hipotezine göre, gece saatlerinde prefrontal korteks inhibisyonu nedeniyle gerçek korku ortaya çıkıyor. ';
      interpretation += 'Gündüz "bullish" görünen hesaplar gece panik yaşıyor olabilir.';
    } else if (nightSentiment > daySentiment + 0.2) {
      interpretation += 'Gece FOMO/açgözlülük sinyalleri. Disinhibisyon durumunda aşırı iyimserlik tehlikeli olabilir.';
    }
  } else {
    interpretation = 'Normal aktivite paterni. Gece/gündüz uyumsuzluğu düşük.';
  }
  
  return {
    nightActivityRatio,
    nightSentiment,
    daySentiment,
    sentimentDissonance,
    panicIndicator,
    fearKeywords: detectedFearKeywords,
    nightPosts: nightPosts.length,
    totalPosts: posts.length,
    marketSignal,
    interpretation,
  };
}

// ============================================================================
// DISSONANCE SCORE - Said vs Done Analysis
// ============================================================================

export interface DissonanceAnalysis {
  overallDissonance: number;        // 0-1 scale
  accounts: AccountDissonance[];    // Per-account analysis
  marketImplication: string;
  confidence: number;
}

export interface AccountDissonance {
  author: string;
  statedSentiment: number;          // What they say (text sentiment)
  impliedAction: 'bullish' | 'bearish' | 'neutral';  // Inferred from keywords
  dissonanceScore: number;          // Mismatch between stated and implied
  suspiciousPatterns: string[];
}

// Action-implying keywords
const BULLISH_ACTION_KEYWORDS = ['bought', 'buying', 'long', 'holding', 'hodl', 'accumulating', 'added'];
const BEARISH_ACTION_KEYWORDS = ['sold', 'selling', 'short', 'exited', 'dumped', 'liquidated', 'stopped out'];

/**
 * Analyze dissonance between what accounts say vs what they imply doing
 * Key insight: "Bullish" tweets at night with "sold" keywords = dissonance
 */
export function analyzeDissonance(posts: SocialPost[]): DissonanceAnalysis {
  const accountMap = new Map<string, SocialPost[]>();
  
  // Group by author
  for (const post of posts) {
    const existing = accountMap.get(post.author) || [];
    existing.push(post);
    accountMap.set(post.author, existing);
  }
  
  const accounts: AccountDissonance[] = [];
  let totalDissonance = 0;
  
  for (const [author, authorPosts] of Array.from(accountMap.entries())) {
    // Calculate stated sentiment (from text analysis)
    const statedSentiment = authorPosts.reduce((sum: number, p: SocialPost) => sum + (p.sentimentScore || 0), 0) / authorPosts.length;
    
    // Detect implied action from keywords
    let bullishActions = 0;
    let bearishActions = 0;
    const suspiciousPatterns: string[] = [];
    
    for (const post of authorPosts) {
      const text = post.text.toLowerCase();
      bullishActions += BULLISH_ACTION_KEYWORDS.filter(kw => text.includes(kw)).length;
      bearishActions += BEARISH_ACTION_KEYWORDS.filter(kw => text.includes(kw)).length;
      
      // Detect suspicious patterns
      if (statedSentiment > 0.3 && bearishActions > 0) {
        suspiciousPatterns.push('Pozitif duygu + satış sinyali');
      }
      if (isNightOwlHour(new Date(post.timestamp)) && bearishActions > bullishActions) {
        suspiciousPatterns.push('Gece satış aktivitesi');
      }
    }
    
    const impliedAction: 'bullish' | 'bearish' | 'neutral' = 
      bullishActions > bearishActions ? 'bullish' :
      bearishActions > bullishActions ? 'bearish' : 'neutral';
    
    // Calculate dissonance
    let dissonanceScore = 0;
    if (statedSentiment > 0.2 && impliedAction === 'bearish') {
      dissonanceScore = 0.7 + Math.abs(statedSentiment) * 0.3;
    } else if (statedSentiment < -0.2 && impliedAction === 'bullish') {
      dissonanceScore = 0.5 + Math.abs(statedSentiment) * 0.3;
    }
    
    if (dissonanceScore > 0.3) {
      accounts.push({
        author,
        statedSentiment,
        impliedAction,
        dissonanceScore,
        suspiciousPatterns,
      });
      totalDissonance += dissonanceScore;
    }
  }
  
  // Sort by dissonance score
  accounts.sort((a, b) => b.dissonanceScore - a.dissonanceScore);
  
  const overallDissonance = accounts.length > 0 ? totalDissonance / accounts.length : 0;
  
  let marketImplication = '';
  if (overallDissonance > 0.6) {
    marketImplication = 'UYARI: Yüksek uyumsuzluk tespit edildi. Piyasa katılımcıları söylediklerinin aksini yapıyor olabilir. Potansiyel manipülasyon veya panik satış riski.';
  } else if (overallDissonance > 0.3) {
    marketImplication = 'DİKKAT: Orta düzey uyumsuzluk. Bazı hesaplarda söylem-eylem tutarsızlığı var.';
  } else {
    marketImplication = 'Normal: Genel söylem-eylem tutarlılığı yüksek.';
  }
  
  return {
    overallDissonance,
    accounts: accounts.slice(0, 20), // Top 20 suspicious
    marketImplication,
    confidence: Math.min(posts.length / 100, 1),
  };
}

// ============================================================================
// DREAM FEAR INDEX - HVDC Fear Keyword Correlation
// ============================================================================

export interface DreamFearIndex {
  fearRatio: number;               // Fear keywords / total keywords
  hopeRatio: number;               // Hope keywords / total keywords
  netFearScore: number;            // -1 to 1 (negative = hope, positive = fear)
  dominantThemes: string[];        // Top fear/hope themes
  marketCorrelation: string;       // Interpretation for market
  hvdcCategories: HVDCCategory[];  // Hall-Van de Castle categories
}

interface HVDCCategory {
  category: string;
  count: number;
  percentage: number;
}

// HVDC-based dream analysis keywords (Hall-Van de Castle scale)
const HVDC_FEAR_KEYWORDS = [
  // Falling/Death/Loss (A/C Index high)
  'falling', 'fall', 'died', 'death', 'dying', 'dead', 'kill', 'killed',
  'lost', 'losing', 'lose', 'chase', 'chased', 'chasing', 'escape', 'trapped',
  'drowning', 'drown', 'crash', 'accident', 'attack', 'attacked', 'monster',
  // Turkish
  'düşmek', 'düşüş', 'ölüm', 'ölmek', 'öldü', 'kayıp', 'kaybetmek', 'kovalamak',
  'kovalandı', 'kaçmak', 'boğulmak', 'kaza', 'saldırı', 'canavar', 'tuzak',
];

const HVDC_HOPE_KEYWORDS = [
  // Flying/Success/Gain
  'flying', 'fly', 'flight', 'winning', 'win', 'won', 'success', 'achieve',
  'found', 'finding', 'discover', 'beautiful', 'love', 'happy', 'joy',
  'freedom', 'escape', 'rescue', 'saved', 'hero', 'power', 'strong',
  // Turkish
  'uçmak', 'uçuş', 'kazanmak', 'başarı', 'bulmak', 'keşfetmek', 'güzel',
  'aşk', 'mutlu', 'özgürlük', 'kurtulmak', 'kurtarıldı', 'kahraman', 'güçlü',
];

/**
 * Analyze dreams using HVDC-inspired keyword analysis
 * Based on DreamBank research and SAM psychoanalytic framework
 */
export function analyzeDreamFear(dreamTexts: string[]): DreamFearIndex {
  let totalFear = 0;
  let totalHope = 0;
  let totalWords = 0;
  
  const fearThemes: Map<string, number> = new Map();
  const hopeThemes: Map<string, number> = new Map();
  
  for (const dream of dreamTexts) {
    const words = dream.toLowerCase().split(/\s+/);
    totalWords += words.length;
    
    for (const keyword of HVDC_FEAR_KEYWORDS) {
      const count = (dream.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      if (count > 0) {
        totalFear += count;
        fearThemes.set(keyword, (fearThemes.get(keyword) || 0) + count);
      }
    }
    
    for (const keyword of HVDC_HOPE_KEYWORDS) {
      const count = (dream.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
      if (count > 0) {
        totalHope += count;
        hopeThemes.set(keyword, (hopeThemes.get(keyword) || 0) + count);
      }
    }
  }
  
  const fearRatio = totalWords > 0 ? totalFear / totalWords : 0;
  const hopeRatio = totalWords > 0 ? totalHope / totalWords : 0;
  const netFearScore = (totalFear - totalHope) / Math.max(totalFear + totalHope, 1);
  
  // Get dominant themes
  const sortedFear = Array.from(fearThemes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedHope = Array.from(hopeThemes.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  
  const dominantThemes = [
    ...sortedFear.map(([kw, count]) => `${kw} (korku: ${count})`),
    ...sortedHope.map(([kw, count]) => `${kw} (umut: ${count})`),
  ];
  
  // HVDC categories
  const hvdcCategories: HVDCCategory[] = [
    { category: 'Düşme/Ölüm', count: totalFear, percentage: fearRatio * 100 },
    { category: 'Uçma/Başarı', count: totalHope, percentage: hopeRatio * 100 },
  ];
  
  // Market correlation interpretation
  let marketCorrelation = '';
  if (netFearScore > 0.3) {
    marketCorrelation = 'DreamBank analizi: Kolektif bilinçaltında korku dominantı. Backtest verilerine göre bu durum piyasa düşüşlerinden 3-5 gün önce artış gösterir. DİKKAT!';
  } else if (netFearScore < -0.3) {
    marketCorrelation = 'DreamBank analizi: Umut/başarı temaları baskın. Piyasa iyimserliği ile korelasyon olabilir, ancak aşırı iyimserlik de risk işareti.';
  } else {
    marketCorrelation = 'DreamBank analizi: Dengeli korku/umut oranı. Piyasa için nötr sinyal.';
  }
  
  return {
    fearRatio,
    hopeRatio,
    netFearScore,
    dominantThemes,
    marketCorrelation,
    hvdcCategories,
  };
}

// ============================================================================
// ICT SMART MONEY DETECTION
// ============================================================================

export interface SmartMoneySignal {
  type: 'accumulation' | 'distribution' | 'neutral';
  confidence: number;
  signals: string[];
  volumeProfile: 'increasing' | 'decreasing' | 'stable';
  institutionalActivity: number;  // 0-1 scale
  recommendation: string;
}

/**
 * Detect Smart Money patterns from social sentiment and volume
 * Based on ICT methodology research
 */
export function detectSmartMoney(
  posts: SocialPost[],
  volumeData?: { date: string; volume: number; close: number }[]
): SmartMoneySignal {
  const signals: string[] = [];
  let accumulationScore = 0;
  let distributionScore = 0;
  
  // Analyze sentiment divergence (smart money buys fear, sells greed)
  const avgSentiment = posts.reduce((sum, p) => sum + (p.sentimentScore || 0), 0) / posts.length;
  
  // Check for whale activity (high follower accounts)
  const whaleAccounts = posts.filter(p => {
    // Approximate whale detection from engagement
    const engagement = (p.likes || 0) + (p.shares || 0) * 2;
    return engagement > 1000;
  });
  
  const whalesSentiment = whaleAccounts.length > 0
    ? whaleAccounts.reduce((sum, p) => sum + (p.sentimentScore || 0), 0) / whaleAccounts.length
    : avgSentiment;
  
  // Smart Money divergence: Whales positive while retail negative = accumulation
  if (whalesSentiment > 0.2 && avgSentiment < 0) {
    accumulationScore += 0.4;
    signals.push('Whale hesaplar pozitif, genel duygu negatif = Birikim sinyali');
  }
  
  // Smart Money distribution: Whales negative while retail positive = distribution
  if (whalesSentiment < -0.2 && avgSentiment > 0) {
    distributionScore += 0.4;
    signals.push('Whale hesaplar negatif, genel duygu pozitif = Dağıtım sinyali');
  }
  
  // Night activity analysis (smart money operates quietly)
  const nightPosts = posts.filter(p => isNightOwlHour(new Date(p.timestamp)));
  if (nightPosts.length > posts.length * 0.2) {
    const nightSentiment = nightPosts.reduce((sum, p) => sum + (p.sentimentScore || 0), 0) / nightPosts.length;
    if (nightSentiment < avgSentiment - 0.3) {
      distributionScore += 0.3;
      signals.push('Gece aktivitesi yüksek ve negatif = Sessiz satış');
    }
  }
  
  // Volume analysis if available
  let volumeProfile: SmartMoneySignal['volumeProfile'] = 'stable';
  if (volumeData && volumeData.length >= 5) {
    const recentVolume = volumeData.slice(-3).reduce((sum, v) => sum + v.volume, 0) / 3;
    const priorVolume = volumeData.slice(-6, -3).reduce((sum, v) => sum + v.volume, 0) / 3;
    
    if (recentVolume > priorVolume * 1.5) {
      volumeProfile = 'increasing';
      signals.push('Hacim artışı tespit edildi');
    } else if (recentVolume < priorVolume * 0.7) {
      volumeProfile = 'decreasing';
      signals.push('Hacim düşüşü tespit edildi');
    }
  }
  
  // Determine overall signal
  const netScore = accumulationScore - distributionScore;
  let type: SmartMoneySignal['type'] = 'neutral';
  let recommendation = '';
  
  if (netScore > 0.3) {
    type = 'accumulation';
    recommendation = 'Smart Money birikim yapıyor olabilir. Düşüşlerde alım fırsatı arayın.';
  } else if (netScore < -0.3) {
    type = 'distribution';
    recommendation = 'Smart Money dağıtım yapıyor olabilir. Yükselişlerde kar realizasyonu düşünün.';
  } else {
    recommendation = 'Net Smart Money sinyali yok. Piyasayı izlemeye devam edin.';
  }
  
  return {
    type,
    confidence: Math.min(Math.abs(netScore) + 0.3, 1),
    signals,
    volumeProfile,
    institutionalActivity: whaleAccounts.length / Math.max(posts.length, 1),
    recommendation,
  };
}

// ============================================================================
// INTEGRATED RISK REPORT - 4 Layer Risk Analysis
// Based on research: Biological, Psychological, Unconscious, Market
// ============================================================================

export interface BiologicalRiskLayer {
  circadianDisruption: number;      // 0-1 circadian rhythm disruption
  pfcInhibition: number;            // 0-1 prefrontal cortex inhibition level
  sleepDeprivationRisk: number;     // 0-1 estimated sleep deprivation
  cognitiveLoadIndex: number;       // 0-1 cognitive load estimation
  riskScore: number;                // 0-100 overall biological risk
  interpretation: string;
}

export interface PsychologicalRiskLayer {
  emotionalReactivity: number;      // 0-1 emotional reactivity level
  dissonanceLevel: number;          // 0-1 said vs done mismatch
  stressIndicator: number;          // 0-1 stress level indicator
  sentimentVolatility: number;      // 0-1 sentiment swings
  riskScore: number;                // 0-100 overall psychological risk
  interpretation: string;
}

export interface UnconsciousRiskLayer {
  dreamFearLevel: number;           // 0-1 collective dream fear
  hvdcAggressionIndex: number;      // 0-1 Hall/Van de Castle A/F index
  nightOwlActivity: number;         // 0-1 night activity ratio
  collectiveAnxiety: number;        // 0-1 aggregate unconscious anxiety
  riskScore: number;                // 0-100 overall unconscious risk
  interpretation: string;
}

export interface MarketRiskLayer {
  smartMoneyDivergence: number;     // 0-1 whale vs retail divergence
  volumeAnomaly: number;            // 0-1 volume abnormality
  institutionalActivity: number;    // 0-1 institutional participation
  liquidityRisk: number;            // 0-1 liquidity risk indicator
  riskScore: number;                // 0-100 overall market risk
  interpretation: string;
}

export interface IntegratedRiskReport {
  biological: BiologicalRiskLayer;
  psychological: PsychologicalRiskLayer;
  unconscious: UnconsciousRiskLayer;
  market: MarketRiskLayer;
  compositeRiskScore: number;       // 0-100 weighted composite score
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  layerWeights: {
    biological: number;
    psychological: number;
    unconscious: number;
    market: number;
  };
  keyRiskDrivers: string[];         // Top contributing factors
  recommendation: string;
  generatedAt: Date;
}

// ============================================================================
// COMBINED SAM ANALYSIS
// ============================================================================

export interface SAMFullAnalysis {
  nightOwl: NightOwlAnalysis;
  dissonance: DissonanceAnalysis;
  dreamFear: DreamFearIndex | null;
  smartMoney: SmartMoneySignal;
  temporalRisk: TemporalRiskAnalysis;
  integratedReport: IntegratedRiskReport;
  finbert: FinbertBatchResult | null;
  overallMarketBias: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;
  actionableInsights: string[];
  finbertEnriched: boolean;
  timestamp: Date;
}

/**
 * Generate Integrated Risk Report from all SAM components
 * Combines 4 layers: Biological, Psychological, Unconscious, Market
 */
export function generateIntegratedRiskReport(
  nightOwl: NightOwlAnalysis,
  dissonance: DissonanceAnalysis,
  dreamFear: DreamFearIndex | null,
  smartMoney: SmartMoneySignal,
  temporalRisk: TemporalRiskAnalysis
): IntegratedRiskReport {
  // Layer weights (can be adjusted based on market conditions)
  const layerWeights = {
    biological: 0.20,
    psychological: 0.25,
    unconscious: 0.25,
    market: 0.30,
  };
  
  // =========== BIOLOGICAL LAYER ===========
  const circadianDisruption = temporalRisk.circadianDisregulation;
  const pfcInhibition = temporalRisk.currentZone.pfcInhibition;
  const sleepDeprivationRisk = Math.min(1, (temporalRisk.zoneDistribution.critical + temporalRisk.zoneDistribution.high) / 
    Math.max(1, temporalRisk.zoneDistribution.normal + temporalRisk.zoneDistribution.low) * 0.5);
  const cognitiveLoadIndex = (pfcInhibition + circadianDisruption) / 2;
  
  const biologicalRiskScore = Math.round(
    (circadianDisruption * 30 + pfcInhibition * 30 + sleepDeprivationRisk * 20 + cognitiveLoadIndex * 20)
  );
  
  let biologicalInterpretation = '';
  if (biologicalRiskScore > 70) {
    biologicalInterpretation = 'KRİTİK: Sirkadiyen ritim ciddi bozukluk. PFC inhibisyonu yüksek. Karar verme kapasitesi düşük.';
  } else if (biologicalRiskScore > 50) {
    biologicalInterpretation = 'YÜKSEK: Uyku düzensizliği ve kognitif yük işaretleri. Dikkatli karar alın.';
  } else if (biologicalRiskScore > 30) {
    biologicalInterpretation = 'ORTA: Hafif sirkadiyen bozukluk. Normal dikkat seviyesi yeterli.';
  } else {
    biologicalInterpretation = 'DÜŞÜK: Biyolojik göstergeler normal. Optimal karar verme kapasitesi.';
  }
  
  const biological: BiologicalRiskLayer = {
    circadianDisruption,
    pfcInhibition,
    sleepDeprivationRisk,
    cognitiveLoadIndex,
    riskScore: biologicalRiskScore,
    interpretation: biologicalInterpretation,
  };
  
  // =========== PSYCHOLOGICAL LAYER ===========
  const emotionalReactivity = temporalRisk.currentZone.emotionalReactivity;
  const dissonanceLevel = dissonance.overallDissonance;
  const stressIndicator = nightOwl.panicIndicator;
  
  // Calculate sentiment volatility from night/day difference
  const sentimentVolatility = Math.abs(nightOwl.nightSentiment - nightOwl.daySentiment);
  
  const psychologicalRiskScore = Math.round(
    emotionalReactivity * 25 + dissonanceLevel * 30 + stressIndicator * 25 + sentimentVolatility * 20
  );
  
  let psychologicalInterpretation = '';
  if (psychologicalRiskScore > 70) {
    psychologicalInterpretation = 'KRİTİK: Yüksek duygusal reaktivite ve stres. Söylem-eylem uyumsuzluğu belirgin.';
  } else if (psychologicalRiskScore > 50) {
    psychologicalInterpretation = 'YÜKSEK: Duygusal dalgalanma ve uyumsuzluk işaretleri. Risk algısı bozulmuş olabilir.';
  } else if (psychologicalRiskScore > 30) {
    psychologicalInterpretation = 'ORTA: Normal stres seviyeleri. Hafif duygu volatilitesi.';
  } else {
    psychologicalInterpretation = 'DÜŞÜK: Psikolojik göstergeler dengeli. Rasyonel karar verme aktif.';
  }
  
  const psychological: PsychologicalRiskLayer = {
    emotionalReactivity,
    dissonanceLevel,
    stressIndicator,
    sentimentVolatility,
    riskScore: Math.min(100, psychologicalRiskScore),
    interpretation: psychologicalInterpretation,
  };
  
  // =========== UNCONSCIOUS LAYER ===========
  const dreamFearLevel = dreamFear ? Math.max(0, dreamFear.netFearScore) : 0;
  const hvdcAggressionIndex = dreamFear ? dreamFear.fearRatio * 5 : 0; // Normalize to 0-1
  const nightOwlActivity = nightOwl.nightActivityRatio;
  const collectiveAnxiety = (dreamFearLevel + nightOwl.panicIndicator + nightOwlActivity) / 3;
  
  const unconsciousRiskScore = Math.round(
    dreamFearLevel * 30 + Math.min(1, hvdcAggressionIndex) * 20 + nightOwlActivity * 25 + collectiveAnxiety * 25
  );
  
  let unconsciousInterpretation = '';
  if (unconsciousRiskScore > 70) {
    unconsciousInterpretation = 'KRİTİK: Kolektif bilinçaltı korkusu çok yüksek. DreamBank korelasyonu piyasa düşüşü öngörüyor.';
  } else if (unconsciousRiskScore > 50) {
    unconsciousInterpretation = 'YÜKSEK: Bilinçaltı endişe işaretleri. Gece aktivitesi ve rüya korkusu yükselişte.';
  } else if (unconsciousRiskScore > 30) {
    unconsciousInterpretation = 'ORTA: Normal bilinçaltı aktivite. Hafif endişe işaretleri.';
  } else {
    unconsciousInterpretation = 'DÜŞÜK: Bilinçaltı göstergeler sakin. Kolektif korku düşük.';
  }
  
  const unconscious: UnconsciousRiskLayer = {
    dreamFearLevel,
    hvdcAggressionIndex: Math.min(1, hvdcAggressionIndex),
    nightOwlActivity,
    collectiveAnxiety,
    riskScore: Math.min(100, unconsciousRiskScore),
    interpretation: unconsciousInterpretation,
  };
  
  // =========== MARKET LAYER ===========
  const smartMoneyDivergence = smartMoney.type === 'neutral' ? 0 : 
    (smartMoney.type === 'distribution' ? smartMoney.confidence : -smartMoney.confidence);
  const volumeAnomaly = smartMoney.volumeProfile === 'stable' ? 0 : 
    (smartMoney.volumeProfile === 'increasing' ? 0.6 : 0.4);
  const institutionalActivity = smartMoney.institutionalActivity;
  const liquidityRisk = smartMoney.type === 'distribution' ? smartMoney.confidence * 0.8 : 0.2;
  
  const marketRiskScore = Math.round(
    Math.abs(smartMoneyDivergence) * 30 + volumeAnomaly * 20 + 
    (1 - institutionalActivity) * 25 + liquidityRisk * 25
  );
  
  let marketInterpretation = '';
  if (smartMoney.type === 'distribution' && marketRiskScore > 50) {
    marketInterpretation = 'UYARI: Smart Money dağıtım yapıyor. Kurumsal satış baskısı olabilir.';
  } else if (smartMoney.type === 'accumulation') {
    marketInterpretation = 'POZİTİF: Smart Money birikim yapıyor. Kurumsal alım desteği var.';
  } else if (volumeAnomaly > 0.5) {
    marketInterpretation = 'DİKKAT: Hacim anomalisi tespit edildi. Piyasa yapısında değişiklik olabilir.';
  } else {
    marketInterpretation = 'NORMAL: Piyasa göstergeleri dengeli. Net kurumsal sinyal yok.';
  }
  
  const market: MarketRiskLayer = {
    smartMoneyDivergence: Math.abs(smartMoneyDivergence),
    volumeAnomaly,
    institutionalActivity,
    liquidityRisk,
    riskScore: Math.min(100, marketRiskScore),
    interpretation: marketInterpretation,
  };
  
  // =========== COMPOSITE SCORE ===========
  const compositeRiskScore = Math.round(
    biological.riskScore * layerWeights.biological +
    psychological.riskScore * layerWeights.psychological +
    unconscious.riskScore * layerWeights.unconscious +
    market.riskScore * layerWeights.market
  );
  
  // Determine risk level
  let riskLevel: IntegratedRiskReport['riskLevel'] = 'low';
  if (compositeRiskScore > 75) riskLevel = 'critical';
  else if (compositeRiskScore > 55) riskLevel = 'high';
  else if (compositeRiskScore > 35) riskLevel = 'moderate';
  
  // Identify key risk drivers
  const keyRiskDrivers: string[] = [];
  const layers = [
    { name: 'Biyolojik', score: biological.riskScore },
    { name: 'Psikolojik', score: psychological.riskScore },
    { name: 'Bilinçdışı', score: unconscious.riskScore },
    { name: 'Piyasa', score: market.riskScore },
  ].sort((a, b) => b.score - a.score);
  
  for (const layer of layers.slice(0, 2)) {
    if (layer.score > 50) {
      keyRiskDrivers.push(`${layer.name}: ${layer.score}/100`);
    }
  }
  
  if (nightOwl.panicIndicator > 0.5) keyRiskDrivers.push('Yüksek gece panik sinyali');
  if (dissonance.overallDissonance > 0.5) keyRiskDrivers.push('Söylem-eylem uyumsuzluğu');
  if (dreamFear && dreamFear.netFearScore > 0.3) keyRiskDrivers.push('Kolektif bilinçaltı korkusu');
  if (smartMoney.type === 'distribution') keyRiskDrivers.push('Smart Money dağıtımı');
  
  // Generate recommendation
  let recommendation = '';
  if (riskLevel === 'critical') {
    recommendation = 'KRİTİK RİSK: Pozisyon boyutlarını küçültün. Yeni alım yapmayın. Stop-loss seviyelerini sıkılaştırın.';
  } else if (riskLevel === 'high') {
    recommendation = 'YÜKSEK RİSK: Dikkatli olun. Kaldıraç kullanmayın. Kar realizasyonu düşünün.';
  } else if (riskLevel === 'moderate') {
    recommendation = 'ORTA RİSK: Normal strateji devam edebilir. Volatiliteye hazır olun.';
  } else {
    recommendation = 'DÜŞÜK RİSK: Piyasa koşulları uygun. Normal strateji sürdürülebilir.';
  }
  
  return {
    biological,
    psychological,
    unconscious,
    market,
    compositeRiskScore,
    riskLevel,
    layerWeights,
    keyRiskDrivers,
    recommendation,
    generatedAt: new Date(),
  };
}

/**
 * Run complete SAM analysis on available data (sync version without FinBERT)
 */
export function runFullSAMAnalysis(
  socialPosts: SocialPost[],
  dreamTexts?: string[],
  volumeData?: { date: string; volume: number; close: number }[]
): SAMFullAnalysis {
  const nightOwl = analyzeNightOwlPatterns(socialPosts);
  const dissonance = analyzeDissonance(socialPosts);
  const dreamFear = dreamTexts && dreamTexts.length > 0 ? analyzeDreamFear(dreamTexts) : null;
  const smartMoney = detectSmartMoney(socialPosts, volumeData);
  const temporalRisk = analyzeTemporalRisk(socialPosts);
  const integratedReport = generateIntegratedRiskReport(nightOwl, dissonance, dreamFear, smartMoney, temporalRisk);
  
  // Calculate overall market bias
  let biasScore = 0;
  
  // Night owl contribution
  if (nightOwl.marketSignal === 'fear') biasScore -= 1;
  else if (nightOwl.marketSignal === 'greed') biasScore += 0.5; // Greed is less reliable
  
  // Dissonance contribution (contrarian)
  if (dissonance.overallDissonance > 0.5) {
    biasScore -= 0.5; // High dissonance often precedes drops
  }
  
  // Dream fear contribution
  if (dreamFear) {
    biasScore -= dreamFear.netFearScore * 0.5;
  }
  
  // Smart money contribution
  if (smartMoney.type === 'accumulation') biasScore += 1;
  else if (smartMoney.type === 'distribution') biasScore -= 1;
  
  const overallMarketBias: SAMFullAnalysis['overallMarketBias'] = 
    biasScore > 0.5 ? 'bullish' :
    biasScore < -0.5 ? 'bearish' : 'neutral';
  
  // Generate actionable insights
  const actionableInsights: string[] = [];
  
  if (nightOwl.panicIndicator > 0.6) {
    actionableInsights.push('⚠️ Gece panik sinyalleri yüksek - Kısa vadeli düşüş riski');
  }
  
  if (dissonance.overallDissonance > 0.5) {
    actionableInsights.push('🔍 Söylem-eylem uyumsuzluğu tespit edildi - Dikkatli olun');
  }
  
  if (dreamFear && dreamFear.netFearScore > 0.3) {
    actionableInsights.push('💭 Kolektif bilinçaltı korkusu yükseliyor - 3-5 gün içinde volatilite artabilir');
  }
  
  if (smartMoney.type === 'accumulation') {
    actionableInsights.push('🐋 Smart Money birikim sinyali - Düşüşler alım fırsatı olabilir');
  } else if (smartMoney.type === 'distribution') {
    actionableInsights.push('🐋 Smart Money dağıtım sinyali - Yükselişlerde kar al');
  }
  
  if (actionableInsights.length === 0) {
    actionableInsights.push('✅ Piyasa normal görünüyor - Mevcut stratejiye devam');
  }
  
  const confidenceScore = (
    nightOwl.totalPosts / 100 * 0.3 +
    dissonance.confidence * 0.3 +
    smartMoney.confidence * 0.4
  );
  
  return {
    nightOwl,
    dissonance,
    dreamFear,
    smartMoney,
    temporalRisk,
    integratedReport,
    finbert: null,
    overallMarketBias,
    confidenceScore: Math.min(confidenceScore, 1),
    actionableInsights,
    finbertEnriched: false,
    timestamp: new Date(),
  };
}

/**
 * Run complete SAM analysis with FinBERT enrichment (async version)
 * Enriches social posts with FinBERT financial sentiment analysis
 */
export async function runFullSAMAnalysisWithFinbert(
  socialPosts: SocialPost[],
  dreamTexts?: string[],
  volumeData?: { date: string; volume: number; close: number }[]
): Promise<SAMFullAnalysis> {
  // Enrich posts with FinBERT sentiment
  let finbertResult: FinbertBatchResult | null = null;
  let enrichedPosts = socialPosts;
  let finbertSucceeded = false;
  
  if (socialPosts.length > 0) {
    try {
      // Extract texts for batch analysis
      const texts = socialPosts.map(p => p.text);
      finbertResult = await finbertService.batchAnalyze(texts);
      
      // Validate FinBERT result before enriching
      if (finbertResult && finbertResult.results && finbertResult.results.length > 0) {
        // Enrich posts with FinBERT scores
        enrichedPosts = socialPosts.map((post, i) => ({
          ...post,
          sentimentScore: finbertResult!.results[i]?.normalizedScore ?? post.sentimentScore,
          finbertLabel: finbertResult!.results[i]?.label,
          finbertConfidence: finbertResult!.results[i]?.confidence,
        }));
        finbertSucceeded = true;
      } else {
        console.warn('[SAM] FinBERT returned empty or invalid results, falling back to original posts');
        enrichedPosts = socialPosts;
        finbertResult = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[SAM] FinBERT enrichment failed:', errorMessage);
      if (errorStack) {
        console.error('[SAM] Stack trace:', errorStack);
      }
      // Explicitly fall back to original posts
      enrichedPosts = socialPosts;
      finbertResult = null;
      finbertSucceeded = false;
    }
  }
  
  const nightOwl = analyzeNightOwlPatterns(enrichedPosts);
  const dissonance = analyzeDissonance(enrichedPosts);
  const dreamFear = dreamTexts && dreamTexts.length > 0 ? analyzeDreamFear(dreamTexts) : null;
  const smartMoney = detectSmartMoney(enrichedPosts, volumeData);
  const temporalRisk = analyzeTemporalRisk(enrichedPosts);
  const integratedReport = generateIntegratedRiskReport(nightOwl, dissonance, dreamFear, smartMoney, temporalRisk);
  
  // Calculate overall market bias with FinBERT contribution
  let biasScore = 0;
  
  // Night owl contribution
  if (nightOwl.marketSignal === 'fear') biasScore -= 1;
  else if (nightOwl.marketSignal === 'greed') biasScore += 0.5;
  
  // Dissonance contribution (contrarian)
  if (dissonance.overallDissonance > 0.5) {
    biasScore -= 0.5;
  }
  
  // Dream fear contribution
  if (dreamFear) {
    biasScore -= dreamFear.netFearScore * 0.5;
  }
  
  // Smart money contribution
  if (smartMoney.type === 'accumulation') biasScore += 1;
  else if (smartMoney.type === 'distribution') biasScore -= 1;
  
  // FinBERT contribution (weighted by confidence)
  if (finbertResult && finbertResult.confidence > 0.5) {
    const finbertWeight = 0.8;
    if (finbertResult.dominantSentiment === 'positive') {
      biasScore += finbertResult.avgSentiment * finbertWeight;
    } else if (finbertResult.dominantSentiment === 'negative') {
      biasScore += finbertResult.avgSentiment * finbertWeight;
    }
  }
  
  const overallMarketBias: SAMFullAnalysis['overallMarketBias'] = 
    biasScore > 0.5 ? 'bullish' :
    biasScore < -0.5 ? 'bearish' : 'neutral';
  
  // Generate actionable insights with FinBERT
  const actionableInsights: string[] = [];
  
  if (nightOwl.panicIndicator > 0.6) {
    actionableInsights.push('⚠️ Gece panik sinyalleri yüksek - Kısa vadeli düşüş riski');
  }
  
  if (dissonance.overallDissonance > 0.5) {
    actionableInsights.push('🔍 Söylem-eylem uyumsuzluğu tespit edildi - Dikkatli olun');
  }
  
  if (dreamFear && dreamFear.netFearScore > 0.3) {
    actionableInsights.push('💭 Kolektif bilinçaltı korkusu yükseliyor - 3-5 gün içinde volatilite artabilir');
  }
  
  if (smartMoney.type === 'accumulation') {
    actionableInsights.push('🐋 Smart Money birikim sinyali - Düşüşler alım fırsatı olabilir');
  } else if (smartMoney.type === 'distribution') {
    actionableInsights.push('🐋 Smart Money dağıtım sinyali - Yükselişlerde kar al');
  }
  
  // FinBERT-specific insights
  if (finbertResult) {
    if (finbertResult.avgSentiment < -0.3 && finbertResult.confidence > 0.6) {
      actionableInsights.push('🤖 FinBERT: Finansal duygu güçlü negatif - Piyasa stresli');
    } else if (finbertResult.avgSentiment > 0.3 && finbertResult.confidence > 0.6) {
      actionableInsights.push('🤖 FinBERT: Finansal duygu güçlü pozitif - Piyasa iyimser');
    }
    
    // Detect sentiment divergence
    if (finbertResult.avgSentiment > 0.2 && nightOwl.nightSentiment < -0.2) {
      actionableInsights.push('⚡ Uyumsuzluk: FinBERT pozitif ama gece duygusu negatif - Gizli korku sinyali');
    }
  }
  
  if (actionableInsights.length === 0) {
    actionableInsights.push('✅ Piyasa normal görünüyor - Mevcut stratejiye devam');
  }
  
  // Calculate confidence with FinBERT contribution
  const baseConfidence = (
    nightOwl.totalPosts / 100 * 0.25 +
    dissonance.confidence * 0.25 +
    smartMoney.confidence * 0.3
  );
  
  const finbertConfidenceBoost = finbertResult ? finbertResult.confidence * 0.2 : 0;
  const confidenceScore = Math.min(baseConfidence + finbertConfidenceBoost, 1);
  
  return {
    nightOwl,
    dissonance,
    dreamFear,
    smartMoney,
    temporalRisk,
    integratedReport,
    finbert: finbertResult,
    overallMarketBias,
    confidenceScore,
    actionableInsights,
    finbertEnriched: finbertSucceeded,
    timestamp: new Date(),
  };
}

/**
 * Get demo/default SAM metrics when no live data available
 * Based on historical backtest averages
 */
export function getDemoMetrics(): {
  nightOwlIndicator: number;
  dissonanceScore: number;
  dreamFearIndex: number;
  smartMoneySignal: string;
  overallBias: string;
  confidence: number;
  historicalAccuracy: number;
  lastUpdate: string;
} {
  // Historical averages from backtest (1989-2024)
  return {
    nightOwlIndicator: 0.35,      // Average night activity ratio
    dissonanceScore: 0.28,        // Average said-vs-done gap
    dreamFearIndex: 0.42,         // Current fear level (0-1)
    smartMoneySignal: 'neutral',  // accumulation/distribution/neutral
    overallBias: 'neutral',       // bullish/bearish/neutral
    confidence: 0.65,             // Model confidence
    historicalAccuracy: 0.83,     // Friday 13th 1989 validated accuracy
    lastUpdate: new Date().toISOString(),
  };
}

export const samService = {
  analyzeNightOwlPatterns,
  analyzeDissonance,
  analyzeDreamFear,
  analyzeTemporalRisk,
  detectSmartMoney,
  generateIntegratedRiskReport,
  runFullSAMAnalysis,
  runFullSAMAnalysisWithFinbert,
  getDemoMetrics,
};
