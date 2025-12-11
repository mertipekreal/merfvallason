import { v4 as uuid } from "uuid";
import { db } from "./db";
import { 
  entities, 
  entityIdentities, 
  streamingEvents,
  behaviorSyncJobs,
  Entity,
  StreamingEvent,
  InsertEntity,
  InsertEntityIdentity,
  InsertStreamingEvent,
  InsertBehaviorSyncJob
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

const CHARTMETRIC_API_BASE = "https://api.chartmetric.com/api";
const CHARTMETRIC_BEARER = process.env.CHARTMETRIC_BEARER;

interface ChartmetricArtist {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  country?: string;
  spotifyId?: string;
  monthlyListeners?: number;
  followers?: number;
}

interface ChartmetricTrack {
  id: string;
  name: string;
  artistId: string;
  artistName: string;
  albumId?: string;
  albumName?: string;
  isrc?: string;
  spotifyId?: string;
  releaseDate?: string;
  spotifyPopularity?: number;
  spotifyStreams?: number;
}

interface ChartmetricChartEntry {
  trackId: string;
  trackName: string;
  artistName: string;
  chartName: string;
  chartType: string;
  region: string;
  position: number;
  peak: number;
  weeks: number;
  entryDate: string;
}

interface ChartmetricPlaylistEntry {
  playlistId: string;
  playlistName: string;
  platform: string;
  trackId: string;
  trackName: string;
  artistName: string;
  addedAt: string;
  position?: number;
  followers?: number;
}

async function fetchChartmetricAPI<T>(endpoint: string, params?: Record<string, string>): Promise<T | null> {
  if (!CHARTMETRIC_BEARER) {
    console.warn("[Chartmetric] API bearer token not configured, using mock data");
    return null;
  }

  try {
    const url = new URL(`${CHARTMETRIC_API_BASE}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${CHARTMETRIC_BEARER}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`[Chartmetric] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    console.error("[Chartmetric] Fetch error:", error);
    return null;
  }
}

function generateMockTurkishArtists(): ChartmetricArtist[] {
  const artists = [
    { name: "Semicenk", genres: ["Turkish Rap", "Arabesk"], monthlyListeners: 8500000 },
    { name: "Ezhel", genres: ["Turkish Rap", "Hip Hop"], monthlyListeners: 12000000 },
    { name: "UZI", genres: ["Turkish Rap", "Trap"], monthlyListeners: 6500000 },
    { name: "Murda", genres: ["Turkish Rap", "Trap"], monthlyListeners: 7200000 },
    { name: "Mero", genres: ["Turkish Rap", "Pop Rap"], monthlyListeners: 15000000 },
    { name: "Tarkan", genres: ["Turkish Pop", "Dance"], monthlyListeners: 9800000 },
    { name: "Hadise", genres: ["Turkish Pop", "Dance Pop"], monthlyListeners: 5400000 },
    { name: "Aleyna Tilki", genres: ["Turkish Pop", "Dance Pop"], monthlyListeners: 11200000 },
    { name: "Simge", genres: ["Turkish Pop"], monthlyListeners: 4200000 },
    { name: "Sefo", genres: ["Turkish Rap", "Drill"], monthlyListeners: 5800000 },
  ];

  return artists.map(a => ({
    id: uuid(),
    name: a.name,
    genres: a.genres,
    country: "TR",
    monthlyListeners: a.monthlyListeners + Math.floor(Math.random() * 1000000),
    followers: Math.floor(a.monthlyListeners * 0.3),
    spotifyId: `spotify_${a.name.toLowerCase().replace(/\s/g, "_")}`,
  }));
}

function generateMockChartEntries(artistName: string): ChartmetricChartEntry[] {
  const charts = [
    { name: "Spotify Turkey Top 50", type: "spotify", region: "TR" },
    { name: "Apple Music Turkey Top 100", type: "apple", region: "TR" },
    { name: "Spotify Global Top 200", type: "spotify", region: "GLOBAL" },
    { name: "Shazam Turkey Top 100", type: "shazam", region: "TR" },
  ];

  const entries: ChartmetricChartEntry[] = [];
  
  for (const chart of charts) {
    if (Math.random() > 0.3) {
      entries.push({
        trackId: uuid(),
        trackName: `${artistName} - Hit Single`,
        artistName,
        chartName: chart.name,
        chartType: chart.type,
        region: chart.region,
        position: Math.floor(Math.random() * 50) + 1,
        peak: Math.floor(Math.random() * 20) + 1,
        weeks: Math.floor(Math.random() * 20) + 1,
        entryDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  return entries;
}

function generateMockPlaylistEntries(artistName: string): ChartmetricPlaylistEntry[] {
  const playlists = [
    { name: "Türkçe Pop", platform: "spotify", followers: 2500000 },
    { name: "Türkçe Rap", platform: "spotify", followers: 1800000 },
    { name: "Viral Türkiye", platform: "spotify", followers: 980000 },
    { name: "Today's Top Hits TR", platform: "spotify", followers: 3200000 },
    { name: "New Music Friday Turkey", platform: "spotify", followers: 450000 },
  ];

  const entries: ChartmetricPlaylistEntry[] = [];

  for (const playlist of playlists) {
    if (Math.random() > 0.4) {
      entries.push({
        playlistId: uuid(),
        playlistName: playlist.name,
        platform: playlist.platform,
        trackId: uuid(),
        trackName: `${artistName} - Latest`,
        artistName,
        addedAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        position: Math.floor(Math.random() * 30) + 1,
        followers: playlist.followers,
      });
    }
  }

  return entries;
}

export async function syncChartmetricArtists(): Promise<{
  synced: number;
  errors: number;
  artists: Entity[];
}> {
  const jobId = uuid();
  const syncJob: InsertBehaviorSyncJob = {
    platform: "chartmetric",
    status: "running",
    startedAt: new Date(),
  };

  await getDb().insert(behaviorSyncJobs).values({ id: jobId, ...syncJob });

  const results: Entity[] = [];
  let errorCount = 0;

  try {
    const artists = CHARTMETRIC_BEARER
      ? await fetchChartmetricAPI<ChartmetricArtist[]>("/artist/list", { country: "TR" })
      : generateMockTurkishArtists();

    if (!artists) {
      throw new Error("Failed to fetch artists");
    }

    for (const artist of artists) {
      try {
        const existingIdentity = await getDb()
          .select()
          .from(entityIdentities)
          .where(
            and(
              eq(entityIdentities.platform, "chartmetric"),
              eq(entityIdentities.platformId, artist.id)
            )
          )
          .limit(1);

        let entityId: string;

        if (existingIdentity.length > 0) {
          entityId = existingIdentity[0].entityId;
          
          await getDb()
            .update(entityIdentities)
            .set({
              followerCount: artist.followers,
              lastSyncedAt: new Date(),
              metadata: { monthlyListeners: artist.monthlyListeners },
            })
            .where(eq(entityIdentities.id, existingIdentity[0].id));
        } else {
          entityId = uuid();
          const newEntity: InsertEntity = {
            type: "artist",
            name: artist.name,
            primaryImage: artist.imageUrl,
            country: artist.country || "TR",
            genres: artist.genres || [],
            tags: ["turkish", "music"],
          };

          await getDb().insert(entities).values({ id: entityId, ...newEntity });

          const newIdentity: InsertEntityIdentity = {
            entityId,
            platform: "chartmetric",
            platformId: artist.id,
            platformUsername: artist.name.toLowerCase().replace(/\s/g, "_"),
            followerCount: artist.followers,
            lastSyncedAt: new Date(),
            metadata: { 
              monthlyListeners: artist.monthlyListeners,
              spotifyId: artist.spotifyId 
            },
          };

          await getDb().insert(entityIdentities).values({ id: uuid(), ...newIdentity });

          if (artist.spotifyId) {
            const spotifyIdentity: InsertEntityIdentity = {
              entityId,
              platform: "spotify",
              platformId: artist.spotifyId,
              platformUsername: artist.name.toLowerCase().replace(/\s/g, "_"),
              lastSyncedAt: new Date(),
            };
            await getDb().insert(entityIdentities).values({ id: uuid(), ...spotifyIdentity });
          }
        }

        const [entity] = await getDb()
          .select()
          .from(entities)
          .where(eq(entities.id, entityId));

        if (entity) {
          results.push(entity);
        }
      } catch (err) {
        console.error(`[Chartmetric] Error syncing artist ${artist.name}:`, err);
        errorCount++;
      }
    }

    await getDb()
      .update(behaviorSyncJobs)
      .set({
        status: "completed",
        entityCount: results.length,
        completedAt: new Date(),
      })
      .where(eq(behaviorSyncJobs.id, jobId));

  } catch (error) {
    console.error("[Chartmetric] Sync error:", error);
    await getDb()
      .update(behaviorSyncJobs)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(behaviorSyncJobs.id, jobId));
  }

  return {
    synced: results.length,
    errors: errorCount,
    artists: results,
  };
}

export async function syncChartmetricCharts(entityId: string): Promise<{
  synced: number;
  errors: number;
  events: StreamingEvent[];
}> {
  const results: StreamingEvent[] = [];
  let errorCount = 0;

  try {
    const [entity] = await getDb()
      .select()
      .from(entities)
      .where(eq(entities.id, entityId));

    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const chartEntries = CHARTMETRIC_BEARER
      ? await fetchChartmetricAPI<ChartmetricChartEntry[]>(`/artist/${entityId}/charts`)
      : generateMockChartEntries(entity.name);

    if (!chartEntries) {
      throw new Error("Failed to fetch chart entries");
    }

    for (const entry of chartEntries) {
      try {
        const newEvent: InsertStreamingEvent = {
          entityId,
          platform: "chartmetric",
          eventType: "chart_entry",
          trackId: entry.trackId,
          trackName: entry.trackName,
          artistName: entry.artistName,
          chartPosition: entry.position,
          chartName: entry.chartName,
          chartRegion: entry.region,
          popularity: 100 - entry.position,
          eventTs: new Date(entry.entryDate),
        };

        const eventId = uuid();
        await getDb().insert(streamingEvents).values({ id: eventId, ...newEvent });

        const [event] = await getDb()
          .select()
          .from(streamingEvents)
          .where(eq(streamingEvents.id, eventId));

        if (event) {
          results.push(event);
        }
      } catch (err) {
        console.error(`[Chartmetric] Error syncing chart entry:`, err);
        errorCount++;
      }
    }
  } catch (error) {
    console.error("[Chartmetric] Chart sync error:", error);
  }

  return {
    synced: results.length,
    errors: errorCount,
    events: results,
  };
}

export async function syncChartmetricPlaylists(entityId: string): Promise<{
  synced: number;
  errors: number;
  events: StreamingEvent[];
}> {
  const results: StreamingEvent[] = [];
  let errorCount = 0;

  try {
    const [entity] = await getDb()
      .select()
      .from(entities)
      .where(eq(entities.id, entityId));

    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const playlistEntries = CHARTMETRIC_BEARER
      ? await fetchChartmetricAPI<ChartmetricPlaylistEntry[]>(`/artist/${entityId}/playlists`)
      : generateMockPlaylistEntries(entity.name);

    if (!playlistEntries) {
      throw new Error("Failed to fetch playlist entries");
    }

    for (const entry of playlistEntries) {
      try {
        const newEvent: InsertStreamingEvent = {
          entityId,
          platform: "chartmetric",
          eventType: "playlist_add",
          trackId: entry.trackId,
          trackName: entry.trackName,
          artistName: entry.artistName,
          playlistId: entry.playlistId,
          playlistName: entry.playlistName,
          listeners: entry.followers,
          popularity: entry.position ? 100 - entry.position : 50,
          eventTs: new Date(entry.addedAt),
        };

        const eventId = uuid();
        await getDb().insert(streamingEvents).values({ id: eventId, ...newEvent });

        const [event] = await getDb()
          .select()
          .from(streamingEvents)
          .where(eq(streamingEvents.id, eventId));

        if (event) {
          results.push(event);
        }
      } catch (err) {
        console.error(`[Chartmetric] Error syncing playlist entry:`, err);
        errorCount++;
      }
    }
  } catch (error) {
    console.error("[Chartmetric] Playlist sync error:", error);
  }

  return {
    synced: results.length,
    errors: errorCount,
    events: results,
  };
}

export async function getEntityStreamingEvents(
  entityId: string,
  eventType?: "chart_entry" | "playlist_add" | "stream",
  limit: number = 50
): Promise<StreamingEvent[]> {
  if (eventType) {
    return await getDb()
      .select()
      .from(streamingEvents)
      .where(
        and(
          eq(streamingEvents.entityId, entityId),
          eq(streamingEvents.eventType, eventType)
        )
      )
      .orderBy(desc(streamingEvents.eventTs))
      .limit(limit);
  }

  return await getDb()
    .select()
    .from(streamingEvents)
    .where(eq(streamingEvents.entityId, entityId))
    .orderBy(desc(streamingEvents.eventTs))
    .limit(limit);
}

export async function calculateStreamingIntensity(event: StreamingEvent): Promise<number> {
  const streams = event.streams || 0;
  const listeners = event.listeners || 0;
  const popularity = event.popularity || 0;
  const chartPosition = event.chartPosition || 200;

  const positionScore = Math.max(0, 100 - chartPosition);
  
  const weightedScore = 
    (streams * 0.001) +
    (listeners * 0.01) +
    (popularity * 0.5) +
    (positionScore * 1);

  const normalized = Math.min(100, Math.log10(weightedScore + 1) * 25);

  return Math.round(normalized * 100) / 100;
}

export async function getChartmetricServiceStatus(): Promise<{
  configured: boolean;
  lastSync: Date | null;
  totalArtists: number;
  totalEvents: number;
}> {
  const lastJob = await getDb()
    .select()
    .from(behaviorSyncJobs)
    .where(eq(behaviorSyncJobs.platform, "chartmetric"))
    .orderBy(desc(behaviorSyncJobs.createdAt))
    .limit(1);

  const chartmetricIdentities = await getDb()
    .select()
    .from(entityIdentities)
    .where(eq(entityIdentities.platform, "chartmetric"));

  const chartmetricEvents = await getDb()
    .select()
    .from(streamingEvents)
    .where(eq(streamingEvents.platform, "chartmetric"));

  return {
    configured: !!CHARTMETRIC_BEARER,
    lastSync: lastJob.length > 0 ? lastJob[0].completedAt : null,
    totalArtists: chartmetricIdentities.length,
    totalEvents: chartmetricEvents.length,
  };
}
