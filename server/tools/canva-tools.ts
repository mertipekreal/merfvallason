/**
 * Canva & Dual-Layer AI Analysis Tools
 * Integrates Canva Connect API and Runway+Gemini dual commentary
 */

import { ToolDefinition, ToolCallResult } from "./index";
import { canvaService } from "../domains/creative/services/canva-service";
import { dualLayerAnalysisService } from "../domains/core/services/dual-layer-analysis-service";
import { runwayService } from "../domains/creative/services/runway-service";

export const canvaToolDefinitions: ToolDefinition[] = [
  {
    name: "canva_check_status",
    description: "Canva entegrasyon durumunu kontrol eder. API bağlantısı ve OAuth durumunu gösterir.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "canva_get_auth_url",
    description: "Canva OAuth yetkilendirme URL'i oluşturur. Kullanıcının Canva hesabına bağlanması için gerekli.",
    parameters: {
      type: "object",
      properties: {
        scopes: {
          type: "array",
          items: { type: "string" },
          description: "İstenen izinler (varsayılan: design:read, design:write, asset:read, asset:write)",
        },
      },
      required: [],
    },
  },
  {
    name: "canva_list_designs",
    description: "Canva'daki mevcut tasarımları listeler.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "canva_export_design",
    description: "Canva tasarımını dışa aktarır (PNG, JPG, PDF veya MP4 formatında).",
    parameters: {
      type: "object",
      properties: {
        designId: {
          type: "string",
          description: "Dışa aktarılacak tasarım ID'si",
        },
        format: {
          type: "string",
          enum: ["png", "jpg", "pdf", "mp4"],
          description: "Çıktı formatı (varsayılan: png)",
        },
      },
      required: ["designId"],
    },
  },
  {
    name: "canva_upload_asset",
    description: "Canva'ya görsel yükler. AI üretilen görselleri Canva'ya aktarmak için kullanılır.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Asset adı",
        },
        url: {
          type: "string",
          description: "Görsel URL'i",
        },
      },
      required: ["name", "url"],
    },
  },
  {
    name: "dual_layer_analyze",
    description: "Çift katmanlı AI analizi yapar. Runway teknik analiz + Gemini duygusal/kültürel analiz birleşimi. İçeriğin güçlü/zayıf yönlerini ve viral potansiyelini değerlendirir.",
    parameters: {
      type: "object",
      properties: {
        contentType: {
          type: "string",
          enum: ["image", "video", "design"],
          description: "İçerik türü",
        },
        description: {
          type: "string",
          description: "İçerik açıklaması veya promptu",
        },
        targetPlatform: {
          type: "string",
          enum: ["tiktok", "instagram", "youtube", "twitter", "linkedin"],
          description: "Hedef platform",
        },
        targetAudience: {
          type: "string",
          description: "Hedef kitle açıklaması",
        },
        imageUrl: {
          type: "string",
          description: "Analiz edilecek görsel URL'i (opsiyonel)",
        },
        videoUrl: {
          type: "string",
          description: "Analiz edilecek video URL'i (opsiyonel)",
        },
      },
      required: ["contentType", "description"],
    },
  },
  {
    name: "dual_layer_generate_with_analysis",
    description: "İçerik üretir ve anında çift katmanlı AI analizi yapar. Runway ile görsel/video oluşturur, sonra Runway+Gemini ile değerlendirir.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "İçerik promptu",
        },
        platform: {
          type: "string",
          enum: ["tiktok", "instagram", "youtube", "twitter", "linkedin"],
          description: "Hedef platform",
        },
        contentType: {
          type: "string",
          enum: ["image", "video"],
          description: "Üretilecek içerik türü (varsayılan: image)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "dual_layer_analyze_task",
    description: "Tamamlanmış bir Runway task'ını çift katmanlı AI ile analiz eder.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "Analiz edilecek Runway task ID'si",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "get_comprehensive_report",
    description: "İçerik için kapsamlı AI raporu oluşturur. Teknik + duygusal analiz + aksiyon önerileri içerir.",
    parameters: {
      type: "object",
      properties: {
        contentUrl: {
          type: "string",
          description: "İçerik URL'i",
        },
        contentType: {
          type: "string",
          enum: ["image", "video"],
          description: "İçerik türü",
        },
        prompt: {
          type: "string",
          description: "İçerik promptu (opsiyonel)",
        },
        platform: {
          type: "string",
          description: "Hedef platform (opsiyonel)",
        },
        audience: {
          type: "string",
          description: "Hedef kitle (opsiyonel)",
        },
      },
      required: ["contentUrl", "contentType"],
    },
  },
];

export async function executeCanvaTool(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  try {
    switch (toolName) {
      case "canva_check_status": {
        const isConfigured = canvaService.isConfigured();
        const tokens = canvaService.getTokens();
        const isAuthenticated = !!tokens && tokens.expiresAt > Date.now();

        return {
          success: true,
          data: {
            configured: isConfigured,
            authenticated: isAuthenticated,
            expiresAt: tokens?.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
          },
          message: isConfigured
            ? isAuthenticated
              ? "✅ Canva bağlı ve aktif"
              : "⚠️ Canva yapılandırılmış ama yetkilendirme gerekli"
            : "❌ Canva yapılandırılmamış - CANVA_CLIENT_ID ve CANVA_CLIENT_SECRET gerekli",
        };
      }

      case "canva_get_auth_url": {
        if (!canvaService.isConfigured()) {
          return {
            success: false,
            message: "Canva yapılandırılmamış. CANVA_CLIENT_ID ve CANVA_CLIENT_SECRET ortam değişkenlerini ekleyin.",
          };
        }

        const scopes = args.scopes || [
          "design:content:read",
          "design:content:write",
          "asset:read",
          "asset:write",
        ];

        const authData = canvaService.getAuthorizationUrl(scopes);

        return {
          success: true,
          data: {
            authUrl: authData.url,
            codeVerifier: authData.codeVerifier,
            state: authData.state,
          },
          message: `🔗 Canva yetkilendirme URL'i oluşturuldu. Bu linki kullanarak Canva hesabınıza bağlanın.`,
        };
      }

      case "canva_list_designs": {
        const limit = args.limit || 20;
        const designs = await canvaService.listDesigns(limit);

        return {
          success: true,
          data: designs,
          message: `📁 ${designs.length} Canva tasarımı listelendi`,
        };
      }

      case "canva_export_design": {
        const { designId, format = "png" } = args;
        const exportResult = await canvaService.exportDesign(designId, format);

        return {
          success: true,
          data: exportResult,
          message: `📤 Tasarım dışa aktarılıyor (ID: ${exportResult.id}, Format: ${format})`,
        };
      }

      case "canva_upload_asset": {
        const { name, url } = args;
        const asset = await canvaService.uploadAsset(name, url);

        return {
          success: true,
          data: asset,
          message: `✅ "${name}" Canva'ya yüklendi (ID: ${asset.id})`,
        };
      }

      case "dual_layer_analyze": {
        const analysis = await dualLayerAnalysisService.analyzeContent({
          contentType: args.contentType,
          description: args.description,
          targetPlatform: args.targetPlatform,
          targetAudience: args.targetAudience,
          imageUrl: args.imageUrl,
          videoUrl: args.videoUrl,
        });

        return {
          success: true,
          data: analysis,
          message: `🔍 Çift Katmanlı Analiz Tamamlandı!
📊 Genel Skor: ${analysis.combined.overallScore}/100
🎨 Runway (Teknik): ${analysis.runway.technicalQuality}/100
🧠 Gemini (Duygusal): Viral Potansiyel ${analysis.gemini.viralPotential}/100
📱 Önerilen Platform: ${analysis.combined.platformRecommendation}`,
        };
      }

      case "dual_layer_generate_with_analysis": {
        const { prompt, platform = "instagram", contentType = "image" } = args;

        const result = await dualLayerAnalysisService.generateWithAnalysis(
          prompt,
          platform,
          contentType
        );

        return {
          success: true,
          data: result,
          message: `🎨 İçerik üretimi başlatıldı ve ön analiz yapıldı!
📋 Task ID: ${result.task.id}
📊 Ön Analiz Skoru: ${result.initialAnalysis.combined.overallScore}/100
🎯 Platform Önerisi: ${result.initialAnalysis.combined.platformRecommendation}
⏳ İçerik hazırlanıyor, tamamlandığında analizi güncelleyebilirsiniz.`,
        };
      }

      case "dual_layer_analyze_task": {
        const { taskId } = args;
        const analysis = await dualLayerAnalysisService.analyzeGeneratedContent(taskId);

        if (!analysis) {
          return {
            success: false,
            message: `Task ${taskId} henüz tamamlanmadı veya bulunamadı. Lütfen durumu kontrol edin.`,
          };
        }

        return {
          success: true,
          data: analysis,
          message: `✅ Task ${taskId} için çift katmanlı analiz tamamlandı!
📊 Genel Skor: ${analysis.combined.overallScore}/100
💪 Güçlü Yönler: ${analysis.combined.strengths.slice(0, 2).join(", ")}
📱 Önerilen Platform: ${analysis.combined.platformRecommendation}`,
        };
      }

      case "get_comprehensive_report": {
        const { contentUrl, contentType, prompt, platform, audience } = args;

        const report = await dualLayerAnalysisService.getComprehensiveReport(
          contentUrl,
          contentType,
          { prompt, platform, audience }
        );

        return {
          success: true,
          data: report,
          message: `📄 Kapsamlı AI Raporu Hazır!
📊 Genel Skor: ${report.analysis.combined.overallScore}/100
📝 Rapor: ${report.report.slice(0, 200)}...
✅ ${report.recommendations.length} aksiyon önerisi oluşturuldu`,
        };
      }

      default:
        return {
          success: false,
          message: `Bilinmeyen araç: ${toolName}`,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Beklenmeyen hata";
    console.error(`Canva/DualLayer tool error (${toolName}):`, error);
    return {
      success: false,
      message: `Hata: ${message}`,
      error: message,
    };
  }
}
