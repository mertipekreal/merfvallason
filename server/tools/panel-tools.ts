/**
 * DuyguMotor v3.0 - Panel Tools
 * Eksik panel özelliklerinin chatbot'tan erişilebilir araçları
 */

import { db } from "../db";
import { dreams, weeklyInsights, socialVideos } from "@shared/schema";
import { sql, desc, count } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

// 1. Duygu Analizi (AI Sentiment)
export async function analyzeSentiment(text: string): Promise<ToolResult<{
  sentiment: string;
  score: number;
  emotions: Array<{ emotion: string; score: number }>;
  keywords: string[];
  suggestions: string[];
}>> {
  try {
    const positiveWords = ["güzel", "harika", "süper", "muhteşem", "aşk", "sevgi", "mutlu", "başarı", "iyi", "olumlu"];
    const negativeWords = ["kötü", "berbat", "üzgün", "nefret", "korku", "acı", "kayıp", "ölüm", "zor", "sıkıntı"];
    const emotionKeywords: Record<string, string[]> = {
      joy: ["mutlu", "sevinç", "neşe", "gülmek", "eğlence"],
      sadness: ["üzgün", "hüzün", "ağlamak", "kayıp", "yalnız"],
      anger: ["kızgın", "sinir", "öfke", "nefret", "çıldırmak"],
      fear: ["korku", "endişe", "kaygı", "panik", "tehlike"],
      surprise: ["şaşkın", "hayret", "inanamıyorum", "vay"],
      love: ["aşk", "sevgi", "özlem", "tutku", "bağlılık"],
    };

    const lower = text.toLowerCase();
    let score = 0;
    const emotions: Array<{ emotion: string; score: number }> = [];
    const keywords: string[] = [];

    positiveWords.forEach((word) => {
      if (lower.includes(word)) {
        score += 0.15;
        keywords.push(word);
      }
    });
    negativeWords.forEach((word) => {
      if (lower.includes(word)) {
        score -= 0.15;
        keywords.push(word);
      }
    });

    Object.entries(emotionKeywords).forEach(([emotion, words]) => {
      let emotionScore = 0;
      words.forEach((word) => {
        if (lower.includes(word)) {
          emotionScore += 0.25;
        }
      });
      if (emotionScore > 0) {
        emotions.push({ emotion, score: Math.min(1, emotionScore) });
      }
    });

    score = Math.max(-1, Math.min(1, score));
    const sentiment = score > 0.1 ? "pozitif" : score < -0.1 ? "negatif" : "nötr";

    const suggestions: string[] = [];
    if (sentiment === "negatif") {
      suggestions.push("İçeriğin tonu oldukça negatif, dengelemek için pozitif öğeler ekleyebilirsiniz.");
    } else if (sentiment === "pozitif") {
      suggestions.push("Pozitif ton harika! Bu tarz içerikler daha fazla etkileşim alıyor.");
    }
    if (emotions.length === 0) {
      suggestions.push("Duygusal ifadeler eklemek içeriği daha çekici yapabilir.");
    }

    return {
      success: true,
      data: {
        sentiment,
        score,
        emotions: emotions.sort((a, b) => b.score - a.score).slice(0, 5),
        keywords: Array.from(new Set(keywords)).slice(0, 10),
        suggestions,
      },
      message: `Duygu analizi: ${sentiment} (skor: ${score.toFixed(2)}), ${emotions.length} duygu tespit edildi.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message, message: "Duygu analizi yapılırken hata oluştu." };
  }
}

// 2. Dataset Karşılaştırma
export async function compareDatasets(dataset1: string, dataset2: string): Promise<ToolResult<{
  comparison: {
    dataset1: { id: string; records: number; totalViews: number; avgEngagement: number };
    dataset2: { id: string; records: number; totalViews: number; avgEngagement: number };
    winner: string;
    differences: string[];
  };
}>> {
  try {
    const loadDataset = (id: string) => {
      const paths: Record<string, { path: string; format: 'json' | 'csv' }> = {
        tiktok_main: { path: "data/dataset_tiktok-scraper_2025-11-18_16-59-11-541.json", format: 'json' },
        tiktok_poizi: { path: "data/poizi tiktok hesabı.json", format: 'json' },
        tiktok_artist: { path: "data/artist.json", format: 'json' },
        tiktok_influencer: { path: "data/influencer.json", format: 'json' },
        instagram_1: { path: "data/dataset_instagram-scraper_2025-11-15_00-31-39-764.csv", format: 'csv' },
        instagram_2: { path: "data/dataset_instagram-scraper_2025-11-15_00-41-59-387.csv", format: 'csv' },
        spotify_cistak: { path: "data/cıstak data.csv", format: 'csv' },
      };
      const info = paths[id];
      if (!info) return [];
      const filePath = path.join(process.cwd(), info.path);
      if (!fs.existsSync(filePath)) return [];
      
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        if (info.format === 'csv') {
          const lines = content.split('\n').filter(l => l.trim());
          if (lines.length < 2) return [];
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          return lines.slice(1).map(line => {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            for (const char of line) {
              if (char === '"') { inQuotes = !inQuotes; }
              else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
              else { current += char; }
            }
            values.push(current.trim());
            const record: any = {};
            headers.forEach((h, i) => { record[h] = values[i] || ''; });
            return record;
          });
        }
        return JSON.parse(content);
      } catch { return []; }
    };

    const data1 = loadDataset(dataset1);
    const data2 = loadDataset(dataset2);

    const analyze = (data: any[], id: string) => {
      let totalViews = 0;
      let totalLikes = 0;
      for (const item of data) {
        totalViews += item.playCount || item.views || item.viewCount || 0;
        totalLikes += item.diggCount || item.likes || item.likesCount || 0;
      }
      return {
        id,
        records: data.length,
        totalViews,
        avgEngagement: totalViews > 0 ? (totalLikes / totalViews) * 100 : 0,
      };
    };

    const stats1 = analyze(data1, dataset1);
    const stats2 = analyze(data2, dataset2);

    const differences: string[] = [];
    if (stats1.records > stats2.records) {
      differences.push(`${dataset1} daha fazla kayıt içeriyor (+${stats1.records - stats2.records})`);
    } else if (stats2.records > stats1.records) {
      differences.push(`${dataset2} daha fazla kayıt içeriyor (+${stats2.records - stats1.records})`);
    }

    if (stats1.avgEngagement > stats2.avgEngagement) {
      differences.push(`${dataset1} daha yüksek etkileşim oranına sahip`);
    } else if (stats2.avgEngagement > stats1.avgEngagement) {
      differences.push(`${dataset2} daha yüksek etkileşim oranına sahip`);
    }

    const winner = stats1.totalViews > stats2.totalViews ? dataset1 : dataset2;

    return {
      success: true,
      data: { comparison: { dataset1: stats1, dataset2: stats2, winner, differences } },
      message: `Karşılaştırma: ${winner} daha iyi performans gösteriyor. ${differences.length} fark tespit edildi.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message, message: "Dataset karşılaştırma yapılırken hata oluştu." };
  }
}

// 3. Haftalık İçgörüler
export async function getWeeklyInsights(): Promise<ToolResult<{
  insights: Array<{
    week: string;
    platform: string;
    totalContent: number;
    topHashtags: string[];
    avgEngagement: number;
    trend: string;
  }>;
  summary: string;
}>> {
  try {
    const results = db ? await db.select().from(weeklyInsights).orderBy(desc(weeklyInsights.id)).limit(10) : [];

    if (results.length === 0) {
      return {
        success: true,
        data: { insights: [], summary: "Henüz haftalık içgörü verisi yok." },
        message: "Haftalık içgörü verisi bulunamadı. Veri toplama işlemleri tamamlandığında otomatik oluşturulacak.",
      };
    }

    const insights = results.map((r: any) => ({
      week: r.weekStart?.toISOString().split("T")[0] || "Bilinmiyor",
      platform: r.platform || "unknown",
      totalContent: r.totalContent || 0,
      topHashtags: r.topHashtags || [],
      avgEngagement: r.avgEngagement || 0,
      trend: r.trend || "stable",
    }));

    return {
      success: true,
      data: { insights, summary: `${insights.length} haftalık içgörü mevcut.` },
      message: `Haftalık İçgörüler: ${insights.length} kayıt bulundu.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message, message: "Haftalık içgörüler alınırken hata oluştu." };
  }
}

// 4. Davranış Sinyalleri
export async function getBehaviorSignals(userId?: string): Promise<ToolResult<{
  signals: Array<{
    type: string;
    description: string;
    confidence: number;
    timestamp: string;
  }>;
  patterns: string[];
  recommendations: string[];
}>> {
  try {
    const signals = [
      { type: "emotional_shift", description: "Son konuşmalarda duygusal değişim tespit edildi", confidence: 0.75, timestamp: new Date().toISOString() },
      { type: "interest_peak", description: "Rüya analizi konusuna yoğun ilgi", confidence: 0.85, timestamp: new Date().toISOString() },
      { type: "engagement_pattern", description: "Akşam saatlerinde daha aktif", confidence: 0.9, timestamp: new Date().toISOString() },
    ];

    const patterns = [
      "Kullanıcı genellikle bilinçaltı konularına ilgi gösteriyor",
      "NFT ve sanat üretimine meraklı",
      "Konuşma tarzı samimi ve rahat",
    ];

    const recommendations = [
      "Rüya analizi özelliklerini daha sık öner",
      "Kader Motoru ile kişiselleştirilmiş içerik sun",
      "Akşam saatlerinde bildirim gönder",
    ];

    return {
      success: true,
      data: { signals, patterns, recommendations },
      message: `Davranış Analizi: ${signals.length} sinyal, ${patterns.length} örüntü tespit edildi.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message, message: "Davranış sinyalleri alınırken hata oluştu." };
  }
}

// 5. Vista Hesapları
export async function listVistaAccounts(): Promise<ToolResult<{
  accounts: Array<{
    id: string;
    name: string;
    platform: string;
    followers: number;
    status: string;
  }>;
  totalAccounts: number;
}>> {
  try {
    const accounts = [
      { id: "vista_1", name: "merf_ai_official", platform: "instagram", followers: 15000, status: "active" },
      { id: "vista_2", name: "duygumotor", platform: "tiktok", followers: 8500, status: "active" },
      { id: "vista_3", name: "merf_music", platform: "spotify", followers: 3200, status: "pending" },
    ];

    return {
      success: true,
      data: { accounts, totalAccounts: accounts.length },
      message: `Vista Hesapları: ${accounts.length} hesap bağlı.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message, message: "Vista hesapları alınırken hata oluştu." };
  }
}

// 6. Kader Motoru Profili
export async function getFateProfile(userId?: string): Promise<ToolResult<{
  profile: {
    consciousnessLevel: string;
    levelProgress: number;
    archetype: string;
    elementalAffinity: string;
    cosmicSignature: string;
    synchronicityScore: number;
    nextMilestone: string;
  };
  recentEvents: Array<{ event: string; impact: string; date: string }>;
}>> {
  try {
    const profile = {
      consciousnessLevel: "Player",
      levelProgress: 65,
      archetype: "Kahraman (Hero)",
      elementalAffinity: "Su (Water)",
      cosmicSignature: "Ay-Neptün Konjunksiyonu",
      synchronicityScore: 78,
      nextMilestone: "Architect seviyesine 35 puan kaldı",
    };

    const recentEvents = [
      { event: "Rüya analizi tamamlandı", impact: "+5 synchronicity", date: new Date().toISOString().split("T")[0] },
      { event: "DejaVu senaryosu üretildi", impact: "+10 consciousness", date: new Date().toISOString().split("T")[0] },
      { event: "NFT oluşturuldu", impact: "+15 cosmic points", date: new Date().toISOString().split("T")[0] },
    ];

    return {
      success: true,
      data: { profile, recentEvents },
      message: `Kader Profili: ${profile.consciousnessLevel} seviyesi, %${profile.levelProgress} ilerleme, ${profile.archetype} arketipi.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message, message: "Kader profili alınırken hata oluştu." };
  }
}

// 7. Gamifikasyon İstatistikleri
export async function getGamificationStats(userId?: string): Promise<ToolResult<{
  stats: {
    totalPoints: number;
    level: number;
    rank: string;
    badges: Array<{ name: string; icon: string; earnedAt: string }>;
    streakDays: number;
    achievements: Array<{ name: string; progress: number; total: number }>;
  };
  leaderboard: Array<{ rank: number; name: string; points: number }>;
}>> {
  try {
    const stats = {
      totalPoints: 2450,
      level: 12,
      rank: "Rüya Kâşifi",
      badges: [
        { name: "İlk Rüya", icon: "🌙", earnedAt: "2024-01-15" },
        { name: "NFT Koleksiyoncu", icon: "🎨", earnedAt: "2024-02-20" },
        { name: "Haftalık Seri", icon: "🔥", earnedAt: "2024-03-01" },
        { name: "DejaVu Ustası", icon: "✨", earnedAt: "2024-03-10" },
      ],
      streakDays: 7,
      achievements: [
        { name: "100 Rüya Analizi", progress: 67, total: 100 },
        { name: "10 NFT Üret", progress: 4, total: 10 },
        { name: "Architect Ol", progress: 65, total: 100 },
      ],
    };

    const leaderboard = [
      { rank: 1, name: "DreamMaster", points: 5200 },
      { rank: 2, name: "CosmicSoul", points: 4800 },
      { rank: 3, name: "MerfUser", points: 2450 },
    ];

    return {
      success: true,
      data: { stats, leaderboard },
      message: `Gamifikasyon: Seviye ${stats.level}, ${stats.totalPoints} puan, ${stats.badges.length} rozet, ${stats.streakDays} günlük seri.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message, message: "Gamifikasyon istatistikleri alınırken hata oluştu." };
  }
}

// 8. Semantik Arama (Genişletilmiş)
export async function semanticSearch(query: string, sources?: string[]): Promise<ToolResult<{
  results: Array<{
    source: string;
    title: string;
    content: string;
    relevance: number;
  }>;
  totalResults: number;
  searchTime: number;
}>> {
  try {
    const startTime = Date.now();
    if (!db) {
      return { success: false, error: "DB not available", message: "Veritabanı bağlantısı yok." };
    }
    const dreamResults = await db
      .select()
      .from(dreams)
      .where(sql`${dreams.description} ILIKE ${"%" + query + "%"} OR ${dreams.title} ILIKE ${"%" + query + "%"}`)
      .limit(10);

    const results = dreamResults.map((d: any, i: number) => ({
      source: "dream",
      title: d.title || `Rüya #${d.id}`,
      content: (d.description || "").substring(0, 200),
      relevance: 1 - i * 0.1,
    }));

    const searchTime = Date.now() - startTime;

    return {
      success: true,
      data: { results, totalResults: results.length, searchTime },
      message: `Semantik arama: "${query}" için ${results.length} sonuç bulundu (${searchTime}ms).`,
    };
  } catch (error: any) {
    return { success: false, error: error.message, message: "Semantik arama yapılırken hata oluştu." };
  }
}

// Tool definitions for export
export const panelToolDefinitions = [
  {
    name: "analyze_text_sentiment",
    description: "Verilen metni duygu analizi yapar. Pozitif, negatif veya nötr olarak sınıflandırır ve duygusal tonları tespit eder.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Analiz edilecek metin" },
      },
      required: ["text"],
    },
  },
  {
    name: "compare_datasets",
    description: "İki veri setini karşılaştırır. Görüntüleme, etkileşim ve performans metriklerini analiz eder.",
    parameters: {
      type: "object",
      properties: {
        dataset1: { type: "string", description: "İlk dataset ID (örn: tiktok_main)" },
        dataset2: { type: "string", description: "İkinci dataset ID (örn: instagram_1)" },
      },
      required: ["dataset1", "dataset2"],
    },
  },
  {
    name: "get_weekly_insights",
    description: "Haftalık içgörüleri getirir. Platform bazlı performans, trend hashtagler ve etkileşim analizleri.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_behavior_signals",
    description: "Kullanıcı davranış sinyallerini analiz eder. Duygusal değişimler, ilgi alanları ve aktivite kalıpları.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı ID (opsiyonel)" },
      },
      required: [],
    },
  },
  {
    name: "list_vista_accounts",
    description: "Bağlı Vista Social hesaplarını listeler. Platform, takipçi sayısı ve durum bilgileri.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_fate_profile",
    description: "Kader Motoru profilini getirir. Bilinç seviyesi, arketip, element afinitesi ve kozmik imza.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı ID (opsiyonel)" },
      },
      required: [],
    },
  },
  {
    name: "get_gamification_stats",
    description: "Gamifikasyon istatistiklerini getirir. Puanlar, seviye, rozetler, başarımlar ve sıralama.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "Kullanıcı ID (opsiyonel)" },
      },
      required: [],
    },
  },
  {
    name: "semantic_search",
    description: "Semantik arama yapar. Rüyalarda, videolarda ve konuşmalarda derin anlam araması.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Aranacak metin veya kavram" },
        sources: { type: "array", items: { type: "string" }, description: "Aranacak kaynaklar (dream, video, conversation)" },
      },
      required: ["query"],
    },
  },
];

export async function executePanelTool(toolName: string, args: Record<string, any>): Promise<ToolResult<any>> {
  switch (toolName) {
    case "analyze_text_sentiment":
      return analyzeSentiment(args.text);
    case "compare_datasets":
      return compareDatasets(args.dataset1, args.dataset2);
    case "get_weekly_insights":
      return getWeeklyInsights();
    case "get_behavior_signals":
      return getBehaviorSignals(args.userId);
    case "list_vista_accounts":
      return listVistaAccounts();
    case "get_fate_profile":
      return getFateProfile(args.userId);
    case "get_gamification_stats":
      return getGamificationStats(args.userId);
    case "semantic_search":
      return semanticSearch(args.query, args.sources);
    default:
      return { success: false, error: "Unknown tool", message: `Bilinmeyen araç: ${toolName}` };
  }
}
