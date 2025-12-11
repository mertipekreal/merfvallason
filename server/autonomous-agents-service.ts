/**
 * DuyguMotor v3.0 - Autonomous Agents Service
 * Self-running AI agents that monitor, analyze and alert
 */

import { db } from "./db";
import { dreams, analyticsResults, socialVideos } from "@shared/schema";
import { eq, desc, sql, and, gte, like } from "drizzle-orm";
import { memoryService } from "./domains/core/services/memory-service";

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  type: 'monitor' | 'analyzer' | 'detector' | 'scheduler';
  enabled: boolean;
  interval: number; // minutes
  lastRun: Date | null;
  nextRun: Date | null;
  status: 'idle' | 'running' | 'error' | 'disabled';
  settings: Record<string, any>;
}

export interface AgentResult {
  agentId: string;
  timestamp: Date;
  success: boolean;
  findings: AgentFinding[];
  summary: string;
  duration: number;
  error?: string;
}

export interface AgentFinding {
  type: 'alert' | 'insight' | 'pattern' | 'anomaly' | 'trend';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  data: Record<string, any>;
  actionable: boolean;
  suggestedAction?: string;
}

export interface TrendPattern {
  hashtag: string;
  frequency: number;
  growth: number;
  sentiment: string;
  relatedTopics: string[];
}

export interface DreamPattern {
  patternType: string;
  frequency: number;
  commonThemes: string[];
  emotionalSignature: {
    dominant: string;
    secondary: string;
    intensity: number;
  };
  timePattern: string;
  archetypes: string[];
}

class AutonomousAgentsService {
  private agents: Map<string, AgentConfig> = new Map();
  private results: Map<string, AgentResult[]> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents() {
    this.agents.set('social_media_watcher', {
      id: 'social_media_watcher',
      name: 'Sosyal Medya İzleyici',
      description: 'TikTok, Instagram ve Twitter trendlerini izler, viral içerikleri tespit eder',
      type: 'monitor',
      enabled: true,
      interval: 60, // every hour
      lastRun: null,
      nextRun: null,
      status: 'idle',
      settings: {
        platforms: ['tiktok', 'instagram', 'twitter'],
        alertThreshold: {
          viralScore: 80,
          engagementSpike: 2.0,
          sentimentShift: 0.3,
        },
        focusHashtags: ['turkishrap', 'müzik', 'viral', 'trend'],
        maxAlertsPerRun: 10,
      },
    });

    this.agents.set('dream_pattern_detector', {
      id: 'dream_pattern_detector',
      name: 'Rüya Örüntü Dedektörü',
      description: 'Rüya veritabanında tekrarlayan temalar, semboller ve duygusal kalıpları tespit eder',
      type: 'detector',
      enabled: true,
      interval: 180, // every 3 hours
      lastRun: null,
      nextRun: null,
      status: 'idle',
      settings: {
        minPatternOccurrence: 5,
        emotionCategories: ['joy', 'fear', 'sadness', 'anger', 'wonder', 'confusion'],
        archetypeMapping: true,
        temporalAnalysis: true,
        symbolDatabase: ['su', 'ateş', 'uçmak', 'düşmek', 'ev', 'yol', 'ölüm', 'doğum'],
      },
    });

    this.agents.set('engagement_analyzer', {
      id: 'engagement_analyzer',
      name: 'Etkileşim Analizörü',
      description: 'İçerik etkileşim kalıplarını analiz eder ve optimum paylaşım zamanlarını önerir',
      type: 'analyzer',
      enabled: true,
      interval: 120, // every 2 hours
      lastRun: null,
      nextRun: null,
      status: 'idle',
      settings: {
        analysisWindow: 7, // days
        peakThreshold: 1.5,
        lowActivityThreshold: 0.5,
        timeZone: 'Europe/Istanbul',
      },
    });

    this.agents.set('sentiment_tracker', {
      id: 'sentiment_tracker',
      name: 'Duygu Durumu Takipçisi',
      description: 'Genel duygu durumu değişimlerini izler ve büyük değişimlerde uyarır',
      type: 'monitor',
      enabled: true,
      interval: 240, // every 4 hours
      lastRun: null,
      nextRun: null,
      status: 'idle',
      settings: {
        sentimentThreshold: 0.2,
        alertOnNegativeSpike: true,
        trackByPlatform: true,
        historicalComparison: true,
      },
    });

    this.agents.set('content_recommender', {
      id: 'content_recommender',
      name: 'İçerik Önerici',
      description: 'Trend analizi ve performans verilerine göre yeni içerik fikirleri üretir',
      type: 'analyzer',
      enabled: true,
      interval: 360, // every 6 hours
      lastRun: null,
      nextRun: null,
      status: 'idle',
      settings: {
        recommendationCount: 5,
        basedOn: ['trends', 'engagement', 'gaps'],
        creativeStyles: ['educational', 'entertaining', 'inspirational', 'controversial'],
      },
    });

    console.log(`🤖 Autonomous Agents Service initialized with ${this.agents.size} agents`);
    this.isInitialized = true;
  }

  async runAgent(agentId: string): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        agentId,
        timestamp: new Date(),
        success: false,
        findings: [],
        summary: 'Agent bulunamadı',
        duration: 0,
        error: `Agent not found: ${agentId}`,
      };
    }

    if (agent.status === 'running') {
      return {
        agentId,
        timestamp: new Date(),
        success: false,
        findings: [],
        summary: 'Agent zaten çalışıyor',
        duration: 0,
        error: 'Agent already running',
      };
    }

    agent.status = 'running';
    const startTime = Date.now();

    try {
      let result: AgentResult;

      switch (agentId) {
        case 'social_media_watcher':
          result = await this.runSocialMediaWatcher(agent);
          break;
        case 'dream_pattern_detector':
          result = await this.runDreamPatternDetector(agent);
          break;
        case 'engagement_analyzer':
          result = await this.runEngagementAnalyzer(agent);
          break;
        case 'sentiment_tracker':
          result = await this.runSentimentTracker(agent);
          break;
        case 'content_recommender':
          result = await this.runContentRecommender(agent);
          break;
        default:
          result = {
            agentId,
            timestamp: new Date(),
            success: false,
            findings: [],
            summary: 'Bilinmeyen agent tipi',
            duration: Date.now() - startTime,
            error: `Unknown agent type: ${agentId}`,
          };
      }

      agent.lastRun = new Date();
      agent.nextRun = new Date(Date.now() + agent.interval * 60 * 1000);
      agent.status = 'idle';

      const agentResults = this.results.get(agentId) || [];
      agentResults.push(result);
      if (agentResults.length > 100) agentResults.shift();
      this.results.set(agentId, agentResults);

      return result;
    } catch (error: any) {
      agent.status = 'error';
      const errorResult: AgentResult = {
        agentId,
        timestamp: new Date(),
        success: false,
        findings: [],
        summary: `Hata: ${error.message}`,
        duration: Date.now() - startTime,
        error: error.message,
      };
      return errorResult;
    }
  }

  private async runSocialMediaWatcher(agent: AgentConfig): Promise<AgentResult> {
    const startTime = Date.now();
    const findings: AgentFinding[] = [];

    try {
      if (!db) {
        return {
          agentId: agent.id,
          timestamp: new Date(),
          success: false,
          findings: [],
          summary: 'Veritabanı bağlantısı yok',
          duration: Date.now() - startTime,
          error: 'No database connection',
        };
      }

      const recentAnalytics = await db.select()
        .from(analyticsResults)
        .orderBy(desc(analyticsResults.createdAt))
        .limit(50);

      const hashtagCounts: Record<string, number> = {};
      const sentimentScores: number[] = [];
      let totalEngagement = 0;

      for (const result of recentAnalytics) {
        const topHashtags = result.topHashtags as any[];
        if (topHashtags && Array.isArray(topHashtags)) {
          for (const tag of topHashtags.slice(0, 5)) {
            const hashtag = tag.hashtag || tag.tag || tag;
            if (typeof hashtag === 'string') {
              hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + (tag.count || 1);
            }
          }
        }
        if (result.avgEngagementRate) {
          totalEngagement += result.avgEngagementRate;
        }
        const sentimentBreakdown = result.sentimentBreakdown as any;
        if (sentimentBreakdown) {
          const positive = sentimentBreakdown.positive || 0;
          const negative = sentimentBreakdown.negative || 0;
          const total = positive + negative;
          if (total > 0) {
            sentimentScores.push((positive - negative) / total);
          }
        }
      }

      const sortedHashtags = Object.entries(hashtagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (sortedHashtags.length > 0) {
        findings.push({
          type: 'trend',
          severity: 'medium',
          title: 'En Popüler Hashtag\'ler',
          description: `Son analizlerde en çok kullanılan hashtag'ler tespit edildi`,
          data: {
            hashtags: sortedHashtags.map(([tag, count]) => ({ tag, count })),
            period: 'Son 50 analiz',
          },
          actionable: true,
          suggestedAction: 'Bu hashtag\'leri içerik stratejinize dahil edin',
        });
      }

      const avgSentiment = sentimentScores.length > 0 
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length 
        : 0;

      if (Math.abs(avgSentiment) > agent.settings.alertThreshold.sentimentShift) {
        findings.push({
          type: 'alert',
          severity: avgSentiment < 0 ? 'high' : 'medium',
          title: avgSentiment > 0 ? 'Pozitif Duygu Dalgası' : 'Negatif Duygu Uyarısı',
          description: `Ortalama duygu durumu ${avgSentiment > 0 ? 'pozitif' : 'negatif'} yönde değişim gösteriyor`,
          data: {
            avgSentiment: avgSentiment.toFixed(2),
            sampleSize: sentimentScores.length,
          },
          actionable: avgSentiment < 0,
          suggestedAction: avgSentiment < 0 ? 'İçerik tonunu gözden geçirin' : undefined,
        });
      }

      const avgEngagement = recentAnalytics.length > 0 
        ? totalEngagement / recentAnalytics.length 
        : 0;

      if (avgEngagement > agent.settings.alertThreshold.viralScore) {
        findings.push({
          type: 'insight',
          severity: 'high',
          title: 'Yüksek Etkileşim Tespit Edildi',
          description: `Ortalama etkileşim oranı ${avgEngagement.toFixed(1)}% - bu normalin üzerinde`,
          data: {
            avgEngagement: avgEngagement.toFixed(1),
            threshold: agent.settings.alertThreshold.viralScore,
          },
          actionable: true,
          suggestedAction: 'Bu dönemdeki başarılı içerikleri analiz edin',
        });
      }

      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: true,
        findings,
        summary: `${findings.length} bulgu tespit edildi: ${sortedHashtags.length} trend hashtag, ortalama sentiment ${avgSentiment.toFixed(2)}`,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: false,
        findings,
        summary: `Hata: ${error.message}`,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async runDreamPatternDetector(agent: AgentConfig): Promise<AgentResult> {
    const startTime = Date.now();
    const findings: AgentFinding[] = [];

    try {
      if (!db) {
        return {
          agentId: agent.id,
          timestamp: new Date(),
          success: false,
          findings: [],
          summary: 'Veritabanı bağlantısı yok',
          duration: Date.now() - startTime,
          error: 'No database connection',
        };
      }

      const recentDreams = await db.select()
        .from(dreams)
        .orderBy(desc(dreams.createdAt))
        .limit(500);

      const emotionCounts: Record<string, number> = {};
      const themeCounts: Record<string, number> = {};
      const symbolCounts: Record<string, number> = {};
      const locationCounts: Record<string, number> = {};

      for (const dream of recentDreams) {
        if (dream.emotion) {
          emotionCounts[dream.emotion] = (emotionCounts[dream.emotion] || 0) + 1;
        }

        if (dream.themes && Array.isArray(dream.themes)) {
          for (const theme of dream.themes) {
            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
          }
        }

        if (dream.objects && Array.isArray(dream.objects)) {
          for (const obj of dream.objects) {
            symbolCounts[obj] = (symbolCounts[obj] || 0) + 1;
          }
        }

        if (dream.location) {
          locationCounts[dream.location] = (locationCounts[dream.location] || 0) + 1;
        }
      }

      const topEmotions = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const topThemes = Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const topSymbols = Object.entries(symbolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (topEmotions.length > 0) {
        const [dominantEmotion, count] = topEmotions[0];
        const percentage = ((count / recentDreams.length) * 100).toFixed(1);

        findings.push({
          type: 'pattern',
          severity: 'medium',
          title: 'Dominant Duygu Örüntüsü',
          description: `"${dominantEmotion}" duygusu rüyaların %${percentage}'inde baskın`,
          data: {
            emotion: dominantEmotion,
            count,
            percentage,
            allEmotions: topEmotions.map(([emotion, count]) => ({ emotion, count })),
          },
          actionable: false,
        });
      }

      if (topThemes.length > 0) {
        findings.push({
          type: 'pattern',
          severity: 'low',
          title: 'En Sık Rüya Temaları',
          description: `Rüya veritabanında ${topThemes.length} tekrarlayan tema tespit edildi`,
          data: {
            themes: topThemes.map(([theme, count]) => ({ theme, count })),
            sampleSize: recentDreams.length,
          },
          actionable: false,
        });
      }

      if (topSymbols.length > 0) {
        const jungianSymbols = topSymbols.filter(([symbol]) => 
          agent.settings.symbolDatabase.some((s: string) => 
            symbol.toLowerCase().includes(s)
          )
        );

        if (jungianSymbols.length > 0) {
          findings.push({
            type: 'insight',
            severity: 'medium',
            title: 'Jung Arketipal Semboller',
            description: `${jungianSymbols.length} arketipal sembol tespit edildi`,
            data: {
              symbols: jungianSymbols.map(([symbol, count]) => ({ symbol, count })),
              archetypeMapping: {
                'su': 'Bilinçaltı, duygular',
                'ateş': 'Dönüşüm, tutku',
                'uçmak': 'Özgürlük, aşkınlık',
                'düşmek': 'Kontrol kaybı, endişe',
                'ev': 'Benlik, güvenlik',
                'yol': 'Yaşam yolculuğu',
              },
            },
            actionable: true,
            suggestedAction: 'Bu sembolleri rüya yorumlamasında kullanın',
          });
        }
      }

      if (topLocations.length > 0) {
        findings.push({
          type: 'pattern',
          severity: 'low',
          title: 'Yaygın Rüya Mekanları',
          description: `${topLocations.length} sık tekrarlayan mekan tespit edildi`,
          data: {
            locations: topLocations.map(([location, count]) => ({ location, count })),
          },
          actionable: false,
        });
      }

      const intensitySum = recentDreams.reduce((sum, d) => sum + (d.intensity || 0), 0);
      const avgIntensity = recentDreams.length > 0 ? intensitySum / recentDreams.length : 0;

      if (avgIntensity > 7) {
        findings.push({
          type: 'alert',
          severity: 'medium',
          title: 'Yüksek Rüya Yoğunluğu',
          description: `Ortalama rüya yoğunluğu ${avgIntensity.toFixed(1)}/10 - bu normalin üzerinde`,
          data: {
            avgIntensity: avgIntensity.toFixed(1),
            sampleSize: recentDreams.length,
          },
          actionable: true,
          suggestedAction: 'Yüksek yoğunluklu rüyaları ayrıntılı analiz edin',
        });
      }

      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: true,
        findings,
        summary: `${findings.length} örüntü tespit edildi: ${topEmotions.length} duygu, ${topThemes.length} tema, ${topSymbols.length} sembol analiz edildi`,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: false,
        findings,
        summary: `Hata: ${error.message}`,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async runEngagementAnalyzer(agent: AgentConfig): Promise<AgentResult> {
    const startTime = Date.now();
    const findings: AgentFinding[] = [];

    try {
      if (!db) {
        return {
          agentId: agent.id,
          timestamp: new Date(),
          success: false,
          findings: [],
          summary: 'Veritabanı bağlantısı yok',
          duration: Date.now() - startTime,
          error: 'No database connection',
        };
      }

      const hoursAgo = new Date();
      hoursAgo.setDate(hoursAgo.getDate() - agent.settings.analysisWindow);

      const recentAnalytics = await db.select()
        .from(analyticsResults)
        .where(gte(analyticsResults.createdAt, hoursAgo))
        .orderBy(desc(analyticsResults.createdAt))
        .limit(100);

      const hourlyEngagement: Record<number, { total: number; count: number }> = {};
      const dayOfWeekEngagement: Record<number, { total: number; count: number }> = {};

      for (const result of recentAnalytics) {
        const engagement = result.avgEngagementRate || 0;
        const createdAt = new Date(result.createdAt!);
        const hour = createdAt.getHours();
        const dayOfWeek = createdAt.getDay();

        if (!hourlyEngagement[hour]) {
          hourlyEngagement[hour] = { total: 0, count: 0 };
        }
        hourlyEngagement[hour].total += engagement;
        hourlyEngagement[hour].count += 1;

        if (!dayOfWeekEngagement[dayOfWeek]) {
          dayOfWeekEngagement[dayOfWeek] = { total: 0, count: 0 };
        }
        dayOfWeekEngagement[dayOfWeek].total += engagement;
        dayOfWeekEngagement[dayOfWeek].count += 1;
      }

      const avgByHour = Object.entries(hourlyEngagement)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          avg: data.count > 0 ? data.total / data.count : 0,
          count: data.count,
        }))
        .sort((a, b) => b.avg - a.avg);

      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const avgByDay = Object.entries(dayOfWeekEngagement)
        .map(([day, data]) => ({
          day: dayNames[parseInt(day)],
          dayIndex: parseInt(day),
          avg: data.count > 0 ? data.total / data.count : 0,
          count: data.count,
        }))
        .sort((a, b) => b.avg - a.avg);

      if (avgByHour.length > 0) {
        const peakHours = avgByHour.slice(0, 3);
        findings.push({
          type: 'insight',
          severity: 'medium',
          title: 'En İyi Paylaşım Saatleri',
          description: `En yüksek etkileşim ${peakHours.map(h => h.hour + ':00').join(', ')} saatlerinde`,
          data: {
            peakHours: peakHours,
            allHours: avgByHour,
          },
          actionable: true,
          suggestedAction: `İçerikleri ${peakHours[0]?.hour}:00 civarında paylaşmayı deneyin`,
        });
      }

      if (avgByDay.length > 0) {
        const bestDay = avgByDay[0];
        findings.push({
          type: 'insight',
          severity: 'low',
          title: 'En İyi Paylaşım Günü',
          description: `${bestDay.day} günü en yüksek etkileşim oranına sahip`,
          data: {
            bestDay: bestDay,
            allDays: avgByDay,
          },
          actionable: true,
          suggestedAction: `Önemli içerikleri ${bestDay.day} günü paylaşın`,
        });
      }

      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: true,
        findings,
        summary: `Etkileşim analizi tamamlandı: ${avgByHour.length} saat, ${avgByDay.length} gün analiz edildi`,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: false,
        findings,
        summary: `Hata: ${error.message}`,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async runSentimentTracker(agent: AgentConfig): Promise<AgentResult> {
    const startTime = Date.now();
    const findings: AgentFinding[] = [];

    try {
      if (!db) {
        return {
          agentId: agent.id,
          timestamp: new Date(),
          success: false,
          findings: [],
          summary: 'Veritabanı bağlantısı yok',
          duration: Date.now() - startTime,
          error: 'No database connection',
        };
      }

      const recentAnalytics = await db.select()
        .from(analyticsResults)
        .orderBy(desc(analyticsResults.createdAt))
        .limit(100);

      const platformSentiment: Record<string, { positive: number; negative: number; neutral: number }> = {};
      let overallPositive = 0;
      let overallNegative = 0;
      let overallNeutral = 0;

      for (const result of recentAnalytics) {
        const platform = result.datasetName?.includes('tiktok') ? 'tiktok' 
          : result.datasetName?.includes('instagram') ? 'instagram'
          : result.datasetName?.includes('spotify') ? 'spotify'
          : result.datasetName?.includes('twitter') ? 'twitter'
          : 'unknown';

        if (!platformSentiment[platform]) {
          platformSentiment[platform] = { positive: 0, negative: 0, neutral: 0 };
        }

        const sentimentBreakdown = result.sentimentBreakdown as any;
        if (sentimentBreakdown) {
          const { positive = 0, negative = 0, neutral = 0 } = sentimentBreakdown;
          platformSentiment[platform].positive += positive;
          platformSentiment[platform].negative += negative;
          platformSentiment[platform].neutral += neutral;
          overallPositive += positive;
          overallNegative += negative;
          overallNeutral += neutral;
        }
      }

      const total = overallPositive + overallNegative + overallNeutral;
      if (total > 0) {
        const positiveRatio = overallPositive / total;
        const negativeRatio = overallNegative / total;

        const netSentiment = positiveRatio - negativeRatio;

        if (Math.abs(netSentiment) > agent.settings.sentimentThreshold) {
          findings.push({
            type: netSentiment > 0 ? 'insight' : 'alert',
            severity: netSentiment > 0 ? 'low' : 'high',
            title: netSentiment > 0 ? 'Pozitif Duygu Eğilimi' : 'Negatif Duygu Uyarısı',
            description: `Genel duygu durumu ${(netSentiment * 100).toFixed(1)}% ${netSentiment > 0 ? 'pozitif' : 'negatif'} yönde`,
            data: {
              positive: (positiveRatio * 100).toFixed(1) + '%',
              negative: (negativeRatio * 100).toFixed(1) + '%',
              neutral: ((1 - positiveRatio - negativeRatio) * 100).toFixed(1) + '%',
              netSentiment: (netSentiment * 100).toFixed(1) + '%',
            },
            actionable: netSentiment < 0,
            suggestedAction: netSentiment < 0 ? 'İçerik stratejisini gözden geçirin' : undefined,
          });
        }

        for (const [platform, sentiment] of Object.entries(platformSentiment)) {
          const platformTotal = sentiment.positive + sentiment.negative + sentiment.neutral;
          if (platformTotal > 10) {
            const platformNet = (sentiment.positive - sentiment.negative) / platformTotal;
            
            findings.push({
              type: 'insight',
              severity: 'low',
              title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Duygu Durumu`,
              description: `${platform} platformunda duygu analizi`,
              data: {
                platform,
                positive: ((sentiment.positive / platformTotal) * 100).toFixed(1) + '%',
                negative: ((sentiment.negative / platformTotal) * 100).toFixed(1) + '%',
                neutral: ((sentiment.neutral / platformTotal) * 100).toFixed(1) + '%',
                netSentiment: (platformNet * 100).toFixed(1) + '%',
              },
              actionable: false,
            });
          }
        }
      }

      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: true,
        findings,
        summary: `Duygu takibi tamamlandı: ${Object.keys(platformSentiment).length} platform, toplam ${total} veri noktası analiz edildi`,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: false,
        findings,
        summary: `Hata: ${error.message}`,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async runContentRecommender(agent: AgentConfig): Promise<AgentResult> {
    const startTime = Date.now();
    const findings: AgentFinding[] = [];

    try {
      if (!db) {
        return {
          agentId: agent.id,
          timestamp: new Date(),
          success: false,
          findings: [],
          summary: 'Veritabanı bağlantısı yok',
          duration: Date.now() - startTime,
          error: 'No database connection',
        };
      }

      const recentAnalytics = await db.select()
        .from(analyticsResults)
        .orderBy(desc(analyticsResults.createdAt))
        .limit(50);

      const trendingTopics: string[] = [];
      const successfulFormats: string[] = [];
      const contentGaps: string[] = [];

      for (const result of recentAnalytics) {
        const topHashtags = result.topHashtags as any[];
        
        if (topHashtags && Array.isArray(topHashtags)) {
          for (const tag of topHashtags.slice(0, 3)) {
            const hashtag = tag.hashtag || tag.tag || tag;
            if (typeof hashtag === 'string' && !trendingTopics.includes(hashtag)) {
              trendingTopics.push(hashtag);
            }
          }
        }

        if (result.avgEngagementRate > 10) {
          const categoryBreakdown = result.categoryBreakdown as any[];
          if (categoryBreakdown && Array.isArray(categoryBreakdown)) {
            for (const cat of categoryBreakdown.slice(0, 2)) {
              const category = cat.category || cat;
              if (typeof category === 'string' && !successfulFormats.includes(category)) {
                successfulFormats.push(category);
              }
            }
          }
        }
      }

      const recommendations = [
        {
          title: 'Trend Bazlı İçerik',
          description: `"${trendingTopics.slice(0, 3).join('", "')}" konularında içerik oluşturun`,
          topics: trendingTopics.slice(0, 5),
          style: 'trending',
        },
        {
          title: 'Yüksek Etkileşim Formatı',
          description: `${successfulFormats.slice(0, 2).join(' ve ')} formatlarında içerikler başarılı oluyor`,
          formats: successfulFormats.slice(0, 3),
          style: 'engaging',
        },
        {
          title: 'Duygusal Hikaye İçeriği',
          description: 'Kişisel hikayeler ve duygusal bağ kuran içerikler üretin',
          style: 'emotional',
        },
        {
          title: 'Eğitici İçerik',
          description: 'Sektör bilgisi ve nasıl yapılır içerikleri paylaşın',
          style: 'educational',
        },
        {
          title: 'Topluluk Etkileşimi',
          description: 'Soru-cevap ve anket içerikleri ile topluluğu dahil edin',
          style: 'interactive',
        },
      ];

      for (const rec of recommendations.slice(0, agent.settings.recommendationCount)) {
        findings.push({
          type: 'insight',
          severity: 'low',
          title: rec.title,
          description: rec.description,
          data: rec,
          actionable: true,
          suggestedAction: `Bu öneriyi içerik planınıza ekleyin`,
        });
      }

      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: true,
        findings,
        summary: `${findings.length} içerik önerisi oluşturuldu: ${trendingTopics.length} trend, ${successfulFormats.length} başarılı format analiz edildi`,
        duration: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        agentId: agent.id,
        timestamp: new Date(),
        success: false,
        findings,
        summary: `Hata: ${error.message}`,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  getAgentList(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  getAgentResults(agentId: string, limit = 10): AgentResult[] {
    const results = this.results.get(agentId) || [];
    return results.slice(-limit);
  }

  getAllResults(limit = 20): AgentResult[] {
    const allResults: AgentResult[] = [];
    const resultsArray = Array.from(this.results.values());
    for (const results of resultsArray) {
      allResults.push(...results);
    }
    return allResults
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  enableAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.enabled = true;
      agent.status = 'idle';
      return true;
    }
    return false;
  }

  disableAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.enabled = false;
      agent.status = 'disabled';
      const interval = this.intervals.get(agentId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(agentId);
      }
      return true;
    }
    return false;
  }

  updateAgentSettings(agentId: string, settings: Record<string, any>): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.settings = { ...agent.settings, ...settings };
      return true;
    }
    return false;
  }

  getAgentStats(): {
    total: number;
    enabled: number;
    running: number;
    totalFindings: number;
    lastRun: Date | null;
  } {
    const agents = Array.from(this.agents.values());
    const allResults = this.getAllResults(1000);

    return {
      total: agents.length,
      enabled: agents.filter(a => a.enabled).length,
      running: agents.filter(a => a.status === 'running').length,
      totalFindings: allResults.reduce((sum, r) => sum + r.findings.length, 0),
      lastRun: allResults.length > 0 ? allResults[0].timestamp : null,
    };
  }
}

export const autonomousAgents = new AutonomousAgentsService();
