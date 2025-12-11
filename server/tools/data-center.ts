/**
 * DuyguMotor v3.2 - Data Center Tools
 * Chatbot-callable functions for data management
 * FIXED: Now loads data from correct 'data/' folder path
 */

import { db } from "../db";
import { dreams } from "@shared/schema";
import { desc, sql, count } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

export interface DataOverview {
  dreams: {
    total: number;
    dreambank: number;
    user: number;
  };
  tiktok: {
    total: number;
    datasets: Array<{ name: string; count: number }>;
  };
  instagram: {
    total: number;
    datasets: Array<{ name: string; count: number }>;
  };
  spotify: {
    total: number;
    datasets: Array<{ name: string; count: number }>;
  };
  twitter: {
    total: number;
  };
  grandTotal: number;
}

export interface BulkJobStatus {
  id: string;
  platform: string;
  status: string;
  targetCount: number;
  collectedCount: number;
  progressPercent: number;
  estimatedCompletion: string;
  createdAt: string | null;
}

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

const datasetFiles: Record<string, { path: string; type: string; displayName: string; format: 'json' | 'csv' }> = {
  tiktok_main: { path: "data/dataset_tiktok-scraper_2025-11-18_16-59-11-541.json", type: "tiktok", displayName: "TikTok Ana Veri", format: 'json' },
  tiktok_poizi: { path: "data/poizi tiktok hesabı.json", type: "tiktok", displayName: "TikTok Poizi Hesabı", format: 'json' },
  tiktok_poizi_search: { path: "data/poizi yazınca ne çıkıyor.json", type: "tiktok", displayName: "TikTok Poizi Arama", format: 'json' },
  tiktok_global_rap: { path: "data/global rap.json", type: "tiktok", displayName: "TikTok Global Rap", format: 'json' },
  tiktok_fan_analiz: { path: "data/xx fan hesap analiz.json", type: "tiktok", displayName: "TikTok Fan Analizi", format: 'json' },
  tiktok_artist: { path: "data/artist.json", type: "tiktok", displayName: "TikTok Artist", format: 'json' },
  tiktok_influencer: { path: "data/influencer.json", type: "tiktok", displayName: "TikTok Influencer", format: 'json' },
  tiktok_normal_user: { path: "data/normal_user.json", type: "tiktok", displayName: "TikTok Normal User", format: 'json' },
  tiktok_prci: { path: "data/prci.json", type: "tiktok", displayName: "TikTok PRCI", format: 'json' },
  instagram_1: { path: "data/dataset_instagram-scraper_2025-11-15_00-31-39-764.csv", type: "instagram", displayName: "Instagram Hashtag 1", format: 'csv' },
  instagram_2: { path: "data/dataset_instagram-scraper_2025-11-15_00-41-59-387.csv", type: "instagram", displayName: "Instagram Hashtag 2", format: 'csv' },
  instagram_3: { path: "data/dataset_instagram-scraper_2025-11-15_00-53-00-752.csv", type: "instagram", displayName: "Instagram Hashtag 3", format: 'csv' },
  spotify_cistak: { path: "data/cıstak data.csv", type: "spotify", displayName: "Spotify Cıstak", format: 'csv' },
  spotify_poizi: { path: "data/poizi spoti.csv", type: "spotify", displayName: "Spotify Poizi", format: 'csv' },
  spotify_mlisa: { path: "data/mlisa.csv", type: "spotify", displayName: "Spotify Mlisa", format: 'csv' },
  spotify_ender: { path: "data/ender spoti.csv", type: "spotify", displayName: "Spotify Ender", format: 'csv' },
  spotify_blok3: { path: "data/blok 3.csv", type: "spotify", displayName: "Spotify Blok 3", format: 'csv' },
  twitter_users: { path: "data/dataset_twitter-user-scraper_2025-11-15_00-09-40-307.csv", type: "twitter", displayName: "Twitter Users", format: 'csv' },
};

function countRecords(filePath: string, format: 'json' | 'csv'): number {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) return 0;
    
    const content = fs.readFileSync(fullPath, "utf-8");
    
    if (format === 'json') {
      const data = JSON.parse(content);
      return Array.isArray(data) ? data.length : 1;
    } else {
      const lines = content.split('\n').filter(l => l.trim());
      return Math.max(0, lines.length - 1);
    }
  } catch {
    return 0;
  }
}

export async function getDataOverview(): Promise<ToolResult<DataOverview>> {
  try {
    let dreamStats = { total: 0, dreambank: 0, user: 0 };
    
    if (db) {
      const dreamResults = await db
        .select({
          total: count(),
          dreambank: sql<number>`COUNT(*) FILTER (WHERE source = 'dreambank')`,
          user: sql<number>`COUNT(*) FILTER (WHERE source != 'dreambank' OR source IS NULL)`,
        })
        .from(dreams);
      
      if (dreamResults[0]) {
        dreamStats = {
          total: Number(dreamResults[0].total) || 0,
          dreambank: Number(dreamResults[0].dreambank) || 0,
          user: Number(dreamResults[0].user) || 0,
        };
      }
    }

    const tiktokDatasets: Array<{ name: string; count: number }> = [];
    const instagramDatasets: Array<{ name: string; count: number }> = [];
    const spotifyDatasets: Array<{ name: string; count: number }> = [];
    let twitterTotal = 0;

    for (const [key, info] of Object.entries(datasetFiles)) {
      const recordCount = countRecords(info.path, info.format);
      
      if (recordCount > 0) {
        if (info.type === "tiktok") {
          tiktokDatasets.push({ name: info.displayName, count: recordCount });
        } else if (info.type === "instagram") {
          instagramDatasets.push({ name: info.displayName, count: recordCount });
        } else if (info.type === "spotify") {
          spotifyDatasets.push({ name: info.displayName, count: recordCount });
        } else if (info.type === "twitter") {
          twitterTotal = recordCount;
        }
      }
    }

    const tiktokTotal = tiktokDatasets.reduce((sum, d) => sum + d.count, 0);
    const instagramTotal = instagramDatasets.reduce((sum, d) => sum + d.count, 0);
    const spotifyTotal = spotifyDatasets.reduce((sum, d) => sum + d.count, 0);

    const overview: DataOverview = {
      dreams: dreamStats,
      tiktok: { total: tiktokTotal, datasets: tiktokDatasets },
      instagram: { total: instagramTotal, datasets: instagramDatasets },
      spotify: { total: spotifyTotal, datasets: spotifyDatasets },
      twitter: { total: twitterTotal },
      grandTotal: dreamStats.total + tiktokTotal + instagramTotal + spotifyTotal + twitterTotal,
    };

    return {
      success: true,
      data: overview,
      message: `Toplam ${overview.grandTotal.toLocaleString()} kayıt mevcut. Rüya: ${dreamStats.total}, TikTok: ${tiktokTotal}, Instagram: ${instagramTotal}, Spotify: ${spotifyTotal}, Twitter: ${twitterTotal}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Veri özeti alınırken bir hata oluştu.",
    };
  }
}

export async function getBulkJobStatus(): Promise<ToolResult<BulkJobStatus[]>> {
  try {
    const response = await fetch("http://localhost:5000/api/bulk/jobs");
    if (!response.ok) {
      return { success: false, error: "API error", message: "İş durumu alınamadı." };
    }

    const data = await response.json();
    const jobs = data.jobs || [];

    const jobStatuses: BulkJobStatus[] = jobs.map((job: any) => {
      const target = job.targetCount || 0;
      const collected = job.collectedCount || 0;
      const progress = target > 0 ? Math.round((collected / target) * 100) : 0;

      let eta = "Hesaplanamıyor";
      if (job.status === "running" && collected > 0 && job.createdAt) {
        const elapsed = Date.now() - new Date(job.createdAt).getTime();
        const rate = collected / (elapsed / 1000 / 60);
        const remaining = target - collected;
        if (rate > 0) {
          const minutesLeft = remaining / rate;
          if (minutesLeft < 60) {
            eta = `~${Math.round(minutesLeft)} dakika`;
          } else if (minutesLeft < 1440) {
            eta = `~${Math.round(minutesLeft / 60)} saat`;
          } else {
            eta = `~${Math.round(minutesLeft / 1440)} gün`;
          }
        }
      } else if (job.status === "completed") {
        eta = "Tamamlandı";
      } else if (job.status === "failed") {
        eta = "Başarısız";
      }

      return {
        id: job.id,
        platform: job.platform,
        status: job.status,
        targetCount: target,
        collectedCount: collected,
        progressPercent: progress,
        estimatedCompletion: eta,
        createdAt: job.createdAt,
      };
    });

    const running = jobStatuses.filter((j) => j.status === "running");
    const summary = running.length > 0
      ? `${running.length} aktif iş var. ${running.map((j) => `${j.platform}: %${j.progressPercent}`).join(", ")}`
      : "Şu an aktif veri toplama işi yok.";

    return {
      success: true,
      data: jobStatuses,
      message: summary,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "İş durumu alınırken bir hata oluştu.",
    };
  }
}

export async function startBulkJob(params: {
  platform: "tiktok" | "instagram" | "dreambank";
  targetCount?: number;
  hashtag?: string;
}): Promise<ToolResult<{ jobId: string }>> {
  try {
    const targetCount = params.targetCount || 1000;
    
    const response = await fetch("http://localhost:5000/api/bulk/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: params.platform,
        targetCount,
        config: { hashtag: params.hashtag || "turkishrap" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error, message: "Veri toplama işi başlatılamadı." };
    }

    const data = await response.json();

    return {
      success: true,
      data: { jobId: data.jobId || data.id || "unknown" },
      message: `${params.platform.toUpperCase()} için ${targetCount.toLocaleString()} hedefli yeni veri toplama işi başlatıldı.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Veri toplama işi başlatılırken bir hata oluştu.",
    };
  }
}

export async function getCollectionProgress(): Promise<ToolResult<{
  targets: { platform: string; target: number; current: number; percent: number; eta: string }[];
  overallPercent: number;
}>> {
  const jobResult = await getBulkJobStatus();
  
  if (!jobResult.success || !jobResult.data) {
    return { success: false, error: jobResult.error, message: jobResult.message };
  }

  const running = jobResult.data.filter((j) => j.status === "running");
  
  const targets = running.map((job) => ({
    platform: job.platform,
    target: job.targetCount,
    current: job.collectedCount,
    percent: job.progressPercent,
    eta: job.estimatedCompletion,
  }));

  const totalTarget = targets.reduce((sum, t) => sum + t.target, 0);
  const totalCurrent = targets.reduce((sum, t) => sum + t.current, 0);
  const overallPercent = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  return {
    success: true,
    data: { targets, overallPercent },
    message: targets.length > 0
      ? `Genel ilerleme: %${overallPercent}. ${targets.map((t) => `${t.platform}: %${t.percent} (${t.eta})`).join(", ")}`
      : "Aktif veri toplama işi bulunmuyor.",
  };
}
