/**
 * DuyguMotor v3.0 - Automation Tools
 * 24/7 otomasyon sistemi için chatbot araçları
 */

import type { ToolDefinition, ToolCallResult } from "./index";
import {
  getAutomationJobs,
  getAutomationDashboardStats,
  startAutomationJob,
  stopAutomationJob,
  updateAutomationJobConfig,
  getRecentAutomationLogs,
  seedDocumentedDejavuCases,
} from "../domains/core/services/automation-service";
import { getDb } from "../db";
import { documentedDejavuCases, quickDejavuMatches } from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import OpenAI from "openai";

// Use Replit AI Integrations for OpenAI access (no API key required, billed to credits)
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const aiIntegrationsClient = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export const automationToolDefinitions: ToolDefinition[] = [
  {
    name: "get_automation_dashboard",
    description: "24/7 otomasyon sisteminin genel durumunu gösterir - aktif işler, toplam işlenen kayıt sayıları, son aktiviteler",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_automation_jobs",
    description: "Tüm otomasyon işlerini listeler - video toplayıcı, rüya toplayıcı, dejavu analizci durumları",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "start_automation_job",
    description: "Belirtilen otomasyon işini başlatır (video-collector, dream-collector, dejavu-analyzer)",
    parameters: {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "Başlatılacak iş ID'si (video-collector, dream-collector, dejavu-analyzer)",
        },
      },
      required: ["jobId"],
    },
  },
  {
    name: "stop_automation_job",
    description: "Belirtilen otomasyon işini durdurur",
    parameters: {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "Durdurulacak iş ID'si",
        },
      },
      required: ["jobId"],
    },
  },
  {
    name: "update_automation_config",
    description: "Otomasyon işinin ayarlarını günceller - hız, hedef sayı, aktif platformlar",
    parameters: {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "Güncellenecek iş ID'si",
        },
        itemsPerMinute: {
          type: "number",
          description: "Dakikada işlenecek kayıt sayısı",
        },
        targetDaily: {
          type: "number",
          description: "Günlük hedef sayısı",
        },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Aktif platformlar listesi (tiktok, instagram, twitter)",
        },
      },
      required: ["jobId"],
    },
  },
  {
    name: "get_automation_logs",
    description: "Son otomasyon loglarını gösterir - başarılı ve hatalı işlemler, zaman damgaları",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Gösterilecek log sayısı (varsayılan: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_documented_dejavu_cases",
    description: "Belgelenmiş dejavu vakalarını gösterir - tarihi ve bilimsel dejavu örnekleri",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_quick_dejavu_matches",
    description: "Hızlı dejavu eşleşmelerini listeler - otomatik analiz sonuçları",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Gösterilecek eşleşme sayısı (varsayılan: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_image_dalle",
    description: "DALL-E 3 ile AI görsel üretir. Yüksek kaliteli, detaylı görseller oluşturur.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Görsel için detaylı açıklama (İngilizce daha iyi sonuç verir)",
        },
        size: {
          type: "string",
          enum: ["1024x1024", "1792x1024", "1024x1792"],
          description: "Görsel boyutu (varsayılan: 1024x1024)",
        },
        quality: {
          type: "string",
          enum: ["standard", "hd"],
          description: "Kalite seviyesi (varsayılan: hd)",
        },
        style: {
          type: "string",
          enum: ["vivid", "natural"],
          description: "Stil: vivid (canlı/dramatik) veya natural (doğal)",
        },
      },
      required: ["prompt"],
    },
  },
];

export async function executeAutomationTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  console.log(`🤖 Executing automation tool: ${toolName}`);

  try {
    switch (toolName) {
      case "get_automation_dashboard": {
        const stats = await getAutomationDashboardStats();
        const runningCount = (stats as any).jobs?.filter((j: any) => j.status === 'running').length || 0;
        const totalProcessed = (stats as any).stats?.totalProcessed || 0;
        return {
          success: true,
          data: stats,
          message: `🤖 Otomasyon Durumu: ${runningCount} aktif iş, ${totalProcessed} toplam kayıt işlendi`,
        };
      }

      case "list_automation_jobs": {
        const jobs = await getAutomationJobs();
        const summary = jobs.map((j: any) => `${j.name}: ${j.status}`).join(", ");
        return {
          success: true,
          data: jobs,
          message: `📋 ${jobs.length} otomasyon işi: ${summary}`,
        };
      }

      case "start_automation_job": {
        const success = await startAutomationJob(args.jobId);
        return {
          success,
          data: { jobId: args.jobId, started: success },
          message: success
            ? `✅ "${args.jobId}" işi başlatıldı`
            : `❌ "${args.jobId}" işi başlatılamadı`,
        };
      }

      case "stop_automation_job": {
        const success = await stopAutomationJob(args.jobId);
        return {
          success,
          data: { jobId: args.jobId, stopped: success },
          message: success
            ? `⏹️ "${args.jobId}" işi durduruldu`
            : `❌ "${args.jobId}" işi durdurulamadı`,
        };
      }

      case "update_automation_config": {
        const config: Record<string, any> = {};
        if (args.itemsPerMinute) config.itemsPerMinute = args.itemsPerMinute;
        if (args.targetDaily) config.targetDaily = args.targetDaily;
        if (args.platforms) config.platforms = args.platforms;

        const success = await updateAutomationJobConfig(args.jobId, config);
        return {
          success,
          data: { jobId: args.jobId, config },
          message: success
            ? `✅ "${args.jobId}" ayarları güncellendi`
            : `❌ "${args.jobId}" ayarları güncellenemedi`,
        };
      }

      case "get_automation_logs": {
        const limit = args.limit || 20;
        const logs = await getRecentAutomationLogs(limit);
        const successCount = logs.filter((l: any) => l.status === "success").length;
        const errorCount = logs.filter((l: any) => l.status === "error").length;
        return {
          success: true,
          data: logs,
          message: `📊 Son ${logs.length} log: ${successCount} başarılı, ${errorCount} hata`,
        };
      }

      case "get_documented_dejavu_cases": {
        const db = getDb();
        if (!db) {
          return { success: false, message: "Veritabanı bağlantısı yok", error: "No DB" };
        }
        const cases = await db.select().from(documentedDejavuCases);
        
        if (cases.length === 0) {
          await seedDocumentedDejavuCases();
          const newCases = await db.select().from(documentedDejavuCases);
          return {
            success: true,
            data: newCases,
            message: `📚 ${newCases.length} belgelenmiş dejavu vakası yüklendi`,
          };
        }
        
        return {
          success: true,
          data: cases,
          message: `📚 ${cases.length} belgelenmiş dejavu vakası mevcut`,
        };
      }

      case "get_quick_dejavu_matches": {
        const db = getDb();
        if (!db) {
          return { success: false, message: "Veritabanı bağlantısı yok", error: "No DB" };
        }
        const limit = args.limit || 20;
        const matches = await db
          .select()
          .from(quickDejavuMatches)
          .orderBy(desc(quickDejavuMatches.createdAt))
          .limit(limit);

        return {
          success: true,
          data: matches,
          message: `🔮 ${matches.length} hızlı dejavu eşleşmesi bulundu`,
        };
      }

      case "generate_image_dalle": {
        try {
          // Using Replit AI Integrations with gpt-image-1 model
          // Response format is always base64, not URL
          const response = await aiIntegrationsClient.images.generate({
            model: "gpt-image-1",
            prompt: args.prompt,
            size: args.size || "1024x1024",
          });

          if (!response.data || response.data.length === 0) {
            return {
              success: false,
              message: "Görsel üretilemedi - boş yanıt",
              error: "Empty response",
            };
          }

          const base64Image = response.data[0].b64_json;
          
          if (!base64Image) {
            return {
              success: false,
              message: "Görsel üretilemedi - base64 verisi yok",
              error: "No base64 data",
            };
          }

          // Create a data URL for displaying in chat
          const imageUrl = `data:image/png;base64,${base64Image}`;

          return {
            success: true,
            data: {
              imageUrl,
              base64: base64Image,
              size: args.size || "1024x1024",
              model: "gpt-image-1",
            },
            message: `🎨 Görsel üretildi! (gpt-image-1 modeli kullanıldı)`,
          };
        } catch (error: any) {
          console.error("Image generation error:", error);
          return {
            success: false,
            message: `Görsel üretimi başarısız: ${error.message}`,
            error: error.message,
          };
        }
      }

      default:
        return {
          success: false,
          message: `Bilinmeyen otomasyon aracı: ${toolName}`,
          error: "Unknown tool",
        };
    }
  } catch (error: any) {
    console.error(`Automation tool error (${toolName}):`, error);
    return {
      success: false,
      message: `Otomasyon aracı hatası: ${error.message}`,
      error: error.message,
    };
  }
}
