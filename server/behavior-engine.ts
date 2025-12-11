import { v4 as uuid } from "uuid";
import { db } from "./db";
import { 
  entities,
  entityIdentities,
  socialEvents, 
  streamingEvents,
  behaviorEvents,
  Entity,
  SocialEvent,
  StreamingEvent,
  BehaviorEvent,
  InsertBehaviorEvent,
  BehaviorPlatform,
  BehaviorTimelinePoint,
  BehaviorSummary
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";
import { calculateSocialIntensity } from "./vista-social-service";
import { calculateStreamingIntensity } from "./chartmetric-service";

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

interface RollingStats {
  mean: number;
  sigma: number;
  count: number;
}

const TURKISH_REGIONS = ['TR', 'turkey', 'türkiye', 'turkiye'];

function isTurkishMarket(region?: string | null, country?: string | null): boolean {
  if (!region && !country) return false;
  const value = (region || country || '').toLowerCase();
  return TURKISH_REGIONS.some(r => value.includes(r.toLowerCase()));
}

function calculateZScore(value: number, mean: number, sigma: number): number {
  if (sigma === 0) return 0;
  return (value - mean) / sigma;
}

function normalizeToIntensity(zScore: number): number {
  const mapped = 50 + (zScore * 15);
  return Math.max(0, Math.min(100, mapped));
}

async function getRollingStats(
  entityId: string,
  platform: string,
  sourceType: 'social' | 'streaming',
  windowDays: number = 30
): Promise<RollingStats> {
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  
  const events = await getDb()
    .select({
      intensity: behaviorEvents.intensity
    })
    .from(behaviorEvents)
    .where(
      and(
        eq(behaviorEvents.entityId, entityId),
        eq(behaviorEvents.sourcePlatform, platform),
        eq(behaviorEvents.sourceType, sourceType),
        gte(behaviorEvents.eventTs, windowStart)
      )
    );

  if (events.length === 0) {
    return { mean: 50, sigma: 15, count: 0 };
  }

  const values = events.map(e => e.intensity);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const sigma = Math.sqrt(variance) || 15;

  return { mean, sigma, count: values.length };
}

export async function normalizeSocialEvent(event: SocialEvent): Promise<BehaviorEvent> {
  const rawIntensity = await calculateSocialIntensity(event);
  const stats = await getRollingStats(event.entityId, event.platform, 'social');
  
  const zScore = calculateZScore(rawIntensity, stats.mean, stats.sigma);
  const normalizedIntensity = normalizeToIntensity(zScore);
  
  const isTurkish = event.hashtags?.some(h => 
    h.toLowerCase().includes('türk') || 
    h.toLowerCase().includes('turk') ||
    h.toLowerCase().includes('tr')
  ) || false;

  const behaviorEvent: InsertBehaviorEvent = {
    entityId: event.entityId,
    sourceType: 'social',
    sourcePlatform: event.platform as BehaviorPlatform,
    sourceEventId: event.id,
    intensity: normalizedIntensity,
    confidence: Math.min(1, stats.count / 30),
    socialWeight: 1.0,
    streamingWeight: 0,
    rawMetrics: {
      views: event.views || 0,
      likes: event.likes || 0,
      shares: event.shares || 0,
      engagement: event.engagementRate || 0,
    },
    zScore,
    rollingMean: stats.mean,
    rollingSigma: stats.sigma,
    isTurkishMarket: isTurkish ? 1 : 0,
    region: isTurkish ? 'TR' : 'GLOBAL',
    eventTs: event.eventTs || new Date(),
  };

  const behaviorId = uuid();
  await getDb().insert(behaviorEvents).values({ id: behaviorId, ...behaviorEvent });

  const [result] = await getDb()
    .select()
    .from(behaviorEvents)
    .where(eq(behaviorEvents.id, behaviorId));

  return result;
}

export async function normalizeStreamingEvent(event: StreamingEvent): Promise<BehaviorEvent> {
  const rawIntensity = await calculateStreamingIntensity(event);
  const stats = await getRollingStats(event.entityId, event.platform, 'streaming');
  
  const zScore = calculateZScore(rawIntensity, stats.mean, stats.sigma);
  const normalizedIntensity = normalizeToIntensity(zScore);
  
  const isTurkish = isTurkishMarket(event.chartRegion);

  const behaviorEvent: InsertBehaviorEvent = {
    entityId: event.entityId,
    sourceType: 'streaming',
    sourcePlatform: event.platform as BehaviorPlatform,
    sourceEventId: event.id,
    intensity: normalizedIntensity,
    confidence: Math.min(1, stats.count / 30),
    socialWeight: 0,
    streamingWeight: 1.0,
    rawMetrics: {
      streams: event.streams || 0,
      engagement: event.popularity || 0,
    },
    zScore,
    rollingMean: stats.mean,
    rollingSigma: stats.sigma,
    isTurkishMarket: isTurkish ? 1 : 0,
    region: isTurkish ? 'TR' : 'GLOBAL',
    eventTs: event.eventTs || new Date(),
  };

  const behaviorId = uuid();
  await getDb().insert(behaviorEvents).values({ id: behaviorId, ...behaviorEvent });

  const [result] = await getDb()
    .select()
    .from(behaviorEvents)
    .where(eq(behaviorEvents.id, behaviorId));

  return result;
}

export async function processPendingSocialEvents(limit: number = 100): Promise<number> {
  const unprocessedEvents = await getDb()
    .select()
    .from(socialEvents)
    .where(
      sql`${socialEvents.id} NOT IN (
        SELECT ${behaviorEvents.sourceEventId} 
        FROM ${behaviorEvents} 
        WHERE ${behaviorEvents.sourceType} = 'social'
      )`
    )
    .limit(limit);

  let processed = 0;
  for (const event of unprocessedEvents) {
    try {
      await normalizeSocialEvent(event);
      processed++;
    } catch (err) {
      console.error(`[Behavior Engine] Error processing social event ${event.id}:`, err);
    }
  }

  return processed;
}

export async function processPendingStreamingEvents(limit: number = 100): Promise<number> {
  const unprocessedEvents = await getDb()
    .select()
    .from(streamingEvents)
    .where(
      sql`${streamingEvents.id} NOT IN (
        SELECT ${behaviorEvents.sourceEventId} 
        FROM ${behaviorEvents} 
        WHERE ${behaviorEvents.sourceType} = 'streaming'
      )`
    )
    .limit(limit);

  let processed = 0;
  for (const event of unprocessedEvents) {
    try {
      await normalizeStreamingEvent(event);
      processed++;
    } catch (err) {
      console.error(`[Behavior Engine] Error processing streaming event ${event.id}:`, err);
    }
  }

  return processed;
}

export async function getBehaviorTimeline(options: {
  entityId?: string;
  platform?: string;
  sourceType?: 'social' | 'streaming' | 'all';
  startDate?: Date;
  endDate?: Date;
  region?: 'turkey' | 'global' | 'all';
  limit?: number;
  offset?: number;
}): Promise<BehaviorTimelinePoint[]> {
  const {
    entityId,
    platform = 'all',
    sourceType = 'all',
    startDate,
    endDate,
    region = 'all',
    limit = 100,
    offset = 0
  } = options;

  let conditions = [];
  
  if (entityId) {
    conditions.push(eq(behaviorEvents.entityId, entityId));
  }
  
  if (platform !== 'all') {
    conditions.push(eq(behaviorEvents.sourcePlatform, platform));
  }
  
  if (sourceType !== 'all') {
    conditions.push(eq(behaviorEvents.sourceType, sourceType));
  }
  
  if (startDate) {
    conditions.push(gte(behaviorEvents.eventTs, startDate));
  }
  
  if (endDate) {
    conditions.push(lte(behaviorEvents.eventTs, endDate));
  }
  
  if (region === 'turkey') {
    conditions.push(eq(behaviorEvents.isTurkishMarket, 1));
  } else if (region === 'global') {
    conditions.push(eq(behaviorEvents.isTurkishMarket, 0));
  }

  const events = await getDb()
    .select({
      event: behaviorEvents,
      entity: entities,
    })
    .from(behaviorEvents)
    .leftJoin(entities, eq(behaviorEvents.entityId, entities.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(behaviorEvents.eventTs))
    .limit(limit)
    .offset(offset);

  return events.map(({ event, entity }) => ({
    timestamp: event.eventTs?.toISOString() || new Date().toISOString(),
    entityId: event.entityId,
    entityName: entity?.name || 'Unknown',
    intensity: event.intensity,
    sourceType: event.sourceType as 'social' | 'streaming',
    platform: event.sourcePlatform as BehaviorPlatform,
    rawMetrics: event.rawMetrics as any || {},
  }));
}

export async function getBehaviorSummary(options: {
  entityId?: string;
  platform?: string;
  period?: 'day' | 'week' | 'month' | 'all';
  region?: 'turkey' | 'global' | 'all';
}): Promise<BehaviorSummary> {
  const {
    entityId,
    platform = 'all',
    period = 'week',
    region = 'all'
  } = options;

  let startDate: Date | undefined;
  const now = new Date();
  
  switch (period) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  let conditions = [];
  
  if (entityId) {
    conditions.push(eq(behaviorEvents.entityId, entityId));
  }
  
  if (platform !== 'all') {
    conditions.push(eq(behaviorEvents.sourcePlatform, platform));
  }
  
  if (startDate) {
    conditions.push(gte(behaviorEvents.eventTs, startDate));
  }
  
  if (region === 'turkey') {
    conditions.push(eq(behaviorEvents.isTurkishMarket, 1));
  } else if (region === 'global') {
    conditions.push(eq(behaviorEvents.isTurkishMarket, 0));
  }

  const events = await getDb()
    .select()
    .from(behaviorEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(behaviorEvents.intensity))
    .limit(1000);

  if (events.length === 0) {
    return {
      entityId: entityId || 'all',
      entityName: 'All Entities',
      period,
      totalEvents: 0,
      avgIntensity: 50,
      peakIntensity: 0,
      socialContribution: 0,
      streamingContribution: 0,
      platformBreakdown: {},
      trendDirection: 'stable',
      topContent: [],
    };
  }

  const socialEvents = events.filter(e => e.sourceType === 'social');
  const streamingEventsArr = events.filter(e => e.sourceType === 'streaming');
  
  const avgIntensity = events.reduce((sum, e) => sum + e.intensity, 0) / events.length;
  const peakIntensity = Math.max(...events.map(e => e.intensity));
  
  const platformBreakdown: Record<string, number> = {};
  events.forEach(e => {
    platformBreakdown[e.sourcePlatform] = (platformBreakdown[e.sourcePlatform] || 0) + 1;
  });

  const halfPoint = Math.floor(events.length / 2);
  const recentAvg = events.slice(0, halfPoint).reduce((sum, e) => sum + e.intensity, 0) / (halfPoint || 1);
  const olderAvg = events.slice(halfPoint).reduce((sum, e) => sum + e.intensity, 0) / ((events.length - halfPoint) || 1);
  
  let trendDirection: 'up' | 'down' | 'stable' = 'stable';
  if (recentAvg > olderAvg * 1.1) trendDirection = 'up';
  else if (recentAvg < olderAvg * 0.9) trendDirection = 'down';

  const topContent = events.slice(0, 5).map(e => ({
    contentId: e.sourceEventId || e.id,
    platform: e.sourcePlatform,
    intensity: e.intensity,
    metrics: e.rawMetrics as Record<string, number> || {},
  }));

  let entityName = 'All Entities';
  if (entityId) {
    const [entity] = await getDb()
      .select()
      .from(entities)
      .where(eq(entities.id, entityId));
    entityName = entity?.name || 'Unknown';
  }

  return {
    entityId: entityId || 'all',
    entityName,
    period,
    totalEvents: events.length,
    avgIntensity: Math.round(avgIntensity * 100) / 100,
    peakIntensity: Math.round(peakIntensity * 100) / 100,
    socialContribution: Math.round((socialEvents.length / events.length) * 100),
    streamingContribution: Math.round((streamingEventsArr.length / events.length) * 100),
    platformBreakdown,
    trendDirection,
    topContent,
  };
}

export async function getTurkeyVsGlobalStats(): Promise<{
  turkey: { events: number; avgIntensity: number };
  global: { events: number; avgIntensity: number };
}> {
  const turkeyEvents = await getDb()
    .select()
    .from(behaviorEvents)
    .where(eq(behaviorEvents.isTurkishMarket, 1));

  const globalEvents = await getDb()
    .select()
    .from(behaviorEvents)
    .where(eq(behaviorEvents.isTurkishMarket, 0));

  const turkeyAvg = turkeyEvents.length > 0
    ? turkeyEvents.reduce((sum, e) => sum + e.intensity, 0) / turkeyEvents.length
    : 0;

  const globalAvg = globalEvents.length > 0
    ? globalEvents.reduce((sum, e) => sum + e.intensity, 0) / globalEvents.length
    : 0;

  return {
    turkey: {
      events: turkeyEvents.length,
      avgIntensity: Math.round(turkeyAvg * 100) / 100,
    },
    global: {
      events: globalEvents.length,
      avgIntensity: Math.round(globalAvg * 100) / 100,
    },
  };
}

export async function getEngineStatus(): Promise<{
  totalBehaviorEvents: number;
  socialEventsProcessed: number;
  streamingEventsProcessed: number;
  pendingSocialEvents: number;
  pendingStreamingEvents: number;
  lastProcessed: Date | null;
}> {
  const totalBehavior = await getDb().select({ count: count() }).from(behaviorEvents);
  const totalSocial = await getDb().select({ count: count() }).from(socialEvents);
  const totalStreaming = await getDb().select({ count: count() }).from(streamingEvents);

  const socialProcessed = await getDb()
    .select({ count: count() })
    .from(behaviorEvents)
    .where(eq(behaviorEvents.sourceType, 'social'));

  const streamingProcessed = await getDb()
    .select({ count: count() })
    .from(behaviorEvents)
    .where(eq(behaviorEvents.sourceType, 'streaming'));

  const lastEvent = await getDb()
    .select()
    .from(behaviorEvents)
    .orderBy(desc(behaviorEvents.createdAt))
    .limit(1);

  return {
    totalBehaviorEvents: totalBehavior[0]?.count || 0,
    socialEventsProcessed: socialProcessed[0]?.count || 0,
    streamingEventsProcessed: streamingProcessed[0]?.count || 0,
    pendingSocialEvents: (totalSocial[0]?.count || 0) - (socialProcessed[0]?.count || 0),
    pendingStreamingEvents: (totalStreaming[0]?.count || 0) - (streamingProcessed[0]?.count || 0),
    lastProcessed: lastEvent[0]?.createdAt || null,
  };
}
