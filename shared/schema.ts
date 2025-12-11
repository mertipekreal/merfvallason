import { pgTable, text, varchar, integer, real, timestamp, jsonb, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Enhanced for Web3 and Gamification
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  walletAddress: varchar("wallet_address", { length: 42 }),
  avatarUrl: text("avatar_url"),
  totalPoints: integer("total_points").notNull().default(0),
  whitelistSlots: integer("whitelist_slots").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// =============================================
// GAMIFICATION SYSTEM
// =============================================

// User Points History
export const userPoints = pgTable("user_points", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

export const insertUserPointsSchema = createInsertSchema(userPoints).omit({
  id: true,
  earnedAt: true,
});

export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;
export type UserPoints = typeof userPoints.$inferSelect;

// User Achievements
export const ACHIEVEMENT_IDS = [
  'first_dream', 'ten_dreams', 'hundred_dreams', 'dream_collector',
  'social_butterfly', 'nft_owner', 'first_mint', 'rare_dreamer',
  'dejavu_master', 'emotion_explorer'
] as const;
export type AchievementId = typeof ACHIEVEMENT_IDS[number];

export const userAchievements = pgTable("user_achievements", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  achievementId: text("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  unlockedAt: true,
});

export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, { name: string; description: string; points: number; icon: string }> = {
  first_dream: { name: 'İlk Rüya', description: 'İlk rüyanı kaydettin', points: 10, icon: '🌙' },
  ten_dreams: { name: 'Rüya Koleksiyoncusu', description: '10 rüya kaydettin', points: 50, icon: '✨' },
  hundred_dreams: { name: 'Rüya Ustası', description: '100 rüya kaydettin', points: 200, icon: '🏆' },
  dream_collector: { name: 'Düş Toplayıcı', description: '25 rüya kaydettin', points: 100, icon: '📚' },
  social_butterfly: { name: 'Sosyal Kelebek', description: 'Rüyalarını paylaştın', points: 75, icon: '🦋' },
  nft_owner: { name: 'NFT Sahibi', description: 'İlk NFT\'ini mint ettin', points: 150, icon: '🎨' },
  first_mint: { name: 'İlk Mint', description: 'Rüya NFT\'i oluşturdun', points: 100, icon: '⛓️' },
  rare_dreamer: { name: 'Nadir Düşçü', description: 'Yüksek nadirlk skorlu rüya', points: 125, icon: '💎' },
  dejavu_master: { name: 'DejaVu Ustası', description: '10 dejavu kaydı oluşturdun', points: 75, icon: '🔮' },
  emotion_explorer: { name: 'Duygu Kaşifi', description: '6 farklı duyguyu keşfettin', points: 60, icon: '🎭' },
};

// Platform types for data uploads
export const PLATFORM_TYPES = ['tiktok', 'instagram', 'linkedin', 'spotify', 'phone_conversations'] as const;
export type PlatformType = typeof PLATFORM_TYPES[number];

// Uploaded Datasets table
export const uploadedDatasets = pgTable("uploaded_datasets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // 'tiktok', 'instagram', 'linkedin', 'spotify', 'phone_conversations'
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  recordCount: integer("record_count").notNull().default(0),
  status: text("status").notNull().default("processing"), // 'processing', 'ready', 'error'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUploadedDatasetSchema = createInsertSchema(uploadedDatasets).omit({
  id: true,
  createdAt: true,
});

export type InsertUploadedDataset = z.infer<typeof insertUploadedDatasetSchema>;
export type UploadedDataset = typeof uploadedDatasets.$inferSelect;

// Legacy Datasets table (kept for compatibility)
export const datasets = pgTable("datasets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'tiktok_json', 'tiktok_csv', 'phone_conversations'
  recordCount: integer("record_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  createdAt: true,
});

export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasets.$inferSelect;

// Analytics Results table
export const analyticsResults = pgTable("analytics_results", {
  id: varchar("id", { length: 36 }).primaryKey(),
  datasetName: text("dataset_name").notNull(),
  totalRecords: integer("total_records").notNull().default(0),
  totalViews: integer("total_views").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  totalShares: integer("total_shares").notNull().default(0),
  avgEngagementRate: real("avg_engagement_rate").notNull().default(0),
  sentimentBreakdown: jsonb("sentiment_breakdown"),
  topHashtags: jsonb("top_hashtags"),
  topCreators: jsonb("top_creators"),
  topEmojis: jsonb("top_emojis"),
  categoryBreakdown: jsonb("category_breakdown"),
  activeHours: jsonb("active_hours"),
  visualizationData: jsonb("visualization_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics History table - stores run history
export const analyticsHistory = pgTable("analytics_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  datasetName: text("dataset_name").notNull(),
  analysisType: text("analysis_type").notNull(), // 'full', 'sentiment', 'trends', 'comparison'
  summary: jsonb("summary"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalyticsHistorySchema = createInsertSchema(analyticsHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalyticsHistory = z.infer<typeof insertAnalyticsHistorySchema>;
export type AnalyticsHistory = typeof analyticsHistory.$inferSelect;

export const insertAnalyticsResultSchema = createInsertSchema(analyticsResults).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalyticsResult = z.infer<typeof insertAnalyticsResultSchema>;
export type AnalyticsResult = typeof analyticsResults.$inferSelect;

// TypeScript interfaces for frontend
export interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
}

export interface HashtagData {
  hashtag: string;
  count: number;
}

export interface CreatorData {
  username: string;
  videoCount: number;
  totalViews: number;
}

export interface EmojiData {
  emoji: string;
  count: number;
}

export interface CategoryData {
  category: string;
  count: number;
}

export interface HourData {
  hour: number;
  count: number;
}

export interface AnalyticsData {
  datasetName: string;
  totalRecords: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
  sentimentBreakdown: SentimentBreakdown;
  topHashtags: HashtagData[];
  topCreators: CreatorData[];
  topEmojis: EmojiData[];
  categoryBreakdown: CategoryData[];
  activeHours: HourData[];
}

export interface TrendingItem {
  id: string;
  title: string;
  views: number;
  likes: number;
  trendScore: number;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface TrendsData {
  datasetName: string;
  trendingContent: TrendingItem[];
  trendingHashtags: HashtagData[];
  trendingCategories: CategoryData[];
  overallSentiment: 'positive' | 'negative' | 'neutral';
}

export interface ComparisonMetric {
  dataset1Value: number;
  dataset2Value: number;
  difference: number;
  percentageChange: number;
}

export interface ComparisonData {
  dataset1Name: string;
  dataset2Name: string;
  totalRecords: ComparisonMetric;
  totalViews: ComparisonMetric;
  totalLikes: ComparisonMetric;
  engagementRate: ComparisonMetric;
  dataset1Sentiment: SentimentBreakdown;
  dataset2Sentiment: SentimentBreakdown;
  dataset1TopHashtags: HashtagData[];
  dataset2TopHashtags: HashtagData[];
  dataset1TopCategories: CategoryData[];
  dataset2TopCategories: CategoryData[];
}

// Creative Core Types
export interface StoryElement {
  id: string;
  title: string;
  description: string;
  emotionalTone: 'happy' | 'sad' | 'exciting' | 'mysterious' | 'romantic';
  keyMoments: string[];
}

export interface Character {
  id: string;
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'background';
  personality: string[];
  emotionalProfile: SentimentBreakdown;
}

export interface WorldSetting {
  id: string;
  name: string;
  theme: string;
  mood: 'bright' | 'dark' | 'neutral' | 'vibrant';
  elements: string[];
}

export interface DreamAsset {
  id: string;
  type: 'visual' | 'audio' | 'text';
  name: string;
  description: string;
  emotionalImpact: number;
}

// Phone Conversation Analysis Types
export interface PhoneConversation {
  id: string;
  participants: string[];
  duration: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  emotionScore: number;
  keywords: string[];
  timestamp: string;
}

// Advanced Visualization Types
export interface EngagementTrendPoint {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
}

export interface HeatmapCell {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  value: number;
  label: string;
}

export interface SentimentTrendPoint {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export interface AdvancedVisualizationData {
  engagementTrends: EngagementTrendPoint[];
  activityHeatmap: HeatmapCell[];
  sentimentTrends: SentimentTrendPoint[];
}

export interface EmotionAnalysis {
  conversationId: string;
  primaryEmotion: string;
  secondaryEmotions: string[];
  confidenceScore: number;
  sentimentScore: number;
  toneAnalysis: {
    formal: number;
    casual: number;
    urgent: number;
    friendly: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface DatasetListItem {
  id: string;
  name: string;
  displayName: string;
  type: string;
  recordCount: number;
}

// Export request schemas
export const analyticsRequestSchema = z.object({
  datasetName: z.string().min(1),
});

export const trendsRequestSchema = z.object({
  datasetName: z.string().min(1),
  limit: z.number().optional().default(10),
});

export const compareRequestSchema = z.object({
  dataset1: z.string().min(1),
  dataset2: z.string().min(1),
});

export const exportRequestSchema = z.object({
  datasetName: z.string().min(1),
  format: z.enum(['json', 'csv']).default('json'),
});

export const sentimentAnalysisSchema = z.object({
  text: z.string().min(1),
  language: z.enum(['en', 'tr']).optional().default('en'),
});

export const briefRequestSchema = z.object({
  keywords: z.string().min(1, "Anahtar kelimeler gerekli"),
  contentType: z.enum(["video", "image", "text", "social"]).default("video"),
  platform: z.enum(["tiktok", "instagram", "youtube", "twitter", "general"]).default("tiktok"),
  tone: z.enum(["professional", "casual", "creative", "viral", "emotional"]).default("viral"),
  context: z.string().optional(),
});

export type AnalyticsRequest = z.infer<typeof analyticsRequestSchema>;
export type TrendsRequest = z.infer<typeof trendsRequestSchema>;
export type CompareRequest = z.infer<typeof compareRequestSchema>;
export type ExportRequest = z.infer<typeof exportRequestSchema>;
export type SentimentAnalysisRequest = z.infer<typeof sentimentAnalysisSchema>;
export type BriefRequest = z.infer<typeof briefRequestSchema>;

// Runway Content Optimizer Types
export const RUNWAY_TASK_TYPES = ['text_to_video', 'image_to_video', 'text_to_image'] as const;
export type RunwayTaskType = typeof RUNWAY_TASK_TYPES[number];

export const RUNWAY_TASK_STATUS = ['pending', 'processing', 'completed', 'failed'] as const;
export type RunwayTaskStatus = typeof RUNWAY_TASK_STATUS[number];

export const TARGET_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'twitter', 'linkedin'] as const;
export type TargetPlatform = typeof TARGET_PLATFORMS[number];

export const runwayTasks = pgTable("runway_tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  taskType: text("task_type").notNull(), // 'text_to_video', 'image_to_video', 'text_to_image'
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
  runwayTaskId: text("runway_task_id"), // ID from Runway API
  promptText: text("prompt_text"),
  inputImageUrl: text("input_image_url"),
  inputVideoUrl: text("input_video_url"),
  outputUrl: text("output_url"),
  targetPlatform: text("target_platform"), // 'tiktok', 'instagram', 'youtube', etc.
  optimizationSettings: jsonb("optimization_settings"),
  errorMessage: text("error_message"),
  progressPercent: integer("progress_percent").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertRunwayTaskSchema = createInsertSchema(runwayTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertRunwayTask = z.infer<typeof insertRunwayTaskSchema>;
export type RunwayTask = typeof runwayTasks.$inferSelect;

// Runway API Request Schemas
export const createRunwayTaskSchema = z.object({
  taskType: z.enum(RUNWAY_TASK_TYPES),
  promptText: z.string().optional(),
  targetPlatform: z.enum(TARGET_PLATFORMS).optional().default('tiktok'),
  duration: z.number().min(2).max(10).optional().default(5),
  ratio: z.string().optional().default('1280:720'),
});

export type CreateRunwayTaskRequest = z.infer<typeof createRunwayTaskSchema>;

// Platform optimization presets
export const PLATFORM_PRESETS: Record<TargetPlatform, { ratio: string; duration: number; style: string }> = {
  tiktok: { ratio: '1080:1920', duration: 5, style: 'vertical, trendy, fast-paced' },
  instagram: { ratio: '1080:1080', duration: 5, style: 'square, aesthetic, clean' },
  youtube: { ratio: '1920:1080', duration: 8, style: 'horizontal, cinematic, professional' },
  twitter: { ratio: '1280:720', duration: 4, style: 'horizontal, attention-grabbing' },
  linkedin: { ratio: '1920:1080', duration: 6, style: 'professional, business-oriented' },
};

// Weekly Scraping System
export const SCRAPE_RUN_STATUS = ['pending', 'running', 'completed', 'failed'] as const;
export type ScrapeRunStatus = typeof SCRAPE_RUN_STATUS[number];

export const scrapeRuns = pgTable("scrape_runs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  weekNumber: text("week_number").notNull(), // Format: 'YYYY-Www' (e.g., '2025-W49')
  platform: text("platform").notNull(), // 'tiktok', 'instagram'
  region: text("region").notNull(), // 'turkey', 'global', 'mixed'
  status: text("status").notNull().default("pending"),
  targetCount: integer("target_count").notNull().default(17500), // 2500 * 7 days
  actualCount: integer("actual_count").notNull().default(0),
  turkeyCount: integer("turkey_count").notNull().default(0),
  globalCount: integer("global_count").notNull().default(0),
  datasetIds: jsonb("dataset_ids"), // Array of Apify dataset IDs
  stats: jsonb("stats"), // Aggregated statistics
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScrapeRunSchema = createInsertSchema(scrapeRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertScrapeRun = z.infer<typeof insertScrapeRunSchema>;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;

// Weekly Content Insights
export const weeklyInsights = pgTable("weekly_insights", {
  id: varchar("id", { length: 36 }).primaryKey(),
  weekNumber: text("week_number").notNull(), // Format: 'YYYY-Www'
  platform: text("platform").notNull(),
  totalVideos: integer("total_videos").notNull().default(0),
  totalViews: integer("total_views").notNull().default(0),
  totalLikes: integer("total_likes").notNull().default(0),
  totalComments: integer("total_comments").notNull().default(0),
  totalShares: integer("total_shares").notNull().default(0),
  avgEngagementRate: real("avg_engagement_rate").notNull().default(0),
  sentimentBreakdown: jsonb("sentiment_breakdown"),
  topHashtags: jsonb("top_hashtags"),
  topCreators: jsonb("top_creators"),
  trendingContent: jsonb("trending_content"),
  regionBreakdown: jsonb("region_breakdown"), // Turkey vs Global stats
  dailyStats: jsonb("daily_stats"), // Per-day breakdown
  weekOverWeekChange: jsonb("week_over_week_change"), // Comparison with previous week
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWeeklyInsightsSchema = createInsertSchema(weeklyInsights).omit({
  id: true,
  createdAt: true,
});

export type InsertWeeklyInsights = z.infer<typeof insertWeeklyInsightsSchema>;
export type WeeklyInsights = typeof weeklyInsights.$inferSelect;

// Weekly Insights TypeScript interfaces
export interface WeeklyRegionBreakdown {
  turkey: {
    count: number;
    views: number;
    engagement: number;
  };
  global: {
    count: number;
    views: number;
    engagement: number;
  };
}

export interface DailyStats {
  date: string;
  count: number;
  views: number;
  likes: number;
  engagement: number;
}

export interface WeekOverWeekChange {
  videos: { current: number; previous: number; change: number };
  views: { current: number; previous: number; change: number };
  engagement: { current: number; previous: number; change: number };
  sentiment: { current: string; previous: string };
}

export interface WeeklyInsightsData {
  weekNumber: string;
  platform: string;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgEngagementRate: number;
  sentimentBreakdown: SentimentBreakdown;
  topHashtags: HashtagData[];
  topCreators: CreatorData[];
  trendingContent: TrendingItem[];
  regionBreakdown: WeeklyRegionBreakdown;
  dailyStats: DailyStats[];
  weekOverWeekChange?: WeekOverWeekChange;
}

// Spotify Insight Schemas
export const spotifyTrackInsightSchema = z.object({
  trackInput: z.string().min(1, "Şarkı ID veya linki gerekli"),
});

export const spotifyPlaylistFitSchema = z.object({
  trackInput: z.string().min(1, "Şarkı ID veya linki gerekli"),
  playlistInput: z.string().min(1, "Playlist ID veya linki gerekli"),
});

export const tiktokBridgeSchema = z.object({
  soundId: z.string().min(1, "TikTok ses ID gerekli"),
  trackInput: z.string().min(1, "Spotify şarkı ID veya linki gerekli"),
});

export const artistPlaylistsSchema = z.object({
  artistInput: z.string().min(1, "Sanatçı ID, link veya arama sorgusu gerekli"),
  useApify: z.boolean().optional().default(false),
});

export type SpotifyTrackInsightRequest = z.infer<typeof spotifyTrackInsightSchema>;
export type SpotifyPlaylistFitRequest = z.infer<typeof spotifyPlaylistFitSchema>;
export type TikTokBridgeRequest = z.infer<typeof tiktokBridgeSchema>;
export type ArtistPlaylistsRequest = z.infer<typeof artistPlaylistsSchema>;

// =============================================
// DREAM DEJAVU ANALYSIS ENGINE
// =============================================

// Emotion types for dreams and dejavu
export const DREAM_EMOTIONS = [
  'fear', 'joy', 'sadness', 'anxiety', 'calm', 'curiosity', 
  'confusion', 'excitement', 'nostalgia', 'wonder', 'dread'
] as const;
export type DreamEmotion = typeof DREAM_EMOTIONS[number];

// Location types
export const DREAM_LOCATIONS = [
  'corridor', 'room', 'street', 'forest', 'water', 'sky', 
  'building', 'home', 'school', 'unknown', 'vehicle', 'nature'
] as const;
export type DreamLocation = typeof DREAM_LOCATIONS[number];

// Theme types
export const DREAM_THEMES = [
  'running', 'searching', 'flying', 'falling', 'chasing', 
  'meeting', 'losing', 'discovering', 'escaping', 'transforming'
] as const;
export type DreamTheme = typeof DREAM_THEMES[number];

// Data sources for dreams
export const DREAM_SOURCES = ['user', 'dreambank', 'imported'] as const;
export type DreamSource = typeof DREAM_SOURCES[number];

// Dreams table
export const dreams = pgTable("dreams", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }), // Optional user association
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(), // DreamLocation
  emotion: text("emotion").notNull(), // DreamEmotion
  themes: jsonb("themes").$type<string[]>().default([]), // Array of DreamTheme
  objects: jsonb("objects").$type<string[]>().default([]), // Objects seen in dream
  intensity: integer("intensity").notNull().default(5), // 1-10 scale
  dreamDate: timestamp("dream_date").notNull(),
  embedding: jsonb("embedding").$type<number[]>(), // Hugging Face embedding vector
  // DreamBank fields
  source: text("source").notNull().default("user"), // 'user', 'dreambank', 'imported'
  externalId: varchar("external_id", { length: 100 }), // Original ID from DreamBank
  dreamerGender: varchar("dreamer_gender", { length: 10 }), // 'M', 'F', etc.
  dreamerAge: varchar("dreamer_age", { length: 20 }), // 'A' (adult), 'C' (child), etc.
  dreamerName: varchar("dreamer_name", { length: 100 }), // Series name from DreamBank
  hallVanDeCastle: jsonb("hall_van_de_castle").$type<{
    characters?: string;
    emotions?: string;
    aggressions?: string;
    friendliness?: string;
    sexuality?: string;
    misfortune?: string;
    goodFortune?: string;
  }>(), // Hall-Van de Castle coding
  rarityScore: integer("rarity_score").default(50), // 0-100 NFT rarity
  nftEligible: integer("nft_eligible").default(1), // Boolean as int for compatibility
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDreamSchema = createInsertSchema(dreams).omit({
  id: true,
  createdAt: true,
  embedding: true,
});

export type InsertDream = z.infer<typeof insertDreamSchema>;
export type Dream = typeof dreams.$inferSelect;

// DejaVu Entries table
export const dejavuEntries = pgTable("dejavu_entries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }), // Optional user association
  description: text("description").notNull(),
  location: text("location").notNull(), // Where it happened
  emotion: text("emotion").notNull(), // What was felt
  familiarity: integer("familiarity").notNull().default(5), // 1-10 scale
  triggerContext: text("trigger_context"), // What triggered the dejavu
  entryDate: timestamp("entry_date").notNull(),
  embedding: jsonb("embedding").$type<number[]>(), // Hugging Face embedding vector
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDejavuEntrySchema = createInsertSchema(dejavuEntries).omit({
  id: true,
  createdAt: true,
  embedding: true,
});

export type InsertDejavuEntry = z.infer<typeof insertDejavuEntrySchema>;
export type DejavuEntry = typeof dejavuEntries.$inferSelect;

// Dream Matches table - stores similarity results
export const MATCH_METHODS = ['embedding', 'cosine', 'hybrid'] as const;
export type MatchMethod = typeof MATCH_METHODS[number];

export const dreamMatches = pgTable("dream_matches", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dreamId: varchar("dream_id", { length: 36 }).notNull(),
  dejavuId: varchar("dejavu_id", { length: 36 }).notNull(),
  similarityScore: real("similarity_score").notNull(), // 0-1 scale
  matchMethod: text("match_method").notNull().default("embedding"), // MatchMethod
  analysisNotes: text("analysis_notes"), // AI-generated analysis
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDreamMatchSchema = createInsertSchema(dreamMatches).omit({
  id: true,
  createdAt: true,
});

export type InsertDreamMatch = z.infer<typeof insertDreamMatchSchema>;
export type DreamMatch = typeof dreamMatches.$inferSelect;

// API Request Schemas for Dream DejaVu
export const createDreamSchema = z.object({
  title: z.string().min(1, "Başlık gerekli"),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalı"),
  location: z.string().min(1, "Mekan gerekli"),
  emotion: z.string().min(1, "Duygu gerekli"),
  themes: z.array(z.string()).default([]),
  objects: z.array(z.string()).default([]),
  intensity: z.number().min(1).max(10).default(5),
  dreamDate: z.string().or(z.date()),
  emotionProfile: z.object({
    fear: z.number().min(0).max(100).default(0),
    wonder: z.number().min(0).max(100).default(0),
    peace: z.number().min(0).max(100).default(0),
    surprise: z.number().min(0).max(100).default(0),
    anticipation: z.number().min(0).max(100).default(0),
    trust: z.number().min(0).max(100).default(0),
  }).optional(),
  motifs: z.array(z.string()).default([]),
  visualColor: z.string().optional(),
  clarity: z.enum(['low', 'medium', 'high']).default('medium'),
  mainCharacters: z.array(z.string()).default([]),
});

export const createDejavuSchema = z.object({
  description: z.string().min(10, "Açıklama en az 10 karakter olmalı"),
  location: z.string().min(1, "Mekan gerekli"),
  emotion: z.string().min(1, "Duygu gerekli"),
  familiarity: z.number().min(1).max(10).default(5),
  triggerContext: z.string().optional(),
  entryDate: z.string().or(z.date()),
});

export const dreamMatchRequestSchema = z.object({
  dejavuId: z.string().optional(),
  dreamId: z.string().optional(),
  topN: z.number().min(1).max(20).default(5),
  minScore: z.number().min(0).max(1).default(0.3),
});

export type CreateDreamRequest = z.infer<typeof createDreamSchema>;
export type CreateDejavuRequest = z.infer<typeof createDejavuSchema>;
export type DreamMatchRequest = z.infer<typeof dreamMatchRequestSchema>;

// TypeScript interfaces for frontend
export interface DreamWithMatch extends Dream {
  matches?: DreamMatchResult[];
}

export interface DejavuWithMatch extends DejavuEntry {
  matches?: DreamMatchResult[];
}

export interface DreamMatchResult {
  matchId: string;
  dream: Dream;
  dejavu: DejavuEntry;
  similarityScore: number;
  matchMethod: MatchMethod;
  analysisNotes?: string;
}

export interface DreamAnalysis {
  dreamId: string;
  emotionalProfile: {
    primaryEmotion: string;
    emotionalIntensity: number;
    sentimentScore: number;
  };
  thematicPatterns: string[];
  symbolInterpretation: string;
  potentialMeaning: string;
  relatedDejavu: DreamMatchResult[];
}

// =============================================
// ENHANCED DREAM METADATA (Web3 Extensions)
// =============================================

// 6-Part Emotion Profile for Dreams
export const DREAM_EMOTION_CATEGORIES = [
  'fear', 'wonder', 'peace', 'surprise', 'anticipation', 'trust'
] as const;
export type DreamEmotionCategory = typeof DREAM_EMOTION_CATEGORIES[number];

export const DREAM_EMOTION_LABELS: Record<DreamEmotionCategory, string> = {
  fear: 'Korku / Anksiyete',
  wonder: 'Merak / Hayranlık',
  peace: 'Huzur / Sakinlik',
  surprise: 'Şaşkınlık',
  anticipation: 'Beklenti',
  trust: 'Güven',
};

// Dream Metadata table - Extended analysis data
export const dreamMetadata = pgTable("dream_metadata", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dreamId: varchar("dream_id", { length: 36 }).notNull().unique(),
  emotionProfile: jsonb("emotion_profile").$type<Record<DreamEmotionCategory, number>>(),
  mainCharacters: jsonb("main_characters").$type<string[]>().default([]),
  locations: jsonb("locations").$type<string[]>().default([]),
  motifs: jsonb("motifs").$type<string[]>().default([]),
  visualColor: varchar("visual_color", { length: 7 }),
  clarity: text("clarity").notNull().default("medium"),
  dejavuIntensity: integer("dejavu_intensity").notNull().default(0),
  rarityScore: real("rarity_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDreamMetadataSchema = createInsertSchema(dreamMetadata).omit({
  id: true,
  createdAt: true,
});

export type InsertDreamMetadata = z.infer<typeof insertDreamMetadataSchema>;
export type DreamMetadata = typeof dreamMetadata.$inferSelect;

// Clarity levels
export const DREAM_CLARITY_LEVELS = ['low', 'medium', 'high'] as const;
export type DreamClarityLevel = typeof DREAM_CLARITY_LEVELS[number];

export const CLARITY_LABELS: Record<DreamClarityLevel, string> = {
  low: 'Bulanık',
  medium: 'Normal',
  high: 'Çok Berrak',
};

// Standard motifs for selection
export const DREAM_MOTIFS = [
  { id: 'water', label: 'Su', icon: '💧' },
  { id: 'mirror', label: 'Ayna', icon: '🪞' },
  { id: 'flight', label: 'Uçuş', icon: '✈️' },
  { id: 'darkness', label: 'Karanlık', icon: '🌑' },
  { id: 'light', label: 'Işık', icon: '💡' },
  { id: 'door', label: 'Kapı', icon: '🚪' },
  { id: 'stairs', label: 'Merdiven', icon: '🪜' },
  { id: 'falling', label: 'Düşüş', icon: '⬇️' },
  { id: 'chase', label: 'Kaçış', icon: '🏃' },
  { id: 'family', label: 'Aile', icon: '👨‍👩‍👧' },
] as const;

// =============================================
// NFT SYSTEM
// =============================================

// NFT Asset Status
export const NFT_ASSET_STATUS = ['pending', 'generating', 'uploading', 'ready', 'minted', 'failed'] as const;
export type NFTAssetStatus = typeof NFT_ASSET_STATUS[number];

// NFT Type - Standard vs Genesis
export const NFT_TYPES = ['standard', 'genesis'] as const;
export type NFTType = typeof NFT_TYPES[number];

// NFT Assets table - Stores generated art and metadata
export const nftAssets = pgTable("nft_assets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dreamId: varchar("dream_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }),
  nftType: text("nft_type").notNull().default("standard"), // 'standard' or 'genesis'
  status: text("status").notNull().default("pending"),
  artPrompt: text("art_prompt"),
  imageUrl: text("image_url"),
  imageCid: text("image_cid"),
  metadataCid: text("metadata_cid"),
  metadata: jsonb("metadata"),
  rarityScore: real("rarity_score").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertNftAssetSchema = createInsertSchema(nftAssets).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertNftAsset = z.infer<typeof insertNftAssetSchema>;
export type NFTAsset = typeof nftAssets.$inferSelect;

// NFT Mints table - Blockchain transaction records
export const nftMints = pgTable("nft_mints", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nftAssetId: varchar("nft_asset_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }),
  walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
  chainId: integer("chain_id").notNull().default(137),
  contractAddress: varchar("contract_address", { length: 42 }),
  tokenId: integer("token_id"),
  transactionHash: varchar("transaction_hash", { length: 66 }),
  status: text("status").notNull().default("pending"),
  gasUsed: text("gas_used"),
  errorMessage: text("error_message"),
  mintedAt: timestamp("minted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNftMintSchema = createInsertSchema(nftMints).omit({
  id: true,
  createdAt: true,
  mintedAt: true,
});

export type InsertNftMint = z.infer<typeof insertNftMintSchema>;
export type NFTMint = typeof nftMints.$inferSelect;

// NFT Metadata Structure (ERC-721 compatible)
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string;
  }>;
}

// =============================================
// API SCHEMAS FOR WEB3
// =============================================

// Enhanced Dream Creation with metadata
export const createEnhancedDreamSchema = z.object({
  title: z.string().min(1, "Başlık gerekli"),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalı"),
  location: z.string().min(1, "Mekan gerekli"),
  emotion: z.string().min(1, "Duygu gerekli"),
  themes: z.array(z.string()).default([]),
  objects: z.array(z.string()).default([]),
  intensity: z.number().min(1).max(10).default(5),
  dreamDate: z.string().or(z.date()),
  emotionProfile: z.object({
    fear: z.number().min(0).max(100).default(0),
    wonder: z.number().min(0).max(100).default(0),
    peace: z.number().min(0).max(100).default(0),
    surprise: z.number().min(0).max(100).default(0),
    anticipation: z.number().min(0).max(100).default(0),
    trust: z.number().min(0).max(100).default(0),
  }).optional(),
  mainCharacters: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  motifs: z.array(z.string()).default([]),
  visualColor: z.string().optional(),
  clarity: z.enum(['low', 'medium', 'high']).default('medium'),
  dejavuIntensity: z.number().min(0).max(10).default(0),
});

export type CreateEnhancedDreamRequest = z.infer<typeof createEnhancedDreamSchema>;

// Wallet Connection Schema
export const walletConnectionSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Geçersiz cüzdan adresi"),
  signature: z.string().optional(),
});

export type WalletConnectionRequest = z.infer<typeof walletConnectionSchema>;

// NFT Mint Request Schema
export const nftMintRequestSchema = z.object({
  dreamId: z.string().min(1, "Rüya ID gerekli"),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Geçersiz cüzdan adresi"),
});

export type NFTMintRequest = z.infer<typeof nftMintRequestSchema>;

// Leaderboard Entry
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string;
  totalPoints: number;
  whitelistSlots: number;
  dreamCount: number;
  nftCount: number;
}

// User Profile with Gamification
export interface UserProfile extends User {
  dreamCount: number;
  dejavuCount: number;
  nftCount: number;
  achievements: UserAchievement[];
  recentPoints: UserPoints[];
}

// =============================================
// DUYGUMOTOR v2.0 - ENHANCED TABLES
// =============================================

// Social Videos table - TikTok/Instagram video storage
export const SOCIAL_PLATFORMS = ['tiktok', 'instagram'] as const;
export type SocialPlatform = typeof SOCIAL_PLATFORMS[number];

export const NFT_VIDEO_STATUS = ['none', 'candidate', 'minted', 'rejected'] as const;
export type NFTVideoStatus = typeof NFT_VIDEO_STATUS[number];

export const REGION_TYPES = ['turkey', 'global'] as const;
export type RegionType = typeof REGION_TYPES[number];

export const socialVideos = pgTable("social_videos", {
  id: varchar("id", { length: 36 }).primaryKey(),
  platform: text("platform").notNull(), // 'tiktok' or 'instagram'
  region: text("region").notNull().default("turkey"), // 'turkey' or 'global'
  platformVideoId: varchar("platform_video_id", { length: 255 }).notNull().unique(),
  caption: text("caption"),
  hashtags: jsonb("hashtags").$type<string[]>().default([]),
  soundId: varchar("sound_id", { length: 255 }),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  
  // AI Analysis
  emotionEmbedding: jsonb("emotion_embedding").$type<number[]>(),
  detectedEmotions: jsonb("detected_emotions").$type<{
    joy: number;
    trust: number;
    fear: number;
    surprise: number;
    sadness: number;
    disgust: number;
    anger: number;
    anticipation: number;
  }>(),
  
  // Stats & Engagement
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  commentCount: integer("comment_count").default(0),
  shareCount: integer("share_count").default(0),
  engagementRate: real("engagement_rate").default(0),
  stats: jsonb("stats"),
  
  // NFT Pipeline
  nftStatus: text("nft_status").notNull().default("none"),
  nftRarityScore: real("nft_rarity_score").default(0),
  
  // Relations
  relatedDreamId: varchar("related_dream_id", { length: 36 }),
  
  // Metadata
  metadata: jsonb("metadata"),
  creatorUsername: varchar("creator_username", { length: 100 }),
  creatorId: varchar("creator_id", { length: 100 }),
  
  fetchedAt: timestamp("fetched_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSocialVideoSchema = createInsertSchema(socialVideos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  fetchedAt: true,
});

export type InsertSocialVideo = z.infer<typeof insertSocialVideoSchema>;
export type SocialVideo = typeof socialVideos.$inferSelect;

// Embedding Jobs table - Background processing queue
export const EMBEDDING_JOB_TYPES = ['embed_dream', 'embed_video', 'compute_dejavu', 'compute_rarity'] as const;
export type EmbeddingJobType = typeof EMBEDDING_JOB_TYPES[number];

export const EMBEDDING_JOB_STATUS = ['pending', 'processing', 'completed', 'failed'] as const;
export type EmbeddingJobStatus = typeof EMBEDDING_JOB_STATUS[number];

export const embeddingJobs = pgTable("embedding_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dreamId: varchar("dream_id", { length: 36 }),
  videoId: varchar("video_id", { length: 36 }),
  
  jobType: text("job_type").notNull(), // EmbeddingJobType
  status: text("status").notNull().default("pending"), // EmbeddingJobStatus
  priority: integer("priority").default(0), // Higher = more urgent
  
  errorMessage: text("error_message"),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  
  result: jsonb("result"), // Job result data
  
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertEmbeddingJobSchema = createInsertSchema(embeddingJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export type InsertEmbeddingJob = z.infer<typeof insertEmbeddingJobSchema>;
export type EmbeddingJob = typeof embeddingJobs.$inferSelect;

// Feedback (RLHF) table - User feedback for model improvement
export const FEEDBACK_TYPES = ['match_quality', 'emotion_accuracy', 'nft_rarity', 'content_relevance'] as const;
export type FeedbackType = typeof FEEDBACK_TYPES[number];

export const feedback = pgTable("feedback", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  dreamId: varchar("dream_id", { length: 36 }),
  videoId: varchar("video_id", { length: 36 }),
  dejavuId: varchar("dejavu_id", { length: 36 }),
  matchId: varchar("match_id", { length: 36 }),
  
  feedbackType: text("feedback_type").notNull(), // FeedbackType
  vote: integer("vote").notNull(), // 0 = negative, 1 = positive
  rating: integer("rating"), // 1-5 stars (optional)
  confidence: real("confidence"), // User's confidence in their feedback
  
  notes: text("notes"), // Optional text feedback
  context: jsonb("context"), // Additional context data
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// NFT Candidates table - Ranked NFT candidates
export const NFT_CANDIDATE_STATUS = ['candidate', 'approved', 'minted', 'rejected'] as const;
export type NFTCandidateStatus = typeof NFT_CANDIDATE_STATUS[number];

export const nftCandidates = pgTable("nft_candidates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dreamId: varchar("dream_id", { length: 36 }),
  videoId: varchar("video_id", { length: 36 }),
  
  // Scoring
  rarityScore: real("rarity_score").notNull(),
  uniquenessScore: real("uniqueness_score"),
  emotionComplexity: real("emotion_complexity"),
  engagementMultiplier: real("engagement_multiplier"),
  finalScore: real("final_score").notNull(),
  rank: integer("rank"),
  
  // Content preview
  title: text("title"),
  previewUrl: text("preview_url"),
  sourceType: text("source_type").notNull().default("dream"), // 'dream' or 'video'
  
  // Status
  nftStatus: text("nft_status").notNull().default("candidate"),
  
  // Metadata
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  mintedAt: timestamp("minted_at"),
});

export const insertNftCandidateSchema = createInsertSchema(nftCandidates).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  mintedAt: true,
});

export type InsertNftCandidate = z.infer<typeof insertNftCandidateSchema>;
export type NFTCandidate = typeof nftCandidates.$inferSelect;

// DejaVu Video Matches table - Dream to Social Video matching
export const dejavuVideoMatches = pgTable("dejavu_video_matches", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dreamId: varchar("dream_id", { length: 36 }).notNull(),
  videoId: varchar("video_id", { length: 36 }).notNull(),
  
  similarityScore: real("similarity_score").notNull(),
  emotionMatch: real("emotion_match").notNull(),
  dejavuProbability: real("dejavu_probability").notNull(),
  
  matchReason: text("match_reason"),
  
  matchedAt: timestamp("matched_at").defaultNow(),
});

export const insertDejavuVideoMatchSchema = createInsertSchema(dejavuVideoMatches).omit({
  id: true,
  matchedAt: true,
});

export type InsertDejavuVideoMatch = z.infer<typeof insertDejavuVideoMatchSchema>;
export type DejavuVideoMatch = typeof dejavuVideoMatches.$inferSelect;

// =============================================
// API SCHEMAS FOR v2.0
// =============================================

// Social Video Ingestion Request
export const ingestSocialVideoSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  platformVideoId: z.string().min(1),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  soundId: z.string().optional(),
  videoUrl: z.string().url().optional(),
  viewCount: z.number().optional(),
  likeCount: z.number().optional(),
  commentCount: z.number().optional(),
  shareCount: z.number().optional(),
  creatorUsername: z.string().optional(),
});

export type IngestSocialVideoRequest = z.infer<typeof ingestSocialVideoSchema>;

// Embedding Job Request
export const createEmbeddingJobSchema = z.object({
  jobType: z.enum(EMBEDDING_JOB_TYPES),
  dreamId: z.string().optional(),
  videoId: z.string().optional(),
  priority: z.number().default(0),
});

export type CreateEmbeddingJobRequest = z.infer<typeof createEmbeddingJobSchema>;

// Feedback Request
export const createFeedbackSchema = z.object({
  feedbackType: z.enum(FEEDBACK_TYPES),
  vote: z.number().min(0).max(1),
  rating: z.number().min(1).max(5).optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  dreamId: z.string().optional(),
  videoId: z.string().optional(),
  dejavuId: z.string().optional(),
  matchId: z.string().optional(),
});

export type CreateFeedbackRequest = z.infer<typeof createFeedbackSchema>;

// Dashboard Stats v2
export interface DashboardStatsV2 {
  dreams: number;
  dreambank: number;
  userDreams: number;
  socialVideos: number;
  tiktokVideos: number;
  instagramVideos: number;
  pendingEmbeddings: number;
  completedEmbeddings: number;
  nftCandidates: number;
  feedbackCount: number;
  dejavuMatches: number;
}

// TypeScript interfaces for v2.0 frontend
export interface SocialVideoWithMatch extends SocialVideo {
  similarityScore?: number;
  emotionMatch?: number;
  dejavuProbability?: number;
}

export interface NFTCandidateWithDetails extends NFTCandidate {
  dream?: Dream;
  video?: SocialVideo;
}

// =============================================
// BULK DATA COLLECTION JOBS
// =============================================

export const JOB_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export type JobStatus = typeof JOB_STATUSES[number];

export const JOB_TYPES = ['tiktok_scrape', 'instagram_scrape', 'dreambank_ingest'] as const;
export type JobType = typeof JOB_TYPES[number];

export const bulkJobs = pgTable("bulk_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  jobType: text("job_type").notNull(),
  status: text("status").notNull().default("pending"),
  
  targetCount: integer("target_count").notNull().default(0),
  processedCount: integer("processed_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  
  config: jsonb("config"),
  errors: jsonb("errors").$type<string[]>().default([]),
  
  progress: real("progress").notNull().default(0),
  
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBulkJobSchema = createInsertSchema(bulkJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBulkJob = z.infer<typeof insertBulkJobSchema>;
export type BulkJob = typeof bulkJobs.$inferSelect;

// Bulk Job Config Types
export interface TikTokScrapeConfig {
  hashtags: string[];
  region: 'turkey' | 'global' | 'both';
  batchSize: number;
}

export interface InstagramScrapeConfig {
  hashtags: string[];
  region: 'turkey' | 'global' | 'both';
  batchSize: number;
}

export interface DreamBankIngestConfig {
  batchSize: number;
  maxRecords: number;
  skipExisting: boolean;
}

// API Schema for starting bulk jobs
export const startBulkJobSchema = z.object({
  jobType: z.enum(JOB_TYPES),
  targetCount: z.number().min(1).max(50000),
  config: z.record(z.any()).optional(),
});

export type StartBulkJobRequest = z.infer<typeof startBulkJobSchema>;

// =============================================
// BEHAVIOR LAYER - UNIFIED BEHAVIOR ANALYTICS
// =============================================

// Entity Types - Artist, Creator, User, Brand
export const ENTITY_TYPES = ['artist', 'creator', 'user', 'brand'] as const;
export type EntityType = typeof ENTITY_TYPES[number];

// Platform types for identity mapping
export const BEHAVIOR_PLATFORMS = ['spotify', 'tiktok', 'instagram', 'twitter', 'youtube', 'chartmetric'] as const;
export type BehaviorPlatform = typeof BEHAVIOR_PLATFORMS[number];

// Entities table - Unified entity for cross-platform tracking
export const entities = pgTable("entities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  type: text("type").notNull(), // EntityType
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  primaryImage: text("primary_image"),
  country: varchar("country", { length: 3 }), // ISO 3166-1 alpha-2
  genres: jsonb("genres").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEntitySchema = createInsertSchema(entities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type Entity = typeof entities.$inferSelect;

// Entity Identities table - Multi-platform identity mapping
export const entityIdentities = pgTable("entity_identities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  platform: text("platform").notNull(), // BehaviorPlatform
  platformId: varchar("platform_id", { length: 255 }).notNull(),
  platformUsername: varchar("platform_username", { length: 255 }),
  profileUrl: text("profile_url"),
  verified: integer("verified").default(0), // Boolean as int
  followerCount: integer("follower_count"),
  lastSyncedAt: timestamp("last_synced_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEntityIdentitySchema = createInsertSchema(entityIdentities).omit({
  id: true,
  createdAt: true,
});

export type InsertEntityIdentity = z.infer<typeof insertEntityIdentitySchema>;
export type EntityIdentity = typeof entityIdentities.$inferSelect;

// Social Events table - TikTok/IG/Twitter/YouTube metrics
export const SOCIAL_EVENT_TYPES = ['post', 'story', 'reel', 'video', 'live', 'comment', 'share'] as const;
export type SocialEventType = typeof SOCIAL_EVENT_TYPES[number];

export const socialEvents = pgTable("social_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  platform: text("platform").notNull(), // BehaviorPlatform
  eventType: text("event_type").notNull(), // SocialEventType
  contentId: varchar("content_id", { length: 255 }),
  contentUrl: text("content_url"),
  caption: text("caption"),
  hashtags: jsonb("hashtags").$type<string[]>().default([]),
  mentions: jsonb("mentions").$type<string[]>().default([]),
  // Engagement metrics
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  saves: integer("saves").default(0),
  engagementRate: real("engagement_rate").default(0),
  // Audio/Music association
  soundId: varchar("sound_id", { length: 255 }),
  soundName: text("sound_name"),
  spotifyTrackId: varchar("spotify_track_id", { length: 50 }),
  // Analysis
  sentiment: real("sentiment"), // -1 to 1
  emotionTags: jsonb("emotion_tags").$type<string[]>().default([]),
  // Timestamps
  publishedAt: timestamp("published_at"),
  eventTs: timestamp("event_ts").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSocialEventSchema = createInsertSchema(socialEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertSocialEvent = z.infer<typeof insertSocialEventSchema>;
export type SocialEvent = typeof socialEvents.$inferSelect;

// Streaming Events table - Spotify/Chartmetric streaming data
export const STREAMING_EVENT_TYPES = ['stream', 'chart_entry', 'playlist_add', 'radio_play', 'download'] as const;
export type StreamingEventType = typeof STREAMING_EVENT_TYPES[number];

export const streamingEvents = pgTable("streaming_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  platform: text("platform").notNull(), // 'spotify', 'chartmetric'
  eventType: text("event_type").notNull(), // StreamingEventType
  trackId: varchar("track_id", { length: 100 }),
  trackName: text("track_name"),
  artistName: text("artist_name"),
  albumId: varchar("album_id", { length: 100 }),
  playlistId: varchar("playlist_id", { length: 100 }),
  playlistName: text("playlist_name"),
  // Stream metrics
  streams: integer("streams").default(0),
  listeners: integer("listeners").default(0),
  popularity: integer("popularity").default(0),
  chartPosition: integer("chart_position"),
  chartName: varchar("chart_name", { length: 255 }),
  chartRegion: varchar("chart_region", { length: 3 }),
  // Audio features (from Spotify)
  audioFeatures: jsonb("audio_features").$type<{
    danceability?: number;
    energy?: number;
    valence?: number;
    tempo?: number;
    acousticness?: number;
    instrumentalness?: number;
    speechiness?: number;
    liveness?: number;
  }>(),
  // Timestamps
  eventTs: timestamp("event_ts").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStreamingEventSchema = createInsertSchema(streamingEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertStreamingEvent = z.infer<typeof insertStreamingEventSchema>;
export type StreamingEvent = typeof streamingEvents.$inferSelect;

// Behavior Events table - Unified normalized behavior metrics
export const behaviorEvents = pgTable("behavior_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  entityId: varchar("entity_id", { length: 36 }).notNull(),
  sourceType: text("source_type").notNull(), // 'social', 'streaming'
  sourcePlatform: text("source_platform").notNull(), // BehaviorPlatform
  sourceEventId: varchar("source_event_id", { length: 36 }),
  // Normalized intensity (0-100 scale via z-score)
  intensity: real("intensity").notNull().default(50),
  confidence: real("confidence").notNull().default(0.5), // 0-1
  // Weights for RLHF
  socialWeight: real("social_weight").default(1.0),
  streamingWeight: real("streaming_weight").default(1.0),
  // Aggregated metrics
  rawMetrics: jsonb("raw_metrics").$type<{
    views?: number;
    likes?: number;
    shares?: number;
    streams?: number;
    engagement?: number;
  }>(),
  // Z-score components
  zScore: real("z_score"),
  rollingMean: real("rolling_mean"),
  rollingSigma: real("rolling_sigma"),
  // Turkish market flag
  isTurkishMarket: integer("is_turkish_market").default(0),
  region: varchar("region", { length: 50 }),
  // Timestamps
  eventTs: timestamp("event_ts").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBehaviorEventSchema = createInsertSchema(behaviorEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertBehaviorEvent = z.infer<typeof insertBehaviorEventSchema>;
export type BehaviorEvent = typeof behaviorEvents.$inferSelect;

// Behavior Sync Jobs table - Track sync status
export const behaviorSyncJobs = pgTable("behavior_sync_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("pending"),
  entityCount: integer("entity_count").default(0),
  eventCount: integer("event_count").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBehaviorSyncJobSchema = createInsertSchema(behaviorSyncJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertBehaviorSyncJob = z.infer<typeof insertBehaviorSyncJobSchema>;
export type BehaviorSyncJob = typeof behaviorSyncJobs.$inferSelect;

// =============================================
// BEHAVIOR LAYER API SCHEMAS
// =============================================

// Entity CRUD schemas
export const createEntitySchema = z.object({
  type: z.enum(ENTITY_TYPES),
  name: z.string().min(1, "İsim gerekli"),
  description: z.string().optional(),
  country: z.string().max(3).optional(),
  genres: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const addIdentitySchema = z.object({
  entityId: z.string().min(1),
  platform: z.enum(BEHAVIOR_PLATFORMS),
  platformId: z.string().min(1),
  platformUsername: z.string().optional(),
  profileUrl: z.string().optional(),
});

export const behaviorTimelineSchema = z.object({
  entityId: z.string().optional(),
  platform: z.enum([...BEHAVIOR_PLATFORMS, 'all']).optional().default('all'),
  sourceType: z.enum(['social', 'streaming', 'all']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
  offset: z.number().min(0).optional().default(0),
  region: z.enum(['turkey', 'global', 'all']).optional().default('all'),
});

export const behaviorSummarySchema = z.object({
  entityId: z.string().optional(),
  platform: z.enum([...BEHAVIOR_PLATFORMS, 'all']).optional().default('all'),
  period: z.enum(['day', 'week', 'month', 'all']).optional().default('week'),
  region: z.enum(['turkey', 'global', 'all']).optional().default('all'),
});

export type CreateEntityRequest = z.infer<typeof createEntitySchema>;
export type AddIdentityRequest = z.infer<typeof addIdentitySchema>;
export type BehaviorTimelineRequest = z.infer<typeof behaviorTimelineSchema>;
export type BehaviorSummaryRequest = z.infer<typeof behaviorSummarySchema>;

// TypeScript interfaces for frontend
export interface EntityWithIdentities extends Entity {
  identities: EntityIdentity[];
}

export interface BehaviorTimelinePoint {
  timestamp: string;
  entityId: string;
  entityName: string;
  intensity: number;
  sourceType: 'social' | 'streaming';
  platform: BehaviorPlatform;
  rawMetrics: {
    views?: number;
    likes?: number;
    shares?: number;
    streams?: number;
    engagement?: number;
  };
}

export interface BehaviorSummary {
  entityId: string;
  entityName: string;
  period: string;
  totalEvents: number;
  avgIntensity: number;
  peakIntensity: number;
  socialContribution: number;
  streamingContribution: number;
  platformBreakdown: Record<string, number>;
  trendDirection: 'up' | 'down' | 'stable';
  topContent: Array<{
    contentId: string;
    platform: string;
    intensity: number;
    metrics: Record<string, number>;
  }>;
}

export interface BehaviorDashboardData {
  entities: EntityWithIdentities[];
  timeline: BehaviorTimelinePoint[];
  summary: BehaviorSummary;
  turkeyVsGlobal: {
    turkey: { events: number; avgIntensity: number };
    global: { events: number; avgIntensity: number };
  };
}

// =============================================
// VISTA SOCIAL ACCOUNT MANAGEMENT
// =============================================

// Vista Social Account Groups - Organize fan pages
export const vistaAccountGroups = pgTable("vista_account_groups", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  iconName: varchar("icon_name", { length: 50 }), // Lucide icon name
  targetArtist: varchar("target_artist", { length: 255 }), // Associated artist name
  totalProfiles: integer("total_profiles").default(0),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVistaAccountGroupSchema = createInsertSchema(vistaAccountGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVistaAccountGroup = z.infer<typeof insertVistaAccountGroupSchema>;
export type VistaAccountGroup = typeof vistaAccountGroups.$inferSelect;

// Vista Social Profiles - Individual fan page profiles
export const vistaProfiles = pgTable("vista_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  groupId: varchar("group_id", { length: 36 }).notNull(),
  vistaProfileId: varchar("vista_profile_id", { length: 100 }), // Vista Social's profile ID (optional for manual entry)
  platform: text("platform").notNull(), // tiktok, instagram
  username: varchar("username", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 500 }),
  profileUrl: text("profile_url"),
  followerCount: integer("follower_count").default(0),
  followingCount: integer("following_count").default(0),
  postCount: integer("post_count").default(0),
  isVerified: integer("is_verified").default(0),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  // Link to behavior entity
  entityId: varchar("entity_id", { length: 36 }),
  // Sync metadata
  lastSyncedAt: timestamp("last_synced_at"),
  syncStatus: text("sync_status").default("pending"), // pending, syncing, completed, failed
  syncError: text("sync_error"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVistaProfileSchema = createInsertSchema(vistaProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVistaProfile = z.infer<typeof insertVistaProfileSchema>;
export type VistaProfile = typeof vistaProfiles.$inferSelect;

// Behavior Sync Schedules - Scheduled sync jobs
export const behaviorSyncSchedules = pgTable("behavior_sync_schedules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  scheduleType: text("schedule_type").notNull(), // daily, weekly, monthly
  cronExpression: varchar("cron_expression", { length: 50 }),
  dayOfWeek: integer("day_of_week"), // 0=Sunday, 1=Monday, etc.
  hourOfDay: integer("hour_of_day").default(3), // UTC hour
  targetType: text("target_type").notNull(), // vista_group, chartmetric, all
  targetId: varchar("target_id", { length: 36 }), // Group ID if targeting specific group
  isActive: integer("is_active").default(1),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  runCount: integer("run_count").default(0),
  lastStatus: text("last_status"), // success, failed, running
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBehaviorSyncScheduleSchema = createInsertSchema(behaviorSyncSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBehaviorSyncSchedule = z.infer<typeof insertBehaviorSyncScheduleSchema>;
export type BehaviorSyncSchedule = typeof behaviorSyncSchedules.$inferSelect;

// Vista API schemas
export const createVistaGroupSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  iconName: z.string().optional(),
  targetArtist: z.string().optional(),
});

export const addVistaProfileSchema = z.object({
  groupId: z.string().min(1),
  vistaProfileId: z.string().optional(), // Optional for manual entry without Vista API
  platform: z.enum(['tiktok', 'instagram']),
  username: z.string().min(1),
  displayName: z.string().optional(),
  profileUrl: z.string().optional(),
  followerCount: z.number().optional(),
});

export const createSyncScheduleSchema = z.object({
  name: z.string().min(1),
  scheduleType: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  hourOfDay: z.number().min(0).max(23).optional(),
  targetType: z.enum(['vista_group', 'chartmetric', 'all']),
  targetId: z.string().optional(),
});

export type CreateVistaGroupRequest = z.infer<typeof createVistaGroupSchema>;
export type AddVistaProfileRequest = z.infer<typeof addVistaProfileSchema>;
export type CreateSyncScheduleRequest = z.infer<typeof createSyncScheduleSchema>;

// Vista group with profiles
export interface VistaGroupWithProfiles extends VistaAccountGroup {
  profiles: VistaProfile[];
}

// =============================================
// KADER MOTORU (FATE ENGINE) v2.0
// =============================================

// Human Profiles (İnsan CV)
export const humanProfiles = pgTable("human_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  birthDate: timestamp("birth_date").notNull(),
  personalityType: varchar("personality_type", { length: 10 }).default('INTJ'),
  
  // Origin Factors (Kökensel Faktörler)
  socioeconomicLevel: real("socioeconomic_level").default(5),
  parentalSupport: real("parental_support").default(5),
  culturalEntropy: real("cultural_entropy").default(5),
  geographicalAdvantage: real("geographical_advantage").default(5),
  healthBaseline: real("health_baseline").default(7),
  
  // Calculated Values
  baseScore: real("base_score").default(100),
  potentialCeiling: real("potential_ceiling").default(1000),
  resilienceFactor: real("resilience_factor").default(1.0),
  currentConsciousness: real("current_consciousness").default(0.6),
  
  // Skills stored as JSON
  skills: jsonb("skills").$type<Array<{
    name: string;
    proficiency: number;
    resonanceFrequency: number;
    masteryLevel: number;
    yearsPracticed: number;
    isInnate: boolean;
  }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHumanProfileSchema = createInsertSchema(humanProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHumanProfile = z.infer<typeof insertHumanProfileSchema>;
export type HumanProfile = typeof humanProfiles.$inferSelect;

// Fate Simulations (Kader Simülasyonları)
export const fateSimulations = pgTable("fate_simulations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  profileId: varchar("profile_id", { length: 36 }).notNull(),
  
  // Dream State
  lucidityLevel: real("lucidity_level").default(0.5),
  vividness: real("vividness").default(0.5),
  symbolDensity: real("symbol_density").default(0.5),
  dejavuIntensity: real("dejavu_intensity").default(0.3),
  precognitionSignal: real("precognition_signal").default(0.2),
  emotionalCharge: real("emotional_charge").default(0),
  dreamSymbols: text("dream_symbols").array(),
  
  // Results
  fateScore: real("fate_score"),
  fateTrajectory: text("fate_trajectory"),
  consciousnessLevel: real("consciousness_level"),
  synchronizationType: real("synchronization_type"),
  synchronicityMatches: jsonb("synchronicity_matches").$type<Array<{
    event: string;
    symbol: string;
    similarity: number;
    timeDelta: number;
  }>>(),
  
  energySignature: real("energy_signature"),
  isProphetic: integer("is_prophetic").default(0),
  interpretation: text("interpretation"),
  butterflyEffects: text("butterfly_effects").array(),
  recommendations: text("recommendations").array(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFateSimulationSchema = createInsertSchema(fateSimulations).omit({
  id: true,
  createdAt: true,
});

export type InsertFateSimulation = z.infer<typeof insertFateSimulationSchema>;
export type FateSimulation = typeof fateSimulations.$inferSelect;

// Life Events (Yaşam Olayları - Sinkronizasyon için)
export const lifeEvents = pgTable("life_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  profileId: varchar("profile_id", { length: 36 }).notNull(),
  eventType: text("event_type").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  significance: real("significance").default(0.5), // 0-1 önem derecesi
  eventDate: timestamp("event_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLifeEventSchema = createInsertSchema(lifeEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertLifeEvent = z.infer<typeof insertLifeEventSchema>;
export type LifeEvent = typeof lifeEvents.$inferSelect;

// Fate Engine API Schemas
export const createHumanProfileSchema = z.object({
  name: z.string().min(1).max(255),
  birthDate: z.string().or(z.date()),
  personalityType: z.string().max(10).optional(),
  socioeconomicLevel: z.number().min(0).max(10).optional(),
  parentalSupport: z.number().min(0).max(10).optional(),
  culturalEntropy: z.number().min(0).max(10).optional(),
  geographicalAdvantage: z.number().min(0).max(10).optional(),
  healthBaseline: z.number().min(0).max(10).optional(),
  skills: z.array(z.object({
    name: z.string(),
    proficiency: z.number().min(0).max(1),
    resonanceFrequency: z.number().min(0).max(1).optional(),
    masteryLevel: z.number().min(1).max(10),
    yearsPracticed: z.number().min(0),
    isInnate: z.boolean().optional(),
  })).optional(),
});

export const runFateSimulationSchema = z.object({
  profileId: z.string(),
  lucidityLevel: z.number().min(0).max(1).optional(),
  vividness: z.number().min(0).max(1).optional(),
  symbolDensity: z.number().min(0).max(1).optional(),
  dejavuIntensity: z.number().min(0).max(1).optional(),
  precognitionSignal: z.number().min(0).max(1).optional(),
  emotionalCharge: z.number().min(-1).max(1).optional(),
  dreamSymbols: z.array(z.string()).optional(),
});

export const addLifeEventSchema = z.object({
  profileId: z.string(),
  eventType: z.string().min(1),
  description: z.string().optional(),
  significance: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateHumanProfileRequest = z.infer<typeof createHumanProfileSchema>;
export type RunFateSimulationRequest = z.infer<typeof runFateSimulationSchema>;
export type AddLifeEventRequest = z.infer<typeof addLifeEventSchema>;

// =============================================
// v3.0: AI CHAT SYSTEM (Gemini Integration)
// =============================================

// Conversations table for AI chat history
export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }),
  role: text("role").notNull(), // 'user' | 'model'
  content: text("content").notNull(),
  insights: jsonb("insights").$type<string[]>().default([]),
  actions: jsonb("actions").$type<string[]>().default([]),
  emotionalState: jsonb("emotional_state").$type<{
    sentiment: number;
    energy: number;
    stress: number;
    clarity: number;
  }>(),
  confidence: real("confidence").default(0.85),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Chat message request schema
export const chatMessageSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
  dreamData: z.any().optional(),
  socialData: z.any().optional(),
});

export type ChatMessageRequest = z.infer<typeof chatMessageSchema>;

// =============================================
// v3.0: DEJAVU GENERATION SYSTEM
// =============================================

// DejaVu Detections table - stores detected dejavu moments
export const dejavuDetections = pgTable("dejavu_detections", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  dreamId: varchar("dream_id", { length: 36 }),
  detectionTimestamp: timestamp("detection_timestamp").defaultNow(),
  embeddingSimilarity: real("embedding_similarity"),
  symbolOverlap: jsonb("symbol_overlap").$type<string[]>().default([]),
  isDejaVu: integer("is_dejavu").default(0).$type<boolean>(),
  confidence: real("confidence"),
  narrativeConnection: text("narrative_connection"),
  psychologicalInterpretation: text("psychological_interpretation"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDejavuDetectionSchema = createInsertSchema(dejavuDetections).omit({
  id: true,
  createdAt: true,
  detectionTimestamp: true,
});

export type InsertDejavuDetection = z.infer<typeof insertDejavuDetectionSchema>;
export type DejavuDetection = typeof dejavuDetections.$inferSelect;

// DejaVu Scenarios table - AI-generated dejavu scenarios
export const dejavuScenarios = pgTable("dejavu_scenarios", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  scenarioId: varchar("scenario_id", { length: 255 }),
  title: varchar("title", { length: 500 }),
  narrative: text("narrative"),
  dreamReferences: jsonb("dream_references").$type<string[]>().default([]),
  behaviorTriggers: jsonb("behavior_triggers").$type<string[]>().default([]),
  emotionalJourney: jsonb("emotional_journey").$type<Array<{ phase: string; emotion: string }>>(),
  psychologicalMeaning: text("psychological_meaning"),
  likelihood: real("likelihood"),
  timeframeEstimate: varchar("timeframe_estimate", { length: 50 }),
  preparationSuggestions: jsonb("preparation_suggestions").$type<string[]>().default([]),
  scenarioType: varchar("scenario_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDejavuScenarioSchema = createInsertSchema(dejavuScenarios).omit({
  id: true,
  createdAt: true,
});

export type InsertDejavuScenario = z.infer<typeof insertDejavuScenarioSchema>;
export type DejavuScenario = typeof dejavuScenarios.$inferSelect;

// Dream Syntheses table - AI-generated dream narratives
export const dreamSyntheses = pgTable("dream_syntheses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  generatedNarrative: text("generated_narrative"),
  symbolsFound: jsonb("symbols_found").$type<string[]>().default([]),
  emotionalArc: jsonb("emotional_arc").$type<Array<{ moment: string; emotion: string }>>(),
  surrealismIndex: real("surrealism_index"),
  coherenceScore: real("coherence_score"),
  parameters: jsonb("parameters").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDreamSynthesisSchema = createInsertSchema(dreamSyntheses).omit({
  id: true,
  createdAt: true,
});

export type InsertDreamSynthesis = z.infer<typeof insertDreamSynthesisSchema>;
export type DreamSynthesis = typeof dreamSyntheses.$inferSelect;

// AI Response interface
export interface AIResponse {
  message: string;
  insights: string[];
  actions: string[];
  followUpQuestions: string[];
  emotionalFeedback: {
    sentiment: number;
    energy: number;
    stress: number;
    clarity: number;
  };
  confidence: number;
  sources: string[];
}

// =============================================
// v3.0: LONG-TERM MEMORY SYSTEM
// =============================================

// Memory Types
export type MemoryType = 'episodic' | 'semantic' | 'procedural' | 'emotional';
export type MemoryImportance = 'critical' | 'high' | 'medium' | 'low';

// Long-Term Memory table - stores vectorized conversation memories
export const memories = pgTable("memories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  sessionId: varchar("session_id", { length: 36 }),
  memoryType: text("memory_type").notNull().$type<MemoryType>(), // episodic, semantic, procedural, emotional
  content: text("content").notNull(), // The actual memory content
  summary: text("summary"), // AI-generated summary
  embedding: real("embedding").array(), // Vector embedding for semantic search
  entities: jsonb("entities").$type<{
    people: string[];
    places: string[];
    topics: string[];
    emotions: string[];
    events: string[];
  }>().default({ people: [], places: [], topics: [], emotions: [], events: [] }),
  importance: text("importance").$type<MemoryImportance>().default('medium'),
  importanceScore: real("importance_score").default(0.5), // 0-1 score
  accessCount: integer("access_count").default(0), // How many times this memory was accessed
  lastAccessed: timestamp("last_accessed").defaultNow(),
  decayFactor: real("decay_factor").default(1.0), // Memory decay over time
  connections: jsonb("connections").$type<{
    relatedMemories: string[];
    relatedDreams: string[];
    relatedConversations: string[];
  }>().default({ relatedMemories: [], relatedDreams: [], relatedConversations: [] }),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memories).omit({
  id: true,
  createdAt: true,
  lastAccessed: true,
});

export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;

// Memory Search Result interface
export interface MemorySearchResult {
  memory: Memory;
  relevanceScore: number;
  matchType: 'vector' | 'text' | 'entity' | 'hybrid';
  context: string;
}

// =============================================
// v3.0: AI OBSERVABILITY SYSTEM
// =============================================

// AI Event Types
export type AIEventType = 'request' | 'response' | 'error' | 'tool_call' | 'streaming';
export type AIErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// AI Metrics table - stores token usage and performance data
export const aiMetrics = pgTable("ai_metrics", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  sessionId: varchar("session_id", { length: 36 }),
  eventType: text("event_type").notNull().$type<AIEventType>(),
  model: text("model").default("gemini-2.5-pro"),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  latencyMs: integer("latency_ms").default(0),
  toolsUsed: jsonb("tools_used").$type<string[]>().default([]),
  success: integer("success").default(1), // 1 = success, 0 = failure
  errorMessage: text("error_message"),
  errorCode: text("error_code"),
  errorSeverity: text("error_severity").$type<AIErrorSeverity>(),
  requestMetadata: jsonb("request_metadata").$type<{
    promptLength: number;
    streaming: boolean;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
  }>(),
  responseMetadata: jsonb("response_metadata").$type<{
    responseLength: number;
    insightsCount: number;
    actionsCount: number;
    confidence: number;
    sentiment: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAIMetricSchema = createInsertSchema(aiMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertAIMetric = z.infer<typeof insertAIMetricSchema>;
export type AIMetric = typeof aiMetrics.$inferSelect;

// AI Error Logs table - detailed error tracking
export const aiErrorLogs = pgTable("ai_error_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  sessionId: varchar("session_id", { length: 36 }),
  errorType: text("error_type").notNull(), // 'api_error', 'timeout', 'rate_limit', 'parsing_error', 'tool_error'
  errorCode: text("error_code"),
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  severity: text("severity").$type<AIErrorSeverity>().default('medium'),
  requestContext: jsonb("request_context").$type<{
    prompt: string;
    model: string;
    toolName?: string;
    toolParams?: Record<string, any>;
  }>(),
  resolved: integer("resolved").default(0), // 0 = unresolved, 1 = resolved
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAIErrorLogSchema = createInsertSchema(aiErrorLogs).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export type InsertAIErrorLog = z.infer<typeof insertAIErrorLogSchema>;
export type AIErrorLog = typeof aiErrorLogs.$inferSelect;

// AI Analytics Summary interface (computed, not stored)
export interface AIAnalyticsSummary {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokensUsed: number;
  avgTokensPerRequest: number;
  topTools: Array<{ tool: string; count: number }>;
  errorsByType: Record<string, number>;
  hourlyUsage: Array<{ hour: string; count: number }>;
  sentimentDistribution: Record<string, number>;
}

// =============================================
// v3.1: DOCUMENTED DEJAVU CASES & 24/7 AUTOMATION
// =============================================

// Documented DejaVu Examples - Historical/Scientific cases
export const DEJAVU_CASE_TYPES = ['medical', 'historical', 'literary', 'modern'] as const;
export type DejavuCaseType = typeof DEJAVU_CASE_TYPES[number];

export const documentedDejavuCases = pgTable("documented_dejavu_cases", {
  id: varchar("id", { length: 36 }).primaryKey(),
  caseType: text("case_type").notNull().$type<DejavuCaseType>(),
  caseName: text("case_name").notNull(),
  source: text("source").notNull(),
  year: varchar("year", { length: 20 }),
  person: text("person"),
  observation: text("observation").notNull(),
  significance: text("significance"),
  scenario: text("scenario"),
  frequency: text("frequency"),
  analysisNotes: text("analysis_notes"),
  embedding: real("embedding").array(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentedDejavuCaseSchema = createInsertSchema(documentedDejavuCases).omit({
  id: true,
  createdAt: true,
});

export type InsertDocumentedDejavuCase = z.infer<typeof insertDocumentedDejavuCaseSchema>;
export type DocumentedDejavuCase = typeof documentedDejavuCases.$inferSelect;

// Continuous Automation Jobs - 24/7 scraping system
export const AUTOMATION_JOB_TYPES = ['video_scraper', 'dream_collector', 'dejavu_analyzer'] as const;
export type AutomationJobType = typeof AUTOMATION_JOB_TYPES[number];

export const AUTOMATION_STATUS = ['active', 'paused', 'stopped', 'error'] as const;
export type AutomationStatus = typeof AUTOMATION_STATUS[number];

export const automationJobs = pgTable("automation_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  jobType: text("job_type").notNull().$type<AutomationJobType>(),
  name: text("name").notNull(),
  status: text("status").notNull().default("paused").$type<AutomationStatus>(),
  ratePerMinute: integer("rate_per_minute").notNull().default(30),
  platforms: jsonb("platforms").$type<string[]>().default([]),
  config: jsonb("config").$type<{
    hashtags?: string[];
    region?: string;
    batchSize?: number;
    autoDejavuAnalysis?: boolean;
  }>(),
  stats: jsonb("stats").$type<{
    totalProcessed: number;
    lastHourProcessed: number;
    successRate: number;
    averageLatency: number;
  }>().default({ totalProcessed: 0, lastHourProcessed: 0, successRate: 100, averageLatency: 0 }),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAutomationJobSchema = createInsertSchema(automationJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAutomationJob = z.infer<typeof insertAutomationJobSchema>;
export type AutomationJob = typeof automationJobs.$inferSelect;

// Automation Run Logs - Track each automation execution
export const automationLogs = pgTable("automation_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  automationJobId: varchar("automation_job_id", { length: 36 }).notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  itemsProcessed: integer("items_processed").default(0),
  itemsSuccessful: integer("items_successful").default(0),
  itemsFailed: integer("items_failed").default(0),
  dejavuMatchesFound: integer("dejavu_matches_found").default(0),
  errors: jsonb("errors").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
});

export const insertAutomationLogSchema = createInsertSchema(automationLogs).omit({
  id: true,
});

export type InsertAutomationLog = z.infer<typeof insertAutomationLogSchema>;
export type AutomationLog = typeof automationLogs.$inferSelect;

// Quick DejaVu Match Results - Fast matching results for new dreams
export const quickDejavuMatches = pgTable("quick_dejavu_matches", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dreamId: varchar("dream_id", { length: 36 }).notNull(),
  matchedCaseId: varchar("matched_case_id", { length: 36 }),
  matchedDejavuId: varchar("matched_dejavu_id", { length: 36 }),
  matchType: text("match_type").notNull(), // 'documented_case', 'user_dejavu', 'dream_pattern'
  similarityScore: real("similarity_score").notNull(),
  matchReason: text("match_reason"),
  sharedMotifs: jsonb("shared_motifs").$type<string[]>().default([]),
  aiAnalysis: text("ai_analysis"),
  processed: integer("processed").default(0), // 0 = pending, 1 = processed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuickDejavuMatchSchema = createInsertSchema(quickDejavuMatches).omit({
  id: true,
  createdAt: true,
});

export type InsertQuickDejavuMatch = z.infer<typeof insertQuickDejavuMatchSchema>;
export type QuickDejavuMatch = typeof quickDejavuMatches.$inferSelect;

// Automation Dashboard Stats interface
export interface AutomationDashboardStats {
  videoScraperStatus: AutomationStatus;
  dreamCollectorStatus: AutomationStatus;
  dejavuAnalyzerStatus: AutomationStatus;
  totalVideosToday: number;
  totalDreamsToday: number;
  dejavuMatchesToday: number;
  videosPerMinute: number;
  dreamsPerMinute: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

// =============================================
// v3.3: PHILOSOPHICAL FRAMEWORK FOR DEJAVU ANALYSIS
// =============================================

// Philosophical traditions for dream/dejavu interpretation
export const PHILOSOPHICAL_TRADITIONS = [
  'ancient_greek',      // Plato, Aristotle
  'augustinian',        // Augustine
  'cartesian',          // Descartes
  'bergsonian',         // Bergson
  'nietzschean',        // Nietzsche
  'freudian',           // Freud
  'jungian',            // Jung
  'phenomenological',   // Sartre, Merleau-Ponty
  'analytic'            // Malcolm
] as const;
export type PhilosophicalTradition = typeof PHILOSOPHICAL_TRADITIONS[number];

// Philosophical Frameworks Table
export const philosophicalFrameworks = pgTable("philosophical_frameworks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tradition: text("tradition").notNull().$type<PhilosophicalTradition>(),
  philosopher: text("philosopher").notNull(),
  era: text("era"), // "Ancient", "Medieval", "Early Modern", "Modern", "Contemporary"
  coreTheory: text("core_theory").notNull(),
  dreamInterpretation: text("dream_interpretation"),
  dejavuInterpretation: text("dejavu_interpretation"),
  consciousnessView: text("consciousness_view"),
  timePerception: text("time_perception"),
  keyWorks: jsonb("key_works").$type<string[]>().default([]),
  keyQuotes: jsonb("key_quotes").$type<{ quote: string; source: string }[]>().default([]),
  applicationToAnalysis: text("application_to_analysis"),
  turkishSummary: text("turkish_summary"),
  embedding: real("embedding").array(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPhilosophicalFrameworkSchema = createInsertSchema(philosophicalFrameworks).omit({
  id: true,
  createdAt: true,
});

export type InsertPhilosophicalFramework = z.infer<typeof insertPhilosophicalFrameworkSchema>;
export type PhilosophicalFramework = typeof philosophicalFrameworks.$inferSelect;

// Individual Profile Analysis (for deep psychological profiling like Kerem)
export const individualProfiles = pgTable("individual_profiles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  birthDate: text("birth_date"),
  location: text("location"),
  personalSummary: text("personal_summary"),
  consciousnessLevel: text("consciousness_level"), // NPC, Player, Builder, Architect, Ascended
  jungArchetypes: jsonb("jung_archetypes").$type<{
    dominant: string;
    shadow: string;
    active: string;
    description: string;
  }>(),
  traumaMap: jsonb("trauma_map").$type<{
    event: string;
    date: string;
    impact: string;
    status: 'active' | 'healing' | 'resolved';
  }[]>().default([]),
  dreams: jsonb("dreams").$type<{
    date: string;
    title: string;
    content: string;
    symbols: string[];
    interpretation: string;
    verified: boolean;
    verificationDetails?: string;
  }[]>().default([]),
  dejavuPredictions: jsonb("dejavu_predictions").$type<{
    prediction: string;
    confidence: number;
    timeframe: string;
    verified?: boolean;
    verificationDate?: string;
  }[]>().default([]),
  philosophicalAnalysis: jsonb("philosophical_analysis").$type<{
    tradition: PhilosophicalTradition;
    interpretation: string;
  }[]>().default([]),
  psychoFinancialMap: jsonb("psycho_financial_map").$type<{
    financialStress: number;
    focusCapacity: number;
    riskAppetite: number;
    supportNetwork: number;
    familyPressure: number;
    pastSuccess: number;
    dreamIntuition: number;
  }>(),
  recommendations: jsonb("recommendations").$type<{
    urgent: string[];
    shortTerm: string[];
    mediumTerm: string[];
  }>(),
  fateFormula: text("fate_formula"),
  fullReport: text("full_report"),
  createdBy: varchar("created_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIndividualProfileSchema = createInsertSchema(individualProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIndividualProfile = z.infer<typeof insertIndividualProfileSchema>;
export type IndividualProfile = typeof individualProfiles.$inferSelect;

// =============================================
// STOCK MARKET ANALYSIS SYSTEM (v3.3)
// =============================================

// OHLCV Price Data (Candlestick data)
export const stockPriceData = pgTable("stock_price_data", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(), // AAPL, MSFT, SPY, etc.
  exchange: varchar("exchange", { length: 20 }).notNull().default("NASDAQ"), // NASDAQ, NYSE, BIST
  timeframe: varchar("timeframe", { length: 10 }).notNull(), // 1m, 5m, 15m, 1h, 1d
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume").notNull(),
  vwap: real("vwap"), // Volume Weighted Average Price
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStockPriceDataSchema = createInsertSchema(stockPriceData).omit({
  id: true,
  createdAt: true,
});

export type InsertStockPriceData = z.infer<typeof insertStockPriceDataSchema>;
export type StockPriceData = typeof stockPriceData.$inferSelect;

// Order Book Data (Level 2 Market Depth)
export const orderBookSnapshots = pgTable("order_book_snapshots", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  bids: jsonb("bids").$type<{ price: number; size: number; orders: number }[]>().default([]),
  asks: jsonb("asks").$type<{ price: number; size: number; orders: number }[]>().default([]),
  spread: real("spread"),
  midPrice: real("mid_price"),
  imbalance: real("imbalance"), // Bid/Ask imbalance ratio
  largeOrdersDetected: jsonb("large_orders_detected").$type<{
    side: 'bid' | 'ask';
    price: number;
    size: number;
    significance: 'high' | 'medium' | 'low';
  }[]>().default([]),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderBookSnapshotSchema = createInsertSchema(orderBookSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertOrderBookSnapshot = z.infer<typeof insertOrderBookSnapshotSchema>;
export type OrderBookSnapshot = typeof orderBookSnapshots.$inferSelect;

// Dark Pool Data (Hidden institutional trades)
export const darkPoolTrades = pgTable("dark_pool_trades", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  price: real("price").notNull(),
  size: real("size").notNull(), // Number of shares
  notionalValue: real("notional_value"), // Dollar value of trade
  venue: varchar("venue", { length: 50 }), // ATS name (e.g., "Citadel", "Virtu")
  tradeType: varchar("trade_type", { length: 20 }), // block, cross, sweep
  sentiment: varchar("sentiment", { length: 20 }), // bullish, bearish, neutral
  percentOfVolume: real("percent_of_volume"), // % of daily volume
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDarkPoolTradeSchema = createInsertSchema(darkPoolTrades).omit({
  id: true,
  createdAt: true,
});

export type InsertDarkPoolTrade = z.infer<typeof insertDarkPoolTradeSchema>;
export type DarkPoolTrade = typeof darkPoolTrades.$inferSelect;

// Options Flow Data (Smart Money Tracking)
export const optionsFlow = pgTable("options_flow", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  optionType: varchar("option_type", { length: 10 }).notNull(), // call, put
  strike: real("strike").notNull(),
  expiration: timestamp("expiration").notNull(),
  premium: real("premium").notNull(), // Total premium paid
  size: integer("size").notNull(), // Number of contracts
  openInterest: integer("open_interest"),
  impliedVolatility: real("implied_volatility"),
  delta: real("delta"),
  gamma: real("gamma"),
  tradeType: varchar("trade_type", { length: 20 }), // sweep, block, split
  sentiment: varchar("sentiment", { length: 20 }), // bullish, bearish, neutral
  isUnusual: integer("is_unusual").default(0), // 1 = unusual activity
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOptionsFlowSchema = createInsertSchema(optionsFlow).omit({
  id: true,
  createdAt: true,
});

export type InsertOptionsFlow = z.infer<typeof insertOptionsFlowSchema>;
export type OptionsFlow = typeof optionsFlow.$inferSelect;

// Fair Value Gaps (FVG) - Price inefficiencies
export const fairValueGaps = pgTable("fair_value_gaps", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(), // bullish, bearish
  gapTop: real("gap_top").notNull(),
  gapBottom: real("gap_bottom").notNull(),
  gapSize: real("gap_size").notNull(),
  gapPercent: real("gap_percent"),
  filled: integer("filled").default(0), // 0 = unfilled, 1 = filled
  filledAt: timestamp("filled_at"),
  filledPercent: real("filled_percent").default(0),
  significance: varchar("significance", { length: 20 }), // high, medium, low
  createdTimestamp: timestamp("created_timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFairValueGapSchema = createInsertSchema(fairValueGaps).omit({
  id: true,
  createdAt: true,
});

export type InsertFairValueGap = z.infer<typeof insertFairValueGapSchema>;
export type FairValueGap = typeof fairValueGaps.$inferSelect;

// Market Structure Shifts (MSS) - Trend reversals
export const marketStructureShifts = pgTable("market_structure_shifts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  shiftType: varchar("shift_type", { length: 20 }).notNull(), // bullish_to_bearish, bearish_to_bullish
  breakLevel: real("break_level").notNull(), // Price level where structure broke
  previousHigh: real("previous_high"),
  previousLow: real("previous_low"),
  newHigh: real("new_high"),
  newLow: real("new_low"),
  strength: varchar("strength", { length: 20 }), // strong, moderate, weak
  confirmed: integer("confirmed").default(0), // 1 = confirmed by price action
  followThrough: real("follow_through"), // % move after shift
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketStructureShiftSchema = createInsertSchema(marketStructureShifts).omit({
  id: true,
  createdAt: true,
});

export type InsertMarketStructureShift = z.infer<typeof insertMarketStructureShiftSchema>;
export type MarketStructureShift = typeof marketStructureShifts.$inferSelect;

// Liquidity Voids - Areas where price moved quickly
export const liquidityVoids = pgTable("liquidity_voids", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(),
  voidTop: real("void_top").notNull(),
  voidBottom: real("void_bottom").notNull(),
  voidSize: real("void_size").notNull(),
  volumeInVoid: real("volume_in_void"), // Low volume = stronger void
  priceVelocity: real("price_velocity"), // Speed of price movement
  magnetStrength: varchar("magnet_strength", { length: 20 }), // strong, medium, weak
  revisited: integer("revisited").default(0),
  revisitedAt: timestamp("revisited_at"),
  createdTimestamp: timestamp("created_timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLiquidityVoidSchema = createInsertSchema(liquidityVoids).omit({
  id: true,
  createdAt: true,
});

export type InsertLiquidityVoid = z.infer<typeof insertLiquidityVoidSchema>;
export type LiquidityVoid = typeof liquidityVoids.$inferSelect;

// Dream-Market Correlation Analysis
export const dreamMarketCorrelations = pgTable("dream_market_correlations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  analysisDate: timestamp("analysis_date").notNull(),
  dreamMetrics: jsonb("dream_metrics").$type<{
    totalDreams: number;
    negativeRatio: number; // % of nightmares/negative dreams
    chaosIndex: number; // Intensity of chaos-related symbols
    fearSymbols: string[]; // ["falling", "fire", "collapse", "death"]
    hopeSymbols: string[]; // ["flying", "light", "growth", "success"]
    avgIntensity: number;
    geographicBreakdown: { region: string; count: number; sentiment: number }[];
  }>(),
  marketMetrics: jsonb("market_metrics").$type<{
    vix: number;
    vixChange: number;
    spyReturn: number;
    nasdaqReturn: number;
    volume: number;
    volumeChange: number;
    advanceDecline: number;
    putCallRatio: number;
  }>(),
  correlationScores: jsonb("correlation_scores").$type<{
    dreamVsVix: number; // -1 to 1
    chaosVsVolatility: number;
    fearVsSelloff: number;
    hopeVsRally: number;
    overallCorrelation: number;
    timeLag: number; // Days between dream signal and market move
  }>(),
  predictions: jsonb("predictions").$type<{
    direction: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    expectedMove: number; // % expected move
    timeframe: string; // "1d", "2d", "1w"
    keyDreamSignals: string[];
  }>(),
  actualOutcome: jsonb("actual_outcome").$type<{
    actualDirection: 'bullish' | 'bearish' | 'neutral';
    actualMove: number;
    predictionAccuracy: number;
    verifiedAt: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDreamMarketCorrelationSchema = createInsertSchema(dreamMarketCorrelations).omit({
  id: true,
  createdAt: true,
});

export type InsertDreamMarketCorrelation = z.infer<typeof insertDreamMarketCorrelationSchema>;
export type DreamMarketCorrelation = typeof dreamMarketCorrelations.$inferSelect;

// Market Maker Sentiment Analysis
export const marketMakerSentiment = pgTable("market_maker_sentiment", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  analysisDate: timestamp("analysis_date").notNull(),
  orderFlowSentiment: jsonb("order_flow_sentiment").$type<{
    netBuyPressure: number; // -100 to 100
    largeOrderBias: 'buy' | 'sell' | 'neutral';
    retailVsInstitutional: number; // Positive = institutional buying
    darkPoolSentiment: number;
  }>(),
  optionsSentiment: jsonb("options_sentiment").$type<{
    callPutRatio: number;
    gammaExposure: number; // GEX
    deltaExposure: number; // DEX
    maxPainPrice: number;
    unusualActivity: 'bullish' | 'bearish' | 'neutral';
  }>(),
  technicalSentiment: jsonb("technical_sentiment").$type<{
    fvgBias: 'bullish' | 'bearish' | 'neutral';
    mssBias: 'bullish' | 'bearish' | 'neutral';
    liquidityTargets: { price: number; type: 'above' | 'below' }[];
    keyLevels: { price: number; type: string; strength: number }[];
  }>(),
  socialSentiment: jsonb("social_sentiment").$type<{
    twitterScore: number; // -100 to 100
    redditScore: number;
    newsScore: number;
    overallSocial: number;
    trendingTopics: string[];
  }>(),
  dreamSentiment: jsonb("dream_sentiment").$type<{
    chaosIndex: number;
    fearIndex: number;
    hopeIndex: number;
    correlatedSymbols: string[];
    prediction: 'bullish' | 'bearish' | 'neutral';
  }>(),
  compositeSentiment: jsonb("composite_sentiment").$type<{
    overallScore: number; // -100 to 100
    direction: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
    confidence: number; // 0-100
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
    keyFactors: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketMakerSentimentSchema = createInsertSchema(marketMakerSentiment).omit({
  id: true,
  createdAt: true,
});

export type InsertMarketMakerSentiment = z.infer<typeof insertMarketMakerSentimentSchema>;
export type MarketMakerSentiment = typeof marketMakerSentiment.$inferSelect;

// Trading Signals (Al/Sat sinyalleri)
export const tradingSignals = pgTable("trading_signals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  signalType: varchar("signal_type", { length: 20 }).notNull(), // buy, sell, hold
  signalStrength: varchar("signal_strength", { length: 20 }).notNull(), // strong, moderate, weak
  entryPrice: real("entry_price"),
  targetPrice: real("target_price"),
  stopLoss: real("stop_loss"),
  riskRewardRatio: real("risk_reward_ratio"),
  timeframe: varchar("timeframe", { length: 20 }), // scalp, swing, position
  reasoning: jsonb("reasoning").$type<{
    technicalFactors: string[];
    sentimentFactors: string[];
    dreamFactors: string[];
    marketMakerFactors: string[];
  }>(),
  confidence: real("confidence").notNull(), // 0-100
  status: varchar("status", { length: 20 }).default("active"), // active, closed, cancelled
  outcome: jsonb("outcome").$type<{
    exitPrice: number;
    exitDate: string;
    profit: number;
    profitPercent: number;
    hitTarget: boolean;
    hitStopLoss: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTradingSignalSchema = createInsertSchema(tradingSignals).omit({
  id: true,
  createdAt: true,
});

export type InsertTradingSignal = z.infer<typeof insertTradingSignalSchema>;
export type TradingSignal = typeof tradingSignals.$inferSelect;

// Backtest Results
export const backtestResults = pgTable("backtest_results", {
  id: varchar("id", { length: 36 }).primaryKey(),
  strategyName: varchar("strategy_name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalTrades: integer("total_trades").notNull(),
  winningTrades: integer("winning_trades").notNull(),
  losingTrades: integer("losing_trades").notNull(),
  winRate: real("win_rate").notNull(),
  profitFactor: real("profit_factor"),
  sharpeRatio: real("sharpe_ratio"),
  maxDrawdown: real("max_drawdown"),
  totalReturn: real("total_return"),
  avgWin: real("avg_win"),
  avgLoss: real("avg_loss"),
  parameters: jsonb("parameters").$type<Record<string, any>>(),
  dreamCorrelationUsed: integer("dream_correlation_used").default(0),
  dreamCorrelationImpact: real("dream_correlation_impact"), // % improvement from dreams
  trades: jsonb("trades").$type<{
    date: string;
    type: 'buy' | 'sell';
    price: number;
    profit: number;
    dreamSignal?: string;
  }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBacktestResultSchema = createInsertSchema(backtestResults).omit({
  id: true,
  createdAt: true,
});

export type InsertBacktestResult = z.infer<typeof insertBacktestResultSchema>;
export type BacktestResult = typeof backtestResults.$inferSelect;

// =============================================
// ECONOMIC INDICATORS (FRED Data)
// =============================================

export const economicIndicators = pgTable("economic_indicators", {
  id: varchar("id", { length: 36 }).primaryKey(),
  indicatorCode: varchar("indicator_code", { length: 50 }).notNull(), // VIX, T10Y2Y, UMCSENT, UNRATE, etc.
  indicatorName: text("indicator_name").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // fear, yield_curve, consumer, employment, inflation
  value: real("value").notNull(),
  previousValue: real("previous_value"),
  changePercent: real("change_percent"),
  signal: varchar("signal", { length: 20 }), // bullish, bearish, neutral, warning
  regime: varchar("regime", { length: 30 }), // risk_on, risk_off, expansion, contraction
  observationDate: timestamp("observation_date").notNull(),
  source: varchar("source", { length: 20 }).default("FRED"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEconomicIndicatorSchema = createInsertSchema(economicIndicators).omit({
  id: true,
  createdAt: true,
});

export type InsertEconomicIndicator = z.infer<typeof insertEconomicIndicatorSchema>;
export type EconomicIndicator = typeof economicIndicators.$inferSelect;

// =============================================
// INSTITUTIONAL ACTIVITY (Quiver Quant Data)
// =============================================

// Congress Trading
export const congressTrades = pgTable("congress_trades", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  politician: text("politician").notNull(),
  party: varchar("party", { length: 20 }), // D, R, I
  chamber: varchar("chamber", { length: 20 }), // House, Senate
  tradeType: varchar("trade_type", { length: 20 }).notNull(), // buy, sell
  amount: varchar("amount", { length: 50 }), // "$1,001 - $15,000" etc.
  amountLow: real("amount_low"),
  amountHigh: real("amount_high"),
  filingDate: timestamp("filing_date").notNull(),
  tradeDate: timestamp("trade_date"),
  daysUntilDisclosure: integer("days_until_disclosure"),
  priceAtFiling: real("price_at_filing"),
  priceNow: real("price_now"),
  returnSinceFiling: real("return_since_filing"),
  source: varchar("source", { length: 50 }).default("QuiverQuant"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCongressTradeSchema = createInsertSchema(congressTrades).omit({
  id: true,
  createdAt: true,
});

export type InsertCongressTrade = z.infer<typeof insertCongressTradeSchema>;
export type CongressTrade = typeof congressTrades.$inferSelect;

// Insider Trading (SEC Form 4)
export const insiderTrades = pgTable("insider_trades", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  insiderName: text("insider_name").notNull(),
  insiderTitle: text("insider_title"), // CEO, CFO, Director, etc.
  relationship: varchar("relationship", { length: 50 }), // Officer, Director, 10% Owner
  tradeType: varchar("trade_type", { length: 20 }).notNull(), // P-Purchase, S-Sale, A-Award
  shares: real("shares").notNull(),
  pricePerShare: real("price_per_share"),
  totalValue: real("total_value"),
  sharesOwnedAfter: real("shares_owned_after"),
  filingDate: timestamp("filing_date").notNull(),
  tradeDate: timestamp("trade_date"),
  secFormType: varchar("sec_form_type", { length: 10 }).default("4"),
  source: varchar("source", { length: 50 }).default("QuiverQuant"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInsiderTradeSchema = createInsertSchema(insiderTrades).omit({
  id: true,
  createdAt: true,
});

export type InsertInsiderTrade = z.infer<typeof insertInsiderTradeSchema>;
export type InsiderTrade = typeof insiderTrades.$inferSelect;

// 13F Institutional Holdings
export const institutionalHoldings = pgTable("institutional_holdings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  institutionName: text("institution_name").notNull(),
  institutionCik: varchar("institution_cik", { length: 20 }),
  shares: real("shares").notNull(),
  value: real("value").notNull(), // In dollars
  percentOfPortfolio: real("percent_of_portfolio"),
  changeShares: real("change_shares"), // Quarter-over-quarter change
  changePercent: real("change_percent"),
  changeType: varchar("change_type", { length: 20 }), // new, increased, decreased, sold_out, unchanged
  filingDate: timestamp("filing_date").notNull(),
  reportDate: timestamp("report_date"), // Quarter end date
  source: varchar("source", { length: 50 }).default("QuiverQuant"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInstitutionalHoldingSchema = createInsertSchema(institutionalHoldings).omit({
  id: true,
  createdAt: true,
});

export type InsertInstitutionalHolding = z.infer<typeof insertInstitutionalHoldingSchema>;
export type InstitutionalHolding = typeof institutionalHoldings.$inferSelect;

// =============================================
// SAM METRICS (Subconscious Analysis Model)
// =============================================

export const samMetrics = pgTable("sam_metrics", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }), // null = market-wide
  sessionDate: timestamp("session_date").notNull(),
  
  // Night Owl Indicator (02:00-05:00 activity)
  nightOwlScore: real("night_owl_score"), // 0-1, weighted activity
  nightOwlSentiment: varchar("night_owl_sentiment", { length: 20 }), // bullish, bearish, neutral
  nightOwlVolume: integer("night_owl_volume"), // Number of activities
  
  // Dissonance Scoring
  dissonanceDelta: real("dissonance_delta"), // Δ = ||Z_invariant - Z_specific||
  saidVsFeltGap: real("said_vs_felt_gap"), // Verbal-emotional gap
  actionWordGap: real("action_word_gap"), // Behavior-word gap
  
  // Dream Fear Index
  dfiScore: real("dfi_score"), // -100 to 100
  fearKeywords: integer("fear_keywords"), // Count of fear-related keywords
  hopeKeywords: integer("hope_keywords"), // Count of hope-related keywords
  
  // Social Sentiment
  socialSentiment: real("social_sentiment"), // -1 to 1
  twitterSentiment: real("twitter_sentiment"),
  redditSentiment: real("reddit_sentiment"),
  newsSentiment: real("news_sentiment"),
  
  // Combined Signal
  compositeScore: real("composite_score"), // Final SAM score
  marketImplication: varchar("market_implication", { length: 20 }), // bullish, bearish, neutral
  confidence: real("confidence"), // 0-100
  
  metadata: jsonb("metadata").$type<{
    sources: string[];
    sampleSize: number;
    processingTime: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSamMetricSchema = createInsertSchema(samMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertSamMetric = z.infer<typeof insertSamMetricSchema>;
export type SamMetric = typeof samMetrics.$inferSelect;

// =============================================
// FEATURE SNAPSHOTS (ML Feature Store)
// =============================================

export const featureSnapshots = pgTable("feature_snapshots", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  sessionDate: timestamp("session_date").notNull(),
  
  // Layer 1: Hard Data Features
  hardDataFeatures: jsonb("hard_data_features").$type<{
    priceChange1d: number;
    priceChange5d: number;
    volume: number;
    volumeRatio: number; // vs 20-day average
    putCallRatio: number;
    darkPoolNetFlow: number;
    congressNetBuys: number;
    insiderNetBuys: number;
    institutional13fChange: number;
  }>(),
  
  // Layer 2: Technical Features
  technicalFeatures: jsonb("technical_features").$type<{
    fvgCount: number;
    fvgNetDirection: number; // bullish - bearish
    mssSignal: number; // -1, 0, 1
    liquidityVoidNearby: boolean;
    trendStrength: number;
    rsi: number;
    macdSignal: number;
  }>(),
  
  // Layer 3: SAM Features
  samFeatures: jsonb("sam_features").$type<{
    nightOwlScore: number;
    dissonanceDelta: number;
    dfiScore: number;
    socialSentiment: number;
    dreamFearRatio: number;
  }>(),
  
  // Economic Features
  economicFeatures: jsonb("economic_features").$type<{
    vix: number;
    yieldCurve: number;
    consumerSentiment: number;
    unemploymentRate: number;
    cpi: number;
    fedFundsRate: number;
    marketRegime: string;
  }>(),
  
  // Normalized Feature Vector (for ML)
  featureVector: jsonb("feature_vector").$type<number[]>(),
  featureNames: jsonb("feature_names").$type<string[]>(),
  
  version: varchar("version", { length: 20 }).default("1.0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeatureSnapshotSchema = createInsertSchema(featureSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertFeatureSnapshot = z.infer<typeof insertFeatureSnapshotSchema>;
export type FeatureSnapshot = typeof featureSnapshots.$inferSelect;

// =============================================
// MARKET PREDICTIONS
// =============================================

export const marketPredictions = pgTable("market_predictions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  predictionDate: timestamp("prediction_date").notNull(),
  horizonDays: integer("horizon_days").notNull(), // 1, 3, 5, 10, etc.
  targetDate: timestamp("target_date").notNull(),
  learningProcessedAt: timestamp("learning_processed_at"), // Prevents double-counting in self-improving engine
  
  // Prediction
  direction: varchar("direction", { length: 20 }).notNull(), // up, down, neutral
  directionProbability: real("direction_probability").notNull(), // 0-1
  expectedReturn: real("expected_return"), // Expected % return
  priceTarget: real("price_target"),
  priceAtPrediction: real("price_at_prediction").notNull(),
  
  // Confidence & Risk
  confidence: real("confidence").notNull(), // 0-100
  riskLevel: varchar("risk_level", { length: 20 }), // low, medium, high
  
  // Layer Contributions
  layerBreakdown: jsonb("layer_breakdown").$type<{
    hardDataScore: number;
    technicalScore: number;
    samScore: number;
    economicScore: number;
    weights: {
      hardData: number;
      technical: number;
      sam: number;
      economic: number;
    };
  }>(),
  
  // Key Factors
  keyFactors: jsonb("key_factors").$type<{
    bullishFactors: string[];
    bearishFactors: string[];
    uncertaintyFactors: string[];
  }>(),
  
  // Feature Snapshot Reference
  featureSnapshotId: varchar("feature_snapshot_id", { length: 36 }),
  modelVersion: varchar("model_version", { length: 50 }),
  
  // Outcome (filled after target date)
  outcome: jsonb("outcome").$type<{
    actualDirection: 'up' | 'down' | 'neutral';
    actualReturn: number;
    priceAtTarget: number;
    predictionCorrect: boolean;
    errorPercent: number;
  }>(),
  outcomeRecordedAt: timestamp("outcome_recorded_at"),
  
  status: varchar("status", { length: 20 }).default("pending"), // pending, correct, incorrect, expired
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketPredictionSchema = createInsertSchema(marketPredictions).omit({
  id: true,
  createdAt: true,
});

export type InsertMarketPrediction = z.infer<typeof insertMarketPredictionSchema>;
export type MarketPrediction = typeof marketPredictions.$inferSelect;

// =============================================
// LIVE SIGNALS & NOTIFICATIONS
// =============================================

export const liveSignals = pgTable("live_signals", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  signalType: varchar("signal_type", { length: 20 }).notNull(), // buy, sell, hold, alert
  strength: real("strength").notNull(), // 0-100
  direction: varchar("direction", { length: 10 }).notNull(), // up, down, neutral
  price: real("price").notNull(),
  targetPrice: real("target_price"),
  stopLoss: real("stop_loss"),
  takeProfit: real("take_profit"),
  confidence: real("confidence").notNull(),
  source: varchar("source", { length: 50 }).notNull(), // prediction_engine, ml_model, technical, sam
  layerScores: jsonb("layer_scores").$type<{
    hardData: number;
    technical: number;
    sam: number;
    economic: number;
    ml: number;
  }>(),
  keyFactors: jsonb("key_factors").$type<string[]>(),
  riskLevel: varchar("risk_level", { length: 20 }),
  expiresAt: timestamp("expires_at"),
  isActive: integer("is_active").default(1),
  notified: integer("notified").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLiveSignalSchema = createInsertSchema(liveSignals).omit({
  id: true,
  createdAt: true,
});

export type InsertLiveSignal = z.infer<typeof insertLiveSignalSchema>;
export type LiveSignal = typeof liveSignals.$inferSelect;

export const notificationTargets = pgTable("notification_targets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  targetType: varchar("target_type", { length: 20 }).notNull(), // telegram, discord, webhook, email
  targetId: text("target_id").notNull(), // chat_id, channel_id, webhook_url
  isActive: integer("is_active").default(1),
  filters: jsonb("filters").$type<{
    symbols?: string[];
    minConfidence?: number;
    signalTypes?: string[];
  }>(),
  lastNotified: timestamp("last_notified"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationTargetSchema = createInsertSchema(notificationTargets).omit({
  id: true,
  createdAt: true,
});

export type InsertNotificationTarget = z.infer<typeof insertNotificationTargetSchema>;
export type NotificationTarget = typeof notificationTargets.$inferSelect;

// =============================================
// PORTFOLIO OPTIMIZATION (Markowitz)
// =============================================

export const portfolios = pgTable("portfolios", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  name: text("name").notNull(),
  description: text("description"),
  initialCapital: real("initial_capital").notNull(),
  currentValue: real("current_value"),
  targetReturn: real("target_return"), // Annual target return %
  riskTolerance: varchar("risk_tolerance", { length: 20 }), // low, medium, high, aggressive
  optimizationType: varchar("optimization_type", { length: 30 }), // markowitz, risk_parity, equal_weight
  rebalanceFrequency: varchar("rebalance_frequency", { length: 20 }), // daily, weekly, monthly
  lastRebalanced: timestamp("last_rebalanced"),
  performance: jsonb("performance").$type<{
    totalReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
  }>(),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

export const portfolioAssets = pgTable("portfolio_assets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  portfolioId: varchar("portfolio_id", { length: 36 }).notNull(),
  symbol: text("symbol").notNull(),
  shares: real("shares").notNull().default(0),
  weight: real("weight").notNull().default(0),
  currentPrice: real("current_price"),
  costBasis: real("cost_basis"),
  expectedReturn: real("expected_return"),
  volatility: real("volatility"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioAssetSchema = createInsertSchema(portfolioAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPortfolioAsset = z.infer<typeof insertPortfolioAssetSchema>;
export type PortfolioAsset = typeof portfolioAssets.$inferSelect;

export const portfolioRebalances = pgTable("portfolio_rebalances", {
  id: varchar("id", { length: 36 }).primaryKey(),
  portfolioId: varchar("portfolio_id", { length: 36 }).notNull(),
  rebalanceDate: timestamp("rebalance_date").notNull(),
  strategy: text("strategy").notNull(),
  previousWeights: jsonb("previous_weights").$type<Record<string, number>>(),
  newWeights: jsonb("new_weights").$type<Record<string, number>>(),
  trades: jsonb("trades").$type<{ symbol: string; action: 'buy' | 'sell'; shares: number; value: number }[]>(),
  performanceSnapshot: jsonb("performance_snapshot").$type<{ sharpeRatio: number; volatility: number; expectedReturn: number }>(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPortfolioRebalanceSchema = createInsertSchema(portfolioRebalances).omit({
  id: true,
  createdAt: true,
});

export type InsertPortfolioRebalance = z.infer<typeof insertPortfolioRebalanceSchema>;
export type PortfolioRebalance = typeof portfolioRebalances.$inferSelect;

export const assetAllocations = pgTable("asset_allocations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  portfolioId: varchar("portfolio_id", { length: 36 }).notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  assetType: varchar("asset_type", { length: 20 }), // stock, etf, crypto, bond
  sector: varchar("sector", { length: 50 }),
  targetWeight: real("target_weight").notNull(), // 0-1
  currentWeight: real("current_weight"),
  shares: real("shares"),
  avgCost: real("avg_cost"),
  currentPrice: real("current_price"),
  marketValue: real("market_value"),
  unrealizedPnl: real("unrealized_pnl"),
  expectedReturn: real("expected_return"),
  volatility: real("volatility"),
  beta: real("beta"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetAllocationSchema = createInsertSchema(assetAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssetAllocation = z.infer<typeof insertAssetAllocationSchema>;
export type AssetAllocation = typeof assetAllocations.$inferSelect;

export const covarianceMatrix = pgTable("covariance_matrix", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbols: jsonb("symbols").$type<string[]>().notNull(),
  matrix: jsonb("matrix").$type<number[][]>().notNull(),
  correlationMatrix: jsonb("correlation_matrix").$type<number[][]>(),
  periodDays: integer("period_days").notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export const insertCovarianceMatrixSchema = createInsertSchema(covarianceMatrix).omit({
  id: true,
  calculatedAt: true,
});

export type InsertCovarianceMatrix = z.infer<typeof insertCovarianceMatrixSchema>;
export type CovarianceMatrix = typeof covarianceMatrix.$inferSelect;

// =============================================
// MACHINE LEARNING MODELS
// =============================================

export const mlModels = pgTable("ml_models", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  modelType: varchar("model_type", { length: 30 }).notNull(), // xgboost, lightgbm, lstm, ensemble
  version: varchar("version", { length: 20 }).notNull(),
  targetSymbol: varchar("target_symbol", { length: 20 }),
  horizonDays: integer("horizon_days"),
  trainingMetrics: jsonb("training_metrics").$type<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    mse: number;
    mae: number;
  }>(),
  validationMetrics: jsonb("validation_metrics").$type<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  }>(),
  hyperparameters: jsonb("hyperparameters").$type<Record<string, any>>(),
  featureCount: integer("feature_count"),
  trainingDataStart: timestamp("training_data_start"),
  trainingDataEnd: timestamp("training_data_end"),
  modelPath: text("model_path"),
  isActive: integer("is_active").default(1),
  lastPredictionAt: timestamp("last_prediction_at"),
  totalPredictions: integer("total_predictions").default(0),
  correctPredictions: integer("correct_predictions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMlModelSchema = createInsertSchema(mlModels).omit({
  id: true,
  createdAt: true,
});

export type InsertMlModel = z.infer<typeof insertMlModelSchema>;
export type MlModel = typeof mlModels.$inferSelect;

export const featureImportance = pgTable("feature_importance", {
  id: varchar("id", { length: 36 }).primaryKey(),
  modelId: varchar("model_id", { length: 36 }).notNull(),
  featureName: text("feature_name").notNull(),
  importance: real("importance").notNull(),
  importanceType: varchar("importance_type", { length: 30 }), // gain, weight, cover, shap
  rank: integer("rank"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeatureImportanceSchema = createInsertSchema(featureImportance).omit({
  id: true,
  createdAt: true,
});

export type InsertFeatureImportance = z.infer<typeof insertFeatureImportanceSchema>;
export type FeatureImportance = typeof featureImportance.$inferSelect;

// =============================================
// ADVANCED RISK MANAGEMENT
// =============================================

export const riskParameters = pgTable("risk_parameters", {
  id: varchar("id", { length: 36 }).primaryKey(),
  portfolioId: varchar("portfolio_id", { length: 36 }),
  symbol: varchar("symbol", { length: 20 }),
  maxPositionSize: real("max_position_size"), // % of portfolio
  kellyFraction: real("kelly_fraction"), // Optimal Kelly betting fraction
  stopLossPercent: real("stop_loss_percent"),
  takeProfitPercent: real("take_profit_percent"),
  trailingStopPercent: real("trailing_stop_percent"),
  maxDrawdownLimit: real("max_drawdown_limit"),
  targetVolatility: real("target_volatility"),
  varLimit: real("var_limit"), // Value at Risk limit
  var95: real("var_95"), // 95% VaR
  var99: real("var_99"), // 99% VaR
  expectedShortfall: real("expected_shortfall"),
  currentRiskScore: real("current_risk_score"),
  lastCalculated: timestamp("last_calculated"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRiskParametersSchema = createInsertSchema(riskParameters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRiskParameters = z.infer<typeof insertRiskParametersSchema>;
export type RiskParameters = typeof riskParameters.$inferSelect;

export const positionSizing = pgTable("position_sizing", {
  id: varchar("id", { length: 36 }).primaryKey(),
  portfolioId: varchar("portfolio_id", { length: 36 }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  signalId: varchar("signal_id", { length: 36 }),
  method: varchar("method", { length: 30 }).notNull(), // kelly, fixed_fraction, volatility_target, equal_risk
  winProbability: real("win_probability"),
  winLossRatio: real("win_loss_ratio"),
  kellyOptimal: real("kelly_optimal"),
  recommendedSize: real("recommended_size"),
  maxSize: real("max_size"),
  volatilityAdjusted: real("volatility_adjusted"),
  riskPerTrade: real("risk_per_trade"),
  stopDistance: real("stop_distance"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export const insertPositionSizingSchema = createInsertSchema(positionSizing).omit({
  id: true,
  calculatedAt: true,
});

export type InsertPositionSizing = z.infer<typeof insertPositionSizingSchema>;
export type PositionSizing = typeof positionSizing.$inferSelect;

// =============================================
// SOCIAL MEDIA SENTIMENT
// =============================================

export const socialSentiment = pgTable("social_sentiment", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 20 }),
  source: varchar("source", { length: 30 }).notNull(), // twitter, reddit, stocktwits, fintwit
  postId: text("post_id"),
  authorId: text("author_id"),
  authorUsername: text("author_username"),
  content: text("content"),
  sentiment: real("sentiment"), // -1 to 1
  sentimentLabel: varchar("sentiment_label", { length: 20 }), // bullish, bearish, neutral
  confidence: real("confidence"),
  engagement: jsonb("engagement").$type<{
    likes: number;
    retweets?: number;
    comments: number;
    views?: number;
  }>(),
  reach: integer("reach"),
  isInfluencer: integer("is_influencer").default(0),
  keywords: jsonb("keywords").$type<string[]>(),
  mentions: jsonb("mentions").$type<string[]>(),
  hashtags: jsonb("hashtags").$type<string[]>(),
  postedAt: timestamp("posted_at"),
  collectedAt: timestamp("collected_at").defaultNow(),
});

export const insertSocialSentimentSchema = createInsertSchema(socialSentiment).omit({
  id: true,
  collectedAt: true,
});

export type InsertSocialSentiment = z.infer<typeof insertSocialSentimentSchema>;
export type SocialSentiment = typeof socialSentiment.$inferSelect;

export const influencerImpact = pgTable("influencer_impact", {
  id: varchar("id", { length: 36 }).primaryKey(),
  platform: varchar("platform", { length: 30 }).notNull(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  followerCount: integer("follower_count"),
  avgEngagement: real("avg_engagement"),
  sentimentBias: real("sentiment_bias"), // -1 (always bearish) to 1 (always bullish)
  predictionAccuracy: real("prediction_accuracy"),
  impactScore: real("impact_score"),
  topSymbols: jsonb("top_symbols").$type<string[]>(),
  totalPosts: integer("total_posts").default(0),
  lastPostAt: timestamp("last_post_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInfluencerImpactSchema = createInsertSchema(influencerImpact).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInfluencerImpact = z.infer<typeof insertInfluencerImpactSchema>;
export type InfluencerImpact = typeof influencerImpact.$inferSelect;

export const socialAggregates = pgTable("social_aggregates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalMentions: integer("total_mentions").default(0),
  uniqueAuthors: integer("unique_authors").default(0),
  avgSentiment: real("avg_sentiment"),
  sentimentStdDev: real("sentiment_std_dev"),
  bullishPercent: real("bullish_percent"),
  bearishPercent: real("bearish_percent"),
  neutralPercent: real("neutral_percent"),
  totalEngagement: integer("total_engagement"),
  influencerMentions: integer("influencer_mentions").default(0),
  topKeywords: jsonb("top_keywords").$type<Array<{word: string; count: number}>>(),
  sentimentChange: real("sentiment_change"), // vs previous period
  volumeChange: real("volume_change"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSocialAggregatesSchema = createInsertSchema(socialAggregates).omit({
  id: true,
  createdAt: true,
});

export type InsertSocialAggregates = z.infer<typeof insertSocialAggregatesSchema>;
export type SocialAggregates = typeof socialAggregates.$inferSelect;

// =============================================
// BIST (TURKISH STOCK EXCHANGE) SUPPORT
// =============================================

export const bistListings = pgTable("bist_listings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  sector: text("sector"),
  sectorEn: text("sector_en"),
  subSector: text("sub_sector"),
  index: varchar("index", { length: 20 }), // BIST100, BIST30, BIST50
  marketCap: real("market_cap"),
  avgVolume: real("avg_volume"),
  ipoDate: timestamp("ipo_date"),
  isActive: integer("is_active").default(1),
  lastPrice: real("last_price"),
  lastPriceUsd: real("last_price_usd"),
  dailyChange: real("daily_change"),
  weeklyChange: real("weekly_change"),
  monthlyChange: real("monthly_change"),
  yearlyChange: real("yearly_change"),
  peRatio: real("pe_ratio"),
  pbRatio: real("pb_ratio"),
  dividendYield: real("dividend_yield"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBistListingSchema = createInsertSchema(bistListings).omit({
  id: true,
  updatedAt: true,
});

export type InsertBistListing = z.infer<typeof insertBistListingSchema>;
export type BistListing = typeof bistListings.$inferSelect;

export const bistPriceData = pgTable("bist_price_data", {
  id: varchar("id", { length: 36 }).primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume").notNull(),
  turnover: real("turnover"),
  usdRate: real("usd_rate"), // TL/USD exchange rate at time
  closeUsd: real("close_usd"), // Price in USD
  changePercent: real("change_percent"),
});

export const insertBistPriceDataSchema = createInsertSchema(bistPriceData).omit({
  id: true,
});

export type InsertBistPriceData = z.infer<typeof insertBistPriceDataSchema>;
export type BistPriceData = typeof bistPriceData.$inferSelect;

export const turkishMacroIndicators = pgTable("turkish_macro_indicators", {
  id: varchar("id", { length: 36 }).primaryKey(),
  indicatorType: varchar("indicator_type", { length: 50 }).notNull(), // inflation, interest_rate, gdp, unemployment, etc.
  value: real("value").notNull(),
  previousValue: real("previous_value"),
  change: real("change"),
  source: varchar("source", { length: 50 }), // TCMB, TUIK, etc.
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  collectedAt: timestamp("collected_at").defaultNow(),
});

export const insertTurkishMacroIndicatorSchema = createInsertSchema(turkishMacroIndicators).omit({
  id: true,
  collectedAt: true,
});

export type InsertTurkishMacroIndicator = z.infer<typeof insertTurkishMacroIndicatorSchema>;
export type TurkishMacroIndicator = typeof turkishMacroIndicators.$inferSelect;

export const currencyRates = pgTable("currency_rates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  baseCurrency: varchar("base_currency", { length: 5 }).notNull(), // TRY
  quoteCurrency: varchar("quote_currency", { length: 5 }).notNull(), // USD, EUR, GBP
  rate: real("rate").notNull(),
  bid: real("bid"),
  ask: real("ask"),
  dailyChange: real("daily_change"),
  weeklyChange: real("weekly_change"),
  source: varchar("source", { length: 30 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertCurrencyRateSchema = createInsertSchema(currencyRates).omit({
  id: true,
});

export type InsertCurrencyRate = z.infer<typeof insertCurrencyRateSchema>;
export type CurrencyRate = typeof currencyRates.$inferSelect;

// ============================================================================
// TRADING PSYCHOLOGY & MONEY MANAGEMENT KNOWLEDGE BASE
// ============================================================================

export const tradingPsychologyArticles = pgTable("trading_psychology_articles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  category: varchar("category", { length: 50 }).notNull(), // psychology, money_management, risk, discipline, emotions
  title: varchar("title", { length: 255 }).notNull(),
  titleTr: varchar("title_tr", { length: 255 }), // Turkish title
  content: text("content").notNull(),
  contentTr: text("content_tr"), // Turkish content
  keyPrinciples: jsonb("key_principles").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  author: varchar("author", { length: 100 }), // Mark Douglas, Van Tharp, etc.
  sourceBook: varchar("source_book", { length: 255 }),
  embedding: jsonb("embedding").$type<number[]>(),
  embeddingTr: jsonb("embedding_tr").$type<number[]>(), // Turkish embedding
  relevanceScore: real("relevance_score").default(0), // How often this article helps
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTradingPsychologyArticleSchema = createInsertSchema(tradingPsychologyArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTradingPsychologyArticle = z.infer<typeof insertTradingPsychologyArticleSchema>;
export type TradingPsychologyArticle = typeof tradingPsychologyArticles.$inferSelect;

// Trading context for article matching
export const tradingContexts = pgTable("trading_contexts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  contextType: varchar("context_type", { length: 50 }).notNull(), // losing_streak, winning_streak, high_volatility, revenge_trading, fomo, etc.
  emotionalState: varchar("emotional_state", { length: 50 }), // fearful, greedy, calm, anxious, overconfident
  marketCondition: varchar("market_condition", { length: 50 }), // trending, ranging, volatile, calm
  recentWinRate: real("recent_win_rate"),
  recentDrawdown: real("recent_drawdown"),
  triggeredArticles: jsonb("triggered_articles").$type<string[]>().default([]),
  helpfulnessRating: real("helpfulness_rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTradingContextSchema = createInsertSchema(tradingContexts).omit({
  id: true,
  createdAt: true,
});

export type InsertTradingContext = z.infer<typeof insertTradingContextSchema>;
export type TradingContext = typeof tradingContexts.$inferSelect;

// =============================================
// SELF-IMPROVING ENGINE - LEARNING HISTORY
// =============================================

export const layerLearningHistory = pgTable("layer_learning_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  layer: varchar("layer", { length: 20 }).notNull(), // hardData, technical, sam, economic
  regime: varchar("regime", { length: 30 }), // risk_on, risk_off, expansion, contraction, neutral
  horizonDays: integer("horizon_days"), // 1, 3, 5, 10
  symbol: varchar("symbol", { length: 10 }),
  
  // Performance metrics
  totalPredictions: integer("total_predictions").default(0),
  correctPredictions: integer("correct_predictions").default(0),
  accuracy: real("accuracy").default(0), // 0-1
  
  // Rolling accuracy with exponential decay
  rollingAccuracy: real("rolling_accuracy").default(0.5),
  decayFactor: real("decay_factor").default(0.95),
  
  // Pattern analysis
  avgScoreWhenCorrect: real("avg_score_when_correct"),
  avgScoreWhenWrong: real("avg_score_when_wrong"),
  avgConfidenceWhenCorrect: real("avg_confidence_when_correct"),
  avgConfidenceWhenWrong: real("avg_confidence_when_wrong"),
  
  // Optimal thresholds learned from data
  optimalScoreThreshold: real("optimal_score_threshold"),
  optimalConfidenceThreshold: real("optimal_confidence_threshold"),
  
  // Weight adjustment recommendation
  weightAdjustment: real("weight_adjustment").default(0), // -0.10 to +0.10
  
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLayerLearningHistorySchema = createInsertSchema(layerLearningHistory).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertLayerLearningHistory = z.infer<typeof insertLayerLearningHistorySchema>;
export type LayerLearningHistory = typeof layerLearningHistory.$inferSelect;

// Prediction analysis for pattern detection
export const predictionPatterns = pgTable("prediction_patterns", {
  id: varchar("id", { length: 36 }).primaryKey(),
  patternType: varchar("pattern_type", { length: 50 }).notNull(), // layer_agreement, high_confidence, regime_specific, time_of_day
  description: text("description"),
  
  // Pattern conditions
  conditions: jsonb("conditions").$type<{
    minLayerAgreement?: number;
    minConfidence?: number;
    regime?: string;
    horizonDays?: number;
    sessionType?: string;
    volatilityLevel?: string;
  }>(),
  
  // Pattern performance
  occurrences: integer("occurrences").default(0),
  successRate: real("success_rate").default(0),
  avgReturn: real("avg_return"),
  
  // Is this pattern actionable?
  isActive: integer("is_active").default(1),
  minOccurrencesRequired: integer("min_occurrences_required").default(10),
  
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPredictionPatternSchema = createInsertSchema(predictionPatterns).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertPredictionPattern = z.infer<typeof insertPredictionPatternSchema>;
export type PredictionPattern = typeof predictionPatterns.$inferSelect;

// =============================================
// FINANCIAL INTELLIGENCE SYSTEM v2.0
// =============================================

// =============================================
// DIJITAL DUYGU PUSULASI (Digital Emotion Compass)
// =============================================

// Emotion Sources - News outlets, social media, analyst reports
export const emotionSources = pgTable("emotion_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'news', 'social', 'analyst', 'forum'
  url: text("url"),
  reliability: real("reliability").default(0.5), // 0-1 trustworthiness score
  language: varchar("language", { length: 10 }).default("en"),
  lastScraped: timestamp("last_scraped"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEmotionSourceSchema = createInsertSchema(emotionSources).omit({
  id: true,
  createdAt: true,
});

export type InsertEmotionSource = z.infer<typeof insertEmotionSourceSchema>;
export type EmotionSource = typeof emotionSources.$inferSelect;

// Emotion Signals - Individual sentiment readings
export const emotionSignals = pgTable("emotion_signals", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id"),
  symbol: varchar("symbol", { length: 20 }),
  rawText: text("raw_text"),
  sentiment: varchar("sentiment", { length: 20 }), // 'positive', 'negative', 'neutral'
  confidence: real("confidence"), // 0-1
  positiveScore: real("positive_score"),
  negativeScore: real("negative_score"),
  neutralScore: real("neutral_score"),
  model: varchar("model", { length: 50 }), // 'finbert', 'openai', 'gemini'
  relevanceScore: real("relevance_score"), // How relevant to finance
  emotionType: varchar("emotion_type", { length: 30 }), // 'fear', 'greed', 'uncertainty', 'optimism'
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertEmotionSignalSchema = createInsertSchema(emotionSignals).omit({
  id: true,
  timestamp: true,
});

export type InsertEmotionSignal = z.infer<typeof insertEmotionSignalSchema>;
export type EmotionSignal = typeof emotionSignals.$inferSelect;

// Emotion Aggregates - Summarized sentiment for symbols over time
export const emotionAggregates = pgTable("emotion_aggregates", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  timeframe: varchar("timeframe", { length: 10 }).notNull(), // '1h', '4h', '1d', '1w'
  overallSentiment: real("overall_sentiment"), // -1 to +1
  signalCount: integer("signal_count"),
  positiveRatio: real("positive_ratio"),
  negativeRatio: real("negative_ratio"),
  neutralRatio: real("neutral_ratio"),
  avgConfidence: real("avg_confidence"),
  trendDirection: varchar("trend_direction", { length: 20 }), // 'improving', 'declining', 'stable'
  fearGreedIndex: real("fear_greed_index"), // 0-100
  topSources: jsonb("top_sources").$type<string[]>(),
  keyPhrases: jsonb("key_phrases").$type<string[]>(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export const insertEmotionAggregateSchema = createInsertSchema(emotionAggregates).omit({
  id: true,
  calculatedAt: true,
});

export type InsertEmotionAggregate = z.infer<typeof insertEmotionAggregateSchema>;
export type EmotionAggregate = typeof emotionAggregates.$inferSelect;

// =============================================
// NASDAQ SINYAL AVCISI (Signal Hunter)
// =============================================

// Market Signals - Raw signals from various sources
export const marketSignalsV2 = pgTable("market_signals_v2", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  signalType: varchar("signal_type", { length: 30 }).notNull(), // 'order_flow', 'dark_pool', 'options', 'mss', 'fvg', 'liquidity'
  direction: varchar("direction", { length: 10 }), // 'bullish', 'bearish', 'neutral'
  source: varchar("source", { length: 50 }), // 'unusual_whales', 'polygon', 'internal'
  rawData: jsonb("raw_data"),
  premium: real("premium"), // For options signals
  volume: integer("volume"),
  openInterest: integer("open_interest"),
  strike: real("strike"),
  expiry: timestamp("expiry"),
  optionType: varchar("option_type", { length: 10 }), // 'call', 'put'
  unusual: boolean("unusual").default(false),
  whale: boolean("whale").default(false), // Large institutional trade
  darkPoolPercent: real("dark_pool_percent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertMarketSignalV2Schema = createInsertSchema(marketSignalsV2).omit({
  id: true,
  timestamp: true,
});

export type InsertMarketSignalV2 = z.infer<typeof insertMarketSignalV2Schema>;
export type MarketSignalV2 = typeof marketSignalsV2.$inferSelect;

// Signal Scores - Analyzed and scored signals
export const signalScores = pgTable("signal_scores", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id"),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  strength: real("strength"), // 0-100
  probability: real("probability"), // 0-1
  riskLevel: varchar("risk_level", { length: 20 }), // 'low', 'medium', 'high', 'extreme'
  timeHorizon: varchar("time_horizon", { length: 20 }), // 'intraday', 'swing', 'position'
  expectedMove: real("expected_move"), // Predicted % move
  confidence: real("confidence"),
  components: jsonb("components").$type<{
    orderFlow: number;
    darkPool: number;
    options: number;
    technical: number;
    emotion: number;
  }>(),
  explanation: text("explanation"),
  recommendation: varchar("recommendation", { length: 30 }), // 'strong_buy', 'buy', 'hold', 'sell', 'strong_sell'
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export const insertSignalScoreSchema = createInsertSchema(signalScores).omit({
  id: true,
  calculatedAt: true,
});

export type InsertSignalScore = z.infer<typeof insertSignalScoreSchema>;
export type SignalScore = typeof signalScores.$inferSelect;

// Signal Backtests - Performance tracking
export const signalBacktests = pgTable("signal_backtests", {
  id: serial("id").primaryKey(),
  signalType: varchar("signal_type", { length: 30 }).notNull(),
  symbol: varchar("symbol", { length: 20 }),
  testPeriod: varchar("test_period", { length: 20 }), // '1m', '3m', '6m', '1y'
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  accuracy: real("accuracy"),
  profitFactor: real("profit_factor"),
  sharpeRatio: real("sharpe_ratio"),
  totalSignals: integer("total_signals"),
  winRate: real("win_rate"),
  avgWin: real("avg_win"),
  avgLoss: real("avg_loss"),
  maxDrawdown: real("max_drawdown"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSignalBacktestSchema = createInsertSchema(signalBacktests).omit({
  id: true,
  createdAt: true,
});

export type InsertSignalBacktest = z.infer<typeof insertSignalBacktestSchema>;
export type SignalBacktest = typeof signalBacktests.$inferSelect;

// Fused Signals - Combined multi-source signals
export const fusedSignals = pgTable("fused_signals", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  overallDirection: varchar("overall_direction", { length: 10 }), // 'bullish', 'bearish', 'neutral'
  confidenceScore: real("confidence_score"), // 0-1
  components: jsonb("components").$type<{
    orderFlow: number;
    darkPool: number;
    options: number;
    emotion: number;
    technical: number;
    economic: number;
  }>(),
  signalIds: jsonb("signal_ids").$type<number[]>(),
  regime: varchar("regime", { length: 30 }), // 'risk_on', 'risk_off', 'neutral'
  recommendation: text("recommendation"),
  targetPrice: real("target_price"),
  stopLoss: real("stop_loss"),
  riskReward: real("risk_reward"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFusedSignalSchema = createInsertSchema(fusedSignals).omit({
  id: true,
  createdAt: true,
});

export type InsertFusedSignal = z.infer<typeof insertFusedSignalSchema>;
export type FusedSignal = typeof fusedSignals.$inferSelect;

// =============================================
// ACCOUNT SNIPER (Algorithmic Valuation)
// =============================================

// Valuation Profiles - Company fundamentals
export const valuationProfiles = pgTable("valuation_profiles", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  companyName: text("company_name"),
  sector: varchar("sector", { length: 50 }),
  industry: varchar("industry", { length: 100 }),
  marketCap: real("market_cap"),
  enterpriseValue: real("enterprise_value"),
  revenue: real("revenue"),
  netIncome: real("net_income"),
  eps: real("eps"),
  peRatio: real("pe_ratio"),
  pbRatio: real("pb_ratio"),
  psRatio: real("ps_ratio"),
  evToEbitda: real("ev_to_ebitda"),
  debtToEquity: real("debt_to_equity"),
  currentRatio: real("current_ratio"),
  roic: real("roic"),
  roe: real("roe"),
  freeCashFlow: real("free_cash_flow"),
  dividendYield: real("dividend_yield"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertValuationProfileSchema = createInsertSchema(valuationProfiles).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export type InsertValuationProfile = z.infer<typeof insertValuationProfileSchema>;
export type ValuationProfile = typeof valuationProfiles.$inferSelect;

// Valuation Snapshots - Point-in-time valuations
export const valuationSnapshots = pgTable("valuation_snapshots", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id"),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  currentPrice: real("current_price"),
  intrinsicValue: real("intrinsic_value"),
  upside: real("upside"), // % difference
  rating: varchar("rating", { length: 20 }), // 'undervalued', 'fairly_valued', 'overvalued'
  confidence: real("confidence"),
  methodology: varchar("methodology", { length: 30 }), // 'dcf', 'comparables', 'asset_based', 'hybrid'
  assumptions: jsonb("assumptions").$type<{
    growthRate?: number;
    discountRate?: number;
    terminalGrowth?: number;
    marginExpansion?: number;
  }>(),
  keyDrivers: jsonb("key_drivers").$type<string[]>(),
  risks: jsonb("risks").$type<string[]>(),
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export const insertValuationSnapshotSchema = createInsertSchema(valuationSnapshots).omit({
  id: true,
  calculatedAt: true,
});

export type InsertValuationSnapshot = z.infer<typeof insertValuationSnapshotSchema>;
export type ValuationSnapshot = typeof valuationSnapshots.$inferSelect;

// SHAP Feature Importances - Explainability
export const valuationFeatureImportances = pgTable("valuation_feature_importances", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id"),
  featureName: text("feature_name").notNull(),
  featureValue: real("feature_value"),
  shapValue: real("shap_value"),
  contribution: varchar("contribution", { length: 20 }), // 'positive', 'negative'
  rank: integer("rank"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertValuationFeatureImportanceSchema = createInsertSchema(valuationFeatureImportances).omit({
  id: true,
  createdAt: true,
});

export type InsertValuationFeatureImportance = z.infer<typeof insertValuationFeatureImportanceSchema>;
export type ValuationFeatureImportance = typeof valuationFeatureImportances.$inferSelect;

// Model Explanations - Universal explainability
export const modelExplanations = pgTable("model_explanations", {
  id: serial("id").primaryKey(),
  modelType: varchar("model_type", { length: 30 }).notNull(), // 'prediction', 'valuation', 'signal', 'emotion'
  referenceId: integer("reference_id"),
  symbol: varchar("symbol", { length: 20 }),
  baseValue: real("base_value"),
  outputValue: real("output_value"),
  shapSummary: jsonb("shap_summary").$type<Array<{
    feature: string;
    value: number;
    contribution: number;
  }>>(),
  textExplanation: text("text_explanation"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertModelExplanationSchema = createInsertSchema(modelExplanations).omit({
  id: true,
  createdAt: true,
});

export type InsertModelExplanation = z.infer<typeof insertModelExplanationSchema>;
export type ModelExplanation = typeof modelExplanations.$inferSelect;

// Valuation Anomalies - Unusual valuation patterns
export const valuationAnomalies = pgTable("valuation_anomalies", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  anomalyType: varchar("anomaly_type", { length: 50 }), // 'price_value_gap', 'metric_outlier', 'sector_deviation'
  severity: varchar("severity", { length: 20 }), // 'low', 'medium', 'high', 'critical'
  description: text("description"),
  currentValue: real("current_value"),
  expectedValue: real("expected_value"),
  deviation: real("deviation"), // Standard deviations from norm
  potentialOpportunity: boolean("potential_opportunity").default(false),
  metadata: jsonb("metadata"),
  detectedAt: timestamp("detected_at").defaultNow(),
});

export const insertValuationAnomalySchema = createInsertSchema(valuationAnomalies).omit({
  id: true,
  detectedAt: true,
});

export type InsertValuationAnomaly = z.infer<typeof insertValuationAnomalySchema>;
export type ValuationAnomaly = typeof valuationAnomalies.$inferSelect;

// =============================================
// ALPHA SIGNALS SYSTEM (Merf Financial Intelligence)
// =============================================

// Market Metrics - Hard Data Layer
export const marketMetrics = pgTable("market_metrics", {
  id: serial("id").primaryKey(),
  assetSymbol: varchar("asset_symbol", { length: 20 }).notNull(),
  
  // Price Data
  price: real("price"),
  priceChange1d: real("price_change_1d"),
  priceChange5d: real("price_change_5d"),
  volume: real("volume"),
  volumeRatio: real("volume_ratio"),
  
  // Fear/Greed Indicators
  fearGreedIndex: integer("fear_greed_index"),
  vixLevel: real("vix_level"),
  putCallRatio: real("put_call_ratio"),
  
  // Smart Money Flows
  smartMoneyFlow: real("smart_money_flow"),
  darkPoolNetFlow: real("dark_pool_net_flow"),
  institutionalFlow: real("institutional_flow"),
  
  // Technical Signals
  rsi: real("rsi"),
  macdSignal: real("macd_signal"),
  trendStrength: real("trend_strength"),
  
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const insertMarketMetricSchema = createInsertSchema(marketMetrics).omit({
  id: true,
  recordedAt: true,
});

export type InsertMarketMetric = z.infer<typeof insertMarketMetricSchema>;
export type MarketMetric = typeof marketMetrics.$inferSelect;

// Subconscious Logs - SAM Data Layer
export const subconsciousLogs = pgTable("subconscious_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 }),
  
  // Dream Content
  dreamContent: text("dream_content"),
  dreamSentimentScore: real("dream_sentiment_score"),
  dreamFearLevel: real("dream_fear_level"),
  dreamHopeLevel: real("dream_hope_level"),
  dreamKeywords: jsonb("dream_keywords").$type<string[]>(),
  
  // Night Owl Metrics
  nightOwlActivity: integer("night_owl_activity").default(0),
  activityHour: integer("activity_hour"),
  isNightOwlWindow: integer("is_night_owl_window").default(0),
  
  // Sentiment Dissonance
  saidSentiment: real("said_sentiment"),
  feltSentiment: real("felt_sentiment"),
  dissonanceScore: real("dissonance_score"),
  
  // Market Implication
  marketImplication: varchar("market_implication", { length: 20 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubconsciousLogSchema = createInsertSchema(subconsciousLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertSubconsciousLog = z.infer<typeof insertSubconsciousLogSchema>;
export type SubconsciousLog = typeof subconsciousLogs.$inferSelect;

// Alpha Signals - Synthesized Intelligence
export const alphaSignals = pgTable("alpha_signals", {
  id: serial("id").primaryKey(),
  targetDate: timestamp("target_date").notNull(),
  assetSymbol: varchar("asset_symbol", { length: 20 }).default("NASDAQ"),
  
  // Prediction
  predictedDirection: varchar("predicted_direction", { length: 20 }).notNull(),
  confidenceScore: real("confidence_score").notNull(),
  expectedReturn: real("expected_return"),
  riskLevel: varchar("risk_level", { length: 20 }),
  
  // Layer Scores (0-100)
  hardDataScore: real("hard_data_score"),
  technicalScore: real("technical_score"),
  samScore: real("sam_score"),
  economicScore: real("economic_score"),
  emotionScore: real("emotion_score"),
  microstructureScore: real("microstructure_score"),
  
  // Source Weights
  sourceWeights: jsonb("source_weights").$type<{
    hard: number;
    technical: number;
    sam: number;
    economic: number;
    emotion: number;
    microstructure: number;
  }>(),
  
  // Key Factors
  bullishFactors: jsonb("bullish_factors").$type<string[]>(),
  bearishFactors: jsonb("bearish_factors").$type<string[]>(),
  
  // Night Owl Contribution
  nightOwlInfluence: real("night_owl_influence"),
  dreamFearContribution: real("dream_fear_contribution"),
  
  // Signal Metadata
  signalStrength: varchar("signal_strength", { length: 20 }),
  marketRegime: varchar("market_regime", { length: 30 }),
  
  // Outcome (filled after target date)
  actualDirection: varchar("actual_direction", { length: 20 }),
  actualReturn: real("actual_return"),
  wasCorrect: integer("was_correct"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlphaSignalSchema = createInsertSchema(alphaSignals).omit({
  id: true,
  createdAt: true,
});

export type InsertAlphaSignal = z.infer<typeof insertAlphaSignalSchema>;
export type AlphaSignal = typeof alphaSignals.$inferSelect;

// Daily Market Summary for Dashboard
export const dailyMarketSummary = pgTable("daily_market_summary", {
  id: serial("id").primaryKey(),
  summaryDate: timestamp("summary_date").notNull(),
  
  // Overall Market Status
  marketMood: varchar("market_mood", { length: 30 }),
  moodEmoji: varchar("mood_emoji", { length: 10 }),
  overallConfidence: real("overall_confidence"),
  
  // Primary Message
  primaryInsight: text("primary_insight"),
  secondaryInsight: text("secondary_insight"),
  
  // Key Metrics Summary
  fearGreedLevel: integer("fear_greed_level"),
  nightOwlAlert: integer("night_owl_alert").default(0),
  dreamFearIndex: real("dream_fear_index"),
  volatilityExpected: varchar("volatility_expected", { length: 20 }),
  
  // Recommendations
  recommendations: jsonb("recommendations").$type<string[]>(),
  
  // Economic Calendar
  upcomingEvents: jsonb("upcoming_events").$type<Array<{
    event: string;
    date: string;
    impact: string;
  }>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDailyMarketSummarySchema = createInsertSchema(dailyMarketSummary).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyMarketSummary = z.infer<typeof insertDailyMarketSummarySchema>;
export type DailyMarketSummary = typeof dailyMarketSummary.$inferSelect;

// FinBERT Financial Sentiment Analysis Results
export const finbertSentiments = pgTable("finbert_sentiments", {
  id: serial("id").primaryKey(),
  sourceType: varchar("source_type", { length: 30 }).notNull(), // 'social_post', 'news', 'tweet', 'dream'
  sourceId: varchar("source_id", { length: 100 }),
  sourceText: text("source_text").notNull(),
  language: varchar("language", { length: 10 }).default("en"),
  
  // FinBERT Results
  sentimentLabel: varchar("sentiment_label", { length: 20 }).notNull(), // 'positive', 'negative', 'neutral'
  confidence: real("confidence").notNull(),
  positiveProb: real("positive_prob"),
  negativeProb: real("negative_prob"),
  neutralProb: real("neutral_prob"),
  
  // Normalized Score (-1 to 1)
  normalizedScore: real("normalized_score"),
  
  // Context
  assetSymbol: varchar("asset_symbol", { length: 20 }),
  keywords: jsonb("keywords").$type<string[]>(),
  
  analyzedAt: timestamp("analyzed_at").defaultNow(),
});

export const insertFinbertSentimentSchema = createInsertSchema(finbertSentiments).omit({
  id: true,
  analyzedAt: true,
});

export type InsertFinbertSentiment = z.infer<typeof insertFinbertSentimentSchema>;
export type FinbertSentiment = typeof finbertSentiments.$inferSelect;

// Prediction Validations - Live Accuracy Tracking
export const predictionValidations = pgTable("prediction_validations", {
  id: serial("id").primaryKey(),
  predictionId: integer("prediction_id"), // Links to alphaSignals.id
  
  // Prediction Details
  symbol: varchar("symbol", { length: 20 }).notNull(),
  predictionTimestamp: timestamp("prediction_timestamp").notNull(),
  horizonDays: integer("horizon_days").default(1),
  
  // Expected vs Actual
  expectedDirection: varchar("expected_direction", { length: 20 }).notNull(), // 'bullish', 'bearish', 'neutral'
  actualDirection: varchar("actual_direction", { length: 20 }),
  expectedConfidence: real("expected_confidence"),
  
  // Outcome Metrics
  outcome: varchar("outcome", { length: 20 }), // 'correct', 'incorrect', 'pending', 'neutral'
  actualReturnPct: real("actual_return_pct"),
  
  // Source Attribution
  samContribution: real("sam_contribution"),
  finbertContribution: real("finbert_contribution"),
  technicalContribution: real("technical_contribution"),
  economicContribution: real("economic_contribution"),
  
  // Metadata
  notes: text("notes"),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPredictionValidationSchema = createInsertSchema(predictionValidations).omit({
  id: true,
  createdAt: true,
});

export type InsertPredictionValidation = z.infer<typeof insertPredictionValidationSchema>;
export type PredictionValidation = typeof predictionValidations.$inferSelect;

// Live Accuracy Metrics Summary
export const accuracyMetrics = pgTable("accuracy_metrics", {
  id: serial("id").primaryKey(),
  metricDate: timestamp("metric_date").notNull(),
  symbol: varchar("symbol", { length: 20 }).default("NASDAQ"),
  
  // Rolling Accuracy
  accuracy7d: real("accuracy_7d"),
  accuracy30d: real("accuracy_30d"),
  accuracy90d: real("accuracy_90d"),
  accuracyAllTime: real("accuracy_all_time"),
  
  // Counts
  totalPredictions: integer("total_predictions"),
  correctPredictions: integer("correct_predictions"),
  incorrectPredictions: integer("incorrect_predictions"),
  pendingValidations: integer("pending_validations"),
  
  // Layer Performance
  samAccuracy: real("sam_accuracy"),
  finbertAccuracy: real("finbert_accuracy"),
  technicalAccuracy: real("technical_accuracy"),
  economicAccuracy: real("economic_accuracy"),
  
  // Best/Worst Performers
  bestPerformingLayer: varchar("best_performing_layer", { length: 30 }),
  worstPerformingLayer: varchar("worst_performing_layer", { length: 30 }),
  
  // Confidence Calibration
  highConfidenceAccuracy: real("high_confidence_accuracy"), // Predictions with >70% confidence
  lowConfidenceAccuracy: real("low_confidence_accuracy"),   // Predictions with <50% confidence
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccuracyMetricsSchema = createInsertSchema(accuracyMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertAccuracyMetrics = z.infer<typeof insertAccuracyMetricsSchema>;
export type AccuracyMetrics = typeof accuracyMetrics.$inferSelect;
