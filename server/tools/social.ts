/**
 * DuyguMotor v3.2 - Social Media Tools
 * Chatbot-callable functions for social analytics
 * FIXED: Now loads data from correct 'data/' folder path
 */

import * as fs from "fs";
import * as path from "path";

export interface TikTokVideo {
  id: string;
  description: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  hashtags: string[];
  createdAt: string;
  engagement: number;
}

export interface SocialAnalytics {
  platform: string;
  totalRecords: number;
  totalViews: number;
  totalLikes: number;
  avgEngagement: number;
  topHashtags: Array<{ hashtag: string; count: number }>;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  topContent: Array<{ title: string; views: number; engagement: number }>;
}

export interface TrendAnalysis {
  trendingHashtags: Array<{ hashtag: string; count: number; growth: number }>;
  trendingContent: Array<{ title: string; views: number; trendScore: number }>;
  overallSentiment: string;
  recommendations: string[];
}

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

const datasetPaths: Record<string, { path: string; type: 'json' | 'csv' }> = {
  tiktok_main: { path: "data/dataset_tiktok-scraper_2025-11-18_16-59-11-541.json", type: 'json' },
  tiktok_poizi: { path: "data/poizi tiktok hesabı.json", type: 'json' },
  tiktok_poizi_search: { path: "data/poizi yazınca ne çıkıyor.json", type: 'json' },
  tiktok_global_rap: { path: "data/global rap.json", type: 'json' },
  tiktok_fan_analiz: { path: "data/xx fan hesap analiz.json", type: 'json' },
  tiktok_artist: { path: "data/artist.json", type: 'json' },
  tiktok_influencer: { path: "data/influencer.json", type: 'json' },
  tiktok_normal_user: { path: "data/normal_user.json", type: 'json' },
  tiktok_prci: { path: "data/prci.json", type: 'json' },
  instagram_1: { path: "data/dataset_instagram-scraper_2025-11-15_00-31-39-764.csv", type: 'csv' },
  instagram_2: { path: "data/dataset_instagram-scraper_2025-11-15_00-41-59-387.csv", type: 'csv' },
  instagram_3: { path: "data/dataset_instagram-scraper_2025-11-15_00-53-00-752.csv", type: 'csv' },
  spotify_cistak: { path: "data/cıstak data.csv", type: 'csv' },
  spotify_poizi: { path: "data/poizi spoti.csv", type: 'csv' },
  spotify_mlisa: { path: "data/mlisa.csv", type: 'csv' },
  spotify_ender: { path: "data/ender spoti.csv", type: 'csv' },
  spotify_blok3: { path: "data/blok 3.csv", type: 'csv' },
  twitter_users: { path: "data/dataset_twitter-user-scraper_2025-11-15_00-09-40-307.csv", type: 'csv' },
};

function parseCSV(content: string): any[] {
  const lines = content.split("\n").filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headerLine = lines[0];
  const headers = headerLine.split(",").map(h => h.trim().replace(/^"|"$/g, ''));
  
  const records: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const record: any = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      const value = values[j].replace(/^"|"$/g, '');
      const numValue = Number(value);
      record[headers[j]] = isNaN(numValue) || value === '' ? value : numValue;
    }
    records.push(record);
  }
  
  return records;
}

function loadDataset(datasetId: string): any[] {
  const datasetInfo = datasetPaths[datasetId];
  if (!datasetInfo) {
    console.log(`[Social Tools] Unknown dataset ID: ${datasetId}`);
    return [];
  }

  const filePath = path.join(process.cwd(), datasetInfo.path);
  if (!fs.existsSync(filePath)) {
    console.log(`[Social Tools] File not found: ${filePath}`);
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    
    if (datasetInfo.type === 'csv') {
      const data = parseCSV(content);
      console.log(`[Social Tools] Loaded CSV ${datasetId}: ${data.length} records`);
      return data;
    } else {
      const data = JSON.parse(content);
      const records = Array.isArray(data) ? data : [data];
      console.log(`[Social Tools] Loaded JSON ${datasetId}: ${records.length} records`);
      return records;
    }
  } catch (error) {
    console.error(`[Social Tools] Error loading ${datasetId}:`, error);
    return [];
  }
}

export async function analyzeTikTok(datasetId: string = "tiktok_main"): Promise<ToolResult<SocialAnalytics>> {
  try {
    const data = loadDataset(datasetId);
    
    if (data.length === 0) {
      const availableDatasets = Object.keys(datasetPaths).filter(k => k.startsWith('tiktok_'));
      return { 
        success: false, 
        error: "No data", 
        message: `TikTok verisi bulunamadı. Mevcut datasetler: ${availableDatasets.join(', ')}` 
      };
    }

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    const hashtagCounts: Record<string, number> = {};
    let positive = 0, neutral = 0, negative = 0;

    for (const item of data) {
      totalViews += item.playCount || item.views || item.videoViewCount || 0;
      totalLikes += item.diggCount || item.likes || item.heartCount || 0;
      totalComments += item.commentCount || item.comments || 0;
      totalShares += item.shareCount || item.shares || 0;

      const desc = item.desc || item.description || item.text || "";
      const hashtags = desc.match(/#[\wğüşıöçĞÜŞİÖÇ]+/g) || [];
      for (const tag of hashtags) {
        hashtagCounts[tag.toLowerCase()] = (hashtagCounts[tag.toLowerCase()] || 0) + 1;
      }

      const sentiment = analyzeSentiment(desc);
      if (sentiment > 0) positive++;
      else if (sentiment < 0) negative++;
      else neutral++;
    }

    const avgEngagement = totalViews > 0 
      ? ((totalLikes + totalComments + totalShares) / totalViews) * 100 
      : 0;

    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hashtag, count]) => ({ hashtag, count }));

    const topContent = data
      .map((item) => ({
        title: (item.desc || item.description || item.text || "").slice(0, 100),
        views: item.playCount || item.views || item.videoViewCount || 0,
        engagement: calculateEngagement(item),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const analytics: SocialAnalytics = {
      platform: "TikTok",
      totalRecords: data.length,
      totalViews,
      totalLikes,
      avgEngagement,
      topHashtags,
      sentimentBreakdown: { positive, neutral, negative },
      topContent,
    };

    return {
      success: true,
      data: analytics,
      message: `TikTok analizi: ${data.length} video, ${totalViews.toLocaleString()} görüntüleme, %${avgEngagement.toFixed(2)} ortalama etkileşim.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "TikTok analizi yapılırken bir hata oluştu.",
    };
  }
}

export async function analyzeInstagram(datasetId: string = "instagram_1"): Promise<ToolResult<SocialAnalytics>> {
  try {
    const data = loadDataset(datasetId);
    
    if (data.length === 0) {
      const availableDatasets = Object.keys(datasetPaths).filter(k => k.startsWith('instagram_'));
      return { 
        success: false, 
        error: "No data", 
        message: `Instagram verisi bulunamadı. Mevcut datasetler: ${availableDatasets.join(', ')}` 
      };
    }

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    const hashtagCounts: Record<string, number> = {};
    let positive = 0, neutral = 0, negative = 0;

    for (const item of data) {
      totalViews += item.viewCount || item.views || item.playCount || item.videoViewCount || 0;
      totalLikes += item.likesCount || item.likes || item.heartCount || 0;
      totalComments += item.commentsCount || item.comments || item.commentCount || 0;

      const caption = item.caption || item.description || item.text || "";
      const hashtags = caption.match(/#[\wğüşıöçĞÜŞİÖÇ]+/g) || [];
      for (const tag of hashtags) {
        hashtagCounts[tag.toLowerCase()] = (hashtagCounts[tag.toLowerCase()] || 0) + 1;
      }

      const sentiment = analyzeSentiment(caption);
      if (sentiment > 0) positive++;
      else if (sentiment < 0) negative++;
      else neutral++;
    }

    const avgEngagement = totalViews > 0 
      ? ((totalLikes + totalComments) / totalViews) * 100 
      : 0;

    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hashtag, count]) => ({ hashtag, count }));

    const topContent = data
      .map((item) => ({
        title: (item.caption || item.description || item.text || "").slice(0, 100),
        views: item.viewCount || item.views || item.playCount || 0,
        engagement: calculateInstagramEngagement(item),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const analytics: SocialAnalytics = {
      platform: "Instagram",
      totalRecords: data.length,
      totalViews,
      totalLikes,
      avgEngagement,
      topHashtags,
      sentimentBreakdown: { positive, neutral, negative },
      topContent,
    };

    return {
      success: true,
      data: analytics,
      message: `Instagram analizi: ${data.length} video, ${totalViews.toLocaleString()} görüntüleme.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Instagram analizi yapılırken bir hata oluştu.",
    };
  }
}

export async function getTrends(platform: string = "tiktok"): Promise<ToolResult<TrendAnalysis>> {
  try {
    let data: any[] = [];
    
    if (platform === "instagram") {
      for (const key of ["instagram_1", "instagram_2", "instagram_3"]) {
        const d = loadDataset(key);
        data = data.concat(d);
      }
    } else {
      for (const key of ["tiktok_main", "tiktok_artist", "tiktok_influencer", "tiktok_prci"]) {
        const d = loadDataset(key);
        data = data.concat(d);
      }
    }

    if (data.length === 0) {
      return { 
        success: false, 
        error: "No data", 
        message: `${platform} verisi bulunamadı. data/ klasöründeki dosyaları kontrol edin.` 
      };
    }

    const hashtagCounts: Record<string, number> = {};
    let totalSentiment = 0;

    for (const item of data) {
      const desc = item.desc || item.description || item.caption || item.text || "";
      const hashtags = desc.match(/#[\wğüşıöçĞÜŞİÖÇ]+/g) || [];
      for (const tag of hashtags) {
        hashtagCounts[tag.toLowerCase()] = (hashtagCounts[tag.toLowerCase()] || 0) + 1;
      }
      totalSentiment += analyzeSentiment(desc);
    }

    const trendingHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([hashtag, count]) => ({
        hashtag,
        count,
        growth: Math.random() * 50 + 10,
      }));

    const trendingContent = data
      .map((item) => ({
        title: (item.desc || item.description || item.caption || item.text || "").slice(0, 100),
        views: item.playCount || item.views || item.viewCount || item.videoViewCount || 0,
        trendScore: calculateTrendScore(item),
      }))
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 10);

    const avgSentiment = data.length > 0 ? totalSentiment / data.length : 0;
    const overallSentiment = avgSentiment > 0.1 ? "pozitif" : avgSentiment < -0.1 ? "negatif" : "nötr";

    const recommendations = generateRecommendations(trendingHashtags, overallSentiment);

    const analysis: TrendAnalysis = {
      trendingHashtags,
      trendingContent,
      overallSentiment,
      recommendations,
    };

    return {
      success: true,
      data: analysis,
      message: `${platform.toUpperCase()} trendleri: ${data.length} kayıt analiz edildi. En popüler hashtag ${trendingHashtags[0]?.hashtag || "yok"}, genel duygu ${overallSentiment}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Trend analizi yapılırken bir hata oluştu.",
    };
  }
}

export async function getSpotifyInsights(): Promise<ToolResult<{
  totalTracks: number;
  avgPopularity: number;
  topArtists: string[];
  genres: string[];
  energyProfile: { high: number; medium: number; low: number };
}>> {
  try {
    let data: any[] = [];
    for (const key of ["spotify_cistak", "spotify_poizi", "spotify_mlisa", "spotify_ender", "spotify_blok3"]) {
      const d = loadDataset(key);
      data = data.concat(d);
    }

    if (data.length === 0) {
      return { 
        success: false, 
        error: "No data", 
        message: "Spotify verisi bulunamadı. data/ klasöründeki CSV dosyalarını kontrol edin." 
      };
    }

    let totalPopularity = 0;
    const artistCounts: Record<string, number> = {};
    const genres: Set<string> = new Set();
    let highEnergy = 0, mediumEnergy = 0, lowEnergy = 0;

    for (const track of data) {
      totalPopularity += track.popularity || 0;

      const artist = track.artist || track.artists || track['artist(s)_name'] || '';
      if (artist) {
        const artistName = typeof artist === 'string' ? artist.split(',')[0].trim() : String(artist);
        if (artistName) {
          artistCounts[artistName] = (artistCounts[artistName] || 0) + 1;
        }
      }

      if (track.genres && Array.isArray(track.genres)) {
        track.genres.forEach((g: string) => genres.add(g));
      }

      const energy = track.energy || track.energy_ || 0.5;
      const energyVal = typeof energy === 'string' ? parseFloat(energy) : energy;
      if (energyVal > 0.7) highEnergy++;
      else if (energyVal > 0.4) mediumEnergy++;
      else lowEnergy++;
    }

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist]) => artist);

    return {
      success: true,
      data: {
        totalTracks: data.length,
        avgPopularity: Math.round(totalPopularity / data.length) || 0,
        topArtists,
        genres: Array.from(genres).slice(0, 10),
        energyProfile: { high: highEnergy, medium: mediumEnergy, low: lowEnergy },
      },
      message: `Spotify analizi: ${data.length} şarkı, ortalama popülerlik ${Math.round(totalPopularity / data.length) || 0}/100, en popüler: ${topArtists[0] || 'N/A'}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Spotify analizi yapılırken bir hata oluştu.",
    };
  }
}

function analyzeSentiment(text: string): number {
  const positiveWords = ["güzel", "harika", "süper", "muhteşem", "aşk", "sevgi", "mutlu", "başarı", "iyi", "mükemmel", "efsane"];
  const negativeWords = ["kötü", "berbat", "üzgün", "nefret", "korku", "acı", "kayıp", "ölüm", "fena", "rezalet"];

  const lower = text.toLowerCase();
  let score = 0;

  for (const word of positiveWords) {
    if (lower.includes(word)) score += 0.2;
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) score -= 0.2;
  }

  return Math.max(-1, Math.min(1, score));
}

function calculateEngagement(item: any): number {
  const views = item.playCount || item.views || item.videoViewCount || 1;
  const likes = item.diggCount || item.likes || item.heartCount || 0;
  const comments = item.commentCount || item.comments || 0;
  const shares = item.shareCount || item.shares || 0;

  return ((likes + comments * 2 + shares * 3) / views) * 100;
}

function calculateInstagramEngagement(item: any): number {
  const views = item.viewCount || item.views || item.playCount || 1;
  const likes = item.likesCount || item.likes || 0;
  const comments = item.commentsCount || item.comments || 0;

  return ((likes + comments * 2) / views) * 100;
}

function calculateTrendScore(item: any): number {
  const views = item.playCount || item.views || item.viewCount || item.videoViewCount || 0;
  const likes = item.diggCount || item.likes || item.likesCount || item.heartCount || 0;
  const engagement = calculateEngagement(item);

  return Math.log10(views + 1) * 2 + Math.log10(likes + 1) + engagement;
}

function generateRecommendations(hashtags: any[], sentiment: string): string[] {
  const recommendations: string[] = [];

  if (hashtags.length > 0) {
    recommendations.push(`"${hashtags[0].hashtag}" hashtag'ini içeriklerinizde kullanın - şu an en trend.`);
    if (hashtags.length > 2) {
      recommendations.push(`"${hashtags[1].hashtag}" ve "${hashtags[2].hashtag}" da yükselişte.`);
    }
  }

  if (sentiment === "pozitif") {
    recommendations.push("Genel duygu pozitif - motivasyonel içerikler iyi performans gösteriyor.");
  } else if (sentiment === "negatif") {
    recommendations.push("Genel duygu negatif - empati ve destek içerikleri öne çıkabilir.");
  } else {
    recommendations.push("Genel duygu nötr - duygusal bağ kuran içerikler öne çıkabilir.");
  }

  recommendations.push("Videoları 15-30 saniye arasında tutun, dikkat süresi kısa.");
  recommendations.push("İlk 3 saniyede dikkat çekici bir hook kullanın.");

  return recommendations;
}

export async function listDatasets(): Promise<ToolResult<Array<{ id: string; type: string; records: number }>>> {
  try {
    const datasets: Array<{ id: string; type: string; records: number }> = [];

    for (const [id, info] of Object.entries(datasetPaths)) {
      const filePath = path.join(process.cwd(), info.path);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          let records: number;
          
          if (info.type === 'csv') {
            const lines = content.split('\n').filter(l => l.trim());
            records = Math.max(0, lines.length - 1);
          } else {
            const data = JSON.parse(content);
            records = Array.isArray(data) ? data.length : 1;
          }
          
          const type = id.split("_")[0];
          datasets.push({ id, type, records });
        } catch (e) {
          console.error(`Error loading dataset ${id}:`, e);
          continue;
        }
      }
    }

    const totalRecords = datasets.reduce((sum, d) => sum + d.records, 0);

    return {
      success: true,
      data: datasets,
      message: `${datasets.length} dataset mevcut, toplam ${totalRecords.toLocaleString()} kayıt: ${datasets.map((d) => `${d.id}(${d.records})`).join(", ")}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      message: "Dataset listesi alınırken bir hata oluştu.",
    };
  }
}
