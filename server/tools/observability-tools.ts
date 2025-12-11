import { aiObservability } from "../ai-observability-service";

export const observabilityTools = {
  get_ai_analytics: {
    name: "get_ai_analytics",
    description: "AI kullanım analitiği ve performans metrikleri al - token kullanımı, başarı oranı, ortalama gecikme, en çok kullanılan araçlar",
    category: "observability",
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
    },
    handler: async (params: { days?: number; userId?: string }) => {
      const days = params.days || 7;
      const summary = await aiObservability.getAnalyticsSummary(params.userId, days);
      
      return {
        period: `Son ${days} gün`,
        totalRequests: summary.totalRequests,
        successRate: `${(summary.successRate * 100).toFixed(1)}%`,
        avgLatencyMs: Math.round(summary.avgLatencyMs),
        totalTokensUsed: summary.totalTokensUsed,
        avgTokensPerRequest: Math.round(summary.avgTokensPerRequest),
        topTools: summary.topTools.slice(0, 5),
        errorsByType: summary.errorsByType,
        sentimentDistribution: summary.sentimentDistribution,
      };
    },
  },

  get_ai_performance: {
    name: "get_ai_performance",
    description: "AI sistem performans metrikleri - latency percentilleri, hata oranı, başarı oranı",
    category: "observability",
    parameters: {
      type: "object",
      properties: {
        hours: {
          type: "number",
          description: "Kaç saatlik veri analiz edilsin (varsayılan: 24)",
        },
      },
    },
    handler: async (params: { hours?: number }) => {
      const hours = params.hours || 24;
      const perf = await aiObservability.getPerformanceMetrics(hours);
      
      return {
        period: `Son ${hours} saat`,
        avgLatency: `${Math.round(perf.avgLatency)}ms`,
        p50Latency: `${Math.round(perf.p50Latency)}ms`,
        p95Latency: `${Math.round(perf.p95Latency)}ms`,
        p99Latency: `${Math.round(perf.p99Latency)}ms`,
        successRate: `${(perf.successRate * 100).toFixed(1)}%`,
        errorRate: `${(perf.errorRate * 100).toFixed(2)}%`,
        status: perf.errorRate > 0.1 ? "⚠️ Dikkat Gerekli" : "✅ Sağlıklı",
      };
    },
  },

  get_ai_errors: {
    name: "get_ai_errors",
    description: "Son AI hatalarını ve çözümlenmemiş sorunları listele",
    category: "observability",
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
    },
    handler: async (params: { limit?: number; unresolvedOnly?: boolean }) => {
      const limit = params.limit || 10;
      
      const errors = params.unresolvedOnly 
        ? await aiObservability.getUnresolvedErrors()
        : await aiObservability.getRecentErrors(limit);
      
      return {
        totalErrors: errors.length,
        unresolvedCount: errors.filter((e: any) => e.resolved === 0).length,
        errors: errors.slice(0, limit).map((e: any) => ({
          id: e.id,
          type: e.errorType,
          severity: e.severity,
          message: e.errorMessage?.substring(0, 100),
          createdAt: e.createdAt,
          resolved: e.resolved === 1,
        })),
      };
    },
  },

  get_daily_token_usage: {
    name: "get_daily_token_usage",
    description: "Bugünkü token kullanımını ve günlük limite göre durumu göster",
    category: "observability",
    parameters: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      const usage = await aiObservability.getDailyTokenUsage();
      const dailyLimit = 1_000_000;
      const usagePercent = (usage.totalTokens / dailyLimit) * 100;
      
      return {
        todaysTokens: usage.totalTokens,
        todaysRequests: usage.requests,
        dailyLimit: dailyLimit,
        usagePercent: `${usagePercent.toFixed(2)}%`,
        remaining: dailyLimit - usage.totalTokens,
        status: usagePercent > 80 ? "⚠️ Yüksek Kullanım" : usagePercent > 50 ? "📊 Normal" : "✅ Düşük",
      };
    },
  },

  resolve_ai_error: {
    name: "resolve_ai_error",
    description: "Bir AI hatasını çözümlendi olarak işaretle",
    category: "observability",
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
    handler: async (params: { errorId: string; resolution: string }) => {
      await aiObservability.resolveError(params.errorId, params.resolution);
      
      return {
        success: true,
        message: `Hata ${params.errorId} çözümlendi olarak işaretlendi`,
        resolution: params.resolution,
      };
    },
  },
};
