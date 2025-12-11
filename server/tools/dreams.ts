/**
 * DuyguMotor v3.0 - Dream Tools
 * Chatbot-callable functions for dream analysis
 */

import { db } from "../db";
import { dreams } from "@shared/schema";
import { eq, desc, ilike, or, sql, count } from "drizzle-orm";

export interface Dream {
  id: string;
  title: string;
  description: string;
  emotion: string;
  location: string;
  themes: string[];
  objects: string[];
  source: string;
  intensity: number;
  createdAt: Date | null;
}

export interface DreamAnalysis {
  dream: Dream;
  emotionalProfile: {
    dominant: string;
    secondary: string[];
    intensity: number;
  };
  symbolism: string[];
  jungianArchetypes: string[];
  collectiveSynchronicity: number;
  interpretation: string;
}

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

export async function searchDreams(query: string, limit: number = 10): Promise<ToolResult<Dream[]>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const searchPattern = `%${query}%`;
    
    const results = await db
      .select()
      .from(dreams)
      .where(
        or(
          ilike(dreams.title, searchPattern),
          ilike(dreams.description, searchPattern)
        )
      )
      .orderBy(desc(dreams.createdAt))
      .limit(limit);

    const formattedDreams: Dream[] = results.map((d) => ({
      id: d.id,
      title: d.title || "İsimsiz Rüya",
      description: d.description || "",
      emotion: d.emotion || "nötr",
      location: d.location || "belirsiz",
      themes: Array.isArray(d.themes) ? d.themes : [],
      objects: Array.isArray(d.objects) ? d.objects : [],
      source: d.source || "user",
      intensity: d.intensity || 5,
      createdAt: d.createdAt,
    }));

    return {
      success: true,
      data: formattedDreams,
      message: `"${query}" için ${formattedDreams.length} rüya bulundu.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Rüya araması yapılırken bir hata oluştu.",
    };
  }
}

export async function getDreamById(dreamId: string): Promise<ToolResult<Dream>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const results = await db
      .select()
      .from(dreams)
      .where(eq(dreams.id, dreamId))
      .limit(1);

    if (results.length === 0) {
      return { success: false, error: "Not found", message: "Rüya bulunamadı." };
    }

    const d = results[0];
    const dream: Dream = {
      id: d.id,
      title: d.title || "İsimsiz Rüya",
      description: d.description || "",
      emotion: d.emotion || "nötr",
      location: d.location || "belirsiz",
      themes: Array.isArray(d.themes) ? d.themes : [],
      objects: Array.isArray(d.objects) ? d.objects : [],
      source: d.source || "user",
      intensity: d.intensity || 5,
      createdAt: d.createdAt,
    };

    return {
      success: true,
      data: dream,
      message: `Rüya bulundu: "${dream.title}"`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Rüya alınırken bir hata oluştu.",
    };
  }
}

export async function getRandomDream(): Promise<ToolResult<Dream>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const results = await db
      .select()
      .from(dreams)
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (results.length === 0) {
      return { success: false, error: "No dreams", message: "Veritabanında rüya yok." };
    }

    const d = results[0];
    const dream: Dream = {
      id: d.id,
      title: d.title || "İsimsiz Rüya",
      description: d.description || "",
      emotion: d.emotion || "nötr",
      location: d.location || "belirsiz",
      themes: Array.isArray(d.themes) ? d.themes : [],
      objects: Array.isArray(d.objects) ? d.objects : [],
      source: d.source || "user",
      intensity: d.intensity || 5,
      createdAt: d.createdAt,
    };

    return {
      success: true,
      data: dream,
      message: `Rastgele rüya: "${dream.title}"`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Rastgele rüya alınırken bir hata oluştu.",
    };
  }
}

export async function analyzeDream(dreamId: string): Promise<ToolResult<DreamAnalysis>> {
  try {
    const dreamResult = await getDreamById(dreamId);
    if (!dreamResult.success || !dreamResult.data) {
      return { success: false, error: dreamResult.error, message: dreamResult.message };
    }

    const dream = dreamResult.data;

    const jungianArchetypes = detectArchetypes(dream);
    const symbolism = extractSymbolism(dream);
    const emotionalProfile = analyzeEmotions(dream);
    const collectiveSynchronicity = calculateSynchronicity(dream);

    const interpretation = generateInterpretation(dream, jungianArchetypes, symbolism);

    const analysis: DreamAnalysis = {
      dream,
      emotionalProfile,
      symbolism,
      jungianArchetypes,
      collectiveSynchronicity,
      interpretation,
    };

    return {
      success: true,
      data: analysis,
      message: `"${dream.title}" rüyası analiz edildi. Dominant duygu: ${emotionalProfile.dominant}, Arketipler: ${jungianArchetypes.join(", ")}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Rüya analizi yapılırken bir hata oluştu.",
    };
  }
}

function detectArchetypes(dream: Dream): string[] {
  const archetypePatterns: Record<string, string[]> = {
    "Kahraman (Hero)": ["savaş", "mücadele", "zafer", "cesaret", "düşman", "kurtarmak"],
    "Gölge (Shadow)": ["korku", "karanlık", "kaçmak", "kovalamak", "düşmek", "kaybolmak"],
    "Anima/Animus": ["aşk", "sevgili", "yabancı", "çekici", "gizemli", "romantik"],
    "Bilge Yaşlı (Wise Old Man)": ["yaşlı", "bilge", "öğretmen", "rehber", "tavsiye", "kitap"],
    "Anne (Great Mother)": ["anne", "doğum", "ev", "koruma", "beslemek", "doğa"],
    "Çocuk (Divine Child)": ["çocuk", "bebek", "masum", "oyun", "yeni başlangıç"],
    "Trickster": ["şaka", "hile", "karışıklık", "değişim", "beklenmedik"],
    "Persona": ["maske", "rol", "toplum", "görünüş", "iş", "sosyal"],
  };

  const content = `${dream.title} ${dream.description} ${dream.emotion} ${dream.location}`.toLowerCase();
  const detected: string[] = [];

  for (const [archetype, keywords] of Object.entries(archetypePatterns)) {
    if (keywords.some((k) => content.includes(k))) {
      detected.push(archetype);
    }
  }

  return detected.length > 0 ? detected : ["Belirsiz"];
}

function extractSymbolism(dream: Dream): string[] {
  const symbols: string[] = [];
  
  const symbolMeanings: Record<string, string> = {
    "su": "Bilinçaltı, duygular, arınma",
    "uçmak": "Özgürlük, yükselme, kaçış",
    "düşmek": "Kontrol kaybı, korku, güvensizlik",
    "ev": "Benlik, aile, güvenlik",
    "yol": "Hayat yolculuğu, kararlar",
    "ölüm": "Dönüşüm, son, yeni başlangıç",
    "hayvan": "İçgüdüler, doğa, güç",
    "bebek": "Yenilik, potansiyel, masumiyet",
    "ateş": "Tutku, yıkım, dönüşüm",
    "ayna": "Öz-yansıma, gerçeklik, kimlik",
  };

  const content = `${dream.title} ${dream.description}`.toLowerCase();

  for (const [symbol, meaning] of Object.entries(symbolMeanings)) {
    if (content.includes(symbol)) {
      symbols.push(`${symbol}: ${meaning}`);
    }
  }

  return symbols.length > 0 ? symbols : ["Belirgin sembol tespit edilemedi"];
}

function analyzeEmotions(dream: Dream): { dominant: string; secondary: string[]; intensity: number } {
  const emotionIntensity: Record<string, number> = {
    "korku": 0.9,
    "öfke": 0.85,
    "sevinç": 0.8,
    "üzüntü": 0.75,
    "şaşkınlık": 0.7,
    "merak": 0.6,
    "huzur": 0.5,
    "kararsızlık": 0.4,
    "nötr": 0.3,
  };

  const dominant = dream.emotion || "nötr";
  const intensity = emotionIntensity[dominant.toLowerCase()] || 0.5;

  const secondaryEmotions: string[] = [];
  const content = `${dream.title} ${dream.description}`.toLowerCase();
  
  for (const [emotion] of Object.entries(emotionIntensity)) {
    if (emotion !== dominant.toLowerCase() && content.includes(emotion)) {
      secondaryEmotions.push(emotion);
    }
  }

  return {
    dominant,
    secondary: secondaryEmotions.slice(0, 2),
    intensity,
  };
}

function calculateSynchronicity(dream: Dream): number {
  let score = 0.3;

  if (dream.themes && dream.themes.length > 2) score += 0.2;
  if (dream.objects && dream.objects.length > 2) score += 0.15;
  if (dream.intensity > 7) score += 0.15;
  if (dream.description.length > 200) score += 0.1;
  if (dream.location !== "belirsiz") score += 0.1;

  return Math.min(1, score);
}

function generateInterpretation(dream: Dream, archetypes: string[], symbols: string[]): string {
  const parts: string[] = [];

  parts.push(`"${dream.title}" rüyası, bilinçaltının önemli mesajlar taşıdığını gösteriyor.`);

  if (archetypes.length > 0 && archetypes[0] !== "Belirsiz") {
    parts.push(`Jung arketipleri açısından ${archetypes[0]} teması öne çıkıyor - bu, ruhsal gelişim sürecinin aktif olduğuna işaret ediyor.`);
  }

  if (symbols.length > 0 && !symbols[0].includes("tespit edilemedi")) {
    parts.push(`Sembolik açıdan ${symbols[0]} dikkat çekici.`);
  }

  if (dream.emotion && dream.emotion !== "nötr") {
    parts.push(`Baskın duygu olan "${dream.emotion}" işlenmemiş deneyimlere işaret edebilir.`);
  }

  parts.push("Bu rüyayı günlük yaşamınızla ilişkilendirmeyi ve tekrar eden temaları not etmeyi öneririm.");

  return parts.join(" ");
}

export async function getDreamStats(): Promise<ToolResult<{
  total: number;
  dreambank: number;
  user: number;
  topEmotions: string[];
  topThemes: string[];
}>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const stats = await db
      .select({
        total: count(),
        dreambank: sql<number>`COUNT(*) FILTER (WHERE source = 'dreambank')`,
        user: sql<number>`COUNT(*) FILTER (WHERE source != 'dreambank' OR source IS NULL)`,
      })
      .from(dreams);

    const recentDreams = await db
      .select({ emotion: dreams.emotion, themes: dreams.themes })
      .from(dreams)
      .orderBy(desc(dreams.createdAt))
      .limit(100);

    const emotionCounts: Record<string, number> = {};
    const themeCounts: Record<string, number> = {};

    for (const d of recentDreams) {
      if (d.emotion) {
        emotionCounts[d.emotion] = (emotionCounts[d.emotion] || 0) + 1;
      }
      if (Array.isArray(d.themes)) {
        for (const t of d.themes) {
          themeCounts[t] = (themeCounts[t] || 0) + 1;
        }
      }
    }

    const topEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([e]) => e);

    const topThemes = Object.entries(themeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    return {
      success: true,
      data: {
        total: Number(stats[0]?.total) || 0,
        dreambank: Number(stats[0]?.dreambank) || 0,
        user: Number(stats[0]?.user) || 0,
        topEmotions,
        topThemes,
      },
      message: `Toplam ${stats[0]?.total || 0} rüya var. En yaygın duygu: ${topEmotions[0] || "Belirsiz"}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Rüya istatistikleri alınırken bir hata oluştu.",
    };
  }
}
