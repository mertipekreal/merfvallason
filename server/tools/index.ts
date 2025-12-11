/**
 * DuyguMotor v3.0 - Tools Index
 * Central hub for all chatbot-callable functions with Gemini Function Calling
 */

import * as dataCenter from "./data-center";
import * as dreamTools from "./dreams";
import * as nftTools from "./nft";
import * as socialTools from "./social";
import { creativeStudioTools, executeCreativeStudioTool } from "./creative-studio";
import { musicAnalysisTools, executeMusicAnalysisTool } from "./music-analysis";
import { dejavuToolDefinitions, executeDejavuTool } from "./dejavu";
import { observabilityTools } from "./observability-tools";
import { generativeUIToolDefinitions, executeGenerativeUITool } from "./generative-ui-tools";
import { autonomousAgentsToolDefinitions, executeAutonomousAgentsTool } from "./autonomous-agents-tools";
import { githubToolDefinitions, executeGitHubTool } from "./github-tools";
import { panelToolDefinitions, executePanelTool } from "./panel-tools";
import { automationToolDefinitions, executeAutomationTool } from "./automation-tools";
import { canvaToolDefinitions, executeCanvaTool } from "./canva-tools";
import { agentToolDefinitions, executeAgentTool } from "./agent-tools";
import { marketTools, executeMarketTool } from "./market-tools";
import * as hybridSearchService from "../domains/core/services/hybrid-search-service";
import { memoryService } from "../domains/core/services/memory-service";
import { redisCacheService, CacheKeys, CacheTTL } from "../redis-cache-service";
import { aiObservability } from "../ai-observability-service";

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

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "get_data_overview",
    description: "DreamBank, TikTok, Instagram, Spotify ve Twitter veri sayılarını ve genel durumu gösterir. Kullanıcı veri durumunu sorduğunda kullan.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_bulk_job_status",
    description: "Aktif veri toplama işlerinin durumunu, ilerleme yüzdesini ve tahmini tamamlanma süresini gösterir.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_collection_progress",
    description: "Veri toplama hedeflerine ne zaman ulaşılacağını hesaplar ve tahmini süreleri verir.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "start_bulk_job",
    description: "Yeni veri toplama işi başlatır. Platform (tiktok, instagram, dreambank), hedef sayı ve hashtag belirtilebilir.",
    parameters: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: ["tiktok", "instagram", "dreambank"],
          description: "Veri toplanacak platform",
        },
        targetCount: {
          type: "number",
          description: "Hedeflenen kayıt sayısı (varsayılan: 1000)",
        },
        hashtag: {
          type: "string",
          description: "Aranacak hashtag (varsayılan: turkishrap)",
        },
      },
      required: ["platform"],
    },
  },
  {
    name: "search_dreams",
    description: "Rüya veritabanında arama yapar. Belirli bir kelime, tema veya duygu için rüyaları bulur.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Aranacak kelime veya tema",
        },
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_dream_by_id",
    description: "Belirli bir rüyanın detaylarını getirir.",
    parameters: {
      type: "object",
      properties: {
        dreamId: {
          type: "string",
          description: "Rüya ID'si",
        },
      },
      required: ["dreamId"],
    },
  },
  {
    name: "get_random_dream",
    description: "Rastgele bir rüya seçer ve detaylarını gösterir.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "analyze_dream",
    description: "Belirli bir rüyayı Jung arketipleri, sembolizm ve duygusal profil açısından analiz eder.",
    parameters: {
      type: "object",
      properties: {
        dreamId: {
          type: "string",
          description: "Analiz edilecek rüya ID'si",
        },
      },
      required: ["dreamId"],
    },
  },
  {
    name: "get_dream_stats",
    description: "Rüya veritabanı istatistiklerini gösterir: toplam sayı, en yaygın duygular ve temalar.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "generate_nft_from_dream",
    description: "Belirli bir rüyadan NFT görseli üretir. Runway AI kullanarak rüya içeriğine özgü sanat eseri oluşturur.",
    parameters: {
      type: "object",
      properties: {
        dreamId: {
          type: "string",
          description: "NFT oluşturulacak rüya ID'si",
        },
      },
      required: ["dreamId"],
    },
  },
  {
    name: "get_nft_status",
    description: "Belirli bir NFT'nin üretim durumunu kontrol eder.",
    parameters: {
      type: "object",
      properties: {
        nftId: {
          type: "string",
          description: "NFT ID'si",
        },
      },
      required: ["nftId"],
    },
  },
  {
    name: "list_nfts",
    description: "Mevcut NFT'leri listeler ve durumlarını gösterir.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_nft_stats",
    description: "NFT istatistiklerini gösterir: toplam, hazır, üretiliyor, başarısız.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "analyze_tiktok",
    description: "TikTok verilerini analiz eder: görüntüleme, beğeni, hashtag ve duygu dağılımı.",
    parameters: {
      type: "object",
      properties: {
        datasetId: {
          type: "string",
          description: "Analiz edilecek dataset ID (varsayılan: tiktok_main)",
        },
      },
      required: [],
    },
  },
  {
    name: "analyze_instagram",
    description: "Instagram verilerini analiz eder: görüntüleme, beğeni, hashtag ve duygu dağılımı.",
    parameters: {
      type: "object",
      properties: {
        datasetId: {
          type: "string",
          description: "Analiz edilecek dataset ID (varsayılan: instagram_1)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_trends",
    description: "TikTok veya Instagram trend analizini yapar: popüler hashtagler, trend içerikler ve öneriler.",
    parameters: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: ["tiktok", "instagram"],
          description: "Trend analizi yapılacak platform (varsayılan: tiktok)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_spotify_insights",
    description: "Spotify verilerini analiz eder: toplam şarkı, popülerlik, en popüler sanatçılar ve enerji profili.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_datasets",
    description: "Mevcut tüm veri setlerini ve kayıt sayılarını listeler.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  ...creativeStudioTools,
  ...musicAnalysisTools,
  ...dejavuToolDefinitions,
  {
    name: "hybrid_search",
    description: "Hem anahtar kelime hem de anlamsal (semantik) arama yapar. Rüyalarda, videolarda veya konuşmalarda derin arama için kullan. Melez arama algoritması ile daha doğru sonuçlar verir.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Aranacak metin veya konsept",
        },
        sources: {
          type: "array",
          items: { type: "string", enum: ["dream", "video", "conversation"] },
          description: "Aranacak kaynaklar (varsayılan: dream)",
        },
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_search_stats",
    description: "Arama sistemi istatistiklerini gösterir: toplam rüya, embedding kapsama oranı.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  // Long-Term Memory Tools
  {
    name: "store_memory",
    description: "Önemli bir bilgiyi uzun süreli hafızaya kaydeder. Kullanıcı bir şeyi hatırlamanı istediğinde veya önemli bir bilgi paylaştığında kullan.",
    parameters: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Hatırlanacak bilgi içeriği",
        },
        userId: {
          type: "string",
          description: "Kullanıcı ID'si",
        },
      },
      required: ["content", "userId"],
    },
  },
  {
    name: "search_memories",
    description: "Uzun süreli hafızada arama yapar. Kullanıcı geçmişte ne söylediğini veya bir bilgiyi sorduğunda kullan.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Aranacak bilgi veya konsept",
        },
        userId: {
          type: "string",
          description: "Kullanıcı ID'si",
        },
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 10)",
        },
      },
      required: ["query", "userId"],
    },
  },
  {
    name: "get_recent_memories",
    description: "Kullanıcının son hafızalarını getirir. Konuşma bağlamını hatırlamak için kullan.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Kullanıcı ID'si",
        },
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 10)",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "get_important_memories",
    description: "Kullanıcının en önemli hafızalarını getirir. Kritik bilgileri hatırlamak için kullan.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Kullanıcı ID'si",
        },
        limit: {
          type: "number",
          description: "Maksimum sonuç sayısı (varsayılan: 10)",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "get_memory_stats",
    description: "Kullanıcının hafıza istatistiklerini gösterir: toplam, türe göre dağılım, en erişilen konular.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Kullanıcı ID'si",
        },
      },
      required: ["userId"],
    },
  },
  // AI Observability Tools
  {
    name: "get_ai_analytics",
    description: "AI kullanım analitiği ve performans metrikleri - token kullanımı, başarı oranı, ortalama gecikme, en çok kullanılan araçlar",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Kaç günlük veri analiz edilsin (varsayılan: 7)",
        },
        userId: {
          type: "string",
          description: "Belirli bir kullanıcıya göre filtrele (opsiyonel)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_ai_performance",
    description: "AI sistem performans metrikleri - latency percentilleri, hata oranı, başarı oranı",
    parameters: {
      type: "object",
      properties: {
        hours: {
          type: "number",
          description: "Kaç saatlik veri analiz edilsin (varsayılan: 24)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_ai_errors",
    description: "Son AI hatalarını ve çözümlenmemiş sorunları listeler",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Kaç hata listelensin (varsayılan: 10)",
        },
        unresolvedOnly: {
          type: "boolean",
          description: "Sadece çözümlenmemiş hataları göster",
        },
      },
      required: [],
    },
  },
  {
    name: "get_daily_token_usage",
    description: "Bugünkü token kullanımını ve günlük limite göre durumu gösterir",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "resolve_ai_error",
    description: "Bir AI hatasını çözümlendi olarak işaretle",
    parameters: {
      type: "object",
      properties: {
        errorId: {
          type: "string",
          description: "Çözümlenen hatanın ID'si",
        },
        resolution: {
          type: "string",
          description: "Çözüm açıklaması",
        },
      },
      required: ["errorId", "resolution"],
    },
  },
  ...generativeUIToolDefinitions,
  ...autonomousAgentsToolDefinitions,
  ...githubToolDefinitions,
  ...panelToolDefinitions,
  ...automationToolDefinitions,
  ...canvaToolDefinitions,
  ...agentToolDefinitions,
  ...marketTools,
];

const CACHEABLE_TOOLS = new Set([
  'get_data_overview',
  'get_dream_stats',
  'get_trends',
  'get_spotify_insights',
  'list_datasets',
  'get_search_stats',
  'get_nft_stats',
  'get_dejavu_stats',
  'search_dreams',
  'hybrid_search',
]);

function getCacheTTL(toolName: string): number {
  const ttlMap: Record<string, number> = {
    'get_data_overview': CacheTTL.dataOverview,
    'get_dream_stats': CacheTTL.long,
    'get_trends': CacheTTL.trends,
    'get_spotify_insights': CacheTTL.medium,
    'list_datasets': CacheTTL.long,
    'get_search_stats': CacheTTL.medium,
    'get_nft_stats': CacheTTL.medium,
    'get_dejavu_stats': CacheTTL.medium,
    'search_dreams': CacheTTL.search,
    'hybrid_search': CacheTTL.search,
  };
  return ttlMap[toolName] || CacheTTL.medium;
}

export async function executeTool(toolName: string, args: Record<string, any>): Promise<ToolCallResult> {
  console.log(`🔧 Executing tool: ${toolName} with args:`, JSON.stringify(args));

  const isCacheable = CACHEABLE_TOOLS.has(toolName);
  const cacheKey = isCacheable 
    ? redisCacheService.createCacheKey(toolName, JSON.stringify(args))
    : '';

  if (isCacheable) {
    const cached = await redisCacheService.get<ToolCallResult>(cacheKey);
    if (cached) {
      console.log(`📦 Cache HIT for ${toolName}`);
      return { ...cached, message: `${cached.message} (önbellekten)` };
    }
    console.log(`📦 Cache MISS for ${toolName}`);
  }

  let result: ToolCallResult;

  try {
    switch (toolName) {
      case "get_data_overview":
        result = await dataCenter.getDataOverview();
        break;

      case "get_bulk_job_status":
        result = await dataCenter.getBulkJobStatus();
        break;

      case "get_collection_progress":
        result = await dataCenter.getCollectionProgress();
        break;

      case "start_bulk_job":
        result = await dataCenter.startBulkJob({
          platform: args.platform,
          targetCount: args.targetCount,
          hashtag: args.hashtag,
        });
        break;

      case "search_dreams":
        result = await dreamTools.searchDreams(args.query, args.limit || 10);
        break;

      case "get_dream_by_id":
        result = await dreamTools.getDreamById(args.dreamId);
        break;

      case "get_random_dream":
        result = await dreamTools.getRandomDream();
        break;

      case "analyze_dream":
        result = await dreamTools.analyzeDream(args.dreamId);
        break;

      case "get_dream_stats":
        result = await dreamTools.getDreamStats();
        break;

      case "generate_nft_from_dream":
        result = await nftTools.generateNFTFromDream(args.dreamId);
        break;

      case "get_nft_status":
        result = await nftTools.getNFTStatus(args.nftId);
        break;

      case "list_nfts":
        result = await nftTools.listNFTs(args.limit || 10);
        break;

      case "get_nft_stats":
        result = await nftTools.getNFTStats();
        break;

      case "analyze_tiktok":
        result = await socialTools.analyzeTikTok(args.datasetId || "tiktok_main");
        break;

      case "analyze_instagram":
        result = await socialTools.analyzeInstagram(args.datasetId || "instagram_1");
        break;

      case "get_trends":
        result = await socialTools.getTrends(args.platform || "tiktok");
        break;

      case "get_spotify_insights":
        result = await socialTools.getSpotifyInsights();
        break;

      case "list_datasets":
        result = await socialTools.listDatasets();
        break;

      case "generate_brief":
      case "create_video":
      case "create_image":
      case "check_content_status":
      case "list_content_tasks":
        result = await executeCreativeStudioTool(toolName, args);
        break;

      case "analyze_track":
      case "check_playlist_fit":
      case "get_artist_playlists":
      case "search_spotify_track":
      case "search_spotify_artist":
      case "tiktok_spotify_bridge":
        result = await executeMusicAnalysisTool(toolName, args);
        break;

      case "synthesize_dream":
      case "detect_dejavu":
      case "generate_dejavu_scenario":
      case "get_dejavu_stats":
      case "list_dejavu_scenarios":
      case "find_dejavu_matches":
        result = await executeDejavuTool(toolName, args);
        break;

      case "hybrid_search": {
        const hybridResults = await hybridSearchService.hybridSearch(args.query, {
          sources: args.sources || ['dream'],
          limit: args.limit || 20,
        });
        result = {
          success: true,
          data: hybridResults,
          message: `"${args.query}" için ${hybridResults.length} sonuç bulundu (Melez Arama).`,
        };
        break;
      }

      case "get_search_stats": {
        const searchStats = await hybridSearchService.getSearchStats();
        result = {
          success: true,
          data: searchStats,
          message: `Arama istatistikleri: ${searchStats.totalDreams} rüya, %${searchStats.embeddingCoverage.toFixed(1)} embedding kapsama.`,
        };
        break;
      }

      // Memory Tools
      case "store_memory": {
        const memory = await memoryService.createMemory(args.userId, args.content);
        result = {
          success: true,
          data: memory,
          message: `Hafıza başarıyla kaydedildi (Tür: ${memory.memoryType}, Önem: ${memory.importance}).`,
        };
        break;
      }

      case "search_memories": {
        const searchedMemories = await memoryService.searchMemories({
          userId: args.userId,
          query: args.query,
          limit: args.limit || 10,
        });
        result = {
          success: true,
          data: searchedMemories,
          message: `"${args.query}" için ${searchedMemories.length} hafıza bulundu.`,
        };
        break;
      }

      case "get_recent_memories": {
        const recentMemories = await memoryService.getRecentMemories(args.userId, args.limit || 10);
        result = {
          success: true,
          data: recentMemories,
          message: `Son ${recentMemories.length} hafıza getirildi.`,
        };
        break;
      }

      case "get_important_memories": {
        const importantMemories = await memoryService.getImportantMemories(args.userId, args.limit || 10);
        result = {
          success: true,
          data: importantMemories,
          message: `En önemli ${importantMemories.length} hafıza getirildi.`,
        };
        break;
      }

      case "get_memory_stats": {
        const memoryStats = await memoryService.getMemoryStats(args.userId);
        result = {
          success: true,
          data: memoryStats,
          message: `Hafıza istatistikleri: ${memoryStats.totalMemories} toplam, ${Object.keys(memoryStats.byType).length} tür, ${memoryStats.mostAccessedTopics.length} popüler konu.`,
        };
        break;
      }

      // AI Observability Tools
      case "get_ai_analytics": {
        const analytics = await observabilityTools.get_ai_analytics.handler(args);
        result = {
          success: true,
          data: analytics,
          message: `AI Analitik Raporu: ${analytics.totalRequests} istek, ${analytics.successRate} başarı, ${analytics.avgLatencyMs}ms ortalama`,
        };
        break;
      }

      case "get_ai_performance": {
        const perf = await observabilityTools.get_ai_performance.handler(args);
        result = {
          success: true,
          data: perf,
          message: `Performans Raporu: ${perf.avgLatency} ortalama, ${perf.successRate} başarı, ${perf.status}`,
        };
        break;
      }

      case "get_ai_errors": {
        const errors = await observabilityTools.get_ai_errors.handler(args);
        result = {
          success: true,
          data: errors,
          message: `Son hatalar: ${errors.totalErrors} toplam, ${errors.unresolvedCount} çözümlenmemiş`,
        };
        break;
      }

      case "get_daily_token_usage": {
        const usage = await observabilityTools.get_daily_token_usage.handler();
        result = {
          success: true,
          data: usage,
          message: `Günlük token: ${usage.todaysTokens.toLocaleString()} / ${usage.dailyLimit.toLocaleString()} (${usage.usagePercent}) ${usage.status}`,
        };
        break;
      }

      case "resolve_ai_error": {
        const resolved = await observabilityTools.resolve_ai_error.handler({
          errorId: args.errorId as string,
          resolution: args.resolution as string,
        });
        result = {
          success: resolved.success,
          data: resolved,
          message: resolved.message,
        };
        break;
      }

      case "analyze_theme":
      case "get_dream_theme":
      case "list_themes":
      case "get_theme_details":
      case "set_active_theme":
      case "blend_themes":
        result = await executeGenerativeUITool(toolName, args);
        break;

      case "list_agents":
      case "run_agent":
      case "get_agent_results":
      case "get_all_findings":
      case "enable_agent":
      case "disable_agent":
      case "get_agent_stats":
        result = await executeAutonomousAgentsTool(toolName, args);
        break;

      case "github_get_user":
      case "github_list_repos":
      case "github_get_repo":
      case "github_list_commits":
      case "github_search_repos":
      case "github_list_issues":
      case "github_create_repo":
        result = await executeGitHubTool(toolName, args);
        break;

      case "analyze_text_sentiment":
      case "compare_datasets":
      case "get_weekly_insights":
      case "get_behavior_signals":
      case "list_vista_accounts":
      case "get_fate_profile":
      case "get_gamification_stats":
      case "semantic_search":
        result = await executePanelTool(toolName, args);
        break;

      case "get_automation_dashboard":
      case "list_automation_jobs":
      case "start_automation_job":
      case "stop_automation_job":
      case "update_automation_config":
      case "get_automation_logs":
      case "get_documented_dejavu_cases":
      case "get_quick_dejavu_matches":
      case "generate_image_dalle":
        result = await executeAutomationTool(toolName, args);
        break;

      case "canva_check_status":
      case "canva_get_auth_url":
      case "canva_list_designs":
      case "canva_export_design":
      case "canva_upload_asset":
      case "dual_layer_analyze":
      case "dual_layer_generate_with_analysis":
      case "dual_layer_analyze_task":
      case "get_comprehensive_report":
        result = await executeCanvaTool(toolName, args);
        break;

      // Agent Tools - Full agent capabilities
      case "execute_sql":
      case "read_file":
      case "list_files":
      case "analyze_csv":
      case "analyze_json":
      case "get_tiktok_stats":
      case "get_instagram_stats":
      case "get_database_schema":
      case "run_analysis":
      case "generate_report":
        result = await executeAgentTool(toolName, args);
        break;

      // Market Analysis Tools (v3.3)
      case "analyze_fvg":
      case "analyze_mss":
      case "analyze_liquidity":
      case "dream_market_correlation":
      case "market_maker_sentiment":
      case "generate_trading_signal":
      case "backtest_strategy":
      case "get_dream_chaos_index":
      case "get_market_dashboard": {
        const marketResult = await executeMarketTool(toolName, args);
        result = {
          success: true,
          data: marketResult,
          message: `Market analizi tamamlandı: ${toolName}`,
        };
        break;
      }

      default:
        result = {
          success: false,
          message: `Bilinmeyen araç: ${toolName}`,
          error: "Unknown tool",
        };
    }

    if (isCacheable && result.success) {
      const ttl = getCacheTTL(toolName);
      await redisCacheService.set(cacheKey, result, ttl);
      console.log(`📦 Cached ${toolName} for ${ttl}s`);
    }

    return result;
  } catch (error: any) {
    console.error(`Tool execution error (${toolName}):`, error);
    return {
      success: false,
      message: `Araç çalıştırılırken hata oluştu: ${error.message}`,
      error: error.message,
    };
  }
}

export function getToolsForGemini(): any[] {
  return toolDefinitions.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export function isValidTool(toolName: string): boolean {
  return toolDefinitions.some(t => t.name === toolName);
}

export function getToolDefinition(toolName: string): ToolDefinition | undefined {
  return toolDefinitions.find(t => t.name === toolName);
}

export function validateToolArgs(toolName: string, args: Record<string, any>): { valid: boolean; error?: string } {
  const tool = getToolDefinition(toolName);
  if (!tool) {
    return { valid: false, error: `Tool not found: ${toolName}` };
  }

  for (const requiredArg of tool.parameters.required) {
    if (!(requiredArg in args) || args[requiredArg] === undefined || args[requiredArg] === null) {
      return { valid: false, error: `Missing required argument: ${requiredArg}` };
    }
  }

  return { valid: true };
}

export function detectToolFromMessage(message: string): { toolName: string; args: Record<string, any> } | null {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("veri") && (lowerMessage.includes("nasıl") || lowerMessage.includes("durum"))) {
    return { toolName: "get_data_overview", args: {} };
  }

  if (lowerMessage.includes("hedef") && (lowerMessage.includes("ne zaman") || lowerMessage.includes("ilerleme"))) {
    return { toolName: "get_collection_progress", args: {} };
  }

  if (lowerMessage.includes("rüya") && lowerMessage.includes("ara")) {
    const match = message.match(/ara[^\w]*(.+)/i);
    if (match) {
      return { toolName: "search_dreams", args: { query: match[1].trim() } };
    }
  }

  if (lowerMessage.includes("trend")) {
    const platform = lowerMessage.includes("instagram") ? "instagram" : "tiktok";
    return { toolName: "get_trends", args: { platform } };
  }

  if (lowerMessage.includes("nft") && lowerMessage.includes("üret")) {
    return null;
  }

  if (lowerMessage.includes("spotify")) {
    return { toolName: "get_spotify_insights", args: {} };
  }

  if (lowerMessage.includes("tiktok") && lowerMessage.includes("analiz")) {
    return { toolName: "analyze_tiktok", args: {} };
  }

  if (lowerMessage.includes("instagram") && lowerMessage.includes("analiz")) {
    return { toolName: "analyze_instagram", args: {} };
  }

  if (lowerMessage.includes("brief") || (lowerMessage.includes("içerik") && lowerMessage.includes("prompt"))) {
    return { toolName: "generate_brief", args: {} };
  }

  if (lowerMessage.includes("video") && (lowerMessage.includes("oluştur") || lowerMessage.includes("üret"))) {
    return { toolName: "create_video", args: {} };
  }

  // @gorsel quick command - direct image generation
  if (lowerMessage.startsWith("@gorsel") || lowerMessage.startsWith("@görsel")) {
    const prompt = message.replace(/^@g[oö]rsel\s*/i, "").trim();
    if (prompt) {
      return { toolName: "generate_image_dalle", args: { prompt, size: "1024x1024" } };
    }
    return null;
  }

  // DALL-E Image Generation detection (with Turkish suffix support: resim→resmi, görsel→görseli, etc.)
  const imageKeywords = ["görsel", "resim", "resm", "image", "fotoğraf", "foto"];
  const createKeywords = ["oluştur", "üret", "çiz", "yap"];
  const hasImageKeyword = imageKeywords.some(k => lowerMessage.includes(k));
  const hasCreateKeyword = createKeywords.some(k => lowerMessage.includes(k));
  
  if (hasImageKeyword && hasCreateKeyword) {
    // Extract prompt from message - look for descriptive content
    const promptPatterns = [
      /(?:görsel|resim|image|fotoğraf)[^\w]*(?:oluştur|üret|çiz|yap)[^\w]*(.+)/i,
      /(.+?)\s+(?:görsel|resim|image|fotoğraf)(?:i|ı|si|sı)?\s+(?:oluştur|üret|çiz|yap)/i,
      /(?:bana|bir)\s+(.+?)\s+(?:görsel|resim)/i
    ];
    
    let prompt = "";
    for (const pattern of promptPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        prompt = match[1].trim();
        break;
      }
    }
    
    // If no specific prompt extracted, use the full message as context
    if (!prompt) {
      prompt = message;
    }
    
    return { toolName: "generate_image_dalle", args: { prompt, size: "1024x1024" } };
  }

  if (lowerMessage.includes("şarkı") && lowerMessage.includes("analiz")) {
    return { toolName: "analyze_track", args: {} };
  }

  if (lowerMessage.includes("playlist") && (lowerMessage.includes("uyum") || lowerMessage.includes("fit"))) {
    return { toolName: "check_playlist_fit", args: {} };
  }

  if (lowerMessage.includes("sanatçı") && lowerMessage.includes("playlist")) {
    return { toolName: "get_artist_playlists", args: {} };
  }

  if (lowerMessage.includes("tiktok") && lowerMessage.includes("köprü")) {
    return { toolName: "tiktok_spotify_bridge", args: {} };
  }

  if (lowerMessage.includes("dejavu") && (lowerMessage.includes("oluştur") || lowerMessage.includes("üret") || lowerMessage.includes("senaryo"))) {
    return { toolName: "generate_dejavu_scenario", args: { scenarioType: "transformative", timeframe: "3months" } };
  }

  if (lowerMessage.includes("dejavu") && (lowerMessage.includes("istatistik") || lowerMessage.includes("durum"))) {
    return { toolName: "get_dejavu_stats", args: {} };
  }

  if (lowerMessage.includes("rüya") && (lowerMessage.includes("oluştur") || lowerMessage.includes("üret") || lowerMessage.includes("sentez"))) {
    return { toolName: "synthesize_dream", args: { 
      primaryEmotion: "wonder", 
      symbols: ["door", "water", "light"], 
      intensity: 7, 
      vividness: 8, 
      lucidity: 5, 
      duration: "medium" 
    }};
  }

  if (lowerMessage.includes("dejavu") && lowerMessage.includes("tespit")) {
    return { toolName: "get_dejavu_stats", args: {} };
  }

  if ((lowerMessage.includes("melez") || lowerMessage.includes("hybrid") || lowerMessage.includes("derin")) && lowerMessage.includes("ara")) {
    const match = lowerMessage.match(/ara[^\w]*(.+)/i) || lowerMessage.match(/için[^\w]*(.+)/i);
    if (match) {
      return { toolName: "hybrid_search", args: { query: match[1].trim() } };
    }
  }

  // Memory detection
  if ((lowerMessage.includes("hatırla") || lowerMessage.includes("kaydet")) && 
      (lowerMessage.includes("bunu") || lowerMessage.includes("şunu"))) {
    return null; // Let Gemini handle with context
  }

  if (lowerMessage.includes("hafıza") && (lowerMessage.includes("istatistik") || lowerMessage.includes("durum"))) {
    return { toolName: "get_memory_stats", args: {} };
  }

  if ((lowerMessage.includes("son") || lowerMessage.includes("geçen")) && lowerMessage.includes("hatırla")) {
    return { toolName: "get_recent_memories", args: {} };
  }

  if (lowerMessage.includes("önemli") && lowerMessage.includes("hatırla")) {
    return { toolName: "get_important_memories", args: {} };
  }

  if (lowerMessage.includes("arama") && (lowerMessage.includes("istatistik") || lowerMessage.includes("durum"))) {
    return { toolName: "get_search_stats", args: {} };
  }

  // AI Observability detection
  if ((lowerMessage.includes("ai") || lowerMessage.includes("yapay zeka")) && 
      (lowerMessage.includes("analitik") || lowerMessage.includes("istatistik"))) {
    return { toolName: "get_ai_analytics", args: {} };
  }

  if ((lowerMessage.includes("ai") || lowerMessage.includes("yapay zeka") || lowerMessage.includes("sistem")) && 
      lowerMessage.includes("performans")) {
    return { toolName: "get_ai_performance", args: {} };
  }

  if ((lowerMessage.includes("ai") || lowerMessage.includes("yapay zeka")) && 
      (lowerMessage.includes("hata") || lowerMessage.includes("error"))) {
    return { toolName: "get_ai_errors", args: {} };
  }

  if (lowerMessage.includes("token") && (lowerMessage.includes("kullanım") || lowerMessage.includes("günlük"))) {
    return { toolName: "get_daily_token_usage", args: {} };
  }

  // Generative UI theme detection
  if (lowerMessage.includes("tema") && (lowerMessage.includes("listele") || lowerMessage.includes("göster") || lowerMessage.includes("neler"))) {
    return { toolName: "list_themes", args: {} };
  }

  if (lowerMessage.includes("tema") && (lowerMessage.includes("analiz") || lowerMessage.includes("öner"))) {
    return null; // Let Gemini extract the content
  }

  if (lowerMessage.includes("tema") && (lowerMessage.includes("ayarla") || lowerMessage.includes("değiştir"))) {
    const themes = ['celestial', 'oceanic', 'volcanic', 'verdant', 'ethereal', 'shadow', 'aurora', 'desert', 'cosmic'];
    for (const theme of themes) {
      if (lowerMessage.includes(theme)) {
        return { toolName: "set_active_theme", args: { theme } };
      }
    }
    return null;
  }

  if ((lowerMessage.includes("tema") || lowerMessage.includes("renk")) && lowerMessage.includes("karıştır")) {
    return null; // Let Gemini handle with context
  }

  // Autonomous Agents detection
  if ((lowerMessage.includes("ajan") || lowerMessage.includes("agent")) && 
      (lowerMessage.includes("listele") || lowerMessage.includes("göster") || lowerMessage.includes("neler"))) {
    return { toolName: "list_agents", args: {} };
  }

  if ((lowerMessage.includes("ajan") || lowerMessage.includes("agent")) && 
      (lowerMessage.includes("çalıştır") || lowerMessage.includes("başlat"))) {
    const agents = ['social_media_watcher', 'dream_pattern_detector', 'engagement_analyzer', 'sentiment_tracker', 'content_recommender'];
    for (const agentId of agents) {
      if (lowerMessage.includes(agentId.replace('_', ' ')) || 
          (agentId === 'social_media_watcher' && lowerMessage.includes('sosyal')) ||
          (agentId === 'dream_pattern_detector' && lowerMessage.includes('rüya')) ||
          (agentId === 'sentiment_tracker' && lowerMessage.includes('duygu'))) {
        return { toolName: "run_agent", args: { agentId } };
      }
    }
    return null;
  }

  if ((lowerMessage.includes("ajan") || lowerMessage.includes("agent")) && 
      (lowerMessage.includes("istatistik") || lowerMessage.includes("durum"))) {
    return { toolName: "get_agent_stats", args: {} };
  }

  if (lowerMessage.includes("bulgu") && (lowerMessage.includes("tüm") || lowerMessage.includes("hepsi"))) {
    return { toolName: "get_all_findings", args: {} };
  }

  // GitHub detection
  if (lowerMessage.includes("github") && (lowerMessage.includes("kullanıcı") || lowerMessage.includes("hesap") || lowerMessage.includes("profil"))) {
    return { toolName: "github_get_user", args: {} };
  }

  if (lowerMessage.includes("github") && (lowerMessage.includes("repo") || lowerMessage.includes("depo"))) {
    if (lowerMessage.includes("listele") || lowerMessage.includes("göster")) {
      return { toolName: "github_list_repos", args: {} };
    }
  }

  if (lowerMessage.includes("github") && lowerMessage.includes("ara")) {
    const queryMatch = lowerMessage.match(/ara[:\s]+["']?([^"']+)["']?/i);
    if (queryMatch) {
      return { toolName: "github_search_repos", args: { query: queryMatch[1].trim() } };
    }
  }

  // Panel Tools Detection
  if ((lowerMessage.includes("duygu") && lowerMessage.includes("analiz")) ||
      (lowerMessage.includes("sentiment") && lowerMessage.includes("analiz"))) {
    return null; // Let Gemini extract the text to analyze
  }

  if ((lowerMessage.includes("karşılaştır") || lowerMessage.includes("compare")) && 
      lowerMessage.includes("dataset")) {
    return null; // Let Gemini extract the dataset names
  }

  if (lowerMessage.includes("haftalık") && (lowerMessage.includes("içgörü") || lowerMessage.includes("analiz") || lowerMessage.includes("rapor"))) {
    return { toolName: "get_weekly_insights", args: {} };
  }

  if (lowerMessage.includes("davranış") && (lowerMessage.includes("sinyal") || lowerMessage.includes("analiz") || lowerMessage.includes("profil"))) {
    return { toolName: "get_behavior_signals", args: {} };
  }

  if (lowerMessage.includes("vista") && (lowerMessage.includes("hesap") || lowerMessage.includes("listele"))) {
    return { toolName: "list_vista_accounts", args: {} };
  }

  if ((lowerMessage.includes("kader") && (lowerMessage.includes("profil") || lowerMessage.includes("durum"))) ||
      (lowerMessage.includes("bilinç") && lowerMessage.includes("seviye"))) {
    return { toolName: "get_fate_profile", args: {} };
  }

  if ((lowerMessage.includes("gamifikasyon") || lowerMessage.includes("puan") || lowerMessage.includes("rozet") || lowerMessage.includes("seviye")) &&
      (lowerMessage.includes("durum") || lowerMessage.includes("istatistik") || lowerMessage.includes("nasıl"))) {
    return { toolName: "get_gamification_stats", args: {} };
  }

  if ((lowerMessage.includes("semantik") || lowerMessage.includes("anlam")) && lowerMessage.includes("ara")) {
    const match = lowerMessage.match(/ara[^\w]*(.+)/i);
    if (match) {
      return { toolName: "semantic_search", args: { query: match[1].trim() } };
    }
  }

  // Canva detection
  if (lowerMessage.includes("canva") && (lowerMessage.includes("durum") || lowerMessage.includes("bağlantı") || lowerMessage.includes("kontrol"))) {
    return { toolName: "canva_check_status", args: {} };
  }

  if (lowerMessage.includes("canva") && (lowerMessage.includes("bağlan") || lowerMessage.includes("yetki") || lowerMessage.includes("auth"))) {
    return { toolName: "canva_get_auth_url", args: {} };
  }

  if (lowerMessage.includes("canva") && (lowerMessage.includes("tasarım") || lowerMessage.includes("design") || lowerMessage.includes("listele"))) {
    return { toolName: "canva_list_designs", args: {} };
  }

  // Dual-layer AI analysis detection
  if ((lowerMessage.includes("çift") && lowerMessage.includes("katman")) || 
      (lowerMessage.includes("dual") && lowerMessage.includes("layer")) ||
      (lowerMessage.includes("runway") && lowerMessage.includes("gemini"))) {
    return { toolName: "dual_layer_analyze", args: {} };
  }

  if ((lowerMessage.includes("kapsamlı") || lowerMessage.includes("detaylı")) && 
      (lowerMessage.includes("rapor") || lowerMessage.includes("analiz"))) {
    return { toolName: "get_comprehensive_report", args: {} };
  }

  // Agent Tools Detection - Full Agent Capabilities
  if (lowerMessage.includes("sql") || (lowerMessage.includes("sorgu") && lowerMessage.includes("çalıştır"))) {
    const queryMatch = message.match(/sql[:\s]+(.+)/i) || message.match(/sorgu[:\s]+(.+)/i);
    if (queryMatch) {
      return { toolName: "execute_sql", args: { query: queryMatch[1].trim() } };
    }
  }

  if (lowerMessage.includes("dosya") && (lowerMessage.includes("oku") || lowerMessage.includes("aç"))) {
    const pathMatch = message.match(/dosya[:\s]+["']?([^"'\s]+)["']?/i);
    if (pathMatch) {
      return { toolName: "read_file", args: { filePath: pathMatch[1] } };
    }
  }

  if ((lowerMessage.includes("dosya") || lowerMessage.includes("klasör")) && lowerMessage.includes("listele")) {
    return { toolName: "list_files", args: { directory: "data" } };
  }

  if (lowerMessage.includes("csv") && lowerMessage.includes("analiz")) {
    return { toolName: "analyze_csv", args: {} };
  }

  if (lowerMessage.includes("json") && lowerMessage.includes("analiz")) {
    return { toolName: "analyze_json", args: {} };
  }

  if (lowerMessage.includes("tiktok") && (lowerMessage.includes("istatistik") || lowerMessage.includes("stat"))) {
    return { toolName: "get_tiktok_stats", args: {} };
  }

  if (lowerMessage.includes("instagram") && (lowerMessage.includes("istatistik") || lowerMessage.includes("stat"))) {
    return { toolName: "get_instagram_stats", args: {} };
  }

  if ((lowerMessage.includes("veritabanı") || lowerMessage.includes("database")) && 
      (lowerMessage.includes("şema") || lowerMessage.includes("tablo") || lowerMessage.includes("yapı"))) {
    return { toolName: "get_database_schema", args: {} };
  }

  if (lowerMessage.includes("analiz") && 
      (lowerMessage.includes("etkileşim") || lowerMessage.includes("engagement"))) {
    return { toolName: "run_analysis", args: { type: "engagement", platform: "all" } };
  }

  if (lowerMessage.includes("analiz") && lowerMessage.includes("saat")) {
    return { toolName: "run_analysis", args: { type: "timing", platform: "all" } };
  }

  if (lowerMessage.includes("analiz") && lowerMessage.includes("hashtag")) {
    return { toolName: "run_analysis", args: { type: "hashtag", platform: "all" } };
  }

  if (lowerMessage.includes("büyüme") && (lowerMessage.includes("strateji") || lowerMessage.includes("plan"))) {
    return { toolName: "run_analysis", args: { type: "growth", platform: "all" } };
  }

  if ((lowerMessage.includes("takvim") || lowerMessage.includes("calendar")) && lowerMessage.includes("içerik")) {
    return { toolName: "generate_report", args: { reportType: "content_calendar" } };
  }

  if (lowerMessage.includes("rapor") && (lowerMessage.includes("haftalık") || lowerMessage.includes("weekly"))) {
    return { toolName: "generate_report", args: { reportType: "weekly" } };
  }

  if (lowerMessage.includes("rapor") && (lowerMessage.includes("günlük") || lowerMessage.includes("daily"))) {
    return { toolName: "generate_report", args: { reportType: "daily" } };
  }

  if (lowerMessage.includes("strateji") && lowerMessage.includes("rapor")) {
    return { toolName: "generate_report", args: { reportType: "growth_strategy" } };
  }

  return null;
}

export { dataCenter, dreamTools, nftTools, socialTools };
