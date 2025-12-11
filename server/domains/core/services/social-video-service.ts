import { storage } from "../../../storage";
import { embeddingJobService } from "../../../embedding-job-service";
import type { SocialVideo, InsertSocialVideo, SocialPlatform } from "@shared/schema";

export class SocialVideoService {
  
  async ingestVideo(videoData: InsertSocialVideo): Promise<SocialVideo> {
    const existingVideo = await storage.getSocialVideoByPlatformId(videoData.platformVideoId);
    
    if (existingVideo) {
      console.log(`Video already exists: ${videoData.platformVideoId}`);
      return existingVideo;
    }
    
    const engagementRate = this.calculateEngagementRate(
      videoData.viewCount || 0,
      videoData.likeCount || 0,
      videoData.commentCount || 0,
      videoData.shareCount || 0
    );
    
    const video = await storage.createSocialVideo({
      ...videoData,
      engagementRate,
      nftStatus: 'none',
    });
    
    await embeddingJobService.queueVideoEmbedding(video.id, 1);
    
    return video;
  }

  async ingestBatch(videos: InsertSocialVideo[]): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const videoData of videos) {
      try {
        await this.ingestVideo(videoData);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`${videoData.platformVideoId}: ${error.message}`);
      }
    }
    
    return { success, failed, errors };
  }

  private calculateEngagementRate(views: number, likes: number, comments: number, shares: number): number {
    if (views === 0) return 0;
    
    const totalEngagements = likes + comments * 2 + shares * 3;
    return (totalEngagements / views) * 100;
  }

  async getVideosByPlatform(platform: SocialPlatform, limit = 50): Promise<SocialVideo[]> {
    return storage.getAllSocialVideos(limit, platform);
  }

  async getVideosWithHighEngagement(minEngagementRate = 5, limit = 50): Promise<SocialVideo[]> {
    const videos = await storage.getAllSocialVideos(200);
    return videos
      .filter(v => (v.engagementRate || 0) >= minEngagementRate)
      .sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0))
      .slice(0, limit);
  }

  async getVideosForNftCandidates(limit = 50): Promise<SocialVideo[]> {
    const videos = await storage.getAllSocialVideos(200);
    
    return videos
      .filter(v => v.emotionEmbedding && v.emotionEmbedding.length > 0)
      .filter(v => v.nftStatus === 'none')
      .sort((a, b) => {
        const scoreA = this.calculateNftPotential(a);
        const scoreB = this.calculateNftPotential(b);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  private calculateNftPotential(video: SocialVideo): number {
    let score = 0;
    
    score += Math.min(20, (video.engagementRate || 0) * 2);
    
    score += Math.min(20, (video.viewCount || 0) / 10000);
    
    const hashtagsCount = (video.hashtags as string[] || []).length;
    score += Math.min(15, hashtagsCount * 2);
    
    const captionLength = (video.caption || '').length;
    score += Math.min(15, captionLength / 20);
    
    if (video.detectedEmotions) {
      const emotions = Object.values(video.detectedEmotions as Record<string, number>);
      const emotionDiversity = emotions.filter(e => e > 0.2).length;
      score += emotionDiversity * 5;
    }
    
    return score;
  }

  async computeRarityForTopVideos(limit = 20): Promise<number> {
    const topVideos = await this.getVideosForNftCandidates(limit);
    let queued = 0;
    
    for (const video of topVideos) {
      await embeddingJobService.queueRarityComputation(undefined, video.id, 0);
      queued++;
    }
    
    return queued;
  }

  async getVideoStats(): Promise<{
    total: number;
    tiktok: number;
    instagram: number;
    withEmbeddings: number;
    avgEngagement: number;
  }> {
    const allVideos = await storage.getAllSocialVideos(10000);
    
    const tiktokVideos = allVideos.filter(v => v.platform === 'tiktok');
    const instagramVideos = allVideos.filter(v => v.platform === 'instagram');
    const withEmbeddings = allVideos.filter(v => v.emotionEmbedding && v.emotionEmbedding.length > 0);
    
    const totalEngagement = allVideos.reduce((sum, v) => sum + (v.engagementRate || 0), 0);
    const avgEngagement = allVideos.length > 0 ? totalEngagement / allVideos.length : 0;
    
    return {
      total: allVideos.length,
      tiktok: tiktokVideos.length,
      instagram: instagramVideos.length,
      withEmbeddings: withEmbeddings.length,
      avgEngagement: Math.round(avgEngagement * 100) / 100
    };
  }
}

export const socialVideoService = new SocialVideoService();
