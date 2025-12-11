import { 
  type User, 
  type InsertUser, 
  type AnalyticsResult,
  type InsertAnalyticsResult,
  type AnalyticsHistory,
  type InsertAnalyticsHistory,
  type AnalyticsData,
  type AdvancedVisualizationData,
  type RunwayTask,
  type InsertRunwayTask,
  type Dream,
  type InsertDream,
  type DejavuEntry,
  type InsertDejavuEntry,
  type DreamMatch,
  type InsertDreamMatch,
  type DreamMetadata,
  type InsertDreamMetadata,
  type SocialVideo,
  type InsertSocialVideo,
  type EmbeddingJob,
  type InsertEmbeddingJob,
  type Feedback,
  type InsertFeedback,
  type NFTCandidate,
  type InsertNftCandidate,
  type DejavuVideoMatch,
  type InsertDejavuVideoMatch,
  type DashboardStatsV2,
  users,
  analyticsResults,
  analyticsHistory,
  runwayTasks,
  dreams,
  dejavuEntries,
  dreamMatches,
  dreamMetadata,
  socialVideos,
  embeddingJobs,
  feedback,
  nftCandidates,
  dejavuVideoMatches,
} from "@shared/schema";
import { getDb, isDatabaseAvailable } from "./db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  saveAnalyticsResult(datasetName: string, analytics: AnalyticsData, visualizations?: AdvancedVisualizationData): Promise<AnalyticsResult>;
  getLatestAnalyticsResult(datasetName: string): Promise<AnalyticsResult | undefined>;
  getAnalyticsHistory(limit?: number): Promise<AnalyticsHistory[]>;
  getAnalyticsHistoryByDataset(datasetName: string, limit?: number): Promise<AnalyticsHistory[]>;
  saveAnalyticsHistory(data: InsertAnalyticsHistory): Promise<AnalyticsHistory>;
  
  createRunwayTask(task: InsertRunwayTask): Promise<RunwayTask>;
  getRunwayTask(id: string): Promise<RunwayTask | undefined>;
  updateRunwayTask(id: string, updates: Partial<InsertRunwayTask>): Promise<RunwayTask | undefined>;
  getRunwayTasks(limit?: number): Promise<RunwayTask[]>;
  
  // Dream DejaVu methods
  createDream(dream: InsertDream & { embedding?: number[] }): Promise<Dream>;
  getDream(id: string): Promise<Dream | undefined>;
  getAllDreams(limit?: number): Promise<Dream[]>;
  updateDreamEmbedding(id: string, embedding: number[]): Promise<Dream | undefined>;
  deleteDream(id: string): Promise<boolean>;
  
  createDejavuEntry(entry: InsertDejavuEntry & { embedding?: number[] }): Promise<DejavuEntry>;
  getDejavuEntry(id: string): Promise<DejavuEntry | undefined>;
  getAllDejavuEntries(limit?: number): Promise<DejavuEntry[]>;
  updateDejavuEmbedding(id: string, embedding: number[]): Promise<DejavuEntry | undefined>;
  deleteDejavuEntry(id: string): Promise<boolean>;
  
  createDreamMatch(match: InsertDreamMatch): Promise<DreamMatch>;
  getDreamMatches(dreamId?: string, dejavuId?: string): Promise<DreamMatch[]>;
  getMatchesForDream(dreamId: string): Promise<DreamMatch[]>;
  getMatchesForDejavu(dejavuId: string): Promise<DreamMatch[]>;
  
  // Dream Metadata (Web3 extensions)
  createDreamMetadata(metadata: {
    dreamId: string;
    emotionProfile?: Record<string, number> | null;
    mainCharacters?: string[];
    locations?: string[];
    motifs?: string[];
    visualColor?: string | null;
    clarity?: string;
    dejavuIntensity?: number;
    rarityScore?: number;
  }): Promise<DreamMetadata>;
  getDreamMetadata(dreamId: string): Promise<DreamMetadata | undefined>;
  
  // v2.0 Social Videos
  createSocialVideo(video: InsertSocialVideo): Promise<SocialVideo>;
  getSocialVideo(id: string): Promise<SocialVideo | undefined>;
  getSocialVideoByPlatformId(platformVideoId: string): Promise<SocialVideo | undefined>;
  getAllSocialVideos(limit?: number, platform?: string): Promise<SocialVideo[]>;
  updateSocialVideoEmbedding(id: string, embedding: number[], detectedEmotions?: Record<string, number>): Promise<SocialVideo | undefined>;
  deleteSocialVideo(id: string): Promise<boolean>;
  
  // v2.0 Embedding Jobs
  createEmbeddingJob(job: InsertEmbeddingJob): Promise<EmbeddingJob>;
  getEmbeddingJob(id: string): Promise<EmbeddingJob | undefined>;
  getPendingEmbeddingJobs(limit?: number): Promise<EmbeddingJob[]>;
  updateEmbeddingJobStatus(id: string, status: string, result?: any, errorMessage?: string): Promise<EmbeddingJob | undefined>;
  
  // v2.0 Feedback (RLHF)
  createFeedback(fb: InsertFeedback): Promise<Feedback>;
  getFeedbackByType(feedbackType: string, limit?: number): Promise<Feedback[]>;
  getFeedbackStats(): Promise<{ positive: number; negative: number; total: number }>;
  
  // v2.0 NFT Candidates
  createNftCandidate(candidate: InsertNftCandidate): Promise<NFTCandidate>;
  getNftCandidate(id: string): Promise<NFTCandidate | undefined>;
  getTopNftCandidates(limit?: number): Promise<NFTCandidate[]>;
  updateNftCandidateStatus(id: string, status: string): Promise<NFTCandidate | undefined>;
  
  // v2.0 DejaVu Video Matches
  createDejavuVideoMatch(match: InsertDejavuVideoMatch): Promise<DejavuVideoMatch>;
  getDejavuVideoMatchesForDream(dreamId: string): Promise<DejavuVideoMatch[]>;
  
  // v2.0 Dashboard Stats
  getDashboardStatsV2(): Promise<DashboardStatsV2>;
}

export class DatabaseStorage implements IStorage {
  private ensureDb() {
    const db = getDb();
    if (!db) {
      throw new Error("Database not available - DATABASE_URL may not be configured");
    }
    return db;
  }

  async getUser(id: string): Promise<User | undefined> {
    const db = this.ensureDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = this.ensureDb();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [user] = await db.insert(users).values({ ...insertUser, id }).returning();
    return user;
  }

  async saveAnalyticsResult(
    datasetName: string, 
    analytics: AnalyticsData, 
    visualizations?: AdvancedVisualizationData
  ): Promise<AnalyticsResult> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(analyticsResults).values({
      id,
      datasetName,
      totalRecords: analytics.totalRecords,
      totalViews: analytics.totalViews,
      totalLikes: analytics.totalLikes,
      totalComments: analytics.totalComments,
      totalShares: analytics.totalShares,
      avgEngagementRate: analytics.avgEngagementRate,
      sentimentBreakdown: analytics.sentimentBreakdown,
      topHashtags: analytics.topHashtags,
      topCreators: analytics.topCreators,
      topEmojis: analytics.topEmojis,
      categoryBreakdown: analytics.categoryBreakdown,
      activeHours: analytics.activeHours,
      visualizationData: visualizations || null,
    }).returning();
    
    return result;
  }

  async getLatestAnalyticsResult(datasetName: string): Promise<AnalyticsResult | undefined> {
    const db = this.ensureDb();
    const [result] = await db
      .select()
      .from(analyticsResults)
      .where(eq(analyticsResults.datasetName, datasetName))
      .orderBy(desc(analyticsResults.createdAt))
      .limit(1);
    return result;
  }

  async getAnalyticsHistory(limit = 50): Promise<AnalyticsHistory[]> {
    const db = this.ensureDb();
    return db
      .select()
      .from(analyticsHistory)
      .orderBy(desc(analyticsHistory.createdAt))
      .limit(limit);
  }

  async getAnalyticsHistoryByDataset(datasetName: string, limit = 20): Promise<AnalyticsHistory[]> {
    const db = this.ensureDb();
    return db
      .select()
      .from(analyticsHistory)
      .where(eq(analyticsHistory.datasetName, datasetName))
      .orderBy(desc(analyticsHistory.createdAt))
      .limit(limit);
  }

  async saveAnalyticsHistory(data: InsertAnalyticsHistory): Promise<AnalyticsHistory> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(analyticsHistory).values({ ...data, id }).returning();
    return result;
  }

  async createRunwayTask(task: InsertRunwayTask): Promise<RunwayTask> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(runwayTasks).values({ ...task, id }).returning();
    return result;
  }

  async getRunwayTask(id: string): Promise<RunwayTask | undefined> {
    const db = this.ensureDb();
    const [task] = await db.select().from(runwayTasks).where(eq(runwayTasks.id, id));
    return task;
  }

  async updateRunwayTask(id: string, updates: Partial<InsertRunwayTask>): Promise<RunwayTask | undefined> {
    const db = this.ensureDb();
    const existingTask = await this.getRunwayTask(id);
    if (!existingTask) {
      return undefined;
    }
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    if (Object.keys(filteredUpdates).length === 0) {
      return existingTask;
    }
    const [result] = await db
      .update(runwayTasks)
      .set(filteredUpdates)
      .where(eq(runwayTasks.id, id))
      .returning();
    return result;
  }

  async getRunwayTasks(limit = 20): Promise<RunwayTask[]> {
    const db = this.ensureDb();
    return db
      .select()
      .from(runwayTasks)
      .orderBy(desc(runwayTasks.createdAt))
      .limit(limit);
  }

  // Dream DejaVu Methods
  async createDream(dreamData: InsertDream & { embedding?: number[] }): Promise<Dream> {
    const db = this.ensureDb();
    const id = randomUUID();
    const dreamDate = typeof dreamData.dreamDate === 'string' 
      ? new Date(dreamData.dreamDate) 
      : dreamData.dreamDate;
    
    const themesArray = Array.isArray(dreamData.themes) 
      ? [...dreamData.themes] as string[]
      : [] as string[];
    const objectsArray = Array.isArray(dreamData.objects)
      ? [...dreamData.objects] as string[]
      : [] as string[];
    
    const insertValue: typeof dreams.$inferInsert = {
      id,
      userId: dreamData.userId ?? null,
      title: dreamData.title,
      description: dreamData.description,
      location: dreamData.location,
      emotion: dreamData.emotion,
      themes: themesArray,
      objects: objectsArray,
      intensity: dreamData.intensity ?? 5,
      dreamDate,
      embedding: dreamData.embedding ?? null,
    };
    
    const [result] = await db.insert(dreams).values(insertValue).returning();
    return result;
  }

  async getDream(id: string): Promise<Dream | undefined> {
    const db = this.ensureDb();
    const [dream] = await db.select().from(dreams).where(eq(dreams.id, id));
    return dream;
  }

  async getAllDreams(limit = 50): Promise<Dream[]> {
    const db = this.ensureDb();
    return db
      .select()
      .from(dreams)
      .orderBy(desc(dreams.createdAt))
      .limit(limit);
  }

  async updateDreamEmbedding(id: string, embedding: number[]): Promise<Dream | undefined> {
    const db = this.ensureDb();
    const [result] = await db
      .update(dreams)
      .set({ embedding })
      .where(eq(dreams.id, id))
      .returning();
    return result;
  }

  async deleteDream(id: string): Promise<boolean> {
    const db = this.ensureDb();
    const result = await db.delete(dreams).where(eq(dreams.id, id));
    return true;
  }

  async createDejavuEntry(entryData: InsertDejavuEntry & { embedding?: number[] }): Promise<DejavuEntry> {
    const db = this.ensureDb();
    const id = randomUUID();
    const entryDate = typeof entryData.entryDate === 'string' 
      ? new Date(entryData.entryDate) 
      : entryData.entryDate;
    
    const insertValue: typeof dejavuEntries.$inferInsert = {
      id,
      userId: entryData.userId ?? null,
      description: entryData.description,
      location: entryData.location,
      emotion: entryData.emotion,
      familiarity: entryData.familiarity ?? 5,
      triggerContext: entryData.triggerContext ?? null,
      entryDate,
      embedding: entryData.embedding ?? null,
    };
    
    const [result] = await db.insert(dejavuEntries).values(insertValue).returning();
    return result;
  }

  async getDejavuEntry(id: string): Promise<DejavuEntry | undefined> {
    const db = this.ensureDb();
    const [entry] = await db.select().from(dejavuEntries).where(eq(dejavuEntries.id, id));
    return entry;
  }

  async getAllDejavuEntries(limit = 50): Promise<DejavuEntry[]> {
    const db = this.ensureDb();
    return db
      .select()
      .from(dejavuEntries)
      .orderBy(desc(dejavuEntries.createdAt))
      .limit(limit);
  }

  async updateDejavuEmbedding(id: string, embedding: number[]): Promise<DejavuEntry | undefined> {
    const db = this.ensureDb();
    const [result] = await db
      .update(dejavuEntries)
      .set({ embedding })
      .where(eq(dejavuEntries.id, id))
      .returning();
    return result;
  }

  async deleteDejavuEntry(id: string): Promise<boolean> {
    const db = this.ensureDb();
    await db.delete(dejavuEntries).where(eq(dejavuEntries.id, id));
    return true;
  }

  async createDreamMatch(match: InsertDreamMatch): Promise<DreamMatch> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(dreamMatches).values({ ...match, id }).returning();
    return result;
  }

  async getDreamMatches(dreamId?: string, dejavuId?: string): Promise<DreamMatch[]> {
    const db = this.ensureDb();
    let query = db.select().from(dreamMatches);
    
    if (dreamId) {
      return db.select().from(dreamMatches)
        .where(eq(dreamMatches.dreamId, dreamId))
        .orderBy(desc(dreamMatches.similarityScore));
    }
    
    if (dejavuId) {
      return db.select().from(dreamMatches)
        .where(eq(dreamMatches.dejavuId, dejavuId))
        .orderBy(desc(dreamMatches.similarityScore));
    }
    
    return db.select().from(dreamMatches)
      .orderBy(desc(dreamMatches.createdAt))
      .limit(100);
  }

  async getMatchesForDream(dreamId: string): Promise<DreamMatch[]> {
    const db = this.ensureDb();
    return db.select().from(dreamMatches)
      .where(eq(dreamMatches.dreamId, dreamId))
      .orderBy(desc(dreamMatches.similarityScore));
  }

  async getMatchesForDejavu(dejavuId: string): Promise<DreamMatch[]> {
    const db = this.ensureDb();
    return db.select().from(dreamMatches)
      .where(eq(dreamMatches.dejavuId, dejavuId))
      .orderBy(desc(dreamMatches.similarityScore));
  }

  async createDreamMetadata(metadata: {
    dreamId: string;
    emotionProfile?: Record<string, number> | null;
    mainCharacters?: string[];
    locations?: string[];
    motifs?: string[];
    visualColor?: string | null;
    clarity?: string;
    dejavuIntensity?: number;
    rarityScore?: number;
  }): Promise<DreamMetadata> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(dreamMetadata).values({
      id,
      dreamId: metadata.dreamId,
      emotionProfile: metadata.emotionProfile || null,
      mainCharacters: metadata.mainCharacters || [],
      locations: metadata.locations || [],
      motifs: metadata.motifs || [],
      visualColor: metadata.visualColor || null,
      clarity: metadata.clarity || 'medium',
      dejavuIntensity: metadata.dejavuIntensity || 0,
      rarityScore: metadata.rarityScore || 0,
    }).returning();
    return result;
  }

  async getDreamMetadata(dreamId: string): Promise<DreamMetadata | undefined> {
    const db = this.ensureDb();
    const [result] = await db.select().from(dreamMetadata)
      .where(eq(dreamMetadata.dreamId, dreamId));
    return result;
  }

  // =============================================
  // v2.0 Social Videos Methods
  // =============================================
  
  async createSocialVideo(video: InsertSocialVideo): Promise<SocialVideo> {
    const db = this.ensureDb();
    const id = randomUUID();
    const hashtagsArray: string[] = Array.isArray(video.hashtags) 
      ? [...video.hashtags] as string[]
      : [];
    const embeddingArray: number[] | null = Array.isArray(video.emotionEmbedding)
      ? [...video.emotionEmbedding] as number[]
      : null;
    
    const insertValue: typeof socialVideos.$inferInsert = {
      id,
      platform: video.platform,
      platformVideoId: video.platformVideoId,
      caption: video.caption ?? null,
      hashtags: hashtagsArray,
      soundId: video.soundId ?? null,
      videoUrl: video.videoUrl ?? null,
      thumbnailUrl: video.thumbnailUrl ?? null,
      emotionEmbedding: embeddingArray,
      detectedEmotions: video.detectedEmotions ?? null,
      viewCount: video.viewCount ?? 0,
      likeCount: video.likeCount ?? 0,
      commentCount: video.commentCount ?? 0,
      shareCount: video.shareCount ?? 0,
      engagementRate: video.engagementRate ?? 0,
      stats: video.stats ?? null,
      nftStatus: video.nftStatus ?? 'none',
      nftRarityScore: video.nftRarityScore ?? 0,
      relatedDreamId: video.relatedDreamId ?? null,
      metadata: video.metadata ?? null,
      creatorUsername: video.creatorUsername ?? null,
      creatorId: video.creatorId ?? null,
    };
    const [result] = await db.insert(socialVideos).values(insertValue).returning();
    return result;
  }

  async getSocialVideo(id: string): Promise<SocialVideo | undefined> {
    const db = this.ensureDb();
    const [video] = await db.select().from(socialVideos).where(eq(socialVideos.id, id));
    return video;
  }

  async getSocialVideoByPlatformId(platformVideoId: string): Promise<SocialVideo | undefined> {
    const db = this.ensureDb();
    const [video] = await db.select().from(socialVideos)
      .where(eq(socialVideos.platformVideoId, platformVideoId));
    return video;
  }

  async getAllSocialVideos(limit = 50, platform?: string): Promise<SocialVideo[]> {
    const db = this.ensureDb();
    if (platform) {
      return db.select().from(socialVideos)
        .where(eq(socialVideos.platform, platform))
        .orderBy(desc(socialVideos.createdAt))
        .limit(limit);
    }
    return db.select().from(socialVideos)
      .orderBy(desc(socialVideos.createdAt))
      .limit(limit);
  }

  async updateSocialVideoEmbedding(
    id: string, 
    embedding: number[], 
    detectedEmotions?: Record<string, number>
  ): Promise<SocialVideo | undefined> {
    const db = this.ensureDb();
    const updateData: any = { emotionEmbedding: embedding };
    if (detectedEmotions) {
      updateData.detectedEmotions = detectedEmotions;
    }
    const [result] = await db.update(socialVideos)
      .set(updateData)
      .where(eq(socialVideos.id, id))
      .returning();
    return result;
  }

  async deleteSocialVideo(id: string): Promise<boolean> {
    const db = this.ensureDb();
    await db.delete(socialVideos).where(eq(socialVideos.id, id));
    return true;
  }

  // =============================================
  // v2.0 Embedding Jobs Methods
  // =============================================
  
  async createEmbeddingJob(job: InsertEmbeddingJob): Promise<EmbeddingJob> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(embeddingJobs).values({ ...job, id }).returning();
    return result;
  }

  async getEmbeddingJob(id: string): Promise<EmbeddingJob | undefined> {
    const db = this.ensureDb();
    const [job] = await db.select().from(embeddingJobs).where(eq(embeddingJobs.id, id));
    return job;
  }

  async getPendingEmbeddingJobs(limit = 50): Promise<EmbeddingJob[]> {
    const db = this.ensureDb();
    return db.select().from(embeddingJobs)
      .where(eq(embeddingJobs.status, 'pending'))
      .orderBy(desc(embeddingJobs.priority), embeddingJobs.createdAt)
      .limit(limit);
  }

  async updateEmbeddingJobStatus(
    id: string, 
    status: string, 
    result?: any, 
    errorMessage?: string
  ): Promise<EmbeddingJob | undefined> {
    const db = this.ensureDb();
    const updateData: any = { status };
    if (result !== undefined) updateData.result = result;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (status === 'processing') updateData.startedAt = new Date();
    if (status === 'completed' || status === 'failed') updateData.completedAt = new Date();
    
    const [updated] = await db.update(embeddingJobs)
      .set(updateData)
      .where(eq(embeddingJobs.id, id))
      .returning();
    return updated;
  }

  // =============================================
  // v2.0 Feedback (RLHF) Methods
  // =============================================
  
  async createFeedback(fb: InsertFeedback): Promise<Feedback> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(feedback).values({ ...fb, id }).returning();
    return result;
  }

  async getFeedbackByType(feedbackType: string, limit = 50): Promise<Feedback[]> {
    const db = this.ensureDb();
    return db.select().from(feedback)
      .where(eq(feedback.feedbackType, feedbackType))
      .orderBy(desc(feedback.createdAt))
      .limit(limit);
  }

  async getFeedbackStats(): Promise<{ positive: number; negative: number; total: number }> {
    const db = this.ensureDb();
    const positiveResult = await db.select({ count: count() }).from(feedback)
      .where(eq(feedback.vote, 1));
    const negativeResult = await db.select({ count: count() }).from(feedback)
      .where(eq(feedback.vote, 0));
    
    const positive = positiveResult[0]?.count || 0;
    const negative = negativeResult[0]?.count || 0;
    
    return {
      positive,
      negative,
      total: positive + negative
    };
  }

  // =============================================
  // v2.0 NFT Candidates Methods
  // =============================================
  
  async createNftCandidate(candidate: InsertNftCandidate): Promise<NFTCandidate> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(nftCandidates).values({ ...candidate, id }).returning();
    return result;
  }

  async getNftCandidate(id: string): Promise<NFTCandidate | undefined> {
    const db = this.ensureDb();
    const [candidate] = await db.select().from(nftCandidates).where(eq(nftCandidates.id, id));
    return candidate;
  }

  async getTopNftCandidates(limit = 50): Promise<NFTCandidate[]> {
    const db = this.ensureDb();
    return db.select().from(nftCandidates)
      .where(eq(nftCandidates.nftStatus, 'candidate'))
      .orderBy(desc(nftCandidates.finalScore))
      .limit(limit);
  }

  async updateNftCandidateStatus(id: string, status: string): Promise<NFTCandidate | undefined> {
    const db = this.ensureDb();
    const updateData: any = { nftStatus: status };
    if (status === 'approved') updateData.approvedAt = new Date();
    if (status === 'minted') updateData.mintedAt = new Date();
    
    const [result] = await db.update(nftCandidates)
      .set(updateData)
      .where(eq(nftCandidates.id, id))
      .returning();
    return result;
  }

  // =============================================
  // v2.0 DejaVu Video Matches Methods
  // =============================================
  
  async createDejavuVideoMatch(match: InsertDejavuVideoMatch): Promise<DejavuVideoMatch> {
    const db = this.ensureDb();
    const id = randomUUID();
    const [result] = await db.insert(dejavuVideoMatches).values({ ...match, id }).returning();
    return result;
  }

  async getDejavuVideoMatchesForDream(dreamId: string): Promise<DejavuVideoMatch[]> {
    const db = this.ensureDb();
    return db.select().from(dejavuVideoMatches)
      .where(eq(dejavuVideoMatches.dreamId, dreamId))
      .orderBy(desc(dejavuVideoMatches.dejavuProbability));
  }

  // =============================================
  // v2.0 Dashboard Stats
  // =============================================
  
  async getDashboardStatsV2(): Promise<DashboardStatsV2> {
    const db = this.ensureDb();
    
    // Total dreams
    const dreamsResult = await db.select({ count: count() }).from(dreams);
    const totalDreams = dreamsResult[0]?.count || 0;
    
    // DreamBank vs User dreams
    const dreamBankResult = await db.select({ count: count() }).from(dreams)
      .where(eq(dreams.source, 'dreambank'));
    const dreamBankCount = dreamBankResult[0]?.count || 0;
    
    const userDreamsResult = await db.select({ count: count() }).from(dreams)
      .where(eq(dreams.source, 'user'));
    const userDreamsCount = userDreamsResult[0]?.count || 0;
    
    // Social Videos
    const videosResult = await db.select({ count: count() }).from(socialVideos);
    const totalVideos = videosResult[0]?.count || 0;
    
    const tiktokResult = await db.select({ count: count() }).from(socialVideos)
      .where(eq(socialVideos.platform, 'tiktok'));
    const tiktokCount = tiktokResult[0]?.count || 0;
    
    const instagramResult = await db.select({ count: count() }).from(socialVideos)
      .where(eq(socialVideos.platform, 'instagram'));
    const instagramCount = instagramResult[0]?.count || 0;
    
    // Embedding Jobs
    const pendingJobsResult = await db.select({ count: count() }).from(embeddingJobs)
      .where(eq(embeddingJobs.status, 'pending'));
    const pendingJobs = pendingJobsResult[0]?.count || 0;
    
    const completedJobsResult = await db.select({ count: count() }).from(embeddingJobs)
      .where(eq(embeddingJobs.status, 'completed'));
    const completedJobs = completedJobsResult[0]?.count || 0;
    
    // NFT Candidates
    const nftCandidatesResult = await db.select({ count: count() }).from(nftCandidates);
    const nftCandidatesCount = nftCandidatesResult[0]?.count || 0;
    
    // Feedback
    const feedbackResult = await db.select({ count: count() }).from(feedback);
    const feedbackCount = feedbackResult[0]?.count || 0;
    
    // DejaVu Matches
    const dejavuMatchesResult = await db.select({ count: count() }).from(dejavuVideoMatches);
    const dejavuMatchesCount = dejavuMatchesResult[0]?.count || 0;
    
    return {
      dreams: totalDreams,
      dreambank: dreamBankCount,
      userDreams: userDreamsCount,
      socialVideos: totalVideos,
      tiktokVideos: tiktokCount,
      instagramVideos: instagramCount,
      pendingEmbeddings: pendingJobs,
      completedEmbeddings: completedJobs,
      nftCandidates: nftCandidatesCount,
      feedbackCount,
      dejavuMatches: dejavuMatchesCount
    };
  }
}

export const storage = new DatabaseStorage();
