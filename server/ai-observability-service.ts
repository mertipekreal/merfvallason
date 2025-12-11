import { db } from "./db";
import { 
  aiMetrics, 
  aiErrorLogs, 
  type AIEventType, 
  type AIErrorSeverity,
  type AIAnalyticsSummary 
} from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

function getDb() {
  if (!db) throw new Error("Database not initialized");
  return db;
}

interface TrackRequestParams {
  userId?: string;
  sessionId?: string;
  model?: string;
  promptLength: number;
  streaming?: boolean;
  temperature?: number;
}

interface TrackResponseParams {
  userId?: string;
  sessionId?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  toolsUsed: string[];
  responseLength: number;
  insightsCount: number;
  actionsCount: number;
  confidence: number;
  sentiment: number;
  success: boolean;
  errorMessage?: string;
  errorCode?: string;
}

interface TrackErrorParams {
  userId?: string;
  sessionId?: string;
  errorType: string;
  errorCode?: string;
  errorMessage: string;
  stackTrace?: string;
  severity: AIErrorSeverity;
  requestContext?: {
    prompt: string;
    model: string;
    toolName?: string;
    toolParams?: Record<string, any>;
  };
}

interface TrackToolCallParams {
  userId?: string;
  sessionId?: string;
  toolName: string;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

class AIObservabilityService {
  private static instance: AIObservabilityService;
  private requestStartTimes: Map<string, number> = new Map();
  private dailyTokenLimit = 1_000_000; // 1M tokens per day
  private alertThresholds = {
    errorRate: 0.1, // 10% error rate triggers alert
    latencyMs: 5000, // 5 seconds latency triggers alert
    tokenUsage: 0.8, // 80% of daily limit triggers alert
  };

  private constructor() {
    console.log("📊 AI Observability Service initialized");
  }

  public static getInstance(): AIObservabilityService {
    if (!AIObservabilityService.instance) {
      AIObservabilityService.instance = new AIObservabilityService();
    }
    return AIObservabilityService.instance;
  }

  startRequestTimer(requestId: string): void {
    this.requestStartTimes.set(requestId, Date.now());
  }

  getLatency(requestId: string): number {
    const startTime = this.requestStartTimes.get(requestId);
    if (!startTime) return 0;
    const latency = Date.now() - startTime;
    this.requestStartTimes.delete(requestId);
    return latency;
  }

  async trackRequest(params: TrackRequestParams): Promise<string> {
    const requestId = uuidv4();
    this.startRequestTimer(requestId);

    try {
      await getDb().insert(aiMetrics).values({
        id: requestId,
        userId: params.userId,
        sessionId: params.sessionId,
        eventType: 'request' as AIEventType,
        model: params.model || 'gemini-2.5-pro',
        requestMetadata: {
          promptLength: params.promptLength,
          streaming: params.streaming || false,
          temperature: params.temperature,
        },
      });
    } catch (error) {
      console.error("Failed to track request:", error);
    }

    return requestId;
  }

  async trackResponse(params: TrackResponseParams): Promise<void> {
    try {
      const severity = params.success ? undefined : this.calculateErrorSeverity(params.errorCode || 'unknown');
      
      await getDb().insert(aiMetrics).values({
        id: uuidv4(),
        userId: params.userId,
        sessionId: params.sessionId,
        eventType: 'response' as AIEventType,
        model: params.model || 'gemini-2.5-pro',
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.inputTokens + params.outputTokens,
        latencyMs: params.latencyMs,
        toolsUsed: params.toolsUsed,
        success: params.success ? 1 : 0,
        errorMessage: params.errorMessage,
        errorCode: params.errorCode,
        errorSeverity: severity,
        responseMetadata: {
          responseLength: params.responseLength,
          insightsCount: params.insightsCount,
          actionsCount: params.actionsCount,
          confidence: params.confidence,
          sentiment: params.sentiment,
        },
      });

      await this.checkAlerts(params);
    } catch (error) {
      console.error("Failed to track response:", error);
    }
  }

  async trackToolCall(params: TrackToolCallParams): Promise<void> {
    try {
      await getDb().insert(aiMetrics).values({
        id: uuidv4(),
        userId: params.userId,
        sessionId: params.sessionId,
        eventType: 'tool_call' as AIEventType,
        toolsUsed: [params.toolName],
        latencyMs: params.latencyMs,
        success: params.success ? 1 : 0,
        errorMessage: params.errorMessage,
      });
    } catch (error) {
      console.error("Failed to track tool call:", error);
    }
  }

  async trackError(params: TrackErrorParams): Promise<void> {
    try {
      await getDb().insert(aiErrorLogs).values({
        id: uuidv4(),
        userId: params.userId,
        sessionId: params.sessionId,
        errorType: params.errorType,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
        stackTrace: params.stackTrace,
        severity: params.severity,
        requestContext: params.requestContext,
      });

      if (params.severity === 'critical' || params.severity === 'high') {
        console.error(`🚨 [AI ALERT] ${params.severity.toUpperCase()} error: ${params.errorMessage}`);
      }
    } catch (error) {
      console.error("Failed to track error:", error);
    }
  }

  async trackStreaming(params: {
    userId?: string;
    sessionId?: string;
    chunksCount: number;
    totalLatencyMs: number;
    success: boolean;
  }): Promise<void> {
    try {
      await getDb().insert(aiMetrics).values({
        id: uuidv4(),
        userId: params.userId,
        sessionId: params.sessionId,
        eventType: 'streaming' as AIEventType,
        latencyMs: params.totalLatencyMs,
        success: params.success ? 1 : 0,
        requestMetadata: {
          promptLength: 0,
          streaming: true,
        },
        responseMetadata: {
          responseLength: params.chunksCount,
          insightsCount: 0,
          actionsCount: 0,
          confidence: 0,
          sentiment: 0,
        },
      });
    } catch (error) {
      console.error("Failed to track streaming:", error);
    }
  }

  private calculateErrorSeverity(errorCode: string): AIErrorSeverity {
    if (errorCode.startsWith('5') || errorCode === 'timeout') return 'critical';
    if (errorCode === 'rate_limit') return 'high';
    if (errorCode.startsWith('4')) return 'medium';
    return 'low';
  }

  private async checkAlerts(params: TrackResponseParams): Promise<void> {
    if (params.latencyMs > this.alertThresholds.latencyMs) {
      console.warn(`⚠️ [AI ALERT] High latency detected: ${params.latencyMs}ms`);
    }

    const dailyStats = await this.getDailyTokenUsage();
    if (dailyStats.totalTokens / this.dailyTokenLimit > this.alertThresholds.tokenUsage) {
      console.warn(`⚠️ [AI ALERT] Daily token usage at ${((dailyStats.totalTokens / this.dailyTokenLimit) * 100).toFixed(1)}%`);
    }
  }

  async getDailyTokenUsage(): Promise<{ totalTokens: number; requests: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await getDb().select({
      totalTokens: sql<number>`COALESCE(SUM(${aiMetrics.totalTokens}), 0)`,
      requests: sql<number>`COUNT(*)`,
    })
    .from(aiMetrics)
    .where(gte(aiMetrics.createdAt, today));

    return {
      totalTokens: Number(result[0]?.totalTokens || 0),
      requests: Number(result[0]?.requests || 0),
    };
  }

  async getAnalyticsSummary(userId?: string, days: number = 7): Promise<AIAnalyticsSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const baseConditions = [gte(aiMetrics.createdAt, startDate)];
    if (userId) {
      baseConditions.push(eq(aiMetrics.userId, userId));
    }

    const metrics = await getDb().select()
      .from(aiMetrics)
      .where(and(...baseConditions))
      .orderBy(desc(aiMetrics.createdAt));

    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.success === 1).length;
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 1;
    
    const latencies = metrics.map(m => m.latencyMs || 0);
    const avgLatencyMs = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;

    const totalTokensUsed = metrics.reduce((sum, m) => sum + (m.totalTokens || 0), 0);
    const avgTokensPerRequest = totalRequests > 0 ? totalTokensUsed / totalRequests : 0;

    const toolCounts: Record<string, number> = {};
    metrics.forEach(m => {
      (m.toolsUsed || []).forEach(tool => {
        toolCounts[tool] = (toolCounts[tool] || 0) + 1;
      });
    });
    const topTools = Object.entries(toolCounts)
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const errorMetrics = metrics.filter(m => m.success === 0);
    const errorsByType: Record<string, number> = {};
    errorMetrics.forEach(m => {
      const type = m.errorCode || 'unknown';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    const hourlyUsage: Record<string, number> = {};
    metrics.forEach(m => {
      if (m.createdAt) {
        const hour = new Date(m.createdAt).getHours().toString().padStart(2, '0') + ':00';
        hourlyUsage[hour] = (hourlyUsage[hour] || 0) + 1;
      }
    });
    const hourlyUsageArray = Object.entries(hourlyUsage)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const sentimentDistribution: Record<string, number> = {
      'very_positive': 0,
      'positive': 0,
      'neutral': 0,
      'negative': 0,
      'very_negative': 0,
    };
    metrics.forEach(m => {
      const sentiment = (m.responseMetadata as any)?.sentiment || 0;
      if (sentiment > 0.5) sentimentDistribution['very_positive']++;
      else if (sentiment > 0.2) sentimentDistribution['positive']++;
      else if (sentiment > -0.2) sentimentDistribution['neutral']++;
      else if (sentiment > -0.5) sentimentDistribution['negative']++;
      else sentimentDistribution['very_negative']++;
    });

    return {
      totalRequests,
      successRate,
      avgLatencyMs,
      totalTokensUsed,
      avgTokensPerRequest,
      topTools,
      errorsByType,
      hourlyUsage: hourlyUsageArray,
      sentimentDistribution,
    };
  }

  async getRecentErrors(limit: number = 20): Promise<any[]> {
    return getDb().select()
      .from(aiErrorLogs)
      .orderBy(desc(aiErrorLogs.createdAt))
      .limit(limit);
  }

  async getUnresolvedErrors(): Promise<any[]> {
    return getDb().select()
      .from(aiErrorLogs)
      .where(eq(aiErrorLogs.resolved, 0))
      .orderBy(desc(aiErrorLogs.createdAt));
  }

  async resolveError(errorId: string, resolution: string): Promise<void> {
    await getDb().update(aiErrorLogs)
      .set({
        resolved: 1,
        resolvedAt: new Date(),
        resolution,
      })
      .where(eq(aiErrorLogs.id, errorId));
  }

  async getPerformanceMetrics(hours: number = 24): Promise<{
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    successRate: number;
    errorRate: number;
  }> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const metrics = await getDb().select()
      .from(aiMetrics)
      .where(and(
        gte(aiMetrics.createdAt, startDate),
        eq(aiMetrics.eventType, 'response')
      ))
      .orderBy(aiMetrics.latencyMs);

    if (metrics.length === 0) {
      return {
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        successRate: 1,
        errorRate: 0,
      };
    }

    const latencies = metrics.map(m => m.latencyMs || 0).sort((a, b) => a - b);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    const p50Index = Math.floor(latencies.length * 0.5);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    const successCount = metrics.filter(m => m.success === 1).length;
    const successRate = successCount / metrics.length;
    const errorRate = 1 - successRate;

    return {
      avgLatency,
      p50Latency: latencies[p50Index] || 0,
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      successRate,
      errorRate,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export const aiObservability = AIObservabilityService.getInstance();
