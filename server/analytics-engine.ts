import type {
  AnalyticsData,
  TrendsData,
  ComparisonData,
  SentimentBreakdown,
  HashtagData,
  CreatorData,
  EmojiData,
  CategoryData,
  HourData,
  TrendingItem,
  ComparisonMetric,
  EngagementTrendPoint,
  HeatmapCell,
  SentimentTrendPoint,
  AdvancedVisualizationData,
} from "@shared/schema";
import { log } from "./index";
import fs from "fs";
import path from "path";
import { openai } from "./openai-client";

interface DetailedSentiment {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  emotions: string[];
  intensity: "low" | "medium" | "high";
  keywords: string[];
}

interface TikTokItem {
  id?: string;
  desc?: string;
  text?: string;
  createTime?: number;
  createTimeISO?: string;
  authorMeta?: {
    name?: string;
    nickName?: string;
  };
  diggCount?: number;
  shareCount?: number;
  playCount?: number;
  commentCount?: number;
  hashtags?: Array<{ name?: string }>;
  webVideoUrl?: string;
}

interface PhoneConversation {
  id?: string;
  participants?: string[];
  duration?: number;
  text?: string;
  sentiment?: string;
  emotion_score?: number;
  keywords?: string[];
  timestamp?: string;
  emotions?: {
    primary?: string;
    secondary?: string[];
  };
  tone?: {
    formal?: number;
    casual?: number;
    urgent?: number;
    friendly?: number;
  };
}

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
const HASHTAG_REGEX = /#[\w\u0080-\uFFFF]+/g;

const sentimentCache = new Map<string, DetailedSentiment>();

interface DatasetMetadata {
  name: string;
  displayName: string;
  platform: string;
  recordCount: number;
  isUploaded: boolean;
  uploadedAt?: Date;
}

export class AnalyticsEngine {
  private datasets: Map<string, any[]> = new Map();
  private datasetMetadata: Map<string, DatasetMetadata> = new Map();
  private useAISentiment: boolean = true;

  constructor() {
    this.loadDatasets();
  }

  addCustomDataset(name: string, data: any[], platform: string): void {
    this.datasets.set(name, data);
    this.datasetMetadata.set(name, {
      name,
      displayName: this.formatDatasetName(name, platform),
      platform,
      recordCount: data.length,
      isUploaded: true,
      uploadedAt: new Date(),
    });
    log(`Added custom dataset: ${name} (${platform}) with ${data.length} records`);
  }

  getUploadedDatasets(): DatasetMetadata[] {
    return Array.from(this.datasetMetadata.values())
      .filter(meta => meta.isUploaded)
      .sort((a, b) => {
        const dateA = a.uploadedAt?.getTime() || 0;
        const dateB = b.uploadedAt?.getTime() || 0;
        return dateB - dateA;
      });
  }

  removeDataset(name: string): boolean {
    if (!this.datasets.has(name)) {
      return false;
    }
    this.datasets.delete(name);
    this.datasetMetadata.delete(name);
    return true;
  }

  private formatDatasetName(name: string, platform: string): string {
    const platformLabels: Record<string, string> = {
      tiktok: "TikTok",
      instagram: "Instagram",
      linkedin: "LinkedIn",
      spotify: "Spotify",
      phone_conversations: "Phone Conversations",
    };
    const label = platformLabels[platform] || platform;
    const shortId = name.split("_").pop() || "";
    return `${label} (${shortId})`;
  }

  async analyzeWithAI(texts: string[]): Promise<DetailedSentiment[]> {
    if (!texts.length) return [];

    const batchSize = 10;
    const results: DetailedSentiment[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const uncachedTexts: { index: number; text: string }[] = [];

      batch.forEach((text, idx) => {
        const cached = sentimentCache.get(text);
        if (cached) {
          results[i + idx] = cached;
        } else {
          uncachedTexts.push({ index: i + idx, text });
        }
      });

      if (uncachedTexts.length === 0) continue;

      try {
        const prompt = `Analyze the sentiment of each text below. Return a JSON array with one object per text.

Each object must have:
- "sentiment": "positive", "negative", or "neutral"
- "confidence": 0-1 score
- "emotions": array of detected emotions (joy, sadness, anger, fear, surprise, disgust, trust, anticipation)
- "intensity": "low", "medium", or "high"
- "keywords": array of key sentiment-bearing words

Texts to analyze:
${uncachedTexts.map((t, idx) => `${idx + 1}. "${t.text}"`).join("\n")}

Return ONLY valid JSON array, no explanation.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content || "[]";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as DetailedSentiment[];
          parsed.forEach((result, idx) => {
            if (uncachedTexts[idx]) {
              const validResult: DetailedSentiment = {
                sentiment: result.sentiment || "neutral",
                confidence: result.confidence || 0.5,
                emotions: result.emotions || [],
                intensity: result.intensity || "medium",
                keywords: result.keywords || [],
              };
              results[uncachedTexts[idx].index] = validResult;
              sentimentCache.set(uncachedTexts[idx].text, validResult);
            }
          });
        }
      } catch (error) {
        log(`AI sentiment analysis error: ${error}`);
        uncachedTexts.forEach(({ index, text }) => {
          const fallback = this.analyzeSentimentFallback(text);
          results[index] = {
            sentiment: fallback,
            confidence: 0.5,
            emotions: [],
            intensity: "medium",
            keywords: [],
          };
        });
      }
    }

    return results;
  }

  async analyzeSingleWithAI(text: string): Promise<DetailedSentiment> {
    if (!text) {
      return { sentiment: "neutral", confidence: 0.5, emotions: [], intensity: "medium", keywords: [] };
    }

    const cached = sentimentCache.get(text);
    if (cached) return cached;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Analyze this text's sentiment. Return JSON with: sentiment (positive/negative/neutral), confidence (0-1), emotions (array), intensity (low/medium/high), keywords (array).

Text: "${text}"

Return ONLY valid JSON object.`
        }],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]) as DetailedSentiment;
        const validResult: DetailedSentiment = {
          sentiment: result.sentiment || "neutral",
          confidence: result.confidence || 0.5,
          emotions: result.emotions || [],
          intensity: result.intensity || "medium",
          keywords: result.keywords || [],
        };
        sentimentCache.set(text, validResult);
        return validResult;
      }
    } catch (error) {
      log(`AI single sentiment error: ${error}`);
    }

    const fallback = this.analyzeSentimentFallback(text);
    return { sentiment: fallback, confidence: 0.5, emotions: [], intensity: "medium", keywords: [] };
  }

  private loadDatasets(): void {
    const dataDir = path.join(process.cwd(), "data");
    
    if (!fs.existsSync(dataDir)) {
      log(`Data directory not found: ${dataDir}`);
      return;
    }

    const files = fs.readdirSync(dataDir);
    
    const tiktokJsonFiles = [
      { file: "dataset_tiktok-scraper_2025-11-18_16-59-11-541.json", name: "tiktok_main", display: "TikTok Ana Veri" },
      { file: "poizi tiktok hesabı.json", name: "tiktok_poizi", display: "TikTok Poizi Hesabı" },
      { file: "poizi yazınca ne çıkıyor.json", name: "tiktok_poizi_search", display: "TikTok Poizi Arama" },
      { file: "global rap.json", name: "tiktok_global_rap", display: "TikTok Global Rap" },
      { file: "xx fan hesap analiz.json", name: "tiktok_fan_analiz", display: "TikTok Fan Hesap Analizi" },
      { file: "artist.json", name: "tiktok_artist", display: "TikTok Artist Data" },
      { file: "influencer.json", name: "tiktok_influencer", display: "TikTok Influencer Data" },
      { file: "normal_user.json", name: "tiktok_normal_user", display: "TikTok Normal User Data" },
      { file: "prci.json", name: "tiktok_prci", display: "TikTok PRCI Data" },
    ];

    for (const { file, name, display } of tiktokJsonFiles) {
      try {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          const records = Array.isArray(data) ? data : [data];
          this.datasets.set(name, records);
          this.datasetMetadata.set(name, {
            name,
            displayName: display,
            platform: "tiktok",
            recordCount: records.length,
            isUploaded: false,
          });
          log(`Loaded ${display}: ${records.length} records`);
        }
      } catch (error) {
        log(`Failed to load ${file}: ${error}`);
      }
    }

    const spotifyFiles = [
      { file: "poizi spoti.csv", name: "spotify_poizi", display: "Spotify Poizi" },
      { file: "mlisa.csv", name: "spotify_mlisa", display: "Spotify Mlisa" },
      { file: "ender spoti.csv", name: "spotify_ender", display: "Spotify Ender" },
      { file: "blok 3.csv", name: "spotify_blok3", display: "Spotify Blok 3" },
      { file: "cıstak data.csv", name: "spotify_cistak", display: "Spotify Cıstak" },
    ];

    for (const { file, name, display } of spotifyFiles) {
      try {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
          const csvContent = fs.readFileSync(filePath, "utf-8");
          const csvData = this.parseCSV(csvContent);
          this.datasets.set(name, csvData);
          this.datasetMetadata.set(name, {
            name,
            displayName: display,
            platform: "spotify",
            recordCount: csvData.length,
            isUploaded: false,
          });
          log(`Loaded ${display}: ${csvData.length} records`);
        }
      } catch (error) {
        log(`Failed to load ${file}: ${error}`);
      }
    }

    const instagramFiles = [
      { file: "dataset_instagram-scraper_2025-11-15_00-31-39-764.csv", name: "instagram_1", display: "Instagram Hashtag Data 1" },
      { file: "dataset_instagram-scraper_2025-11-15_00-41-59-387.csv", name: "instagram_2", display: "Instagram Hashtag Data 2" },
      { file: "dataset_instagram-scraper_2025-11-15_00-53-00-752.csv", name: "instagram_3", display: "Instagram Hashtag Data 3" },
    ];

    for (const { file, name, display } of instagramFiles) {
      try {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
          const csvContent = fs.readFileSync(filePath, "utf-8");
          const csvData = this.parseCSV(csvContent);
          this.datasets.set(name, csvData);
          this.datasetMetadata.set(name, {
            name,
            displayName: display,
            platform: "instagram",
            recordCount: csvData.length,
            isUploaded: false,
          });
          log(`Loaded ${display}: ${csvData.length} records`);
        }
      } catch (error) {
        log(`Failed to load ${file}: ${error}`);
      }
    }

    const tiktokSoundFiles = [
      { file: "dataset_tiktok-sound-scraper_2025-11-15_16-21-40-044.csv", name: "tiktok_sound_1", display: "TikTok Sound Data 1" },
      { file: "dataset_tiktok-sound-scraper_2025-11-15_16-55-22-986.csv", name: "tiktok_sound_2", display: "TikTok Sound Data 2" },
    ];

    for (const { file, name, display } of tiktokSoundFiles) {
      try {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
          const csvContent = fs.readFileSync(filePath, "utf-8");
          const csvData = this.parseCSV(csvContent);
          this.datasets.set(name, csvData);
          this.datasetMetadata.set(name, {
            name,
            displayName: display,
            platform: "tiktok",
            recordCount: csvData.length,
            isUploaded: false,
          });
          log(`Loaded ${display}: ${csvData.length} records`);
        }
      } catch (error) {
        log(`Failed to load ${file}: ${error}`);
      }
    }

    const twitterCsvPath = path.join(dataDir, "dataset_twitter-user-scraper_2025-11-15_00-09-40-307.csv");
    try {
      if (fs.existsSync(twitterCsvPath)) {
        const csvContent = fs.readFileSync(twitterCsvPath, "utf-8");
        const csvData = this.parseCSV(csvContent);
        this.datasets.set("twitter_users", csvData);
        this.datasetMetadata.set("twitter_users", {
          name: "twitter_users",
          displayName: "Twitter/X Users",
          platform: "twitter",
          recordCount: csvData.length,
          isUploaded: false,
        });
        log(`Loaded Twitter Users: ${csvData.length} records`);
      }
    } catch (error) {
      log(`Failed to load Twitter CSV: ${error}`);
    }
  }

  private parseCSV(content: string): any[] {
    const { headers, rows } = this.parseCSVContent(content);
    if (headers.length === 0 || rows.length === 0) return [];

    const data: any[] = [];
    for (const values of rows) {
      const obj: any = {};
      const minLen = Math.min(headers.length, values.length);
      for (let idx = 0; idx < minLen; idx++) {
        obj[headers[idx]] = values[idx];
      }
      if (minLen > 0 && Object.keys(obj).some(k => obj[k] && obj[k].length > 0)) {
        data.push(obj);
      }
    }

    return data;
  }

  private parseCSVContent(content: string): { headers: string[]; rows: string[][] } {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;
    let i = 0;

    while (i < content.length) {
      const char = content[i];
      
      if (char === '"') {
        if (inQuotes && content[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i++;
        continue;
      }

      if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && content[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f.length > 0)) {
        rows.push(currentRow);
      }
    }

    const headers = rows.length > 0 ? rows[0].map(h => h.replace(/"/g, "")) : [];
    const dataRows = rows.slice(1);

    return { headers, rows: dataRows };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  private analyzeSentimentFallback(text: string): "positive" | "negative" | "neutral" {
    if (!text) return "neutral";
    
    const lowerText = text.toLowerCase();
    
    const positiveWords = [
      "love", "great", "amazing", "awesome", "beautiful", "best", "happy",
      "excellent", "wonderful", "fantastic", "incredible", "perfect", "good",
      "harika", "güzel", "mükemmel", "iyi", "mutlu", "sevgi", "teşekkür",
      "super", "cool", "nice", "wow", "like", "enjoy", "fun"
    ];
    
    const negativeWords = [
      "hate", "bad", "terrible", "awful", "worst", "sad", "angry", "annoying",
      "horrible", "disappointed", "poor", "ugly", "boring", "stupid",
      "kötü", "berbat", "korkunç", "üzgün", "kızgın", "sinir", "sıkıcı"
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    if (positiveCount > negativeCount) return "positive";
    if (negativeCount > positiveCount) return "negative";
    return "neutral";
  }

  private analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
    return this.analyzeSentimentFallback(text);
  }

  private extractHashtags(text: string): string[] {
    if (!text) return [];
    const matches = text.match(HASHTAG_REGEX) || [];
    return matches.map(tag => tag.toLowerCase());
  }

  private extractEmojis(text: string): string[] {
    if (!text) return [];
    return text.match(EMOJI_REGEX) || [];
  }

  private extractCategory(text: string, hashtags: string[]): string {
    const categories: Record<string, string[]> = {
      "Entertainment": ["funny", "comedy", "meme", "viral", "trend", "challenge"],
      "Music": ["music", "song", "dance", "singing", "rap", "beat", "müzik", "şarkı"],
      "Lifestyle": ["life", "daily", "routine", "vlog", "day", "yaşam"],
      "Beauty": ["makeup", "beauty", "skincare", "fashion", "makyaj", "güzellik"],
      "Food": ["food", "recipe", "cooking", "eat", "yemek", "tarif"],
      "Travel": ["travel", "trip", "vacation", "adventure", "seyahat", "gezi"],
      "Education": ["learn", "tutorial", "howto", "tips", "education", "eğitim"],
      "Sports": ["fitness", "workout", "sport", "gym", "exercise", "spor"],
      "Technology": ["tech", "gaming", "phone", "app", "computer", "teknoloji"],
      "Business": ["business", "entrepreneur", "money", "work", "iş", "para"],
    };

    const allText = (text + " " + hashtags.join(" ")).toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => allText.includes(kw))) {
        return category;
      }
    }

    return "Other";
  }

  async getAnalytics(datasetName: string): Promise<AnalyticsData> {
    const data = this.datasets.get(datasetName) || [];
    log(`Analyzing dataset: ${datasetName}, records: ${data.length}`);

    if (datasetName === "phone_conversations") {
      return this.analyzePhoneConversations(data as PhoneConversation[]);
    }

    return this.analyzeTikTokData(data as TikTokItem[], datasetName);
  }

  private analyzeTikTokData(data: TikTokItem[], datasetName: string): AnalyticsData {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const hashtagCounts: Map<string, number> = new Map();
    const creatorStats: Map<string, { videoCount: number; totalViews: number }> = new Map();
    const emojiCounts: Map<string, number> = new Map();
    const categoryCounts: Map<string, number> = new Map();
    const hourCounts: Map<number, number> = new Map();

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    data.forEach((item) => {
      const text = item.desc || item.text || "";
      const sentiment = this.analyzeSentiment(text);
      sentimentCounts[sentiment]++;

      const hashtags = item.hashtags?.map(h => `#${h.name || ""}`) || this.extractHashtags(text);
      hashtags.forEach((tag) => {
        if (tag && tag.length > 1) {
          hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
        }
      });

      const username = item.authorMeta?.name || item.authorMeta?.nickName || "unknown";
      const views = parseInt(String(item.playCount || 0));
      const existingCreator = creatorStats.get(username) || { videoCount: 0, totalViews: 0 };
      creatorStats.set(username, {
        videoCount: existingCreator.videoCount + 1,
        totalViews: existingCreator.totalViews + views,
      });

      const emojis = this.extractEmojis(text);
      emojis.forEach((emoji) => {
        emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
      });

      const category = this.extractCategory(text, hashtags);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

      const createTime = item.createTime || (item.createTimeISO ? new Date(item.createTimeISO).getTime() / 1000 : 0);
      if (createTime) {
        const hour = new Date(createTime * 1000).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }

      totalViews += parseInt(String(item.playCount || 0));
      totalLikes += parseInt(String(item.diggCount || 0));
      totalComments += parseInt(String(item.commentCount || 0));
      totalShares += parseInt(String(item.shareCount || 0));
    });

    const totalEngagement = totalLikes + totalComments + totalShares;
    const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

    const topHashtags: HashtagData[] = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([hashtag, count]) => ({ hashtag, count }));

    const topCreators: CreatorData[] = Array.from(creatorStats.entries())
      .sort((a, b) => b[1].totalViews - a[1].totalViews)
      .slice(0, 10)
      .map(([username, stats]) => ({
        username,
        videoCount: stats.videoCount,
        totalViews: stats.totalViews,
      }));

    const topEmojis: EmojiData[] = Array.from(emojiCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([emoji, count]) => ({ emoji, count }));

    const categoryBreakdown: CategoryData[] = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));

    const activeHours: HourData[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts.get(hour) || 0,
    }));

    return {
      datasetName,
      totalRecords: data.length,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      avgEngagementRate,
      sentimentBreakdown: sentimentCounts,
      topHashtags,
      topCreators,
      topEmojis,
      categoryBreakdown,
      activeHours,
    };
  }

  private analyzePhoneConversations(data: PhoneConversation[]): AnalyticsData {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const keywordCounts: Map<string, number> = new Map();
    const participantStats: Map<string, { callCount: number; totalDuration: number }> = new Map();
    const hourCounts: Map<number, number> = new Map();

    let totalEmotionScore = 0;

    data.forEach((conv) => {
      const sentiment = (conv.sentiment as "positive" | "negative" | "neutral") || 
        this.analyzeSentiment(conv.text || "");
      sentimentCounts[sentiment]++;

      (conv.keywords || []).forEach((keyword) => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      });

      (conv.participants || []).forEach((participant) => {
        const existing = participantStats.get(participant) || { callCount: 0, totalDuration: 0 };
        participantStats.set(participant, {
          callCount: existing.callCount + 1,
          totalDuration: existing.totalDuration + (conv.duration || 0),
        });
      });

      if (conv.timestamp) {
        const hour = new Date(conv.timestamp).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }

      totalEmotionScore += conv.emotion_score || 0;
    });

    const avgEmotionScore = data.length > 0 ? (totalEmotionScore / data.length) * 100 : 0;

    const topHashtags: HashtagData[] = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([hashtag, count]) => ({ hashtag, count }));

    const topCreators: CreatorData[] = Array.from(participantStats.entries())
      .sort((a, b) => b[1].callCount - a[1].callCount)
      .slice(0, 10)
      .map(([username, stats]) => ({
        username,
        videoCount: stats.callCount,
        totalViews: stats.totalDuration,
      }));

    const activeHours: HourData[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts.get(hour) || 0,
    }));

    return {
      datasetName: "phone_conversations",
      totalRecords: data.length,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      avgEngagementRate: avgEmotionScore,
      sentimentBreakdown: sentimentCounts,
      topHashtags,
      topCreators,
      topEmojis: [],
      categoryBreakdown: [],
      activeHours,
    };
  }

  async getTrends(datasetName: string, limit: number = 10): Promise<TrendsData> {
    const data = this.datasets.get(datasetName) || [];

    const trendingContent: TrendingItem[] = [];
    const hashtagCounts: Map<string, number> = new Map();
    const categoryCounts: Map<string, number> = new Map();
    let posCount = 0, negCount = 0, neuCount = 0;

    (data as TikTokItem[]).forEach((item, index) => {
      const text = item.desc || item.text || "";
      const sentiment = this.analyzeSentiment(text);
      
      if (sentiment === "positive") posCount++;
      else if (sentiment === "negative") negCount++;
      else neuCount++;

      const views = parseInt(String(item.playCount || 0));
      const likes = parseInt(String(item.diggCount || 0));
      const trendScore = views > 0 ? ((likes / views) * 100) + Math.log10(views + 1) : 0;

      if (trendScore > 0) {
        trendingContent.push({
          id: item.id || `item-${index}`,
          title: text.slice(0, 100) || `Content #${index + 1}`,
          views,
          likes,
          trendScore,
          sentiment,
        });
      }

      const hashtags = item.hashtags?.map(h => `#${h.name || ""}`) || this.extractHashtags(text);
      hashtags.forEach((tag) => {
        if (tag && tag.length > 1) {
          hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1);
        }
      });

      const category = this.extractCategory(text, hashtags);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    trendingContent.sort((a, b) => b.trendScore - a.trendScore);

    const trendingHashtags: HashtagData[] = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([hashtag, count]) => ({ hashtag, count }));

    const trendingCategories: CategoryData[] = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([category, count]) => ({ category, count }));

    const overallSentiment: "positive" | "negative" | "neutral" = 
      posCount >= negCount && posCount >= neuCount ? "positive" :
      negCount >= posCount && negCount >= neuCount ? "negative" : "neutral";

    return {
      datasetName,
      trendingContent: trendingContent.slice(0, limit),
      trendingHashtags,
      trendingCategories,
      overallSentiment,
    };
  }

  async compare(dataset1Name: string, dataset2Name: string): Promise<ComparisonData> {
    const analytics1 = await this.getAnalytics(dataset1Name);
    const analytics2 = await this.getAnalytics(dataset2Name);

    const createMetric = (val1: number, val2: number): ComparisonMetric => ({
      dataset1Value: val1,
      dataset2Value: val2,
      difference: val2 - val1,
      percentageChange: val1 > 0 ? ((val2 - val1) / val1) * 100 : 0,
    });

    return {
      dataset1Name,
      dataset2Name,
      totalRecords: createMetric(analytics1.totalRecords, analytics2.totalRecords),
      totalViews: createMetric(analytics1.totalViews, analytics2.totalViews),
      totalLikes: createMetric(analytics1.totalLikes, analytics2.totalLikes),
      engagementRate: createMetric(analytics1.avgEngagementRate, analytics2.avgEngagementRate),
      dataset1Sentiment: analytics1.sentimentBreakdown,
      dataset2Sentiment: analytics2.sentimentBreakdown,
      dataset1TopHashtags: analytics1.topHashtags.slice(0, 5),
      dataset2TopHashtags: analytics2.topHashtags.slice(0, 5),
      dataset1TopCategories: analytics1.categoryBreakdown.slice(0, 5),
      dataset2TopCategories: analytics2.categoryBreakdown.slice(0, 5),
    };
  }

  getDatasetList(): Array<{ id: string; name: string; displayName: string; type: string; recordCount: number }> {
    return Array.from(this.datasetMetadata.values()).map(meta => ({
      id: meta.name,
      name: meta.name,
      displayName: meta.displayName,
      type: meta.platform,
      recordCount: meta.recordCount,
    }));
  }

  async getAISentimentAnalysis(datasetName: string, limit: number = 10): Promise<Array<{
    id: string;
    text: string;
    analysis: DetailedSentiment;
  }>> {
    const data = this.datasets.get(datasetName) || [];
    const items = data.slice(0, limit);
    const results: Array<{ id: string; text: string; analysis: DetailedSentiment }> = [];

    const texts: string[] = [];
    const itemsWithText: Array<{ id: string; text: string }> = [];

    items.forEach((item: any, index: number) => {
      const text = item.desc || item.text || "";
      const id = item.id || `item-${index}`;
      if (text) {
        texts.push(text);
        itemsWithText.push({ id, text });
      }
    });

    if (texts.length === 0) return results;

    const analyses = await this.analyzeWithAI(texts);

    itemsWithText.forEach((item, index) => {
      results.push({
        id: item.id,
        text: item.text.slice(0, 200),
        analysis: analyses[index] || {
          sentiment: "neutral",
          confidence: 0.5,
          emotions: [],
          intensity: "medium",
          keywords: [],
        },
      });
    });

    return results;
  }

  getAdvancedVisualizations(datasetName: string): AdvancedVisualizationData {
    const data = this.datasets.get(datasetName) || [];
    
    return {
      engagementTrends: this.calculateEngagementTrends(data, datasetName),
      activityHeatmap: this.calculateActivityHeatmap(data, datasetName),
      sentimentTrends: this.calculateSentimentTrends(data, datasetName),
    };
  }

  private calculateEngagementTrends(data: any[], datasetName: string): EngagementTrendPoint[] {
    const trends: Map<string, EngagementTrendPoint> = new Map();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      trends.set(dateStr, {
        date: dateStr,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagement: 0,
      });
    }
    
    if (datasetName === "tiktok_json" || datasetName === "tiktok_csv") {
      data.forEach((item: TikTokItem) => {
        let dateStr: string | null = null;
        if (item.createTimeISO) {
          try {
            const date = new Date(item.createTimeISO);
            if (!isNaN(date.getTime())) {
              dateStr = item.createTimeISO.split("T")[0];
            }
          } catch {
          }
        } else if (item.createTime && !isNaN(item.createTime)) {
          const date = new Date(item.createTime * 1000);
          if (!isNaN(date.getTime())) {
            dateStr = date.toISOString().split("T")[0];
          }
        }

        if (!dateStr) {
          const randomDays = Math.floor(Math.random() * 14);
          const date = new Date();
          date.setDate(date.getDate() - randomDays);
          dateStr = date.toISOString().split("T")[0];
        }

        const existing = trends.get(dateStr);
        if (!existing) return;

        existing.views += item.playCount || 0;
        existing.likes += item.diggCount || 0;
        existing.comments += item.commentCount || 0;
        existing.shares += item.shareCount || 0;
      });
    } else if (datasetName === "phone_conversations") {
      data.forEach((item: PhoneConversation) => {
        let dateStr: string | null = null;
        if (item.timestamp) {
          try {
            const date = new Date(item.timestamp);
            if (!isNaN(date.getTime())) {
              dateStr = date.toISOString().split("T")[0];
            }
          } catch {
          }
        }

        if (!dateStr) {
          const randomDays = Math.floor(Math.random() * 14);
          const date = new Date();
          date.setDate(date.getDate() - randomDays);
          dateStr = date.toISOString().split("T")[0];
        }

        const existing = trends.get(dateStr);
        if (!existing) return;

        existing.views += 1;
        const emotionScore = typeof item.emotion_score === 'number' ? item.emotion_score : 0.5;
        const duration = typeof item.duration === 'number' ? item.duration : 60;
        existing.likes += Math.round(emotionScore * 10);
        existing.comments += Math.round(duration / 60);
        existing.shares += 1;
      });
    }

    const result = Array.from(trends.values());
    result.forEach(point => {
      const total = point.views + point.likes + point.comments + point.shares;
      const engagementRaw = total > 0 ? ((point.likes + point.comments) / total * 100) : 0;
      point.engagement = Math.min(engagementRaw, 100);
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateActivityHeatmap(data: any[], datasetName: string): HeatmapCell[] {
    const heatmap: Map<string, HeatmapCell> = new Map();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        heatmap.set(key, {
          day,
          hour,
          value: 0,
          label: `${dayNames[day]} ${hour}:00`,
        });
      }
    }

    const parseDate = (item: any, datasetType: string): Date | null => {
      try {
        if (datasetType === "tiktok") {
          if (item.createTimeISO) {
            const date = new Date(item.createTimeISO);
            return !isNaN(date.getTime()) ? date : null;
          }
          if (item.createTime && !isNaN(item.createTime)) {
            const date = new Date(item.createTime * 1000);
            return !isNaN(date.getTime()) ? date : null;
          }
        } else if (datasetType === "phone") {
          if (item.timestamp) {
            const date = new Date(item.timestamp);
            return !isNaN(date.getTime()) ? date : null;
          }
        }
        return null;
      } catch {
        return null;
      }
    };

    if (datasetName === "tiktok_json" || datasetName === "tiktok_csv") {
      data.forEach((item: TikTokItem) => {
        let date = parseDate(item, "tiktok");
        
        if (!date) {
          date = new Date();
          date.setHours(Math.floor(Math.random() * 24));
          date.setDate(date.getDate() - Math.floor(Math.random() * 7));
        }

        const day = date.getDay();
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        
        const cell = heatmap.get(key);
        if (cell) {
          cell.value += 1;
        }
      });
    } else if (datasetName === "phone_conversations") {
      data.forEach((item: PhoneConversation) => {
        let date = parseDate(item, "phone");
        
        if (!date) {
          date = new Date();
          date.setHours(Math.floor(Math.random() * 24));
          date.setDate(date.getDate() - Math.floor(Math.random() * 7));
        }

        const day = date.getDay();
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        
        const cell = heatmap.get(key);
        if (cell) {
          cell.value += 1;
        }
      });
    }

    return Array.from(heatmap.values());
  }

  private calculateSentimentTrends(data: any[], datasetName: string): SentimentTrendPoint[] {
    const trends: Map<string, SentimentTrendPoint> = new Map();

    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      trends.set(dateStr, {
        date: dateStr,
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
      });
    }

    if (datasetName === "tiktok_json" || datasetName === "tiktok_csv") {
      data.forEach((item: TikTokItem) => {
        let dateStr: string | null = null;
        if (item.createTimeISO) {
          try {
            const date = new Date(item.createTimeISO);
            if (!isNaN(date.getTime())) {
              dateStr = item.createTimeISO.split("T")[0];
            }
          } catch {
          }
        } else if (item.createTime && !isNaN(item.createTime)) {
          const date = new Date(item.createTime * 1000);
          if (!isNaN(date.getTime())) {
            dateStr = date.toISOString().split("T")[0];
          }
        }

        if (!dateStr) {
          const randomDays = Math.floor(Math.random() * 14);
          const date = new Date();
          date.setDate(date.getDate() - randomDays);
          dateStr = date.toISOString().split("T")[0];
        }

        const existing = trends.get(dateStr);
        if (!existing) return;

        const text = item.desc || item.text || "";
        const sentiment = this.analyzeSentiment(text);
        
        if (sentiment === "positive") existing.positive++;
        else if (sentiment === "negative") existing.negative++;
        else existing.neutral++;
        
        existing.total++;
      });
    } else if (datasetName === "phone_conversations") {
      data.forEach((item: PhoneConversation) => {
        let dateStr: string | null = null;
        if (item.timestamp) {
          try {
            const date = new Date(item.timestamp);
            if (!isNaN(date.getTime())) {
              dateStr = item.timestamp.split("T")[0];
            }
          } catch {
          }
        }

        if (!dateStr) {
          const randomDays = Math.floor(Math.random() * 14);
          const date = new Date();
          date.setDate(date.getDate() - randomDays);
          dateStr = date.toISOString().split("T")[0];
        }

        const existing = trends.get(dateStr);
        if (!existing) return;

        const sentiment = item.sentiment || "neutral";
        if (sentiment === "positive") existing.positive++;
        else if (sentiment === "negative") existing.negative++;
        else existing.neutral++;
        
        existing.total++;
      });
    }

    return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const analyticsEngine = new AnalyticsEngine();
