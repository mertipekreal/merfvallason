import { ToolDefinition, ToolCallResult } from "./index";
import { runwayService } from "../domains/creative/services/runway-service";
import { storage } from "../storage";
import type { RunwayTask } from "@shared/schema";
import { openai } from "../openai-client";

export const creativeStudioTools: ToolDefinition[] = [
  {
    name: "generate_brief",
    description: "İçerik brief'i oluşturur. Anahtar kelimelere göre platform için optimize edilmiş prompt, ipuçları ve alternatifler üretir.",
    parameters: {
      type: "object",
      properties: {
        keywords: {
          type: "string",
          description: "Virgülle ayrılmış anahtar kelimeler (örn: 'moda, trend, yaz')"
        },
        platform: {
          type: "string",
          enum: ["tiktok", "instagram", "youtube", "twitter", "linkedin"],
          description: "Hedef platform"
        },
        contentType: {
          type: "string",
          enum: ["video", "image", "carousel", "story", "reel"],
          description: "İçerik türü"
        },
        tone: {
          type: "string",
          enum: ["eğlenceli", "profesyonel", "duygusal", "bilgilendirici", "viral"],
          description: "İçerik tonu"
        },
        context: {
          type: "string",
          description: "Ek bağlam veya açıklama (opsiyonel)"
        }
      },
      required: ["keywords", "platform"]
    }
  },
  {
    name: "create_video",
    description: "Runway AI ile metinden video oluşturur. Platform için optimize edilmiş video içeriği üretir.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Video açıklaması/promptu"
        },
        platform: {
          type: "string",
          enum: ["tiktok", "instagram", "youtube", "twitter", "linkedin"],
          description: "Hedef platform (aspect ratio otomatik ayarlanır)"
        },
        duration: {
          type: "number",
          description: "Video süresi saniye cinsinden (5, 10 veya 15)"
        }
      },
      required: ["prompt"]
    }
  },
  {
    name: "create_image",
    description: "Runway AI ile metinden görsel oluşturur. Platform için optimize edilmiş görsel içerik üretir.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Görsel açıklaması/promptu"
        },
        platform: {
          type: "string",
          enum: ["tiktok", "instagram", "youtube", "twitter", "linkedin"],
          description: "Hedef platform"
        },
        referenceImageUrl: {
          type: "string",
          description: "Referans görsel URL'i (opsiyonel)"
        }
      },
      required: ["prompt"]
    }
  },
  {
    name: "check_content_status",
    description: "Runway AI task durumunu kontrol eder. Video veya görsel oluşturma işleminin durumunu sorgular.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Runway task ID'si"
        }
      },
      required: ["taskId"]
    }
  },
  {
    name: "list_content_tasks",
    description: "Tüm Runway AI içerik oluşturma görevlerini listeler.",
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
  }
];

export async function executeCreativeStudioTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      case "generate_brief": {
        const { keywords, platform = "tiktok", contentType = "video", tone = "eğlenceli", context } = args;

        const keywordList = keywords.split(/[,\n]/).map((k: string) => k.trim()).filter(Boolean);

        const systemPrompt = `Sen bir içerik optimizasyon uzmanısın. Kullanıcının verdiği anahtar kelimelere göre, ${platform} platformu için ${contentType} içeriği oluşturmak üzere en etkili prompt'u oluşturacaksın.

Prompt özellikleri:
- ${tone} tonda olmalı
- ${platform} algoritmasına uygun
- Yüksek etkileşim potansiyeli olan
- SEO ve keşfet sayfası için optimize edilmiş
- Türk izleyici kitlesine hitap eden

Yanıtını JSON formatında ver:
{
  "optimizedPrompt": "Detaylı ve etkili prompt metni",
  "keywords": ["anahtar", "kelimeler", "listesi"],
  "tips": ["İpucu 1", "İpucu 2", "İpucu 3"],
  "score": 85,
  "variations": ["Alternatif 1", "Alternatif 2"]
}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: `Anahtar kelimeler: ${keywordList.join(", ")}${context ? `\n\nEk bağlam: ${context}` : ""}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.8,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("AI yanıt vermedi");
        }

        const result = JSON.parse(content);
        
        return {
          success: true,
          data: {
            ...result,
            platform,
            contentType,
            tone,
            originalKeywords: keywordList
          },
          message: `"${keywordList.join(", ")}" için ${platform} brief'i oluşturuldu. Skor: ${result.score}/100`
        };
      }

      case "create_video": {
        const { prompt, platform = "tiktok", duration = 5 } = args;
        
        const task = await runwayService.createTextToVideo(prompt, platform, duration);
        
        return {
          success: true,
          data: {
            taskId: task.id,
            status: task.status,
            platform,
            duration,
            prompt: task.promptText
          },
          message: `Video oluşturma başlatıldı (ID: ${task.id}). ${platform} için ${duration}sn video hazırlanıyor...`
        };
      }

      case "create_image": {
        const { prompt, platform = "instagram", referenceImageUrl } = args;
        
        const task = await runwayService.createTextToImage(prompt, platform, referenceImageUrl);
        
        return {
          success: true,
          data: {
            taskId: task.id,
            status: task.status,
            platform,
            prompt: task.promptText
          },
          message: `Görsel oluşturma başlatıldı (ID: ${task.id}). ${platform} için görsel hazırlanıyor...`
        };
      }

      case "check_content_status": {
        const { taskId } = args;
        
        const status = await runwayService.checkTaskStatus(String(taskId));
        
        if (!status) {
          return { success: false, message: `Task ${taskId} bulunamadı` };
        }
        
        const statusMessages: Record<string, string> = {
          pending: "Beklemede",
          processing: "İşleniyor",
          completed: "Tamamlandı",
          failed: "Başarısız"
        };
        
        return {
          success: true,
          data: status,
          message: `Task ${taskId}: ${statusMessages[status.status] || status.status}${status.outputUrl ? ` - Çıktı hazır: ${status.outputUrl}` : ""}`
        };
      }

      case "list_content_tasks": {
        const { limit = 10 } = args;
        
        const tasks = await storage.getRunwayTasks(limit);
        
        const summary = tasks.map((t: RunwayTask) => ({
          id: t.id,
          type: t.taskType,
          status: t.status,
          platform: t.targetPlatform,
          createdAt: t.createdAt
        }));
        
        const statusCounts = tasks.reduce((acc: Record<string, number>, t: RunwayTask) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          success: true,
          data: { tasks: summary, statusCounts, total: tasks.length },
          message: `${tasks.length} içerik görevi listelendi. Bekleyen: ${statusCounts.pending || 0}, İşlenen: ${statusCounts.processing || 0}, Tamamlanan: ${statusCounts.completed || 0}`
        };
      }

      default:
        return { success: false, message: `Bilinmeyen araç: ${toolName}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "İçerik oluşturma hatası";
    return { success: false, message };
  }
}
