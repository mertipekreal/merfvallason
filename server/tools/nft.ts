/**
 * DuyguMotor v3.0 - NFT Tools
 * Chatbot-callable functions for NFT generation
 */

import { db } from "../db";
import { nftCandidates, dreams } from "@shared/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { runwayService } from "../domains/creative/services/runway-service";

export interface NFTCandidate {
  id: string;
  dreamId: string;
  dreamTitle: string;
  nftStatus: string;
  previewUrl: string | null;
  metadata: any;
  createdAt: Date | null;
}

export interface NFTGenerationResult {
  nftId: string;
  dreamId: string;
  taskId: string;
  status: string;
  estimatedTime: string;
}

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

export async function generateNFTFromDream(dreamId: string): Promise<ToolResult<NFTGenerationResult>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const dreamResults = await db
      .select()
      .from(dreams)
      .where(eq(dreams.id, dreamId))
      .limit(1);

    if (dreamResults.length === 0) {
      return { success: false, error: "Dream not found", message: "Rüya bulunamadı." };
    }

    const dream = dreamResults[0];

    const prompt = buildDreamPrompt(dream);

    const { v4: uuidv4 } = await import("uuid");
    const nftId = uuidv4();

    await db.insert(nftCandidates).values({
      id: nftId,
      dreamId: dream.id,
      nftStatus: "generating",
      rarityScore: 0.5,
      finalScore: 0.5,
      sourceType: "dream",
      title: dream.title,
      metadata: {
        dreamTitle: dream.title,
        prompt,
        generatedAt: new Date().toISOString(),
      },
    });

    const taskResult = await runwayService.createTextToImage(prompt, "instagram");

    if (!taskResult || !taskResult.runwayTaskId) {
      await db
        .update(nftCandidates)
        .set({ nftStatus: "failed" })
        .where(eq(nftCandidates.id, nftId));

      return {
        success: false,
        error: "Runway API error",
        message: "Görsel oluşturma başlatılamadı. Runway API'de bir sorun var.",
      };
    }

    await db
      .update(nftCandidates)
      .set({
        metadata: {
          dreamTitle: dream.title,
          prompt,
          runwayTaskId: taskResult.runwayTaskId,
          generatedAt: new Date().toISOString(),
        },
      })
      .where(eq(nftCandidates.id, nftId));

    return {
      success: true,
      data: {
        nftId,
        dreamId: dream.id,
        taskId: taskResult.runwayTaskId,
        status: "generating",
        estimatedTime: "~30-60 saniye",
      },
      message: `"${dream.title}" rüyasından NFT üretimi başladı. Görsel ~30-60 saniye içinde hazır olacak.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "NFT üretimi başlatılırken bir hata oluştu.",
    };
  }
}

function buildDreamPrompt(dream: any): string {
  const parts: string[] = [];

  if (dream.title) {
    parts.push(dream.title);
  }

  if (dream.description) {
    const shortContent = dream.description.slice(0, 200);
    parts.push(shortContent);
  }

  if (dream.emotion) {
    parts.push(`Emotion: ${dream.emotion}`);
  }

  if (dream.location) {
    parts.push(`Setting: ${dream.location}`);
  }

  if (Array.isArray(dream.themes) && dream.themes.length > 0) {
    parts.push(`Themes: ${dream.themes.slice(0, 3).join(", ")}`);
  }

  if (Array.isArray(dream.objects) && dream.objects.length > 0) {
    parts.push(`Objects: ${dream.objects.slice(0, 3).join(", ")}`);
  }

  const basePrompt = parts.join(". ");

  return `Dreamlike surreal digital art: ${basePrompt}. Ethereal atmosphere, symbolic imagery, cinematic lighting, artistic interpretation of subconscious imagery.`;
}

export async function getNFTStatus(nftId: string): Promise<ToolResult<NFTCandidate>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const results = await db
      .select()
      .from(nftCandidates)
      .where(eq(nftCandidates.id, nftId))
      .limit(1);

    if (results.length === 0) {
      return { success: false, error: "NFT not found", message: "NFT bulunamadı." };
    }

    const nft = results[0];
    const metadata = nft.metadata as any;

    if (nft.nftStatus === "generating" && metadata?.runwayTaskId) {
      try {
        const taskStatus = await runwayService.checkTaskStatus(metadata.runwayTaskId);

        if (taskStatus && taskStatus.status === "completed" && taskStatus.outputUrl) {
          await db
            .update(nftCandidates)
            .set({
              nftStatus: "ready",
              previewUrl: taskStatus.outputUrl,
            })
            .where(eq(nftCandidates.id, nftId));

          nft.nftStatus = "ready";
          nft.previewUrl = taskStatus.outputUrl;
        } else if (taskStatus && taskStatus.status === "failed") {
          await db
            .update(nftCandidates)
            .set({ nftStatus: "failed" })
            .where(eq(nftCandidates.id, nftId));

          nft.nftStatus = "failed";
        }
      } catch {
      }
    }

    const candidate: NFTCandidate = {
      id: nft.id,
      dreamId: nft.dreamId || "",
      dreamTitle: metadata?.dreamTitle || nft.title || "İsimsiz",
      nftStatus: nft.nftStatus,
      previewUrl: nft.previewUrl,
      metadata: nft.metadata,
      createdAt: nft.createdAt,
    };

    let statusMessage = "";
    switch (nft.nftStatus) {
      case "generating":
        statusMessage = "Görsel hala üretiliyor, lütfen bekleyin...";
        break;
      case "ready":
        statusMessage = "NFT hazır! Görsel başarıyla oluşturuldu.";
        break;
      case "failed":
        statusMessage = "Görsel üretimi başarısız oldu.";
        break;
      default:
        statusMessage = `NFT durumu: ${nft.nftStatus}`;
    }

    return {
      success: true,
      data: candidate,
      message: statusMessage,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "NFT durumu kontrol edilirken bir hata oluştu.",
    };
  }
}

export async function listNFTs(limit: number = 10): Promise<ToolResult<NFTCandidate[]>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const results = await db
      .select()
      .from(nftCandidates)
      .orderBy(desc(nftCandidates.createdAt))
      .limit(limit);

    const candidates: NFTCandidate[] = results.map((nft) => {
      const metadata = nft.metadata as any;
      return {
        id: nft.id,
        dreamId: nft.dreamId || "",
        dreamTitle: metadata?.dreamTitle || nft.title || "İsimsiz",
        nftStatus: nft.nftStatus,
        previewUrl: nft.previewUrl,
        metadata: nft.metadata,
        createdAt: nft.createdAt,
      };
    });

    const ready = candidates.filter((c) => c.nftStatus === "ready").length;
    const generating = candidates.filter((c) => c.nftStatus === "generating").length;

    return {
      success: true,
      data: candidates,
      message: `${candidates.length} NFT bulundu. ${ready} hazır, ${generating} üretiliyor.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "NFT listesi alınırken bir hata oluştu.",
    };
  }
}

export async function getNFTStats(): Promise<ToolResult<{
  total: number;
  ready: number;
  generating: number;
  failed: number;
}>> {
  try {
    if (!db) {
      return { success: false, error: "Database not available", message: "Veritabanı bağlantısı yok." };
    }

    const results = await db
      .select({ 
        nftStatus: nftCandidates.nftStatus, 
        count: sql<number>`count(*)::int` 
      })
      .from(nftCandidates)
      .groupBy(nftCandidates.nftStatus);

    const stats = {
      total: 0,
      ready: 0,
      generating: 0,
      failed: 0,
    };

    for (const row of results) {
      const c = Number(row.count);
      stats.total += c;
      if (row.nftStatus === "ready") stats.ready = c;
      else if (row.nftStatus === "generating") stats.generating = c;
      else if (row.nftStatus === "failed") stats.failed = c;
    }

    return {
      success: true,
      data: stats,
      message: `Toplam ${stats.total} NFT: ${stats.ready} hazır, ${stats.generating} üretiliyor, ${stats.failed} başarısız.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "NFT istatistikleri alınırken bir hata oluştu.",
    };
  }
}
