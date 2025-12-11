import { db } from './db';
import { v4 as uuid } from 'uuid';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import {
  vistaAccountGroups,
  vistaProfiles,
  behaviorSyncSchedules,
  entities,
  entityIdentities,
  socialEvents,
  InsertVistaAccountGroup,
  InsertVistaProfile,
  InsertBehaviorSyncSchedule,
  VistaAccountGroup,
  VistaProfile,
  BehaviorSyncSchedule,
  VistaGroupWithProfiles,
} from '@shared/schema';
import { syncVistaPosts } from './vista-social-service';
import { processPendingSocialEvents, processPendingStreamingEvents } from './behavior-engine';

async function processBehaviorEvents(limit: number): Promise<{ social: number; streaming: number }> {
  const social = await processPendingSocialEvents(limit);
  const streaming = await processPendingStreamingEvents(limit);
  return { social, streaming };
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

const VISTA_API_KEY = process.env.VISTA_SOCIAL_API_KEY;
const VISTA_API_BASE = 'https://api.vistasocial.com/v1';

// =============================================
// VISTA ACCOUNT GROUP MANAGEMENT
// =============================================

export async function createVistaGroup(data: Omit<InsertVistaAccountGroup, 'totalProfiles'>): Promise<VistaAccountGroup> {
  const id = uuid();
  const group: InsertVistaAccountGroup = {
    ...data,
    totalProfiles: 0,
    isActive: 1,
  };

  await getDb().insert(vistaAccountGroups).values({ id, ...group });
  
  const [created] = await getDb()
    .select()
    .from(vistaAccountGroups)
    .where(eq(vistaAccountGroups.id, id));
  
  return created;
}

export async function getVistaGroups(): Promise<VistaGroupWithProfiles[]> {
  const groups = await getDb()
    .select()
    .from(vistaAccountGroups)
    .where(eq(vistaAccountGroups.isActive, 1));
  
  const result: VistaGroupWithProfiles[] = [];
  
  for (const group of groups) {
    const profiles = await getDb()
      .select()
      .from(vistaProfiles)
      .where(and(
        eq(vistaProfiles.groupId, group.id),
        eq(vistaProfiles.isActive, 1)
      ));
    
    result.push({ ...group, profiles });
  }
  
  return result;
}

export async function getVistaGroup(id: string): Promise<VistaGroupWithProfiles | null> {
  const [group] = await getDb()
    .select()
    .from(vistaAccountGroups)
    .where(eq(vistaAccountGroups.id, id));
  
  if (!group) return null;
  
  const profiles = await getDb()
    .select()
    .from(vistaProfiles)
    .where(and(
      eq(vistaProfiles.groupId, id),
      eq(vistaProfiles.isActive, 1)
    ));
  
  return { ...group, profiles };
}

export async function updateVistaGroup(id: string, data: Partial<InsertVistaAccountGroup>): Promise<VistaAccountGroup | null> {
  await getDb()
    .update(vistaAccountGroups)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vistaAccountGroups.id, id));
  
  const [updated] = await getDb()
    .select()
    .from(vistaAccountGroups)
    .where(eq(vistaAccountGroups.id, id));
  
  return updated || null;
}

export async function deleteVistaGroup(id: string): Promise<boolean> {
  await getDb()
    .update(vistaAccountGroups)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(vistaAccountGroups.id, id));
  
  await getDb()
    .update(vistaProfiles)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(vistaProfiles.groupId, id));
  
  return true;
}

// =============================================
// VISTA PROFILE MANAGEMENT
// =============================================

export async function addVistaProfile(data: InsertVistaProfile): Promise<VistaProfile> {
  const id = uuid();
  
  await getDb().insert(vistaProfiles).values({ id, ...data });
  
  await getDb()
    .update(vistaAccountGroups)
    .set({ 
      totalProfiles: await getProfileCount(data.groupId),
      updatedAt: new Date() 
    })
    .where(eq(vistaAccountGroups.id, data.groupId));
  
  const [created] = await getDb()
    .select()
    .from(vistaProfiles)
    .where(eq(vistaProfiles.id, id));
  
  return created;
}

async function getProfileCount(groupId: string): Promise<number> {
  const profiles = await getDb()
    .select()
    .from(vistaProfiles)
    .where(and(
      eq(vistaProfiles.groupId, groupId),
      eq(vistaProfiles.isActive, 1)
    ));
  
  return profiles.length;
}

export async function updateVistaProfile(id: string, data: Partial<InsertVistaProfile>): Promise<VistaProfile | null> {
  await getDb()
    .update(vistaProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(vistaProfiles.id, id));
  
  const [updated] = await getDb()
    .select()
    .from(vistaProfiles)
    .where(eq(vistaProfiles.id, id));
  
  return updated || null;
}

export async function deleteVistaProfile(id: string): Promise<boolean> {
  const [profile] = await getDb()
    .select()
    .from(vistaProfiles)
    .where(eq(vistaProfiles.id, id));
  
  if (!profile) return false;
  
  await getDb()
    .update(vistaProfiles)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(vistaProfiles.id, id));
  
  await getDb()
    .update(vistaAccountGroups)
    .set({ 
      totalProfiles: await getProfileCount(profile.groupId),
      updatedAt: new Date() 
    })
    .where(eq(vistaAccountGroups.id, profile.groupId));
  
  return true;
}

// Bulk import profiles from Vista Social API
export async function importVistaProfilesFromAPI(groupId: string): Promise<{
  imported: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let imported = 0;
  
  if (!VISTA_API_KEY) {
    errors.push('Vista Social API key not configured');
    return { imported, errors };
  }
  
  try {
    const response = await fetch(`${VISTA_API_BASE}/profiles`, {
      headers: {
        'Authorization': `Bearer ${VISTA_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      errors.push(`Vista API error: ${response.status}`);
      return { imported, errors };
    }
    
    const data = await response.json();
    const profiles = data.profiles || data.data || [];
    
    for (const p of profiles) {
      try {
        const existing = await getDb()
          .select()
          .from(vistaProfiles)
          .where(eq(vistaProfiles.vistaProfileId, p.id))
          .limit(1);
        
        if (existing.length === 0) {
          await addVistaProfile({
            groupId,
            vistaProfileId: p.id,
            platform: p.platform || 'tiktok',
            username: p.username || p.handle,
            displayName: p.display_name || p.name,
            profileUrl: p.profile_url || p.url,
            followerCount: p.follower_count || p.followers || 0,
            followingCount: p.following_count || p.following || 0,
            postCount: p.post_count || p.posts || 0,
            isVerified: p.verified ? 1 : 0,
            bio: p.bio || p.description,
            profileImageUrl: p.profile_image_url || p.avatar,
            syncStatus: 'pending',
            isActive: 1,
          });
          imported++;
        }
      } catch (err) {
        errors.push(`Failed to import profile ${p.id}: ${err}`);
      }
    }
  } catch (err) {
    errors.push(`Failed to fetch profiles: ${err}`);
  }
  
  return { imported, errors };
}

// =============================================
// SYNC SCHEDULE MANAGEMENT
// =============================================

export async function createSyncSchedule(data: InsertBehaviorSyncSchedule): Promise<BehaviorSyncSchedule> {
  const id = uuid();
  const nextRun = calculateNextRun(data.scheduleType, data.dayOfWeek, data.hourOfDay);
  
  await getDb().insert(behaviorSyncSchedules).values({
    id,
    ...data,
    nextRunAt: nextRun,
    runCount: 0,
    isActive: 1,
  });
  
  const [created] = await getDb()
    .select()
    .from(behaviorSyncSchedules)
    .where(eq(behaviorSyncSchedules.id, id));
  
  return created;
}

export async function getSyncSchedules(): Promise<BehaviorSyncSchedule[]> {
  return getDb()
    .select()
    .from(behaviorSyncSchedules)
    .where(eq(behaviorSyncSchedules.isActive, 1));
}

export async function updateSyncSchedule(id: string, data: Partial<InsertBehaviorSyncSchedule>): Promise<BehaviorSyncSchedule | null> {
  await getDb()
    .update(behaviorSyncSchedules)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(behaviorSyncSchedules.id, id));
  
  const [updated] = await getDb()
    .select()
    .from(behaviorSyncSchedules)
    .where(eq(behaviorSyncSchedules.id, id));
  
  return updated || null;
}

export async function deleteSyncSchedule(id: string): Promise<boolean> {
  await getDb()
    .update(behaviorSyncSchedules)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(behaviorSyncSchedules.id, id));
  
  return true;
}

function calculateNextRun(
  scheduleType: string,
  dayOfWeek?: number | null,
  hourOfDay?: number | null
): Date {
  const now = new Date();
  const hour = hourOfDay ?? 3; // Default 3 AM UTC
  
  switch (scheduleType) {
    case 'daily':
      const nextDaily = new Date(now);
      nextDaily.setUTCHours(hour, 0, 0, 0);
      if (nextDaily <= now) {
        nextDaily.setDate(nextDaily.getDate() + 1);
      }
      return nextDaily;
    
    case 'weekly':
      const targetDay = dayOfWeek ?? 1; // Default Monday
      const nextWeekly = new Date(now);
      nextWeekly.setUTCHours(hour, 0, 0, 0);
      const currentDay = nextWeekly.getUTCDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0 || (daysUntil === 0 && nextWeekly <= now)) {
        daysUntil += 7;
      }
      nextWeekly.setDate(nextWeekly.getDate() + daysUntil);
      return nextWeekly;
    
    case 'monthly':
      const nextMonthly = new Date(now);
      nextMonthly.setUTCDate(1);
      nextMonthly.setUTCHours(hour, 0, 0, 0);
      if (nextMonthly <= now) {
        nextMonthly.setMonth(nextMonthly.getMonth() + 1);
      }
      return nextMonthly;
    
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

// =============================================
// SYNC EXECUTION
// =============================================

export async function runScheduledSyncs(): Promise<{
  executed: number;
  errors: string[];
}> {
  const now = new Date();
  let executed = 0;
  const errors: string[] = [];
  
  // Find schedules that are due
  const dueSchedules = await getDb()
    .select()
    .from(behaviorSyncSchedules)
    .where(and(
      eq(behaviorSyncSchedules.isActive, 1),
      or(
        lt(behaviorSyncSchedules.nextRunAt, now),
        isNull(behaviorSyncSchedules.nextRunAt)
      )
    ));
  
  for (const schedule of dueSchedules) {
    try {
      console.log(`[BehaviorSync] Running schedule: ${schedule.name}`);
      
      // Update status to running
      await getDb()
        .update(behaviorSyncSchedules)
        .set({ lastStatus: 'running', lastRunAt: now })
        .where(eq(behaviorSyncSchedules.id, schedule.id));
      
      // Execute sync based on target type
      switch (schedule.targetType) {
        case 'vista_group':
          if (schedule.targetId) {
            await syncVistaGroup(schedule.targetId);
          }
          break;
        
        case 'chartmetric':
          // TODO: Implement Chartmetric scheduled sync
          console.log('[BehaviorSync] Chartmetric sync not yet implemented');
          break;
        
        case 'all':
          await syncAllVistaGroups();
          break;
      }
      
      // Process behavior events
      await processBehaviorEvents(1000);
      
      // Calculate next run
      const nextRun = calculateNextRun(
        schedule.scheduleType,
        schedule.dayOfWeek,
        schedule.hourOfDay
      );
      
      // Update schedule status
      await getDb()
        .update(behaviorSyncSchedules)
        .set({
          lastStatus: 'success',
          nextRunAt: nextRun,
          runCount: (schedule.runCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(behaviorSyncSchedules.id, schedule.id));
      
      executed++;
      console.log(`[BehaviorSync] Completed: ${schedule.name}, next run: ${nextRun}`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push(`Schedule ${schedule.name}: ${errorMessage}`);
      
      await getDb()
        .update(behaviorSyncSchedules)
        .set({
          lastStatus: 'failed',
          lastError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(behaviorSyncSchedules.id, schedule.id));
    }
  }
  
  return { executed, errors };
}

async function syncVistaGroup(groupId: string): Promise<void> {
  const group = await getVistaGroup(groupId);
  if (!group) {
    throw new Error(`Vista group not found: ${groupId}`);
  }
  
  console.log(`[BehaviorSync] Syncing Vista group: ${group.name} (${group.profiles.length} profiles)`);
  
  for (const profile of group.profiles) {
    try {
      // Update profile status
      await getDb()
        .update(vistaProfiles)
        .set({ syncStatus: 'syncing', updatedAt: new Date() })
        .where(eq(vistaProfiles.id, profile.id));
      
      // Sync posts if we have an entity ID
      if (profile.entityId) {
        await syncVistaPosts(profile.entityId, profile.platform as 'tiktok' | 'instagram');
      }
      
      // Update profile status
      await getDb()
        .update(vistaProfiles)
        .set({ 
          syncStatus: 'completed',
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(vistaProfiles.id, profile.id));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await getDb()
        .update(vistaProfiles)
        .set({ 
          syncStatus: 'failed',
          syncError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(vistaProfiles.id, profile.id));
    }
  }
}

async function syncAllVistaGroups(): Promise<void> {
  const groups = await getVistaGroups();
  
  for (const group of groups) {
    await syncVistaGroup(group.id);
  }
}

// =============================================
// MANUAL SYNC TRIGGERS
// =============================================

export async function triggerGroupSync(groupId: string): Promise<{
  success: boolean;
  synced: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let synced = 0;
  
  try {
    const group = await getVistaGroup(groupId);
    if (!group) {
      return { success: false, synced: 0, errors: ['Group not found'] };
    }
    
    for (const profile of group.profiles) {
      try {
        if (profile.entityId) {
          await syncVistaPosts(profile.entityId, profile.platform as 'tiktok' | 'instagram');
          synced++;
        }
      } catch (err) {
        errors.push(`Profile ${profile.username}: ${err}`);
      }
    }
    
    await processBehaviorEvents(1000);
    
    return { success: true, synced, errors };
  } catch (err) {
    return { success: false, synced, errors: [String(err)] };
  }
}

// =============================================
// SEED DEFAULT GROUPS
// =============================================

export async function seedDefaultVistaGroups(): Promise<void> {
  const defaultGroups = [
    { name: 'Poizi Fan Sayfaları', slug: 'poizi', description: 'Poizi fan hesapları', color: '#19B5B5', iconName: 'Users', targetArtist: 'Poizi' },
    { name: 'Türkçe Rap', slug: 'turkce-rap', description: 'Türkçe rap sayfaları', color: '#FF6B6B', iconName: 'Music', targetArtist: null },
    { name: 'Rasch Fan Sayfaları', slug: 'rasch', description: 'Rasch fan hesapları', color: '#4ECDC4', iconName: 'Star', targetArtist: 'Rasch' },
    { name: 'Ümit Pamukçu Fan Sayfaları', slug: 'umit-pamukcu', description: 'Ümit Pamukçu fan hesapları', color: '#FFE66D', iconName: 'Heart', targetArtist: 'Ümit Pamukçu' },
  ];
  
  for (const groupData of defaultGroups) {
    const existing = await getDb()
      .select()
      .from(vistaAccountGroups)
      .where(eq(vistaAccountGroups.slug, groupData.slug))
      .limit(1);
    
    if (existing.length === 0) {
      await createVistaGroup(groupData);
      console.log(`[BehaviorSync] Created default group: ${groupData.name}`);
    }
  }
}

// Start the scheduler check interval (call this once at startup)
let schedulerInterval: NodeJS.Timeout | null = null;

export function startBehaviorSyncScheduler(intervalMinutes: number = 5): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
  
  console.log(`[BehaviorSync] Starting scheduler (checking every ${intervalMinutes} minutes)`);
  
  // Run immediately on startup
  runScheduledSyncs().catch(console.error);
  
  // Then run on interval
  schedulerInterval = setInterval(() => {
    runScheduledSyncs().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}

export function stopBehaviorSyncScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[BehaviorSync] Scheduler stopped');
  }
}
