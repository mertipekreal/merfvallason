import { storage } from "../../../storage";
import type { Feedback, InsertFeedback, FeedbackType } from "@shared/schema";

export interface FeedbackStats {
  positive: number;
  negative: number;
  total: number;
  byType: Record<string, { positive: number; negative: number }>;
  avgRating: number;
  avgConfidence: number;
}

export class FeedbackService {
  
  async submitFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const fb = await storage.createFeedback(feedbackData);
    
    await this.updateRLHFModel(fb);
    
    return fb;
  }

  private async updateRLHFModel(feedback: Feedback): Promise<void> {
    console.log(`RLHF Feedback received: Type=${feedback.feedbackType}, Vote=${feedback.vote}`);
    
  }

  async getFeedbackStats(): Promise<FeedbackStats> {
    const basicStats = await storage.getFeedbackStats();
    
    const byType: Record<string, { positive: number; negative: number }> = {};
    const feedbackTypes: FeedbackType[] = ['match_quality', 'emotion_accuracy', 'nft_rarity', 'content_relevance'];
    
    for (const type of feedbackTypes) {
      const feedbacks = await storage.getFeedbackByType(type, 1000);
      byType[type] = {
        positive: feedbacks.filter(f => f.vote === 1).length,
        negative: feedbacks.filter(f => f.vote === 0).length,
      };
    }
    
    const allFeedbacks = await this.getAllFeedback(1000);
    
    const ratingsWithValues = allFeedbacks.filter(f => f.rating !== null && f.rating !== undefined);
    const avgRating = ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsWithValues.length
      : 0;
    
    const confidencesWithValues = allFeedbacks.filter(f => f.confidence !== null && f.confidence !== undefined);
    const avgConfidence = confidencesWithValues.length > 0
      ? confidencesWithValues.reduce((sum, f) => sum + (f.confidence || 0), 0) / confidencesWithValues.length
      : 0;
    
    return {
      ...basicStats,
      byType,
      avgRating: Math.round(avgRating * 10) / 10,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  async getAllFeedback(limit = 50): Promise<Feedback[]> {
    const allFeedbacks: Feedback[] = [];
    const feedbackTypes: FeedbackType[] = ['match_quality', 'emotion_accuracy', 'nft_rarity', 'content_relevance'];
    
    for (const type of feedbackTypes) {
      const feedbacks = await storage.getFeedbackByType(type, Math.ceil(limit / feedbackTypes.length));
      allFeedbacks.push(...feedbacks);
    }
    
    return allFeedbacks
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async submitMatchQualityFeedback(
    matchId: string,
    dreamId: string,
    vote: 0 | 1,
    rating?: number,
    notes?: string
  ): Promise<Feedback> {
    return this.submitFeedback({
      feedbackType: 'match_quality',
      matchId,
      dreamId,
      vote,
      rating,
      notes,
      confidence: rating ? rating / 5 : undefined,
    });
  }

  async submitEmotionAccuracyFeedback(
    dreamId?: string,
    videoId?: string,
    vote: 0 | 1 = 1,
    rating?: number,
    notes?: string
  ): Promise<Feedback> {
    return this.submitFeedback({
      feedbackType: 'emotion_accuracy',
      dreamId,
      videoId,
      vote,
      rating,
      notes,
      confidence: rating ? rating / 5 : undefined,
    });
  }

  async submitNftRarityFeedback(
    dreamId?: string,
    videoId?: string,
    vote: 0 | 1 = 1,
    rating?: number,
    notes?: string
  ): Promise<Feedback> {
    return this.submitFeedback({
      feedbackType: 'nft_rarity',
      dreamId,
      videoId,
      vote,
      rating,
      notes,
      confidence: rating ? rating / 5 : undefined,
    });
  }

  async submitContentRelevanceFeedback(
    videoId?: string,
    dejavuId?: string,
    vote: 0 | 1 = 1,
    rating?: number,
    notes?: string
  ): Promise<Feedback> {
    return this.submitFeedback({
      feedbackType: 'content_relevance',
      videoId,
      dejavuId,
      vote,
      rating,
      notes,
      confidence: rating ? rating / 5 : undefined,
    });
  }

  async getRLHFTrainingData(): Promise<{
    positiveExamples: Feedback[];
    negativeExamples: Feedback[];
    highConfidenceExamples: Feedback[];
  }> {
    const allFeedback = await this.getAllFeedback(500);
    
    const positiveExamples = allFeedback.filter(f => f.vote === 1);
    const negativeExamples = allFeedback.filter(f => f.vote === 0);
    const highConfidenceExamples = allFeedback.filter(f => (f.confidence || 0) >= 0.8);
    
    return {
      positiveExamples,
      negativeExamples,
      highConfidenceExamples,
    };
  }

  getAccuracyByType(): Promise<Record<string, number>> {
    return this.getFeedbackStats().then(stats => {
      const accuracy: Record<string, number> = {};
      
      for (const [type, counts] of Object.entries(stats.byType)) {
        const total = counts.positive + counts.negative;
        accuracy[type] = total > 0 ? (counts.positive / total) * 100 : 0;
      }
      
      return accuracy;
    });
  }
}

export const feedbackService = new FeedbackService();
