import { v4 as uuid } from "uuid";
import { db } from "./db";
import { 
  entities, 
  entityIdentities, 
  socialEvents, 
  behaviorSyncJobs,
  vistaAccountGroups,
  vistaProfiles,
  Entity,
  SocialEvent,
  InsertEntity,
  InsertEntityIdentity,
  InsertSocialEvent,
  InsertBehaviorSyncJob
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

const VISTA_API_BASE = "https://vistasocial.com/api/integration";
const VISTA_API_KEY = process.env.VISTA_SOCIAL_API_KEY;
const VISTA_API_KEY_2 = process.env.VISTA_SOCIAL_API_KEY_2;

// Multi-account support
export type VistaAccountType = 'primary' | 'secondary';

function getVistaApiKey(account: VistaAccountType = 'primary'): string | undefined {
  return account === 'secondary' ? VISTA_API_KEY_2 : VISTA_API_KEY;
}

interface VistaApiProfile {
  id: number;
  name: string;
  network: string;
  username?: string;
  profile_url?: string;
  followers?: number;
  following?: number;
  posts?: number;
}

interface VistaApiGroup {
  id: string;
  name: string;
  type: string;
}

interface VistaApiPost {
  id: string;
  author?: {
    name: string;
    email: string;
  };
  message?: string;
  publish_at?: string;
  timezone?: string;
  profile?: {
    name: string;
    username: string;
    network: string;
    profile_url: string;
  };
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  engagement?: number;
  published_link?: string;
}

interface VistaDailyPerformance {
  id: string;
  date: string;
  profile: string;
  network: string;
  engagement: number;
  followers: number;
  stories?: number;
  impressions?: number;
  reach?: number;
}

async function fetchVistaAPI<T>(endpoint: string, params?: Record<string, string>, account: VistaAccountType = 'primary'): Promise<T | null> {
  const apiKey = getVistaApiKey(account);
  const accountLabel = account === 'secondary' ? 'Hesap 2' : 'Hesap 1';
  
  if (!apiKey) {
    console.warn(`[Vista Social ${accountLabel}] API key not configured`);
    return null;
  }

  try {
    const url = new URL(`${VISTA_API_BASE}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    console.log(`[Vista Social ${accountLabel}] Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        "api_key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vista Social ${accountLabel}] API error: ${response.status} ${response.statusText}`, errorText);
      return null;
    }

    const data = await response.json() as T;
    console.log(`[Vista Social ${accountLabel}] Success:`, Array.isArray(data) ? `${data.length} items` : 'object');
    return data;
  } catch (error) {
    console.error(`[Vista Social ${accountLabel}] Fetch error:`, error);
    return null;
  }
}

export async function getVistaProfiles(groupId?: string): Promise<VistaApiProfile[] | null> {
  const params: Record<string, string> = {};
  if (groupId) {
    params.group_id = groupId;
  }
  return fetchVistaAPI<VistaApiProfile[]>("/profiles", params);
}

export async function getVistaGroups(): Promise<VistaApiGroup[] | null> {
  return fetchVistaAPI<VistaApiGroup[]>("/groups");
}

export async function getVistaPosts(status: string = "published", profileId?: string): Promise<VistaApiPost[] | null> {
  const params: Record<string, string> = { status };
  if (profileId) {
    params.profile_id = profileId;
  }
  return fetchVistaAPI<VistaApiPost[]>("/posts", params);
}

export async function getVistaDailyPerformance(
  dateFrom: string, 
  dateTo: string, 
  profileId?: string,
  groupId?: string
): Promise<VistaDailyPerformance[] | null> {
  const params: Record<string, string> = {
    date_from: dateFrom,
    date_to: dateTo,
  };
  if (profileId) {
    params.profile_id = profileId;
  }
  if (groupId) {
    params.group_id = groupId;
  }
  return fetchVistaAPI<VistaDailyPerformance[]>("/data/daily", params);
}

export async function getVistaPostPerformance(
  dateFrom: string, 
  dateTo: string, 
  profileId?: string,
  groupId?: string
): Promise<VistaApiPost[] | null> {
  const params: Record<string, string> = {
    date_from: dateFrom,
    date_to: dateTo,
  };
  if (profileId) {
    params.profile_id = profileId;
  }
  if (groupId) {
    params.group_id = groupId;
  }
  return fetchVistaAPI<VistaApiPost[]>("/data/posts", params);
}

export async function syncVistaProfilesFromAPI(): Promise<{
  synced: number;
  errors: number;
  profiles: any[];
}> {
  const jobId = uuid();
  const syncJob: InsertBehaviorSyncJob = {
    platform: "vista_social",
    status: "running",
    startedAt: new Date(),
  };

  await getDb().insert(behaviorSyncJobs).values({ id: jobId, ...syncJob });

  const results: any[] = [];
  let errorCount = 0;

  try {
    const profiles = await getVistaProfiles();

    if (!profiles) {
      throw new Error("Failed to fetch profiles from Vista Social API");
    }

    console.log(`[Vista Social] Syncing ${profiles.length} profiles from API`);

    for (const profile of profiles) {
      try {
        const platform = profile.network.toLowerCase() as "tiktok" | "instagram" | "facebook" | "linkedin";
        
        const existingIdentity = await getDb()
          .select()
          .from(entityIdentities)
          .where(
            and(
              eq(entityIdentities.platform, platform),
              eq(entityIdentities.platformId, String(profile.id))
            )
          )
          .limit(1);

        let entityId: string;

        if (existingIdentity.length > 0) {
          entityId = existingIdentity[0].entityId;
          
          await getDb()
            .update(entityIdentities)
            .set({
              followerCount: profile.followers,
              lastSyncedAt: new Date(),
            })
            .where(eq(entityIdentities.id, existingIdentity[0].id));
        } else {
          entityId = uuid();
          const newEntity: InsertEntity = {
            type: "artist",
            name: profile.name,
            primaryImage: undefined,
            country: "TR",
            genres: [],
            tags: ["turkish", platform, "vista"],
          };

          await getDb().insert(entities).values(Object.assign({ id: entityId }, newEntity));

          const newIdentity: InsertEntityIdentity = {
            entityId,
            platform,
            platformId: String(profile.id),
            platformUsername: profile.username || profile.name,
            profileUrl: profile.profile_url,
            verified: 0,
            followerCount: profile.followers,
            lastSyncedAt: new Date(),
          };

          await getDb().insert(entityIdentities).values({ id: uuid(), ...newIdentity });
        }

        const [entity] = await getDb()
          .select()
          .from(entities)
          .where(eq(entities.id, entityId));

        if (entity) {
          results.push({ ...entity, vistaId: profile.id, network: profile.network });
        }
      } catch (err) {
        console.error(`[Vista Social] Error syncing profile ${profile.name}:`, err);
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
    console.error("[Vista Social] Sync error:", error);
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
    profiles: results,
  };
}

export async function syncVistaPostsFromAPI(profileId?: string): Promise<{
  synced: number;
  errors: number;
  events: SocialEvent[];
}> {
  const results: SocialEvent[] = [];
  let errorCount = 0;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const dateFrom = thirtyDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');
    const dateTo = now.toISOString().slice(0, 10).replace(/-/g, '');

    const posts = await getVistaPostPerformance(dateFrom, dateTo, profileId);

    if (!posts) {
      throw new Error("Failed to fetch posts from Vista Social API");
    }

    console.log(`[Vista Social] Syncing ${posts.length} posts from API`);

    for (const post of posts) {
      try {
        if (!post.profile) continue;

        const platform = post.profile.network.toLowerCase() as "tiktok" | "instagram" | "facebook" | "linkedin";
        
        const identity = await getDb()
          .select()
          .from(entityIdentities)
          .where(eq(entityIdentities.platformUsername, post.profile.username))
          .limit(1);

        if (identity.length === 0) {
          console.log(`[Vista Social] Skipping post - no entity found for ${post.profile.username}`);
          continue;
        }

        const entityId = identity[0].entityId;
        const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
        const impressions = post.impressions || post.views || 1;
        const engagementRate = (totalEngagement / impressions) * 100;

        const newEvent: InsertSocialEvent = {
          entityId,
          platform,
          eventType: "post",
          contentId: post.id,
          contentUrl: post.published_link,
          caption: post.message,
          hashtags: [],
          mentions: [],
          views: post.views || post.impressions || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          saves: 0,
          engagementRate,
          publishedAt: post.publish_at ? new Date(post.publish_at) : new Date(),
          eventTs: new Date(),
        };

        const eventId = uuid();
        await getDb().insert(socialEvents).values(Object.assign({ id: eventId }, newEvent));

        const [event] = await getDb()
          .select()
          .from(socialEvents)
          .where(eq(socialEvents.id, eventId));

        if (event) {
          results.push(event);
        }
      } catch (err) {
        console.error(`[Vista Social] Error syncing post ${post.id}:`, err);
        errorCount++;
      }
    }
  } catch (error) {
    console.error("[Vista Social] Post sync error:", error);
  }

  return {
    synced: results.length,
    errors: errorCount,
    events: results,
  };
}

// Sync posts for a specific entity (used by behavior-sync-worker and routes)
export async function syncVistaPosts(entityId: string, platform: 'tiktok' | 'instagram'): Promise<{
  synced: number;
  errors: number;
}> {
  let synced = 0;
  let errors = 0;

  try {
    const identity = await getDb()
      .select()
      .from(entityIdentities)
      .where(and(
        eq(entityIdentities.entityId, entityId),
        eq(entityIdentities.platform, platform)
      ))
      .limit(1);

    if (identity.length === 0) {
      console.log(`[Vista Social] No identity found for entity ${entityId} on ${platform}`);
      return { synced: 0, errors: 0 };
    }

    const username = identity[0].platformUsername;
    
    // Fetch posts from Vista Social API
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dateFrom = thirtyDaysAgo.toISOString().slice(0, 10).replace(/-/g, '');
    const dateTo = now.toISOString().slice(0, 10).replace(/-/g, '');

    const posts = await getVistaPostPerformance(dateFrom, dateTo);

    if (!posts) {
      console.log(`[Vista Social] No posts found for ${username}`);
      return { synced: 0, errors: 0 };
    }

    // Filter posts for this profile
    const profilePosts = posts.filter(p => 
      p.profile?.username?.toLowerCase() === username.toLowerCase() &&
      p.profile?.network?.toLowerCase() === platform
    );

    console.log(`[Vista Social] Syncing ${profilePosts.length} posts for ${username} on ${platform}`);

    for (const post of profilePosts) {
      try {
        const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
        const impressions = post.impressions || post.views || 1;
        const engagementRate = (totalEngagement / impressions) * 100;

        const newEvent: InsertSocialEvent = {
          entityId,
          platform,
          eventType: "post",
          contentId: post.id,
          contentUrl: post.published_link,
          caption: post.message,
          hashtags: [],
          mentions: [],
          views: post.views || post.impressions || 0,
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          saves: 0,
          engagementRate,
          publishedAt: post.publish_at ? new Date(post.publish_at) : new Date(),
          eventTs: new Date(),
        };

        const eventId = uuid();
        await getDb().insert(socialEvents).values(Object.assign({ id: eventId }, newEvent));
        synced++;
      } catch (err) {
        console.error(`[Vista Social] Error syncing post ${post.id}:`, err);
        errors++;
      }
    }
  } catch (error) {
    console.error(`[Vista Social] syncVistaPosts error for ${entityId}:`, error);
    errors++;
  }

  return { synced, errors };
}

export async function syncVistaGroupFromDB(groupId: string): Promise<{
  synced: number;
  errors: number;
}> {
  let synced = 0;
  let errors = 0;

  try {
    const profiles = await getDb()
      .select()
      .from(vistaProfiles)
      .where(eq(vistaProfiles.groupId, groupId));

    for (const profile of profiles) {
      try {
        await getDb()
          .update(vistaProfiles)
          .set({
            syncStatus: "syncing",
            lastSyncedAt: new Date(),
          })
          .where(eq(vistaProfiles.id, profile.id));

        if (profile.vistaProfileId && VISTA_API_KEY) {
          const apiProfiles = await getVistaProfiles();
          const vistaProfile = apiProfiles?.find(p => String(p.id) === profile.vistaProfileId);

          if (vistaProfile) {
            await getDb()
              .update(vistaProfiles)
              .set({
                displayName: vistaProfile.name,
                followerCount: vistaProfile.followers || 0,
                followingCount: vistaProfile.following || 0,
                postCount: vistaProfile.posts || 0,
                profileUrl: vistaProfile.profile_url,
                syncStatus: "completed",
                lastSyncedAt: new Date(),
              })
              .where(eq(vistaProfiles.id, profile.id));
            synced++;
          } else {
            await getDb()
              .update(vistaProfiles)
              .set({
                syncStatus: "completed",
                lastSyncedAt: new Date(),
              })
              .where(eq(vistaProfiles.id, profile.id));
            synced++;
          }
        } else {
          await getDb()
            .update(vistaProfiles)
            .set({
              syncStatus: "completed",
              lastSyncedAt: new Date(),
            })
            .where(eq(vistaProfiles.id, profile.id));
          synced++;
        }
      } catch (err) {
        console.error(`[Vista Social] Error syncing profile ${profile.username}:`, err);
        await getDb()
          .update(vistaProfiles)
          .set({
            syncStatus: "failed",
            syncError: err instanceof Error ? err.message : "Unknown error",
          })
          .where(eq(vistaProfiles.id, profile.id));
        errors++;
      }
    }

    await getDb()
      .update(vistaAccountGroups)
      .set({ totalProfiles: profiles.length })
      .where(eq(vistaAccountGroups.id, groupId));

  } catch (error) {
    console.error("[Vista Social] Group sync error:", error);
  }

  return { synced, errors };
}

export async function getEntitySocialEvents(
  entityId: string,
  platform?: string,
  limit: number = 50
): Promise<SocialEvent[]> {
  if (platform) {
    return await getDb()
      .select()
      .from(socialEvents)
      .where(
        and(
          eq(socialEvents.entityId, entityId),
          eq(socialEvents.platform, platform)
        )
      )
      .orderBy(desc(socialEvents.eventTs))
      .limit(limit);
  }

  return await getDb()
    .select()
    .from(socialEvents)
    .where(eq(socialEvents.entityId, entityId))
    .orderBy(desc(socialEvents.eventTs))
    .limit(limit);
}

export async function calculateSocialIntensity(event: SocialEvent): Promise<number> {
  const views = event.views || 0;
  const likes = event.likes || 0;
  const comments = event.comments || 0;
  const shares = event.shares || 0;
  const saves = event.saves || 0;

  const weightedScore = 
    (views * 0.1) +
    (likes * 1) +
    (comments * 2) +
    (shares * 3) +
    (saves * 2);

  const normalized = Math.min(100, Math.log10(weightedScore + 1) * 20);

  return Math.round(normalized * 100) / 100;
}

export async function getVistaServiceStatus(): Promise<{
  configured: boolean;
  apiKeyPresent: boolean;
  apiKey2Present: boolean;
  lastSync: Date | null;
  totalProfiles: number;
  totalEvents: number;
}> {
  const lastJob = await getDb()
    .select()
    .from(behaviorSyncJobs)
    .where(eq(behaviorSyncJobs.platform, "vista_social"))
    .orderBy(desc(behaviorSyncJobs.createdAt))
    .limit(1);

  const totalProfiles = await getDb().select().from(entities);
  const totalEvents = await getDb().select().from(socialEvents);

  return {
    configured: true,
    apiKeyPresent: !!VISTA_API_KEY,
    apiKey2Present: !!VISTA_API_KEY_2,
    lastSync: lastJob.length > 0 ? lastJob[0].completedAt : null,
    totalProfiles: totalProfiles.length,
    totalEvents: totalEvents.length,
  };
}

// Test single account connection
async function testSingleAccount(account: VistaAccountType): Promise<{
  success: boolean;
  message: string;
  profileCount?: number;
  groupCount?: number;
}> {
  const apiKey = getVistaApiKey(account);
  const label = account === 'secondary' ? 'Hesap 2' : 'Hesap 1';
  
  if (!apiKey) {
    return { success: false, message: `${label}: API key yapılandırılmamış` };
  }

  const profiles = await fetchVistaAPI<VistaApiProfile[]>("/profiles", {}, account);
  
  if (profiles === null) {
    return { success: false, message: `${label}: API bağlantısı başarısız` };
  }

  const groups = await fetchVistaAPI<VistaApiGroup[]>("/groups", {}, account);

  return {
    success: true,
    message: `${label}: ${profiles.length} profil, ${groups?.length || 0} grup`,
    profileCount: profiles.length,
    groupCount: groups?.length || 0,
  };
}

export async function testVistaConnection(account?: VistaAccountType): Promise<{
  success: boolean;
  message: string;
  accounts?: {
    primary: { success: boolean; message: string; profileCount?: number; groupCount?: number };
    secondary: { success: boolean; message: string; profileCount?: number; groupCount?: number };
  };
  data?: any;
}> {
  // If specific account requested, test only that one
  if (account) {
    const result = await testSingleAccount(account);
    return {
      success: result.success,
      message: result.message,
    };
  }

  // Test both accounts
  const [primary, secondary] = await Promise.all([
    testSingleAccount('primary'),
    testSingleAccount('secondary'),
  ]);

  const anySuccess = primary.success || secondary.success;
  
  let message = '';
  if (primary.success && secondary.success) {
    message = `Her iki hesap bağlı. Toplam: ${(primary.profileCount || 0) + (secondary.profileCount || 0)} profil`;
  } else if (primary.success) {
    message = `Hesap 1 bağlı (${primary.profileCount} profil). Hesap 2: ${secondary.message}`;
  } else if (secondary.success) {
    message = `Hesap 2 bağlı (${secondary.profileCount} profil). Hesap 1: ${primary.message}`;
  } else {
    message = `Bağlantı başarısız. Hesap 1: ${primary.message}, Hesap 2: ${secondary.message}`;
  }

  return {
    success: anySuccess,
    message,
    accounts: { primary, secondary },
  };
}

// Get profiles from specific account
export async function getVistaProfilesFromAccount(account: VistaAccountType, groupId?: string): Promise<VistaApiProfile[] | null> {
  const params: Record<string, string> = {};
  if (groupId) {
    params.group_id = groupId;
  }
  return fetchVistaAPI<VistaApiProfile[]>("/profiles", params, account);
}

// Get groups from specific account
export async function getVistaGroupsFromAccount(account: VistaAccountType): Promise<VistaApiGroup[] | null> {
  return fetchVistaAPI<VistaApiGroup[]>("/groups", {}, account);
}
