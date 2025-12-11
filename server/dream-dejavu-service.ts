import { log } from "./index";
import { 
  huggingfaceService, 
  cosineSimilarity, 
  composeDreamText, 
  composeDejavuText 
} from "./huggingface-service";
import type { 
  Dream, 
  DejavuEntry, 
  DreamMatch, 
  DreamMatchResult,
  DreamAnalysis,
  MatchMethod 
} from "@shared/schema";
import { openai, getOpenAIWithMetadata } from "./openai-client";

// Deep Dream Theme Extraction Types
export interface DeepDreamThemes {
  archetypes: string[];
  symbols: { symbol: string; meaning: string }[];
  characters: string[];
  locations: string[];
  emotions: { emotion: string; intensity: number }[];
  narrativePattern: string;
  psychologicalInsight: string;
}

// DejaVu Likelihood Analysis Types
export interface DejaVuLikelihood {
  score: number;              // 0–100: probability of triggering dejavu in the future
  riskLevel: "low" | "medium" | "high";
  keyMotifs: string[];        // symbols/themes that may trigger dejavu
  motifRiskScores: { motif: string; risk: number }[];  // individual motif risk scores
  emotionalIntensity: number; // 0–1 normalized emotional intensity
  noveltyScore: number;       // 0–1; how "unusual" the dream is
  repetitionScore: number;    // 0–1; similarity to past dreams
  patternNotes: string;       // explanation of why this score
}

// High-risk dejavu motifs in Turkish
const HIGH_RISK_MOTIFS = [
  { keywords: ["su", "deniz", "okyanus", "göl", "ırmak", "yağmur", "boğulma"], motif: "su", riskWeight: 0.8 },
  { keywords: ["düşme", "düşmek", "uçurum", "boşluk", "kayma"], motif: "düşüş", riskWeight: 0.85 },
  { keywords: ["koşma", "kaçma", "kovalama", "takip", "peşinde"], motif: "kaçış", riskWeight: 0.75 },
  { keywords: ["uçma", "uçmak", "havada", "gökyüzü", "kanat"], motif: "uçuş", riskWeight: 0.7 },
  { keywords: ["ev", "oda", "kapı", "merdiven", "koridor"], motif: "ev/mekan", riskWeight: 0.65 },
  { keywords: ["yolculuk", "araba", "tren", "otobüs", "uçak", "gemi"], motif: "yolculuk", riskWeight: 0.7 },
  { keywords: ["aile", "anne", "baba", "kardeş", "çocuk", "bebek"], motif: "aile", riskWeight: 0.6 },
  { keywords: ["kayıp", "kaybetme", "bulamama", "arama"], motif: "kayıp", riskWeight: 0.75 },
  { keywords: ["ölüm", "ölmek", "cenaze", "mezar"], motif: "ölüm", riskWeight: 0.9 },
  { keywords: ["sınav", "test", "okul", "geç kalma", "hazır değil"], motif: "sınav/stres", riskWeight: 0.65 },
  { keywords: ["çıplak", "utanç", "mahcup", "herkesin önünde"], motif: "maruziyet", riskWeight: 0.7 },
  { keywords: ["hayvan", "köpek", "kedi", "yılan", "örümcek"], motif: "hayvan", riskWeight: 0.55 },
  { keywords: ["ayna", "yansıma", "ikiz", "benzer"], motif: "yansıma/ikiz", riskWeight: 0.8 },
  { keywords: ["karanlık", "gece", "korku", "kabus"], motif: "karanlık/korku", riskWeight: 0.75 },
];

// Extract motifs and calculate risk scores
function extractMotifsWithRisk(dreamText: string): { motifs: string[]; motifRiskScores: { motif: string; risk: number }[]; avgRiskScore: number } {
  const lower = dreamText.toLowerCase();
  const foundMotifs: { motif: string; risk: number }[] = [];
  
  for (const motifDef of HIGH_RISK_MOTIFS) {
    for (const keyword of motifDef.keywords) {
      if (lower.includes(keyword)) {
        // Avoid duplicates
        if (!foundMotifs.find(m => m.motif === motifDef.motif)) {
          foundMotifs.push({ motif: motifDef.motif, risk: motifDef.riskWeight });
        }
        break;
      }
    }
  }
  
  const avgRiskScore = foundMotifs.length > 0 
    ? foundMotifs.reduce((sum, m) => sum + m.risk, 0) / foundMotifs.length 
    : 0;
  
  return {
    motifs: foundMotifs.map(m => m.motif),
    motifRiskScores: foundMotifs,
    avgRiskScore,
  };
}

// Calculate novelty score based on uniqueness
function calculateNoveltyScore(dream: Dream, allDreams: Dream[]): number {
  if (allDreams.length <= 1) return 0.5; // Neutral if not enough data
  
  const dreamEmbedding = dream.embedding as number[] | null;
  if (!dreamEmbedding?.length) return 0.5;
  
  // Calculate average similarity to other dreams
  let totalSimilarity = 0;
  let count = 0;
  
  for (const other of allDreams) {
    if (other.id === dream.id) continue;
    const otherEmbedding = other.embedding as number[] | null;
    if (otherEmbedding?.length) {
      totalSimilarity += cosineSimilarity(dreamEmbedding, otherEmbedding);
      count++;
    }
  }
  
  if (count === 0) return 0.5;
  
  const avgSimilarity = totalSimilarity / count;
  // Novelty = 1 - similarity (more unique = higher novelty)
  return Math.max(0, Math.min(1, 1 - avgSimilarity));
}

// Calculate repetition score
function calculateRepetitionScore(dream: Dream, allDreams: Dream[]): number {
  if (allDreams.length <= 1) return 0;
  
  const dreamText = `${dream.title} ${dream.description}`.toLowerCase();
  const dreamThemes = (dream.themes as string[] || []).map(t => t.toLowerCase());
  
  let repetitionCount = 0;
  
  for (const other of allDreams) {
    if (other.id === dream.id) continue;
    
    const otherText = `${other.title} ${other.description}`.toLowerCase();
    const otherThemes = (other.themes as string[] || []).map(t => t.toLowerCase());
    
    // Check for common themes
    const commonThemes = dreamThemes.filter(t => otherThemes.includes(t));
    if (commonThemes.length > 0) repetitionCount++;
    
    // Check for similar locations
    if (dream.location === other.location) repetitionCount += 0.5;
    
    // Check for similar emotions
    if (dream.emotion === other.emotion) repetitionCount += 0.3;
  }
  
  // Normalize to 0-1
  return Math.min(1, repetitionCount / Math.max(allDreams.length - 1, 1));
}

// Compute overall dejavu likelihood score
function computeDejaVuScore(features: {
  emotionalIntensity: number;
  noveltyScore: number;
  motifRiskScore: number;
  repetitionScore: number;
}): number {
  const { emotionalIntensity, noveltyScore, motifRiskScore, repetitionScore } = features;
  
  // Weights (can be adjusted)
  const wEmotion = 0.35;
  const wNovelty = 0.2;
  const wMotif = 0.25;
  const wRepeat = 0.2;
  
  const raw = 
    wEmotion * emotionalIntensity +
    wNovelty * noveltyScore +
    wMotif * motifRiskScore +
    wRepeat * repetitionScore;
  
  // 0–1 → 0–100
  return Math.round(raw * 100);
}

// Map score to risk level
function mapRiskLevel(score: number): "low" | "medium" | "high" {
  if (score < 35) return "low";
  if (score < 70) return "medium";
  return "high";
}

// Main DejaVu Likelihood Analysis function
export async function analyzeDreamDejaVuLikelihood(params: {
  dream: Dream;
  userDreamHistory: Dream[];
}): Promise<DejaVuLikelihood> {
  const { dream, userDreamHistory } = params;
  
  try {
    // Compose dream text for analysis
    const dreamText = composeDreamText({
      title: dream.title,
      description: dream.description,
      location: dream.location,
      emotion: dream.emotion,
      themes: dream.themes as string[] || [],
      objects: dream.objects as string[] || [],
    });
    
    // Extract motifs and calculate risk
    const { motifs, motifRiskScores, avgRiskScore } = extractMotifsWithRisk(dreamText);
    
    // Calculate emotional intensity (normalize 1-10 to 0-1)
    const emotionalIntensity = dream.intensity / 10;
    
    // Calculate novelty score
    const noveltyScore = calculateNoveltyScore(dream, userDreamHistory);
    
    // Calculate repetition score
    const repetitionScore = calculateRepetitionScore(dream, userDreamHistory);
    
    // Compute overall score
    const score = computeDejaVuScore({
      emotionalIntensity,
      noveltyScore,
      motifRiskScore: avgRiskScore,
      repetitionScore,
    });
    
    const riskLevel = mapRiskLevel(score);
    
    // Generate pattern notes with OpenAI
    let patternNotes = "";
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "Sen bir rüya analisti ve bilinçaltı uzmanısın. Kısa ve öz Türkçe yanıtlar ver."
          },
          { 
            role: "user", 
            content: `Bu rüyanın gelecekte dejavu tetikleme olasılığını açıkla (1-2 cümle):

Rüya: ${dreamText}
Duygusal yoğunluk: ${Math.round(emotionalIntensity * 100)}%
Tespit edilen motifler: ${motifs.join(", ") || "Belirgin motif yok"}
Benzersizlik skoru: ${Math.round(noveltyScore * 100)}%
Tekrar skoru: ${Math.round(repetitionScore * 100)}%
Dejavu olasılığı: %${score} (${riskLevel === 'high' ? 'yüksek' : riskLevel === 'medium' ? 'orta' : 'düşük'} risk)`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });
      
      patternNotes = response.choices[0]?.message?.content || "";
    } catch (e) {
      patternNotes = `%${score} dejavu olasılığı - ${motifs.length > 0 ? `${motifs.join(", ")} motifleri tespit edildi` : "Belirgin motif tespit edilmedi"}.`;
    }
    
    return {
      score,
      riskLevel,
      keyMotifs: motifs,
      motifRiskScores,
      emotionalIntensity,
      noveltyScore,
      repetitionScore,
      patternNotes,
    };
  } catch (error) {
    log(`[DreamService] DejaVu likelihood analysis error: ${error}`);
    return {
      score: 50,
      riskLevel: "medium",
      keyMotifs: [],
      motifRiskScores: [],
      emotionalIntensity: dream.intensity / 10,
      noveltyScore: 0.5,
      repetitionScore: 0,
      patternNotes: "Analiz tamamlanamadı.",
    };
  }
}

// Calculate days between dream and dejavu
export function calculateDaysBetween(dreamDate: Date | string, dejavuDate: Date | string): number {
  const d1 = new Date(dreamDate);
  const d2 = new Date(dejavuDate);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Deep Theme Extraction using OpenAI
export async function extractDeepThemes(dream: Dream): Promise<DeepDreamThemes> {
  try {
    const dreamText = composeDreamText({
      title: dream.title,
      description: dream.description,
      location: dream.location,
      emotion: dream.emotion,
      themes: dream.themes as string[] || [],
      objects: dream.objects as string[] || [],
    });

    const prompt = `Sen bir Jungcu rüya analisti ve sembol uzmanısın. Bu rüyayı derinlemesine analiz et.

RÜYA:
${dreamText}

Şu JSON formatında yanıt ver:
{
  "archetypes": ["Jungcu arketipler - Anima, Animus, Gölge, Persona, Yaşlı Bilge vb."],
  "symbols": [
    {"symbol": "sembol adı", "meaning": "psikolojik anlamı"}
  ],
  "characters": ["rüyada görülen karakter tipleri"],
  "locations": ["mekanların sembolik anlamları"],
  "emotions": [
    {"emotion": "duygu", "intensity": 1-10}
  ],
  "narrativePattern": "rüyanın anlatı kalıbı (kaçış, arayış, dönüşüm, yüzleşme vb.)",
  "psychologicalInsight": "rüyanın bilinçaltı mesajı hakkında 1-2 cümle"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Sen deneyimli bir Jungcu psikolog ve rüya analistsin. Rüyaları arketipsel ve sembolik açıdan derinlemesine yorumlarsın. Yanıtlarını her zaman geçerli JSON formatında ver."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI yanıt vermedi");
    }

    return JSON.parse(content) as DeepDreamThemes;
  } catch (error) {
    log(`[DreamService] Deep theme extraction error: ${error}`);
    return {
      archetypes: [],
      symbols: [],
      characters: [],
      locations: [],
      emotions: [{ emotion: dream.emotion, intensity: dream.intensity }],
      narrativePattern: "bilinmiyor",
      psychologicalInsight: "Analiz yapılamadı",
    };
  }
}

export async function generateDreamEmbedding(dream: {
  title: string;
  description: string;
  location: string;
  emotion: string;
  themes?: string[];
  objects?: string[];
}): Promise<number[]> {
  const text = composeDreamText(dream);
  log(`[DreamService] Generating embedding for dream: ${dream.title}`);
  return await huggingfaceService.generateEmbedding(text);
}

export async function generateDejavuEmbedding(dejavu: {
  description: string;
  location: string;
  emotion: string;
  triggerContext?: string;
}): Promise<number[]> {
  const text = composeDejavuText(dejavu);
  log(`[DreamService] Generating embedding for dejavu`);
  return await huggingfaceService.generateEmbedding(text);
}

export function findDreamMatches(
  targetEmbedding: number[],
  dreams: Dream[],
  topN: number = 5,
  minScore: number = 0.3
): { dreamId: string; score: number }[] {
  const candidates = dreams
    .filter(d => d.embedding && (d.embedding as number[]).length > 0)
    .map(d => ({
      id: d.id,
      embedding: d.embedding as number[],
    }));

  return huggingfaceService.findTopMatches(targetEmbedding, candidates, topN, minScore)
    .map(m => ({ dreamId: m.id, score: m.score }));
}

export function findDejavuMatches(
  targetEmbedding: number[],
  dejavu: DejavuEntry[],
  topN: number = 5,
  minScore: number = 0.3
): { dejavuId: string; score: number }[] {
  const candidates = dejavu
    .filter(d => d.embedding && (d.embedding as number[]).length > 0)
    .map(d => ({
      id: d.id,
      embedding: d.embedding as number[],
    }));

  return huggingfaceService.findTopMatches(targetEmbedding, candidates, topN, minScore)
    .map(m => ({ dejavuId: m.id, score: m.score }));
}

export async function analyzeDreamWithAI(
  dream: Dream,
  relatedMatches: DreamMatchResult[]
): Promise<DreamAnalysis> {
  try {
    const dreamText = composeDreamText({
      title: dream.title,
      description: dream.description,
      location: dream.location,
      emotion: dream.emotion,
      themes: dream.themes as string[] || [],
      objects: dream.objects as string[] || [],
    });

    const matchContext = relatedMatches.length > 0
      ? `\n\nİlişkili Dejavu Deneyimleri:\n${relatedMatches.map((m, i) => 
          `${i + 1}. (Benzerlik: ${(m.similarityScore * 100).toFixed(1)}%) - ${m.dejavu.description}`
        ).join('\n')}`
      : '';

    const prompt = `Sen bir rüya analisti ve psikolojik danışmansın. Aşağıdaki rüyayı analiz et ve Türkçe olarak yanıtla.

RÜYA:
${dreamText}
${matchContext}

Lütfen şu formatta JSON yanıt ver:
{
  "emotionalProfile": {
    "primaryEmotion": "ana duygu",
    "emotionalIntensity": 1-10 arası sayı,
    "sentimentScore": -1 ile 1 arası sayı (negatif/pozitif)
  },
  "thematicPatterns": ["tema1", "tema2", "tema3"],
  "symbolInterpretation": "Rüyadaki sembollerin psikolojik yorumu",
  "potentialMeaning": "Rüyanın olası anlamı ve bilinçaltı mesajları"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Sen deneyimli bir rüya analisti ve Jungcu psikolojist sin. Rüyaları sembolik ve arketipsel açıdan yorumlarsın. Yanıtlarını her zaman geçerli JSON formatında ver."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI yanıt vermedi");
    }

    const analysis = JSON.parse(content);

    return {
      dreamId: dream.id,
      emotionalProfile: {
        primaryEmotion: analysis.emotionalProfile?.primaryEmotion || dream.emotion,
        emotionalIntensity: analysis.emotionalProfile?.emotionalIntensity || dream.intensity,
        sentimentScore: analysis.emotionalProfile?.sentimentScore || 0,
      },
      thematicPatterns: analysis.thematicPatterns || dream.themes as string[] || [],
      symbolInterpretation: analysis.symbolInterpretation || "Sembol yorumu yapılamadı",
      potentialMeaning: analysis.potentialMeaning || "Anlam çıkarımı yapılamadı",
      relatedDejavu: relatedMatches,
    };
  } catch (error) {
    log(`[DreamService] AI analysis error: ${error}`);
    return {
      dreamId: dream.id,
      emotionalProfile: {
        primaryEmotion: dream.emotion,
        emotionalIntensity: dream.intensity,
        sentimentScore: 0,
      },
      thematicPatterns: dream.themes as string[] || [],
      symbolInterpretation: "Analiz yapılamadı",
      potentialMeaning: "AI analizi şu an kullanılamıyor",
      relatedDejavu: relatedMatches,
    };
  }
}

// Enhanced Match Analysis Result Type
export interface EnhancedMatchAnalysis {
  summary: string;
  commonMotifs: string[];
  emotionalConnection: string;
  timeDimensionInsight: string;
  daysBetween: number;
  connectionStrength: 'güçlü' | 'orta' | 'zayıf';
  predictiveNote: string;
}

export async function generateMatchAnalysis(
  dream: Dream,
  dejavu: DejavuEntry,
  similarityScore: number
): Promise<string> {
  try {
    const enhanced = await generateEnhancedMatchAnalysis(dream, dejavu, similarityScore);
    return enhanced.summary;
  } catch (error) {
    log(`[DreamService] Match analysis error: ${error}`);
    return `Benzerlik skoru: ${(similarityScore * 100).toFixed(1)}%. Mekan ve duygu bazlı eşleşme tespit edildi.`;
  }
}

export async function generateEnhancedMatchAnalysis(
  dream: Dream,
  dejavu: DejavuEntry,
  similarityScore: number
): Promise<EnhancedMatchAnalysis> {
  try {
    const dreamText = composeDreamText({
      title: dream.title,
      description: dream.description,
      location: dream.location,
      emotion: dream.emotion,
      themes: dream.themes as string[] || [],
      objects: dream.objects as string[] || [],
    });

    const dejavuText = composeDejavuText({
      description: dejavu.description,
      location: dejavu.location,
      emotion: dejavu.emotion,
      triggerContext: dejavu.triggerContext || undefined,
    });

    // Calculate time dimension
    const daysBetween = calculateDaysBetween(dream.dreamDate, dejavu.entryDate);
    const timeContext = daysBetween === 0 ? "aynı gün" :
                        daysBetween <= 3 ? `${daysBetween} gün sonra (kısa vadeli)` :
                        daysBetween <= 7 ? `${daysBetween} gün sonra (bir hafta içinde)` :
                        daysBetween <= 30 ? `${daysBetween} gün sonra (bir ay içinde)` :
                        `${daysBetween} gün sonra (uzun vadeli)`;

    const prompt = `Bir rüya ve dejavu deneyimi arasındaki derin bağlantıyı analiz et.

RÜYA (${formatDateTR(dream.dreamDate)}):
${dreamText}

DEJAVU DENEYİMİ (${formatDateTR(dejavu.entryDate)}):
${dejavuText}

ZAMAN BOYUTU: Dejavu, rüyadan ${timeContext} yaşandı.
Benzerlik Skoru: ${(similarityScore * 100).toFixed(1)}%

Şu JSON formatında detaylı analiz yap:
{
  "summary": "Bu dejavu büyük ihtimalle şu rüyanızla ilişkili. Çünkü... (2-3 cümle, spesifik motiflerden bahset)",
  "commonMotifs": ["ortak motif 1", "ortak motif 2", "ortak motif 3"],
  "emotionalConnection": "duygusal bağlantının açıklaması",
  "timeDimensionInsight": "zaman aralığının psikolojik önemi",
  "connectionStrength": "güçlü/orta/zayıf",
  "predictiveNote": "gelecekte benzer deneyimler hakkında kısa bir öngörü"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Sen bir Jungcu psikolog ve bilinçaltı uzmanısın. Rüyalar ile gerçek hayat deneyimleri arasındaki derin bağlantıları analiz edersin. Her zaman spesifik ve anlamlı yorumlar yaparsın."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI yanıt vermedi");
    }

    const parsed = JSON.parse(content);
    return {
      ...parsed,
      daysBetween,
      connectionStrength: parsed.connectionStrength || (similarityScore >= 0.7 ? 'güçlü' : similarityScore >= 0.5 ? 'orta' : 'zayıf'),
    };
  } catch (error) {
    log(`[DreamService] Enhanced match analysis error: ${error}`);
    const daysBetween = calculateDaysBetween(dream.dreamDate, dejavu.entryDate);
    return {
      summary: `Benzerlik skoru: ${(similarityScore * 100).toFixed(1)}%. Mekan ve duygu bazlı eşleşme tespit edildi.`,
      commonMotifs: [dream.location === dejavu.location ? 'ortak mekan' : '', dream.emotion === dejavu.emotion ? 'ortak duygu' : ''].filter(Boolean),
      emotionalConnection: dream.emotion === dejavu.emotion ? `Her iki deneyimde de "${dream.emotion}" duygusu hissedilmiş.` : 'Farklı duygular mevcut.',
      timeDimensionInsight: `Deneyimler arasında ${daysBetween} gün var.`,
      daysBetween,
      connectionStrength: similarityScore >= 0.7 ? 'güçlü' : similarityScore >= 0.5 ? 'orta' : 'zayıf',
      predictiveNote: 'Daha fazla kayıt ile patern analizi yapılabilir.',
    };
  }
}

function formatDateTR(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function calculateFeatureBasedSimilarity(
  dream: Dream,
  dejavu: DejavuEntry
): number {
  let score = 0;
  let weights = 0;

  if (dream.location.toLowerCase() === dejavu.location.toLowerCase()) {
    score += 0.4;
  } else if (dream.location.includes(dejavu.location) || dejavu.location.includes(dream.location)) {
    score += 0.2;
  }
  weights += 0.4;

  if (dream.emotion.toLowerCase() === dejavu.emotion.toLowerCase()) {
    score += 0.35;
  }
  weights += 0.35;

  const intensityDiff = Math.abs(dream.intensity - dejavu.familiarity) / 10;
  score += (1 - intensityDiff) * 0.15;
  weights += 0.15;

  const descWords = dream.description.toLowerCase().split(/\s+/);
  const dejavuWords = dejavu.description.toLowerCase().split(/\s+/);
  const descSet = new Set(descWords);
  const dejavuSet = new Set(dejavuWords);
  const intersection = descWords.filter(w => dejavuSet.has(w) && w.length > 3);
  const unionSize = descSet.size + dejavuSet.size - intersection.length;
  const jaccard = intersection.length / Math.max(unionSize, 1);
  score += jaccard * 0.1;
  weights += 0.1;

  return score / weights;
}

export function hybridMatch(
  dream: Dream,
  dejavu: DejavuEntry
): { score: number; method: MatchMethod } {
  const dreamEmbedding = dream.embedding as number[] | null;
  const dejavuEmbedding = dejavu.embedding as number[] | null;

  if (dreamEmbedding?.length && dejavuEmbedding?.length) {
    const embeddingScore = cosineSimilarity(dreamEmbedding, dejavuEmbedding);
    const featureScore = calculateFeatureBasedSimilarity(dream, dejavu);
    const hybridScore = embeddingScore * 0.7 + featureScore * 0.3;
    return { score: hybridScore, method: 'hybrid' };
  }

  const featureScore = calculateFeatureBasedSimilarity(dream, dejavu);
  return { score: featureScore, method: 'cosine' };
}

// Find all matching dejavus for a specific dream
export interface DreamDejavuSuggestion {
  rank: number;
  dejavuId: string;
  dejavu: DejavuEntry;
  similarity: number;
  sharedMotifs: string[];
  emotionMatch: boolean;
  locationMatch: boolean;
  daysBetween: number;
  connectionStrength: 'güçlü' | 'orta' | 'zayıf';
  briefSummary: string;
}

const MIN_SIMILARITY_THRESHOLD = 0.3; // Minimum 30% similarity to include in suggestions

export async function findMatchesForDream(
  dream: Dream, 
  allDejavus: DejavuEntry[],
  topN: number = 5
): Promise<DreamDejavuSuggestion[]> {
  if (!allDejavus.length) {
    return [];
  }

  const dreamText = composeDreamText({
    title: dream.title,
    description: dream.description,
    location: dream.location,
    emotion: dream.emotion,
    themes: dream.themes as string[] || [],
    objects: dream.objects as string[] || [],
  });

  // Score all dejavus against this dream
  const scoredDejavus: { dejavu: DejavuEntry; score: number }[] = [];
  
  for (const dejavu of allDejavus) {
    const { score } = hybridMatch(dream, dejavu);
    // Only include matches above minimum threshold
    if (score >= MIN_SIMILARITY_THRESHOLD) {
      scoredDejavus.push({ dejavu, score });
    }
  }

  // Sort by score descending and take top N
  scoredDejavus.sort((a, b) => b.score - a.score);
  const topMatches = scoredDejavus.slice(0, topN);

  // Build suggestions
  const suggestions: DreamDejavuSuggestion[] = [];
  
  for (let i = 0; i < topMatches.length; i++) {
    const { dejavu, score } = topMatches[i];
    const similarity = Math.round(score * 100);
    
    // Find shared motifs
    const dreamMotifs = extractMotifsWithRisk(dreamText).motifs;
    const dejavuText = composeDejavuText({
      description: dejavu.description,
      location: dejavu.location,
      emotion: dejavu.emotion,
      triggerContext: dejavu.triggerContext || '',
    });
    const dejavuMotifs = extractMotifsWithRisk(dejavuText).motifs;
    const sharedMotifs = dreamMotifs.filter(m => dejavuMotifs.includes(m));
    
    // Calculate days between
    const daysBetween = calculateDaysBetween(dream.dreamDate, dejavu.entryDate);
    
    // Determine connection strength
    let connectionStrength: 'güçlü' | 'orta' | 'zayıf';
    if (similarity >= 70) connectionStrength = 'güçlü';
    else if (similarity >= 50) connectionStrength = 'orta';
    else connectionStrength = 'zayıf';
    
    // Generate brief summary
    let briefSummary = '';
    if (sharedMotifs.length > 0) {
      briefSummary = `Ortak temalar: ${sharedMotifs.join(', ')}. `;
    }
    if (dream.location === dejavu.location) {
      briefSummary += 'Aynı mekan. ';
    }
    if (dream.emotion === dejavu.emotion) {
      briefSummary += 'Aynı duygu durumu. ';
    }
    if (daysBetween === 0) {
      briefSummary += 'Aynı gün yaşanmış.';
    } else if (daysBetween <= 7) {
      briefSummary += `${daysBetween} gün arayla.`;
    }
    
    if (!briefSummary) {
      briefSummary = `%${similarity} benzerlik oranı ile eşleşme.`;
    }
    
    suggestions.push({
      rank: i + 1,
      dejavuId: dejavu.id,
      dejavu,
      similarity,
      sharedMotifs,
      emotionMatch: dream.emotion === dejavu.emotion,
      locationMatch: dream.location === dejavu.location,
      daysBetween,
      connectionStrength,
      briefSummary: briefSummary.trim(),
    });
  }
  
  return suggestions;
}

export const dreamDejavuService = {
  generateDreamEmbedding,
  generateDejavuEmbedding,
  findDreamMatches,
  findDejavuMatches,
  analyzeDreamWithAI,
  generateMatchAnalysis,
  generateEnhancedMatchAnalysis,
  calculateFeatureBasedSimilarity,
  hybridMatch,
  extractDeepThemes,
  calculateDaysBetween,
  analyzeDreamDejaVuLikelihood,
  findMatchesForDream,
};
