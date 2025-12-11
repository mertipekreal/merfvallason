/**
 * DuyguMotor v3.3 - Agent Tools
 * Full agent capabilities: SQL, file access, data analysis, code execution
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { readFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolCallResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

// Agent tool definitions
export const agentToolDefinitions: ToolDefinition[] = [
  {
    name: "execute_sql",
    description: "Veritabanında SQL sorgusu çalıştır. SELECT sorgularıyla veri çek, analiz yap. Tablolar: dreams, social_videos, conversations, datasets, scrape_runs, weekly_insights, dejavu_entries, nft_candidates",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Çalıştırılacak SQL sorgusu (sadece SELECT)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_file",
    description: "Dosya oku - CSV, JSON, TXT formatlarını destekler. Veri analizi için kullan.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Okunacak dosya yolu (örn: data/tiktok.json)",
        },
        limit: {
          type: "number",
          description: "Maksimum satır sayısı (varsayılan: 100)",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "list_files",
    description: "Klasördeki dosyaları listele. Mevcut veri kaynaklarını keşfet.",
    parameters: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "Listelenecek klasör (varsayılan: data/)",
        },
      },
      required: [],
    },
  },
  {
    name: "analyze_csv",
    description: "CSV dosyasını analiz et - sütun istatistikleri, satır sayısı, veri tipleri",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Analiz edilecek CSV dosyası",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "analyze_json",
    description: "JSON dosyasını analiz et - kayıt sayısı, alan tipleri, özet istatistikler",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Analiz edilecek JSON dosyası",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "get_tiktok_stats",
    description: "TikTok verilerinden istatistikler çıkar - oynatma, beğeni, yorum analizi",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "TikTok veri dosyası (varsayılan: otomatik bul)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_instagram_stats",
    description: "Instagram verilerinden istatistikler çıkar - etkileşim analizi",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Instagram veri dosyası (varsayılan: otomatik bul)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_database_schema",
    description: "Veritabanı şemasını göster - tüm tablolar ve sütunlar",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "run_analysis",
    description: "Özel analiz çalıştır - veriler üzerinde hesaplama yap",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["engagement", "timing", "hashtag", "content", "growth"],
          description: "Analiz tipi",
        },
        platform: {
          type: "string",
          enum: ["tiktok", "instagram", "all"],
          description: "Platform",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "generate_report",
    description: "Kapsamlı rapor oluştur - tüm verileri birleştir",
    parameters: {
      type: "object",
      properties: {
        reportType: {
          type: "string",
          enum: ["daily", "weekly", "content_calendar", "growth_strategy"],
          description: "Rapor tipi",
        },
      },
      required: ["reportType"],
    },
  },
];

// Execute agent tools
export async function executeAgentTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  console.log(`🤖 Agent Tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case "execute_sql":
        return await executeSql(args.query);

      case "read_file":
        return await readFileContent(args.filePath, args.limit || 100);

      case "list_files":
        return await listFiles(args.directory || "data");

      case "analyze_csv":
        return await analyzeCsv(args.filePath);

      case "analyze_json":
        return await analyzeJson(args.filePath);

      case "get_tiktok_stats":
        return await getTikTokStats(args.filePath);

      case "get_instagram_stats":
        return await getInstagramStats(args.filePath);

      case "get_database_schema":
        return await getDatabaseSchema();

      case "run_analysis":
        return await runAnalysis(args.type, args.platform || "all");

      case "generate_report":
        return await generateReport(args.reportType);

      default:
        return {
          success: false,
          message: `Bilinmeyen araç: ${toolName}`,
          error: "Unknown tool",
        };
    }
  } catch (error: any) {
    console.error(`Agent tool error (${toolName}):`, error);
    return {
      success: false,
      message: `Hata: ${error.message}`,
      error: error.message,
    };
  }
}

// SQL Execution (SELECT only for safety)
async function executeSql(query: string): Promise<ToolCallResult> {
  const trimmedQuery = query.trim().toLowerCase();
  
  // Security: Only allow SELECT queries
  if (!trimmedQuery.startsWith("select")) {
    return {
      success: false,
      message: "Güvenlik: Sadece SELECT sorguları çalıştırılabilir.",
      error: "Only SELECT queries allowed",
    };
  }

  // Block dangerous patterns
  const dangerousPatterns = ["drop", "delete", "update", "insert", "alter", "truncate", "create"];
  for (const pattern of dangerousPatterns) {
    if (trimmedQuery.includes(pattern)) {
      return {
        success: false,
        message: `Güvenlik: '${pattern}' komutu engellenmiştir.`,
        error: "Dangerous query blocked",
      };
    }
  }

  try {
    if (!db) throw new Error("Database not initialized");
    const result = await db.execute(sql.raw(query));
    const rows = result.rows || result;
    const count = Array.isArray(rows) ? rows.length : 0;

    return {
      success: true,
      data: {
        rows: Array.isArray(rows) ? rows.slice(0, 100) : rows,
        count,
        query,
      },
      message: `✅ ${count} satır döndü`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `SQL Hatası: ${error.message}`,
      error: error.message,
    };
  }
}

// Read file content
async function readFileContent(filePath: string, limit: number): Promise<ToolCallResult> {
  const fullPath = path.resolve(filePath);
  
  if (!existsSync(fullPath)) {
    return {
      success: false,
      message: `Dosya bulunamadı: ${filePath}`,
      error: "File not found",
    };
  }

  try {
    const content = await readFile(fullPath, "utf-8");
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".json") {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data.slice(0, limit) : data;
      return {
        success: true,
        data: items,
        message: `✅ JSON dosyası okundu (${Array.isArray(data) ? data.length : 1} kayıt)`,
      };
    } else if (ext === ".csv") {
      const lines = content.split("\n").slice(0, limit + 1);
      const header = lines[0];
      const rows = lines.slice(1).filter(l => l.trim());
      return {
        success: true,
        data: { header, rows, totalRows: content.split("\n").length - 1 },
        message: `✅ CSV dosyası okundu (${rows.length} satır gösteriliyor)`,
      };
    } else {
      const lines = content.split("\n").slice(0, limit);
      return {
        success: true,
        data: { content: lines.join("\n"), totalLines: content.split("\n").length },
        message: `✅ Dosya okundu (${lines.length} satır)`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Dosya okuma hatası: ${error.message}`,
      error: error.message,
    };
  }
}

// List files in directory
async function listFiles(directory: string): Promise<ToolCallResult> {
  const fullPath = path.resolve(directory);
  
  if (!existsSync(fullPath)) {
    return {
      success: false,
      message: `Klasör bulunamadı: ${directory}`,
      error: "Directory not found",
    };
  }

  try {
    const entries = await readdir(fullPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const filePath = path.join(fullPath, entry.name);
        const stats = await stat(filePath);
        return {
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          modified: stats.mtime,
        };
      })
    );

    return {
      success: true,
      data: files,
      message: `✅ ${files.length} dosya/klasör bulundu`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Klasör okuma hatası: ${error.message}`,
      error: error.message,
    };
  }
}

// Analyze CSV
async function analyzeCsv(filePath: string): Promise<ToolCallResult> {
  const fullPath = path.resolve(filePath);
  
  if (!existsSync(fullPath)) {
    return {
      success: false,
      message: `Dosya bulunamadı: ${filePath}`,
      error: "File not found",
    };
  }

  try {
    const content = await readFile(fullPath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    const header = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
    const dataRows = lines.slice(1);

    const analysis = {
      fileName: path.basename(filePath),
      totalRows: dataRows.length,
      columns: header,
      columnCount: header.length,
      sampleData: dataRows.slice(0, 5).map(row => {
        const values = row.split(",");
        const obj: Record<string, string> = {};
        header.forEach((h, i) => {
          obj[h] = values[i]?.replace(/"/g, "").trim() || "";
        });
        return obj;
      }),
    };

    return {
      success: true,
      data: analysis,
      message: `✅ CSV analizi tamamlandı: ${dataRows.length} satır, ${header.length} sütun`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `CSV analiz hatası: ${error.message}`,
      error: error.message,
    };
  }
}

// Analyze JSON
async function analyzeJson(filePath: string): Promise<ToolCallResult> {
  const fullPath = path.resolve(filePath);
  
  if (!existsSync(fullPath)) {
    return {
      success: false,
      message: `Dosya bulunamadı: ${filePath}`,
      error: "File not found",
    };
  }

  try {
    const content = await readFile(fullPath, "utf-8");
    const data = JSON.parse(content);
    
    const isArray = Array.isArray(data);
    const items = isArray ? data : [data];
    const sample = items[0] || {};
    const fields = Object.keys(sample);

    const analysis = {
      fileName: path.basename(filePath),
      isArray,
      totalRecords: items.length,
      fields,
      fieldCount: fields.length,
      sampleRecord: sample,
      fieldTypes: fields.reduce((acc, field) => {
        acc[field] = typeof sample[field];
        return acc;
      }, {} as Record<string, string>),
    };

    return {
      success: true,
      data: analysis,
      message: `✅ JSON analizi tamamlandı: ${items.length} kayıt, ${fields.length} alan`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `JSON analiz hatası: ${error.message}`,
      error: error.message,
    };
  }
}

// Get TikTok stats
async function getTikTokStats(filePath?: string): Promise<ToolCallResult> {
  // Find TikTok data file
  const possiblePaths = [
    filePath,
    "dataset_tiktok-sound-scraper_2025-11-15_16-55-22-986.csv",
    "data/dataset_tiktok-scraper_2025-11-18_16-59-11-541.json",
    "dataset_tiktok-scraper_2025-11-18_16-59-11-541.json",
  ].filter(Boolean);

  let dataFile: string | undefined;
  for (const p of possiblePaths) {
    if (p && existsSync(path.resolve(p))) {
      dataFile = p;
      break;
    }
  }

  if (!dataFile) {
    return {
      success: false,
      message: "TikTok veri dosyası bulunamadı",
      error: "No TikTok data file found",
    };
  }

  try {
    const content = await readFile(path.resolve(dataFile), "utf-8");
    const ext = path.extname(dataFile).toLowerCase();

    let stats: any = { source: dataFile };

    if (ext === ".csv") {
      const lines = content.split("\n").filter(l => l.trim());
      const header = lines[0].split(",").map(h => h.replace(/"/g, ""));
      const data = lines.slice(1);

      // Find column indices
      const playIdx = header.findIndex(h => h.includes("playCount"));
      const likeIdx = header.findIndex(h => h.includes("diggCount"));
      const shareIdx = header.findIndex(h => h.includes("shareCount"));
      const commentIdx = header.findIndex(h => h.includes("commentCount"));
      const timeIdx = header.findIndex(h => h.includes("createTimeISO"));

      let totalPlays = 0, totalLikes = 0, totalShares = 0, totalComments = 0;
      const postTimes: string[] = [];

      data.forEach(row => {
        const cols = row.split(",").map(c => c.replace(/"/g, ""));
        if (playIdx >= 0) totalPlays += parseInt(cols[playIdx]) || 0;
        if (likeIdx >= 0) totalLikes += parseInt(cols[likeIdx]) || 0;
        if (shareIdx >= 0) totalShares += parseInt(cols[shareIdx]) || 0;
        if (commentIdx >= 0) totalComments += parseInt(cols[commentIdx]) || 0;
        if (timeIdx >= 0 && cols[timeIdx]) {
          const hour = cols[timeIdx].split("T")[1]?.split(":")[0];
          if (hour) postTimes.push(hour);
        }
      });

      const engagementRate = totalPlays > 0 ? ((totalLikes + totalComments + totalShares) / totalPlays * 100).toFixed(2) : 0;

      // Hour distribution
      const hourCounts: Record<string, number> = {};
      postTimes.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
      const bestHours = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([h, c]) => `${h}:00 (${c} video)`);

      stats = {
        ...stats,
        videoCount: data.length,
        totalPlays,
        totalLikes,
        totalShares,
        totalComments,
        avgPlaysPerVideo: Math.round(totalPlays / data.length),
        avgLikesPerVideo: Math.round(totalLikes / data.length),
        engagementRate: `${engagementRate}%`,
        bestPostingHours: bestHours,
      };
    } else if (ext === ".json") {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];

      let totalPlays = 0, totalLikes = 0;
      items.forEach(item => {
        totalPlays += item.playCount || item.stats?.playCount || 0;
        totalLikes += item.diggCount || item.stats?.diggCount || 0;
      });

      stats = {
        ...stats,
        videoCount: items.length,
        totalPlays,
        totalLikes,
        avgPlaysPerVideo: Math.round(totalPlays / items.length),
        engagementRate: totalPlays > 0 ? `${(totalLikes / totalPlays * 100).toFixed(2)}%` : "0%",
      };
    }

    return {
      success: true,
      data: stats,
      message: `✅ TikTok analizi tamamlandı: ${stats.videoCount} video, ${stats.totalPlays?.toLocaleString()} oynatma`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `TikTok analiz hatası: ${error.message}`,
      error: error.message,
    };
  }
}

// Get Instagram stats
async function getInstagramStats(filePath?: string): Promise<ToolCallResult> {
  const possiblePaths = [
    filePath,
    "data/dataset_instagram-scraper_2025-11-15_00-41-59-387.csv",
    "data/dataset_instagram-scraper_2025-11-15_00-53-00-752.csv",
  ].filter(Boolean);

  let dataFile: string | undefined;
  for (const p of possiblePaths) {
    if (p && existsSync(path.resolve(p))) {
      dataFile = p;
      break;
    }
  }

  if (!dataFile) {
    return {
      success: false,
      message: "Instagram veri dosyası bulunamadı",
      error: "No Instagram data file found",
    };
  }

  try {
    const stats = await stat(path.resolve(dataFile));
    const content = await readFile(path.resolve(dataFile), "utf-8");
    const lines = content.split("\n").filter(l => l.trim());

    return {
      success: true,
      data: {
        source: dataFile,
        totalRows: lines.length - 1,
        fileSize: formatBytes(stats.size),
        sampleRow: lines[1]?.substring(0, 200) + "...",
      },
      message: `✅ Instagram verisi: ${lines.length - 1} satır`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Instagram analiz hatası: ${error.message}`,
      error: error.message,
    };
  }
}

// Get database schema
async function getDatabaseSchema(): Promise<ToolCallResult> {
  try {
    if (!db) throw new Error("Database not initialized");
    const result = await db.execute(sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position
    `);

    const tables: Record<string, string[]> = {};
    (result.rows as any[]).forEach(row => {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
    });

    return {
      success: true,
      data: tables,
      message: `✅ ${Object.keys(tables).length} tablo bulundu`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Schema hatası: ${error.message}`,
      error: error.message,
    };
  }
}

// Run analysis
async function runAnalysis(type: string, platform: string): Promise<ToolCallResult> {
  const analyses: Record<string, any> = {};

  if (type === "engagement" || type === "content") {
    const tiktokStats = await getTikTokStats();
    if (tiktokStats.success) {
      analyses.tiktok = tiktokStats.data;
    }
  }

  if (type === "timing") {
    analyses.optimalTimes = {
      turkey: {
        peak: ["12:00", "18:00", "21:00", "23:00"],
        secondary: ["09:00", "15:00", "20:00"],
        weekend: ["11:00", "14:00", "19:00", "22:00"],
      },
      recommendation: "En yüksek etkileşim öğle ve akşam saatlerinde",
    };
  }

  if (type === "hashtag") {
    analyses.hashtags = {
      primary: ["#fyp", "#foryou", "#viral", "#keşfet"],
      turkish: ["#türkiye", "#müzik", "#edit", "#trend"],
      niche: ["#fanedit", "#fanpage", "#aesthetic"],
    };
  }

  if (type === "growth") {
    analyses.strategy = {
      daily: "3 post/gün minimum",
      timing: "Peak saatlerde paylaş",
      engagement: "İlk 1 saat kritik",
      crossPromotion: "Hesaplar arası etiketleme",
    };
  }

  return {
    success: true,
    data: analyses,
    message: `✅ ${type} analizi tamamlandı`,
  };
}

// Generate report
async function generateReport(reportType: string): Promise<ToolCallResult> {
  const report: any = {
    type: reportType,
    generatedAt: new Date().toISOString(),
  };

  // Get dream count
  try {
    if (!db) throw new Error("Database not initialized");
    const dreamResult = await db.execute(sql`SELECT COUNT(*) as count FROM dreams`);
    report.dreamCount = (dreamResult.rows as any[])[0]?.count || 0;
  } catch { report.dreamCount = "N/A"; }

  // Get TikTok stats
  const tiktokStats = await getTikTokStats();
  if (tiktokStats.success) {
    report.tiktok = tiktokStats.data;
  }

  if (reportType === "content_calendar") {
    report.schedule = {
      monday: ["12:00 🎵 Ses", "18:00 ✂️ Edit", "21:00 🔥 Trend"],
      tuesday: ["12:00 📝 Lyrics", "18:00 🎵 Duet", "23:00 🌙 Aesthetic"],
      wednesday: ["12:00 😱 Reaction", "18:00 ✂️ Edit", "21:00 🎵 Challenge"],
      thursday: ["12:00 🎬 BTS", "18:00 🔥 Trend", "21:00 💃 Dance"],
      friday: ["12:00 🎵 Ses", "18:00 🎨 Fan Art", "23:00 🌙 Vibes"],
      saturday: ["11:00 ⏪ Throwback", "14:00 ✂️ Edit", "19:00 🎵 Party", "22:00 🔥 Night"],
      sunday: ["11:00 📝 Chill", "14:00 😱 Best of", "19:00 🎵 Teaser", "22:00 🌙 Mood"],
    };
  }

  if (reportType === "growth_strategy") {
    report.tactics = [
      "İlk 1 saatte 30 hesaptan ses kullanımı",
      "Cross-promotion: Hesaplar arası etiket",
      "Duet/Stitch zincirleri",
      "Her videoda 'Bu sesi kullan' CTA",
      "Trend formatları sesle birleştir",
      "Haftalık #challenge başlat",
    ];
  }

  return {
    success: true,
    data: report,
    message: `✅ ${reportType} raporu oluşturuldu`,
  };
}

// Helper: Format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
