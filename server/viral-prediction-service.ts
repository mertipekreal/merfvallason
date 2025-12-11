/**
 * Viral Video Prediction Service
 * Uses existing TikTok/Instagram data to predict viral potential
 */

import fs from 'fs';
import path from 'path';

interface TikTokVideo {
  'authorMeta.avatar': string;
  'authorMeta.name': string;
  text: string;
  diggCount: number;
  shareCount?: number;
  commentCount?: number;
  playCount?: number;
}

interface ViralPrediction {
  videoId: string;
  author: string;
  caption: string;
  currentLikes: number;
  viralScore: number;
  predictedGrowth: number;
  viralProbability: number;
  factors: {
    engagement: number;
    timing: number;
    hashtags: number;
    contentType: number;
    trendAlignment: number;
  };
  recommendation: string;
}

interface DatasetStats {
  platform: string;
  totalVideos: number;
  totalLikes: number;
  avgLikes: number;
  maxLikes: number;
  viralThreshold: number;
  viralCount: number;
  viralPercentage: number;
}

class ViralPredictionService {
  private tiktokData: TikTokVideo[] = [];
  private instagramData: any[] = [];
  private dataLoaded = false;

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      
      // Load TikTok JSON files
      const tiktokFiles = [
        'poizi tiktok hesabı.json',
        'global rap.json',
        'xx fan hesap analiz.json',
        'poizi yazınca ne çıkıyor.json',
        'dataset_tiktok-scraper_2025-11-18_16-59-11-541.json',
        'dataset_tiktok-sound-scraper_2025-11-15_16-55-22-986.json'
      ];

      for (const file of tiktokFiles) {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
              this.tiktokData.push(...data);
            }
          } catch (e) {
            console.log(`Could not parse ${file}`);
          }
        }
      }

      // Load Instagram CSV files
      const instagramFiles = fs.readdirSync(dataDir).filter(f => f.includes('instagram') && f.endsWith('.csv'));
      for (const file of instagramFiles) {
        try {
          const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
          const lines = content.split('\n').slice(1);
          this.instagramData.push(...lines.filter(l => l.trim()));
        } catch (e) {
          console.log(`Could not parse ${file}`);
        }
      }

      this.dataLoaded = true;
      console.log(`📊 Viral Service: Loaded ${this.tiktokData.length} TikTok videos, ${this.instagramData.length} Instagram posts`);
    } catch (error) {
      console.error('Error loading viral data:', error);
    }
  }

  getDatasetStats(): { tiktok: DatasetStats; instagram: DatasetStats } {
    const tiktokLikes = this.tiktokData.map(v => v.diggCount || 0);
    const totalTikTokLikes = tiktokLikes.reduce((a, b) => a + b, 0);
    const maxTikTokLikes = Math.max(...tiktokLikes, 0);
    const avgTikTokLikes = tiktokLikes.length > 0 ? totalTikTokLikes / tiktokLikes.length : 0;
    const viralThreshold = avgTikTokLikes * 10; // 10x average = viral
    const viralCount = tiktokLikes.filter(l => l >= viralThreshold).length;

    return {
      tiktok: {
        platform: 'TikTok',
        totalVideos: this.tiktokData.length,
        totalLikes: totalTikTokLikes,
        avgLikes: Math.round(avgTikTokLikes),
        maxLikes: maxTikTokLikes,
        viralThreshold: Math.round(viralThreshold),
        viralCount,
        viralPercentage: this.tiktokData.length > 0 ? Math.round((viralCount / this.tiktokData.length) * 100 * 100) / 100 : 0
      },
      instagram: {
        platform: 'Instagram',
        totalVideos: this.instagramData.length,
        totalLikes: 0,
        avgLikes: 0,
        maxLikes: 0,
        viralThreshold: 0,
        viralCount: 0,
        viralPercentage: 0
      }
    };
  }

  predictViral(caption: string, hashtags: string[] = [], author?: string): ViralPrediction {
    // Analyze based on existing viral content patterns
    const viralHashtags = ['fyp', 'fypシ', 'viral', 'keşfet', 'trending', 'foryou', 'foryoupage'];
    const emotionalWords = ['güzel', 'aşk', 'love', 'amazing', 'crazy', 'şok', 'inanılmaz'];
    
    // Calculate factors
    const hashtagScore = hashtags.filter(h => 
      viralHashtags.some(vh => h.toLowerCase().includes(vh))
    ).length / Math.max(hashtags.length, 1);

    const emotionalScore = emotionalWords.filter(w => 
      caption.toLowerCase().includes(w)
    ).length / emotionalWords.length;

    const captionLength = caption.length;
    const optimalLength = captionLength >= 50 && captionLength <= 200;

    // Learn from existing data
    const topVideos = this.tiktokData
      .sort((a, b) => (b.diggCount || 0) - (a.diggCount || 0))
      .slice(0, 20);

    const avgTopHashtags = topVideos.reduce((acc, v) => {
      const tags = (v.text || '').match(/#\w+/g) || [];
      return acc + tags.length;
    }, 0) / Math.max(topVideos.length, 1);

    // Calculate viral probability
    const factors = {
      engagement: Math.min(emotionalScore * 1.5, 1),
      timing: 0.7, // Default timing score
      hashtags: Math.min(hashtagScore + 0.3, 1),
      contentType: optimalLength ? 0.8 : 0.5,
      trendAlignment: this.calculateTrendAlignment(caption)
    };

    const viralScore = (
      factors.engagement * 0.25 +
      factors.timing * 0.15 +
      factors.hashtags * 0.2 +
      factors.contentType * 0.15 +
      factors.trendAlignment * 0.25
    ) * 100;

    const viralProbability = Math.min(viralScore / 100 * 1.2, 0.95);
    const predictedGrowth = viralProbability > 0.5 ? 
      Math.round(1000 * Math.pow(viralProbability, 2)) : 
      Math.round(100 * viralProbability);

    let recommendation = '';
    if (viralScore >= 70) {
      recommendation = 'Yüksek viral potansiyel! Hemen paylaş.';
    } else if (viralScore >= 50) {
      recommendation = 'İyi potansiyel. Daha fazla trend hashtag ekle.';
    } else if (viralScore >= 30) {
      recommendation = 'Orta potansiyel. Caption\'ı daha duygusal yap.';
    } else {
      recommendation = 'Düşük potansiyel. İçeriği yeniden düşün.';
    }

    return {
      videoId: `pred_${Date.now()}`,
      author: author || 'unknown',
      caption,
      currentLikes: 0,
      viralScore: Math.round(viralScore * 100) / 100,
      predictedGrowth,
      viralProbability: Math.round(viralProbability * 100) / 100,
      factors,
      recommendation
    };
  }

  private calculateTrendAlignment(caption: string): number {
    // Check alignment with top performing content
    const trendingWords = this.extractTrendingWords();
    const captionWords = caption.toLowerCase().split(/\s+/);
    
    const matches = captionWords.filter(w => trendingWords.includes(w)).length;
    return Math.min(matches / 5, 1);
  }

  private extractTrendingWords(): string[] {
    const wordCount = new Map<string, number>();
    
    for (const video of this.tiktokData.slice(0, 100)) {
      const words = (video.text || '').toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 3 && !word.startsWith('#')) {
          wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
      }
    }

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word]) => word);
  }

  getTopPerformers(limit: number = 10): Array<{
    author: string;
    caption: string;
    likes: number;
    viralScore: number;
  }> {
    return this.tiktokData
      .filter(v => v.diggCount > 0)
      .sort((a, b) => (b.diggCount || 0) - (a.diggCount || 0))
      .slice(0, limit)
      .map(v => ({
        author: v['authorMeta.name'] || 'unknown',
        caption: (v.text || '').substring(0, 100),
        likes: v.diggCount || 0,
        viralScore: Math.min(100, Math.log10(v.diggCount + 1) * 20)
      }));
  }

  analyzeHashtags(): Array<{ hashtag: string; count: number; avgLikes: number }> {
    const hashtagStats = new Map<string, { count: number; totalLikes: number }>();

    for (const video of this.tiktokData) {
      const hashtags = (video.text || '').match(/#\w+/g) || [];
      for (const tag of hashtags) {
        const existing = hashtagStats.get(tag.toLowerCase()) || { count: 0, totalLikes: 0 };
        existing.count++;
        existing.totalLikes += video.diggCount || 0;
        hashtagStats.set(tag.toLowerCase(), existing);
      }
    }

    return Array.from(hashtagStats.entries())
      .map(([hashtag, stats]) => ({
        hashtag,
        count: stats.count,
        avgLikes: Math.round(stats.totalLikes / stats.count)
      }))
      .sort((a, b) => b.avgLikes - a.avgLikes)
      .slice(0, 20);
  }

  getOverallStats(): {
    totalVideos: number;
    totalLikes: number;
    avgViralScore: number;
    viralPercentage: number;
    topHashtags: string[];
    recommendation: string;
  } {
    const stats = this.getDatasetStats();
    const topHashtags = this.analyzeHashtags().slice(0, 5).map(h => h.hashtag);
    
    const avgViralScore = this.tiktokData.length > 0 ?
      this.tiktokData.reduce((acc, v) => acc + Math.min(100, Math.log10((v.diggCount || 0) + 1) * 20), 0) / this.tiktokData.length : 0;

    return {
      totalVideos: stats.tiktok.totalVideos + stats.instagram.totalVideos,
      totalLikes: stats.tiktok.totalLikes,
      avgViralScore: Math.round(avgViralScore * 100) / 100,
      viralPercentage: stats.tiktok.viralPercentage,
      topHashtags,
      recommendation: `En iyi hashtag: ${topHashtags[0] || 'N/A'}. Ortalama viral skoru: ${avgViralScore.toFixed(1)}%`
    };
  }
}

export const viralPredictionService = new ViralPredictionService();
