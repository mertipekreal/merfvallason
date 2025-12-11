import { getDb } from './db';
import { 
  users, userPoints, userAchievements, dreams, dejavuEntries, nftAssets,
  ACHIEVEMENT_DEFINITIONS, AchievementId, LeaderboardEntry, UserProfile
} from '@shared/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Database not available');
  return db;
}

export class GamificationService {
  async addPoints(userId: string, points: number, reason: string): Promise<void> {
    const db = requireDb();
    await db.insert(userPoints).values({
      id: randomUUID(),
      userId,
      points,
      reason,
    });

    await db.update(users)
      .set({ totalPoints: sql`${users.totalPoints} + ${points}` })
      .where(eq(users.id, userId));
  }

  async addWhitelistSlots(userId: string, slots: number = 1): Promise<void> {
    const db = requireDb();
    await db.update(users)
      .set({ whitelistSlots: sql`${users.whitelistSlots} + ${slots}` })
      .where(eq(users.id, userId));
  }

  async unlockAchievement(userId: string, achievementId: AchievementId): Promise<number> {
    const db = requireDb();
    const existing = await db.select()
      .from(userAchievements)
      .where(sql`${userAchievements.userId} = ${userId} AND ${userAchievements.achievementId} = ${achievementId}`)
      .limit(1);

    if (existing.length > 0) {
      return 0;
    }

    await db.insert(userAchievements).values({
      id: randomUUID(),
      userId,
      achievementId,
    });

    const definition = ACHIEVEMENT_DEFINITIONS[achievementId];
    if (definition && definition.points > 0) {
      await this.addPoints(userId, definition.points, `Rozet: ${definition.name}`);
    }

    return definition?.points || 0;
  }

  async checkAndUnlockAchievements(userId: string): Promise<AchievementId[]> {
    const db = requireDb();
    const unlockedAchievements: AchievementId[] = [];

    const [dreamCountResult] = await db.select({ count: count() })
      .from(dreams)
      .where(eq(dreams.userId, userId));
    const dreamCount = dreamCountResult?.count || 0;

    const [dejavuCountResult] = await db.select({ count: count() })
      .from(dejavuEntries)
      .where(eq(dejavuEntries.userId, userId));
    const dejavuCount = dejavuCountResult?.count || 0;

    const [nftCountResult] = await db.select({ count: count() })
      .from(nftAssets)
      .where(sql`${nftAssets.userId} = ${userId} AND ${nftAssets.status} = 'minted'`);
    const nftCount = nftCountResult?.count || 0;

    if (dreamCount >= 1) {
      const pts = await this.unlockAchievement(userId, 'first_dream');
      if (pts > 0) unlockedAchievements.push('first_dream');
    }

    if (dreamCount >= 10) {
      const pts = await this.unlockAchievement(userId, 'ten_dreams');
      if (pts > 0) unlockedAchievements.push('ten_dreams');
    }

    if (dreamCount >= 25) {
      const pts = await this.unlockAchievement(userId, 'dream_collector');
      if (pts > 0) unlockedAchievements.push('dream_collector');
    }

    if (dreamCount >= 100) {
      const pts = await this.unlockAchievement(userId, 'hundred_dreams');
      if (pts > 0) unlockedAchievements.push('hundred_dreams');
    }

    if (dejavuCount >= 10) {
      const pts = await this.unlockAchievement(userId, 'dejavu_master');
      if (pts > 0) unlockedAchievements.push('dejavu_master');
    }

    if (nftCount >= 1) {
      const pts = await this.unlockAchievement(userId, 'nft_owner');
      if (pts > 0) unlockedAchievements.push('nft_owner');
    }

    return unlockedAchievements;
  }

  async onDreamSubmitted(userId: string | null): Promise<{ points: number; whitelistSlots: number; achievements: AchievementId[] }> {
    if (!userId) {
      return { points: 10, whitelistSlots: 1, achievements: [] };
    }

    await this.addPoints(userId, 10, 'Rüya kaydı');
    await this.addWhitelistSlots(userId, 1);

    const achievements = await this.checkAndUnlockAchievements(userId);

    return { points: 10, whitelistSlots: 1, achievements };
  }

  async onDejavuSubmitted(userId: string | null): Promise<{ points: number; achievements: AchievementId[] }> {
    if (!userId) {
      return { points: 5, achievements: [] };
    }

    await this.addPoints(userId, 5, 'DejaVu kaydı');

    const achievements = await this.checkAndUnlockAchievements(userId);

    return { points: 5, achievements };
  }

  async onNFTMinted(userId: string): Promise<{ points: number; achievements: AchievementId[] }> {
    await this.addPoints(userId, 25, 'NFT mint');

    const achievements: AchievementId[] = [];
    
    const pts1 = await this.unlockAchievement(userId, 'first_mint');
    if (pts1 > 0) achievements.push('first_mint');

    const pts2 = await this.unlockAchievement(userId, 'nft_owner');
    if (pts2 > 0) achievements.push('nft_owner');

    return { points: 25, achievements };
  }

  async getLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    const db = requireDb();
    const result = await db.execute(sql`
      SELECT 
        u.id as user_id,
        u.username,
        u.avatar_url,
        u.total_points,
        u.whitelist_slots,
        COALESCE((SELECT COUNT(*) FROM dreams d WHERE d.user_id = u.id), 0) as dream_count,
        COALESCE((SELECT COUNT(*) FROM nft_assets n WHERE n.user_id = u.id AND n.status = 'minted'), 0) as nft_count
      FROM users u
      WHERE u.total_points > 0
      ORDER BY u.total_points DESC
      LIMIT ${limit}
    `);

    return (result.rows as any[]).map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      totalPoints: row.total_points || 0,
      whitelistSlots: row.whitelist_slots || 0,
      dreamCount: parseInt(row.dream_count) || 0,
      nftCount: parseInt(row.nft_count) || 0,
    }));
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = requireDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) return null;

    const [dreamCountResult] = await db.select({ count: count() })
      .from(dreams)
      .where(eq(dreams.userId, userId));

    const [dejavuCountResult] = await db.select({ count: count() })
      .from(dejavuEntries)
      .where(eq(dejavuEntries.userId, userId));

    const [nftCountResult] = await db.select({ count: count() })
      .from(nftAssets)
      .where(sql`${nftAssets.userId} = ${userId} AND ${nftAssets.status} = 'minted'`);

    const achievements = await db.select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
      .orderBy(desc(userAchievements.unlockedAt));

    const recentPoints = await db.select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .orderBy(desc(userPoints.earnedAt))
      .limit(10);

    return {
      ...user,
      dreamCount: dreamCountResult?.count || 0,
      dejavuCount: dejavuCountResult?.count || 0,
      nftCount: nftCountResult?.count || 0,
      achievements,
      recentPoints,
    };
  }

  async getUserAchievements(userId: string): Promise<{ unlocked: AchievementId[]; locked: AchievementId[] }> {
    const db = requireDb();
    const unlockedRecords = await db.select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    const unlocked = unlockedRecords.map(r => r.achievementId as AchievementId);
    const allAchievements = Object.keys(ACHIEVEMENT_DEFINITIONS) as AchievementId[];
    const locked = allAchievements.filter(a => !unlocked.includes(a));

    return { unlocked, locked };
  }

  async getUserPoints(userId: string, limit: number = 20): Promise<{ total: number; history: typeof userPoints.$inferSelect[] }> {
    const db = requireDb();
    const [user] = await db.select({ totalPoints: users.totalPoints })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const history = await db.select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .orderBy(desc(userPoints.earnedAt))
      .limit(limit);

    return {
      total: user?.totalPoints || 0,
      history,
    };
  }
}

export const gamificationService = new GamificationService();
