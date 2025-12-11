/**
 * DuyguMotor v3.0 - DejaVu System
 * Complete DejaVu generation and detection with Gemini AI integration
 * 
 * 3 Core Engines:
 * 1. Dream Synthesis Engine - AI-powered dream narrative generation
 * 2. DejaVu Detector - Detects dejavu signals from dreams + behavior
 * 3. DejaVu Generator - Creates controlled dejavu scenarios
 */

import { db } from "../db";
import { dreams, dejavuDetections, dejavuScenarios, dreamSyntheses } from "@shared/schema";
import { eq, desc, sql, count, and, gte } from "drizzle-orm";
import { geminiAI } from "../domains/core/services/gemini-ai-service";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

// =============================================
// SCHEMAS
// =============================================

const DreamParamsSchema = z.object({
  primaryEmotion: z.enum(["fear", "joy", "sadness", "confusion", "wonder", "calm", "anxiety"]),
  symbols: z.array(z.string()).min(1).max(10),
  intensity: z.number().min(0).max(10),
  vividness: z.number().min(0).max(10),
  lucidity: z.number().min(0).max(10),
  duration: z.enum(["short", "medium", "long"]),
  language: z.string().default("tr"),
  style: z.enum(["surreal", "narrative", "fragmented", "symbolic"]).optional()
});

export type DreamParams = z.infer<typeof DreamParamsSchema>;

const DejaVuSignalSchema = z.object({
  dreamId: z.string(),
  dreamNarrative: z.string(),
  dreamSymbols: z.array(z.string()),
  dreamEmotion: z.string(),
  dreamDate: z.string(),
  currentSignals: z.object({
    location: z.string().optional(),
    activity: z.string().optional(),
    emotionDetected: z.string().optional(),
    socialContext: z.string().optional(),
    musicPlaying: z.string().optional()
  }),
  dreamEmbedding: z.array(z.number()).optional(),
  currentBehaviorEmbedding: z.array(z.number()).optional()
});

export type DejaVuSignal = z.infer<typeof DejaVuSignalSchema>;

const DejaVuGenerationParamsSchema = z.object({
  userId: z.string(),
  scenarioType: z.enum(["positive", "neutral", "challenging", "transformative"]),
  timeframe: z.enum(["1week", "1month", "3months", "6months"]),
  behaviorProfile: z.object({
    sleepQuality: z.number().min(0).max(10).optional(),
    socialEngagement: z.number().min(0).max(10).optional(),
    stressLevel: z.number().min(0).max(10).optional(),
    musicMood: z.record(z.number()).optional()
  }).optional()
});

export type DejaVuGenerationParams = z.infer<typeof DejaVuGenerationParamsSchema>;

// =============================================
// DREAM SYNTHESIS ENGINE
// =============================================

export interface GeneratedDream {
  narrative: string;
  symbolsFound: string[];
  emotionalArc: Array<{ moment: string; emotion: string }>;
  surrealismIndex: number;
  coherenceScore: number;
  timestamp: string;
}

export async function synthesizeDream(params: DreamParams): Promise<ToolResult<GeneratedDream>> {
  try {
    const validated = DreamParamsSchema.parse(params);

    const systemPrompt = `Sen usta bir rüya anlatıcısısın. Otantik, canlı ve psikolojik olarak gerçekçi rüyalar üretiyorsun.

KURALLAR:
1. Rüyalar sürreal: mekanlar değişir, insanlar yüz değiştirir, zaman lineer değil
2. Duygular anlatıyı yönlendirir, mantık değil
3. Duyusal detaylar ekle (sesler, dokular, renkler) ama kararsız olsunlar
4. Verilen sembolleri doğal kullan, zorlamadan
5. Yoğunluğa uy: yüksek = kaotik/canlı, düşük = puslu/yüzen
6. Fade-out veya ani geçişle bitir (tipik rüya sonu)

STİL:
- "surreal": lineer olmayan, mantıksız, rüya gibi
- "narrative": daha tutarlı hikaye akışı, ama yine rüyamsı
- "fragmented": hızlı sahne geçişleri, eksik anılar
- "symbolic": arketipsel imgeler, Jung temaları

JSON formatında yanıtla:
{
  "narrative": "Rüya metni (2-3 paragraf)",
  "symbolsFound": ["sembol1", "sembol2"],
  "emotionalArc": [{"moment": "Başlangıç", "emotion": "merak"}, {"moment": "Doruk", "emotion": "korku"}],
  "surrealismIndex": 0.8,
  "coherenceScore": 0.7
}`;

    const userPrompt = `${validated.duration} uzunluğunda bir rüya oluştur:
- Ana duygu: ${validated.primaryEmotion}
- Semboller: ${validated.symbols.join(", ")}
- Yoğunluk (0-10): ${validated.intensity}
- Canlılık (0-10): ${validated.vividness}
- Lucidite (0-10): ${validated.lucidity}
- Stil: ${validated.style || "surreal"}
- Dil: ${validated.language}

Otantik ve duygusal olarak tutarlı bir rüya yarat.`;

    const response = await geminiAI.generateStructuredContent(systemPrompt, userPrompt);
    
    const parsed = typeof response === 'string' ? JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}') : response;
    
    const result: GeneratedDream = {
      narrative: parsed.narrative || "Rüya oluşturulamadı",
      symbolsFound: parsed.symbolsFound || validated.symbols,
      emotionalArc: parsed.emotionalArc || [{ moment: "Genel", emotion: validated.primaryEmotion }],
      surrealismIndex: parsed.surrealismIndex || 0.7,
      coherenceScore: parsed.coherenceScore || 0.6,
      timestamp: new Date().toISOString()
    };

    if (db) {
      try {
        await db.insert(dreamSyntheses).values({
          id: uuidv4(),
          userId: null,
          generatedNarrative: result.narrative,
          symbolsFound: result.symbolsFound,
          emotionalArc: result.emotionalArc,
          surrealismIndex: result.surrealismIndex,
          coherenceScore: result.coherenceScore,
          parameters: validated as any
        });
      } catch (dbErr) {
        console.error("Failed to save dream synthesis:", dbErr);
      }
    }

    return {
      success: true,
      data: result,
      message: `Rüya başarıyla oluşturuldu. Sürrealizm indeksi: ${(result.surrealismIndex * 100).toFixed(0)}%`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Rüya oluşturulurken bir hata oluştu."
    };
  }
}

// =============================================
// DEJAVU DETECTOR
// =============================================

export interface DejaVuDetectionResult {
  isDejaVu: boolean;
  confidence: number;
  embeddingSimilarity: number;
  symbolOverlap: string[];
  emotionMatch: boolean;
  timeGapDays: number;
  narrativeConnection: string;
  psychologicalInterpretation: string;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  const dotProduct = a.reduce((sum, av, i) => sum + av * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, av) => sum + av * av, 0));
  const normB = Math.sqrt(b.reduce((sum, bv) => sum + bv * bv, 0));
  return normA && normB ? dotProduct / (normA * normB) : 0;
}

export async function detectDejaVu(signal: DejaVuSignal): Promise<ToolResult<DejaVuDetectionResult>> {
  try {
    const validated = DejaVuSignalSchema.parse(signal);

    const embeddingSimilarity = validated.dreamEmbedding && validated.currentBehaviorEmbedding
      ? cosineSimilarity(validated.dreamEmbedding, validated.currentBehaviorEmbedding)
      : 0;
    
    const similarityThreshold = 0.7;
    const couldBeDejaVu = embeddingSimilarity > similarityThreshold;

    const currentSymbols = [
      validated.currentSignals.location,
      validated.currentSignals.activity,
      validated.currentSignals.emotionDetected
    ].filter(Boolean) as string[];
    
    const symbolOverlap = validated.dreamSymbols.filter((sym) =>
      currentSymbols.some((cs) => cs.toLowerCase().includes(sym.toLowerCase()))
    );

    const emotionMatch = validated.currentSignals.emotionDetected?.toLowerCase() === 
      validated.dreamEmotion.toLowerCase();

    const dreamDate = new Date(validated.dreamDate);
    const currentDate = new Date();
    const timeGapDays = Math.floor((currentDate.getTime() - dreamDate.getTime()) / (1000 * 60 * 60 * 24));

    let narrativeConnection = "";
    let psychInterpretation = "";
    let confidence = 0;

    if (couldBeDejaVu || symbolOverlap.length > 0 || emotionMatch) {
      const systemPrompt = `Sen Jungian rüya psikoloğusun, dejavu analizinde uzmanlaşmış.
Geçmiş bir rüya ile şu anki yaşam olayı arasındaki bağlantıyı analiz et.
JSON formatında yanıtla: {"narrativeConnection": "Bağlantı açıklaması", "interpretation": "Psikolojik yorum", "confidence": 0.7}`;

      const userMessage = `
Rüya (${timeGapDays} gün önce):
Anlatı: ${validated.dreamNarrative}
Semboller: ${validated.dreamSymbols.join(", ")}
Duygu: ${validated.dreamEmotion}

Şu anki Olay:
Konum/Aktivite: ${validated.currentSignals.location || "bilinmiyor"} - ${validated.currentSignals.activity || "bilinmiyor"}
Duygu: ${validated.currentSignals.emotionDetected || "bilinmiyor"}
Sosyal: ${validated.currentSignals.socialContext || "bilinmiyor"}
Müzik: ${validated.currentSignals.musicPlaying || "yok"}

Eşleşen Semboller: ${symbolOverlap.join(", ") || "yok"}

Bu gerçek bir dejavu mı? Psikolojik anlamı nedir?`;

      try {
        const response = await geminiAI.generateStructuredContent(systemPrompt, userMessage);
        const parsed = typeof response === 'string' ? JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}') : response;
        
        narrativeConnection = parsed.narrativeConnection || "Bağlantı tespit edildi";
        psychInterpretation = parsed.interpretation || "Olası dejavu sinyali";
        confidence = parsed.confidence ?? 0.7;
      } catch (err) {
        confidence = embeddingSimilarity * 0.8 + (symbolOverlap.length > 0 ? 0.2 : 0);
        narrativeConnection = "Embedding ve sembol eşleşmesi tespit edildi.";
        psychInterpretation = "Olası dejavu sinyali; insan yorumu gerekebilir.";
      }
    }

    const isDejaVu = confidence > 0.6 && (symbolOverlap.length > 0 || emotionMatch);

    const result: DejaVuDetectionResult = {
      isDejaVu,
      confidence,
      embeddingSimilarity,
      symbolOverlap,
      emotionMatch,
      timeGapDays,
      narrativeConnection,
      psychologicalInterpretation: psychInterpretation
    };

    if (db && isDejaVu) {
      try {
        await db.insert(dejavuDetections).values({
          id: uuidv4(),
          userId: null,
          dreamId: validated.dreamId,
          embeddingSimilarity,
          symbolOverlap,
          isDejaVu,
          confidence,
          narrativeConnection,
          psychologicalInterpretation: psychInterpretation
        });
      } catch (dbErr) {
        console.error("Failed to save dejavu detection:", dbErr);
      }
    }

    return {
      success: true,
      data: result,
      message: isDejaVu 
        ? `DejaVu tespit edildi! Güven: ${(confidence * 100).toFixed(0)}%` 
        : "DejaVu tespit edilmedi."
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "DejaVu tespiti yapılırken bir hata oluştu."
    };
  }
}

// =============================================
// DEJAVU GENERATOR
// =============================================

export interface GeneratedDejaVuScenario {
  scenarioId: string;
  title: string;
  narrative: string;
  dreamReferences: string[];
  behaviorTriggers: string[];
  emotionalJourney: Array<{ phase: string; emotion: string }>;
  psychologicalMeaning: string;
  likelihood: number;
  timeframeEstimate: string;
  preparationSuggestions: string[];
}

export async function generateDejaVuScenario(params: DejaVuGenerationParams): Promise<ToolResult<GeneratedDejaVuScenario>> {
  try {
    const validated = DejaVuGenerationParamsSchema.parse(params);

    let userDreamHistory: any[] = [];
    if (db) {
      const recentDreams = await db
        .select()
        .from(dreams)
        .where(validated.userId ? eq(dreams.userId, validated.userId) : sql`1=1`)
        .orderBy(desc(dreams.createdAt))
        .limit(10);

      userDreamHistory = recentDreams.map(d => ({
        narrative: d.description || "",
        symbols: Array.isArray(d.objects) ? d.objects : [],
        emotions: [d.emotion].filter(Boolean),
        vividness: d.intensity || 5,
        date: d.dreamDate?.toISOString() || d.createdAt?.toISOString()
      }));
    }

    const topSymbols = extractTopSymbols(userDreamHistory, 5);
    const topEmotions = extractTopEmotions(userDreamHistory, 5);
    const avgVividness = userDreamHistory.length > 0
      ? userDreamHistory.reduce((sum, d) => sum + (d.vividness || 5), 0) / userDreamHistory.length
      : 5;

    const systemPrompt = `Sen psikolojik önsezi ve dejavu konusunda uzman bir senaryo yazarısın.
Görevin: kullanıcının hayatında GERÇEKLEŞEBİLECEK gerçekçi, duygusal açıdan zengin bir senaryo oluşturmak.

Bu senaryo:
1. Tekrarlayan rüya sembollerini ve duygularını uyanık hayat durumuna dahil etmeli
2. Kullanıcının davranış kalıplarını yansıtmalı
3. "Bunu rüyamda gördüm" hissi vermeli
4. Dönüştürücü ama gerçekçi olmalı (fantezi değil)
5. Psikolojik derinlik taşımalı (Jung arketipleri, gölge çalışması, bireyleşme)

JSON formatında yanıtla:
{
  "title": "Senaryo başlığı",
  "narrative": "3-4 paragraf canlı anlatı, ŞU AN oluyor gibi",
  "dreamReferences": ["rüyadan sembol1", "sembol2"],
  "behaviorTriggers": ["tetikleyici1", "tetikleyici2"],
  "emotionalJourney": [{"phase": "Başlangıç", "emotion": "merak"}, {"phase": "Doruk", "emotion": "aydınlanma"}],
  "psychologicalMeaning": "Psikolojik yorum",
  "likelihood": 0.7,
  "timeframeEstimate": "1-2 ay içinde",
  "preparationSuggestions": ["Öneri 1", "Öneri 2"]
}`;

    const userMessage = `${validated.scenarioType} tipinde bir dejavu senaryosu oluştur:

RÜYA GEÇMİŞİ ANALİZİ:
- Tekrarlayan semboller: ${topSymbols.join(", ") || "belirsiz"}
- Ana duygular: ${topEmotions.join(", ") || "belirsiz"}
- Ortalama canlılık: ${avgVividness.toFixed(1)}/10

DAVRANIŞ PROFİLİ:
- Uyku kalitesi: ${validated.behaviorProfile?.sleepQuality || 5}/10
- Sosyal etkileşim: ${validated.behaviorProfile?.socialEngagement || 5}/10
- Stres seviyesi: ${validated.behaviorProfile?.stressLevel || 5}/10

SENARYO PARAMETRELERİ:
- Tip: ${validated.scenarioType}
- Zaman çerçevesi: ${validated.timeframe}

Kullanıcının aniden tekrarlayan rüyalarını yansıtan bir an yaşadığı bir senaryo oluştur.
Spesifik, duygusal olarak yankı uyandıran ve psikolojik olarak anlamlı olsun.`;

    const response = await geminiAI.generateStructuredContent(systemPrompt, userMessage);
    const parsed = typeof response === 'string' ? JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}') : response;

    const scenarioId = `dejavu_${Date.now()}`;
    
    const result: GeneratedDejaVuScenario = {
      scenarioId,
      title: parsed.title || "Gizemli Kesişim",
      narrative: parsed.narrative || "Senaryo oluşturulamadı",
      dreamReferences: parsed.dreamReferences || topSymbols,
      behaviorTriggers: parsed.behaviorTriggers || [],
      emotionalJourney: parsed.emotionalJourney || [{ phase: "Genel", emotion: "merak" }],
      psychologicalMeaning: parsed.psychologicalMeaning || "Bilinçaltı ile bağlantı",
      likelihood: parsed.likelihood || 0.6,
      timeframeEstimate: parsed.timeframeEstimate || validated.timeframe,
      preparationSuggestions: parsed.preparationSuggestions || []
    };

    if (db) {
      try {
        await db.insert(dejavuScenarios).values({
          id: uuidv4(),
          userId: validated.userId || null,
          scenarioId: result.scenarioId,
          title: result.title,
          narrative: result.narrative,
          dreamReferences: result.dreamReferences,
          behaviorTriggers: result.behaviorTriggers,
          emotionalJourney: result.emotionalJourney,
          psychologicalMeaning: result.psychologicalMeaning,
          likelihood: result.likelihood,
          timeframeEstimate: result.timeframeEstimate,
          preparationSuggestions: result.preparationSuggestions,
          scenarioType: validated.scenarioType
        });
      } catch (dbErr) {
        console.error("Failed to save dejavu scenario:", dbErr);
      }
    }

    return {
      success: true,
      data: result,
      message: `DejaVu senaryosu oluşturuldu: "${result.title}". Gerçekleşme olasılığı: ${(result.likelihood * 100).toFixed(0)}%`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "DejaVu senaryosu oluşturulurken bir hata oluştu."
    };
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function extractTopSymbols(dreamHistory: any[], limit: number = 5): string[] {
  const symbolCount: Record<string, number> = {};
  dreamHistory.forEach((dream) => {
    (dream.symbols || []).forEach((sym: string) => {
      symbolCount[sym] = (symbolCount[sym] || 0) + 1;
    });
  });
  return Object.entries(symbolCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map((e) => e[0]);
}

function extractTopEmotions(dreamHistory: any[], limit: number = 5): string[] {
  const emotionCount: Record<string, number> = {};
  dreamHistory.forEach((dream) => {
    (dream.emotions || []).forEach((em: string) => {
      emotionCount[em] = (emotionCount[em] || 0) + 1;
    });
  });
  return Object.entries(emotionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map((e) => e[0]);
}

// =============================================
// ADDITIONAL QUERY FUNCTIONS
// =============================================

export async function getDejaVuStats(): Promise<ToolResult<{
  totalDetections: number;
  confirmedDejaVus: number;
  totalScenarios: number;
  avgConfidence: number;
  recentDetections: any[];
}>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const [detectionsResult] = await db
      .select({ count: count() })
      .from(dejavuDetections);
    
    const [confirmedResult] = await db
      .select({ count: count() })
      .from(dejavuDetections)
      .where(eq(dejavuDetections.isDejaVu, 1));

    const [scenariosResult] = await db
      .select({ count: count() })
      .from(dejavuScenarios);

    const avgConfidenceResult = await db
      .select({ avg: sql<number>`AVG(${dejavuDetections.confidence})` })
      .from(dejavuDetections)
      .where(eq(dejavuDetections.isDejaVu, 1));

    const recentDetections = await db
      .select()
      .from(dejavuDetections)
      .where(eq(dejavuDetections.isDejaVu, 1))
      .orderBy(desc(dejavuDetections.createdAt))
      .limit(5);

    return {
      success: true,
      data: {
        totalDetections: detectionsResult?.count || 0,
        confirmedDejaVus: confirmedResult?.count || 0,
        totalScenarios: scenariosResult?.count || 0,
        avgConfidence: avgConfidenceResult[0]?.avg || 0,
        recentDetections
      },
      message: `DejaVu istatistikleri: ${confirmedResult?.count || 0} onaylanmış dejavu, ${scenariosResult?.count || 0} senaryo.`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "DejaVu istatistikleri alınırken bir hata oluştu."
    };
  }
}

export async function listDejaVuScenarios(limit: number = 10): Promise<ToolResult<any[]>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const scenarios = await db
      .select()
      .from(dejavuScenarios)
      .orderBy(desc(dejavuScenarios.createdAt))
      .limit(limit);

    return {
      success: true,
      data: scenarios,
      message: `${scenarios.length} dejavu senaryosu listelendi.`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "DejaVu senaryoları alınırken bir hata oluştu."
    };
  }
}

export async function findDejaVuMatches(dreamId: string): Promise<ToolResult<{
  dream: any;
  potentialMatches: any[];
}>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const [dream] = await db
      .select()
      .from(dreams)
      .where(eq(dreams.id, dreamId))
      .limit(1);

    if (!dream) {
      return { success: false, error: "Dream not found", message: "Rüya bulunamadı." };
    }

    const dreamSymbols = Array.isArray(dream.objects) ? dream.objects : [];
    const dreamEmotion = dream.emotion || "";

    const allDreams = await db
      .select()
      .from(dreams)
      .where(sql`${dreams.id} != ${dreamId}`)
      .limit(100);

    const potentialMatches = allDreams
      .map(d => {
        const otherSymbols = Array.isArray(d.objects) ? d.objects : [];
        const symbolOverlap = dreamSymbols.filter((sym: string) =>
          otherSymbols.some((os: string) => os.toLowerCase().includes(sym.toLowerCase()))
        );
        const emotionMatch = d.emotion?.toLowerCase() === dreamEmotion.toLowerCase();
        const score = symbolOverlap.length * 0.3 + (emotionMatch ? 0.5 : 0);
        
        return {
          ...d,
          matchScore: score,
          symbolOverlap,
          emotionMatch
        };
      })
      .filter(m => m.matchScore > 0.2)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    return {
      success: true,
      data: {
        dream,
        potentialMatches
      },
      message: `${potentialMatches.length} potansiyel dejavu eşleşmesi bulundu.`
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "DejaVu eşleşmeleri aranırken bir hata oluştu."
    };
  }
}

// =============================================
// TOOL DEFINITIONS FOR GEMINI
// =============================================

export const dejavuToolDefinitions = [
  {
    name: "synthesize_dream",
    description: "AI ile yeni bir rüya anlatısı oluşturur. Duygu, semboller, yoğunluk ve stil belirtilebilir. Yaratıcı rüya içerikleri üretir.",
    parameters: {
      type: "object",
      properties: {
        primaryEmotion: {
          type: "string",
          enum: ["fear", "joy", "sadness", "confusion", "wonder", "calm", "anxiety"],
          description: "Rüyanın ana duygusu"
        },
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "Rüyada yer alacak semboller (örn: su, kapı, uçuş)"
        },
        intensity: {
          type: "number",
          description: "Yoğunluk seviyesi (0-10)"
        },
        vividness: {
          type: "number",
          description: "Canlılık seviyesi (0-10)"
        },
        lucidity: {
          type: "number",
          description: "Lucidite seviyesi (0-10)"
        },
        duration: {
          type: "string",
          enum: ["short", "medium", "long"],
          description: "Rüya uzunluğu"
        },
        style: {
          type: "string",
          enum: ["surreal", "narrative", "fragmented", "symbolic"],
          description: "Rüya stili"
        }
      },
      required: ["primaryEmotion", "symbols", "intensity", "vividness", "lucidity", "duration"]
    }
  },
  {
    name: "detect_dejavu",
    description: "Bir rüya ve şu anki davranış sinyallerini karşılaştırarak dejavu anı tespit eder. Sembol, duygu ve embedding benzerliği analiz eder.",
    parameters: {
      type: "object",
      properties: {
        dreamId: {
          type: "string",
          description: "Karşılaştırılacak rüya ID'si"
        },
        currentLocation: {
          type: "string",
          description: "Şu anki konum"
        },
        currentActivity: {
          type: "string",
          description: "Şu anki aktivite"
        },
        currentEmotion: {
          type: "string",
          description: "Şu anki duygu durumu"
        },
        musicPlaying: {
          type: "string",
          description: "Çalan müzik (varsa)"
        }
      },
      required: ["dreamId"]
    }
  },
  {
    name: "generate_dejavu_scenario",
    description: "Kullanıcının rüya geçmişi ve davranış profilini analiz ederek gelecekte yaşayabileceği dejavu senaryosu oluşturur.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Kullanıcı ID'si (opsiyonel)"
        },
        scenarioType: {
          type: "string",
          enum: ["positive", "neutral", "challenging", "transformative"],
          description: "Senaryo tipi"
        },
        timeframe: {
          type: "string",
          enum: ["1week", "1month", "3months", "6months"],
          description: "Zaman çerçevesi"
        },
        sleepQuality: {
          type: "number",
          description: "Uyku kalitesi (0-10)"
        },
        stressLevel: {
          type: "number",
          description: "Stres seviyesi (0-10)"
        }
      },
      required: ["scenarioType", "timeframe"]
    }
  },
  {
    name: "get_dejavu_stats",
    description: "DejaVu sisteminin genel istatistiklerini gösterir: tespit sayıları, ortalama güven skoru, son tespitler.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "list_dejavu_scenarios",
    description: "Oluşturulmuş dejavu senaryolarını listeler.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 10)"
        }
      },
      required: []
    }
  },
  {
    name: "find_dejavu_matches",
    description: "Belirli bir rüya için potansiyel dejavu eşleşmeleri bulur. Sembol ve duygu benzerliğine göre diğer rüyalarla karşılaştırır.",
    parameters: {
      type: "object",
      properties: {
        dreamId: {
          type: "string",
          description: "Rüya ID'si"
        }
      },
      required: ["dreamId"]
    }
  }
];

// =============================================
// TOOL EXECUTOR
// =============================================

export async function executeDejavuTool(toolName: string, args: Record<string, any>): Promise<ToolResult<any>> {
  switch (toolName) {
    case "synthesize_dream":
      return await synthesizeDream({
        primaryEmotion: args.primaryEmotion,
        symbols: args.symbols || ["door", "water"],
        intensity: args.intensity || 5,
        vividness: args.vividness || 5,
        lucidity: args.lucidity || 3,
        duration: args.duration || "medium",
        language: "tr",
        style: args.style || "surreal"
      });

    case "detect_dejavu":
      const dreamResult = await db?.select().from(dreams).where(eq(dreams.id, args.dreamId)).limit(1);
      const dream = dreamResult?.[0];
      
      if (!dream) {
        return { success: false, error: "Dream not found", message: "Rüya bulunamadı." };
      }

      return await detectDejaVu({
        dreamId: args.dreamId,
        dreamNarrative: dream.description || "",
        dreamSymbols: Array.isArray(dream.objects) ? dream.objects : [],
        dreamEmotion: dream.emotion || "",
        dreamDate: dream.dreamDate?.toISOString() || new Date().toISOString(),
        currentSignals: {
          location: args.currentLocation,
          activity: args.currentActivity,
          emotionDetected: args.currentEmotion,
          musicPlaying: args.musicPlaying
        }
      });

    case "generate_dejavu_scenario":
      return await generateDejaVuScenario({
        userId: args.userId || "anonymous",
        scenarioType: args.scenarioType || "transformative",
        timeframe: args.timeframe || "3months",
        behaviorProfile: {
          sleepQuality: args.sleepQuality,
          stressLevel: args.stressLevel
        }
      });

    case "get_dejavu_stats":
      return await getDejaVuStats();

    case "list_dejavu_scenarios":
      return await listDejaVuScenarios(args.limit || 10);

    case "find_dejavu_matches":
      return await findDejaVuMatches(args.dreamId);

    default:
      return {
        success: false,
        message: `Bilinmeyen dejavu aracı: ${toolName}`,
        error: "Unknown tool"
      };
  }
}
