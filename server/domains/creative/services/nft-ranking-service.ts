import { storage } from "../../../storage";
import { embeddingJobService } from "../../../embedding-job-service";
import type { NFTCandidate, Dream, SocialVideo } from "@shared/schema";

export interface RankingWeights {
  rarityScore: number;
  uniquenessScore: number;
  emotionComplexity: number;
  engagementMultiplier: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  rarityScore: 0.4,
  uniquenessScore: 0.25,
  emotionComplexity: 0.2,
  engagementMultiplier: 0.15,
};

export class NftRankingService {
  private weights: RankingWeights = DEFAULT_WEIGHTS;

  setWeights(weights: Partial<RankingWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  async getTopCandidates(limit = 50): Promise<NFTCandidate[]> {
    return storage.getTopNftCandidates(limit);
  }

  async getCandidate(id: string): Promise<NFTCandidate | undefined> {
    return storage.getNftCandidate(id);
  }

  async approveCandidate(id: string): Promise<NFTCandidate | undefined> {
    return storage.updateNftCandidateStatus(id, 'approved');
  }

  async rejectCandidate(id: string): Promise<NFTCandidate | undefined> {
    return storage.updateNftCandidateStatus(id, 'rejected');
  }

  async markAsMinted(id: string): Promise<NFTCandidate | undefined> {
    return storage.updateNftCandidateStatus(id, 'minted');
  }

  async computeRankingsForDreams(limit = 50): Promise<number> {
    const dreams = await storage.getAllDreams(limit);
    const dreamsWithEmbeddings = dreams.filter(d => d.embedding && d.embedding.length > 0);
    let queued = 0;
    
    for (const dream of dreamsWithEmbeddings) {
      await embeddingJobService.queueRarityComputation(dream.id, undefined, 0);
      queued++;
    }
    
    return queued;
  }

  async computeRankingsForVideos(limit = 50): Promise<number> {
    const videos = await storage.getAllSocialVideos(limit);
    const videosWithEmbeddings = videos.filter(v => v.emotionEmbedding && v.emotionEmbedding.length > 0);
    let queued = 0;
    
    for (const video of videosWithEmbeddings) {
      await embeddingJobService.queueRarityComputation(undefined, video.id, 0);
      queued++;
    }
    
    return queued;
  }

  async updateRanks(): Promise<void> {
    const candidates = await storage.getTopNftCandidates(1000);
    
    candidates.sort((a, b) => b.finalScore - a.finalScore);
    
    console.log(`Updated ranks for ${candidates.length} NFT candidates`);
  }

  calculateFinalScore(
    rarityScore: number,
    uniquenessScore: number,
    emotionComplexity: number,
    engagementMultiplier: number
  ): number {
    return (
      rarityScore * this.weights.rarityScore +
      uniquenessScore * this.weights.uniquenessScore +
      emotionComplexity * this.weights.emotionComplexity +
      (engagementMultiplier - 1) * 100 * this.weights.engagementMultiplier
    );
  }

  async getCandidateStats(): Promise<{
    total: number;
    candidates: number;
    approved: number;
    minted: number;
    rejected: number;
    avgRarityScore: number;
    avgFinalScore: number;
    dreamBased: number;
    videoBased: number;
  }> {
    const allCandidates = await storage.getTopNftCandidates(10000);
    
    const stats = {
      total: allCandidates.length,
      candidates: allCandidates.filter(c => c.nftStatus === 'candidate').length,
      approved: allCandidates.filter(c => c.nftStatus === 'approved').length,
      minted: allCandidates.filter(c => c.nftStatus === 'minted').length,
      rejected: allCandidates.filter(c => c.nftStatus === 'rejected').length,
      avgRarityScore: 0,
      avgFinalScore: 0,
      dreamBased: allCandidates.filter(c => c.sourceType === 'dream').length,
      videoBased: allCandidates.filter(c => c.sourceType === 'video').length,
    };
    
    if (allCandidates.length > 0) {
      stats.avgRarityScore = allCandidates.reduce((sum, c) => sum + c.rarityScore, 0) / allCandidates.length;
      stats.avgFinalScore = allCandidates.reduce((sum, c) => sum + c.finalScore, 0) / allCandidates.length;
    }
    
    stats.avgRarityScore = Math.round(stats.avgRarityScore * 10) / 10;
    stats.avgFinalScore = Math.round(stats.avgFinalScore * 10) / 10;
    
    return stats;
  }

  async getTopBySourceType(sourceType: 'dream' | 'video', limit = 20): Promise<NFTCandidate[]> {
    const candidates = await storage.getTopNftCandidates(200);
    return candidates
      .filter(c => c.sourceType === sourceType)
      .slice(0, limit);
  }

  async getRarityDistribution(): Promise<{
    legendary: number;
    epic: number;
    rare: number;
    common: number;
  }> {
    const candidates = await storage.getTopNftCandidates(10000);
    
    return {
      legendary: candidates.filter(c => c.rarityScore >= 90).length,
      epic: candidates.filter(c => c.rarityScore >= 70 && c.rarityScore < 90).length,
      rare: candidates.filter(c => c.rarityScore >= 40 && c.rarityScore < 70).length,
      common: candidates.filter(c => c.rarityScore < 40).length,
    };
  }

  getRarityTier(score: number): 'legendary' | 'epic' | 'rare' | 'common' {
    if (score >= 90) return 'legendary';
    if (score >= 70) return 'epic';
    if (score >= 40) return 'rare';
    return 'common';
  }

  getRarityTierEmoji(score: number): string {
    const tier = this.getRarityTier(score);
    const emojis = {
      legendary: '💎',
      epic: '🔥',
      rare: '✨',
      common: '📦',
    };
    return emojis[tier];
  }
}

export const nftRankingService = new NftRankingService();
