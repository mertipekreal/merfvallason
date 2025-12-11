import { storage } from "./storage";
import { HfInference } from "@huggingface/inference";
import type { EmbeddingJob, Dream, SocialVideo } from "@shared/schema";

const hf = new HfInference();

const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export class EmbeddingJobService {
  private isProcessing = false;
  private processingInterval: ReturnType<typeof setInterval> | null = null;

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: text,
      });
      
      if (Array.isArray(result) && result.length > 0) {
        if (Array.isArray(result[0])) {
          return result[0] as number[];
        }
        return result as number[];
      }
      
      throw new Error("Invalid embedding response format");
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  async processJob(job: EmbeddingJob): Promise<void> {
    try {
      await storage.updateEmbeddingJobStatus(job.id, 'processing');
      
      switch (job.jobType) {
        case 'embed_dream':
          await this.processDreamEmbedding(job);
          break;
        case 'embed_video':
          await this.processVideoEmbedding(job);
          break;
        case 'compute_dejavu':
          await this.computeDejavuMatches(job);
          break;
        case 'compute_rarity':
          await this.computeRarityScore(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }
      
      await storage.updateEmbeddingJobStatus(job.id, 'completed', { processedAt: new Date() });
    } catch (error: any) {
      console.error(`Error processing job ${job.id}:`, error);
      await storage.updateEmbeddingJobStatus(job.id, 'failed', undefined, error.message);
    }
  }

  private async processDreamEmbedding(job: EmbeddingJob): Promise<void> {
    if (!job.dreamId) {
      throw new Error("Dream ID required for embed_dream job");
    }
    
    const dream = await storage.getDream(job.dreamId);
    if (!dream) {
      throw new Error(`Dream not found: ${job.dreamId}`);
    }
    
    const textForEmbedding = `${dream.title}. ${dream.description}. Location: ${dream.location}. Emotion: ${dream.emotion}. Themes: ${(dream.themes || []).join(', ')}`;
    
    const embedding = await this.generateEmbedding(textForEmbedding);
    await storage.updateDreamEmbedding(job.dreamId, embedding);
  }

  private async processVideoEmbedding(job: EmbeddingJob): Promise<void> {
    if (!job.videoId) {
      throw new Error("Video ID required for embed_video job");
    }
    
    const video = await storage.getSocialVideo(job.videoId);
    if (!video) {
      throw new Error(`Video not found: ${job.videoId}`);
    }
    
    const textForEmbedding = `${video.caption || ''}. Hashtags: ${(video.hashtags || []).join(' ')}`;
    
    const embedding = await this.generateEmbedding(textForEmbedding);
    
    const detectedEmotions = await this.detectEmotions(textForEmbedding);
    
    await storage.updateSocialVideoEmbedding(job.videoId, embedding, detectedEmotions);
  }

  private async detectEmotions(text: string): Promise<Record<string, number>> {
    const emotions = {
      joy: 0,
      trust: 0,
      fear: 0,
      surprise: 0,
      sadness: 0,
      disgust: 0,
      anger: 0,
      anticipation: 0
    };
    
    const emotionKeywords: Record<string, string[]> = {
      joy: ['happy', 'joy', 'excited', 'love', 'amazing', 'mutlu', 'sevinç', 'harika'],
      trust: ['trust', 'believe', 'faith', 'hope', 'güven', 'umut'],
      fear: ['fear', 'scared', 'afraid', 'terror', 'korku', 'korkmuş'],
      surprise: ['surprise', 'shocked', 'wow', 'unexpected', 'şaşkın', 'beklenmedik'],
      sadness: ['sad', 'cry', 'lonely', 'depressed', 'üzgün', 'ağlamak'],
      disgust: ['disgust', 'gross', 'hate', 'tiksinme', 'nefret'],
      anger: ['angry', 'rage', 'furious', 'mad', 'kızgın', 'öfke'],
      anticipation: ['wait', 'expect', 'hope', 'excited', 'beklenti', 'heyecan']
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          emotions[emotion as keyof typeof emotions] += 0.2;
        }
      }
      emotions[emotion as keyof typeof emotions] = Math.min(1, emotions[emotion as keyof typeof emotions]);
    }
    
    return emotions;
  }

  private async computeDejavuMatches(job: EmbeddingJob): Promise<void> {
    if (!job.dreamId) {
      throw new Error("Dream ID required for compute_dejavu job");
    }
    
    const dream = await storage.getDream(job.dreamId);
    if (!dream || !dream.embedding) {
      throw new Error(`Dream not found or has no embedding: ${job.dreamId}`);
    }
    
    const videos = await storage.getAllSocialVideos(100);
    const videosWithEmbeddings = videos.filter(v => v.emotionEmbedding && v.emotionEmbedding.length > 0);
    
    for (const video of videosWithEmbeddings) {
      const similarity = this.cosineSimilarity(dream.embedding, video.emotionEmbedding!);
      const emotionMatch = this.calculateEmotionMatch(dream, video);
      const dejavuProbability = (similarity * 0.6) + (emotionMatch * 0.4);
      
      if (dejavuProbability >= 0.3) {
        await storage.createDejavuVideoMatch({
          dreamId: dream.id,
          videoId: video.id,
          similarityScore: similarity,
          emotionMatch,
          dejavuProbability,
          matchReason: this.generateMatchReason(similarity, emotionMatch),
        });
      }
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      const minLen = Math.min(a.length, b.length);
      a = a.slice(0, minLen);
      b = b.slice(0, minLen);
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateEmotionMatch(dream: Dream, video: SocialVideo): number {
    if (!video.detectedEmotions) return 0.5;
    
    const dreamEmotion = dream.emotion.toLowerCase();
    const emotions = video.detectedEmotions as Record<string, number>;
    
    const emotionMappings: Record<string, string[]> = {
      'joy': ['joy', 'happiness', 'sevinç', 'mutluluk'],
      'fear': ['fear', 'anxiety', 'korku', 'anksiyete'],
      'sadness': ['sadness', 'sad', 'üzüntü', 'hüzün'],
      'surprise': ['surprise', 'şaşkınlık'],
      'anger': ['anger', 'öfke', 'kızgınlık'],
    };
    
    for (const [emotionKey, variants] of Object.entries(emotionMappings)) {
      if (variants.some(v => dreamEmotion.includes(v))) {
        return emotions[emotionKey] || 0.5;
      }
    }
    
    return 0.5;
  }

  private generateMatchReason(similarity: number, emotionMatch: number): string {
    const reasons: string[] = [];
    
    if (similarity >= 0.7) {
      reasons.push("Yüksek semantik benzerlik");
    } else if (similarity >= 0.5) {
      reasons.push("Orta düzey semantik benzerlik");
    }
    
    if (emotionMatch >= 0.7) {
      reasons.push("Güçlü duygusal eşleşme");
    } else if (emotionMatch >= 0.5) {
      reasons.push("Orta düzey duygusal eşleşme");
    }
    
    return reasons.join(", ") || "Temel benzerlik tespit edildi";
  }

  private async computeRarityScore(job: EmbeddingJob): Promise<void> {
    if (!job.dreamId && !job.videoId) {
      throw new Error("Dream ID or Video ID required for compute_rarity job");
    }
    
    let rarityScore = 50;
    let uniquenessScore = 0;
    let emotionComplexity = 0;
    let engagementMultiplier = 1;
    let title = "";
    let previewUrl: string | undefined;
    let sourceType: "dream" | "video" = "dream";
    
    if (job.dreamId) {
      const dream = await storage.getDream(job.dreamId);
      if (!dream) throw new Error(`Dream not found: ${job.dreamId}`);
      
      sourceType = "dream";
      title = dream.title;
      
      const themesCount = (dream.themes as string[] || []).length;
      const objectsCount = (dream.objects as string[] || []).length;
      const textLength = dream.description.length;
      
      uniquenessScore = Math.min(100, themesCount * 10 + objectsCount * 5);
      emotionComplexity = Math.min(100, dream.intensity * 10);
      
      rarityScore = Math.min(100, 
        30 + 
        (textLength > 200 ? 20 : textLength / 10) +
        uniquenessScore * 0.3 +
        emotionComplexity * 0.2
      );
    } else if (job.videoId) {
      const video = await storage.getSocialVideo(job.videoId);
      if (!video) throw new Error(`Video not found: ${job.videoId}`);
      
      sourceType = "video";
      title = video.caption?.substring(0, 100) || "Untitled Video";
      previewUrl = video.thumbnailUrl || undefined;
      
      const hashtagsCount = (video.hashtags as string[] || []).length;
      const viewCount = video.viewCount || 0;
      const likeCount = video.likeCount || 0;
      const commentCount = video.commentCount || 0;
      
      uniquenessScore = Math.min(100, hashtagsCount * 5);
      engagementMultiplier = 1 + (video.engagementRate || 0) * 0.5;
      
      if (video.detectedEmotions) {
        const emotions = Object.values(video.detectedEmotions as Record<string, number>);
        emotionComplexity = Math.min(100, emotions.filter(e => e > 0.3).length * 15);
      }
      
      const engagementScore = Math.min(50, (viewCount + likeCount * 2 + commentCount * 3) / 10000);
      rarityScore = Math.min(100, 
        20 + 
        uniquenessScore * 0.2 +
        emotionComplexity * 0.3 +
        engagementScore
      );
    }
    
    const finalScore = rarityScore * engagementMultiplier;
    
    await storage.createNftCandidate({
      dreamId: job.dreamId ?? undefined,
      videoId: job.videoId ?? undefined,
      rarityScore,
      uniquenessScore,
      emotionComplexity,
      engagementMultiplier,
      finalScore,
      title,
      previewUrl,
      sourceType,
      nftStatus: "candidate",
    });
  }

  async queueDreamEmbedding(dreamId: string, priority = 0): Promise<EmbeddingJob> {
    return storage.createEmbeddingJob({
      jobType: 'embed_dream',
      dreamId,
      priority,
      status: 'pending',
    });
  }

  async queueVideoEmbedding(videoId: string, priority = 0): Promise<EmbeddingJob> {
    return storage.createEmbeddingJob({
      jobType: 'embed_video',
      videoId,
      priority,
      status: 'pending',
    });
  }

  async queueDejavuComputation(dreamId: string, priority = 0): Promise<EmbeddingJob> {
    return storage.createEmbeddingJob({
      jobType: 'compute_dejavu',
      dreamId,
      priority,
      status: 'pending',
    });
  }

  async queueRarityComputation(dreamId?: string, videoId?: string, priority = 0): Promise<EmbeddingJob> {
    return storage.createEmbeddingJob({
      jobType: 'compute_rarity',
      dreamId,
      videoId,
      priority,
      status: 'pending',
    });
  }

  async processPendingJobs(limit = 10): Promise<number> {
    const pendingJobs = await storage.getPendingEmbeddingJobs(limit);
    let processedCount = 0;
    
    for (const job of pendingJobs) {
      try {
        await this.processJob(job);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
      }
    }
    
    return processedCount;
  }

  startBackgroundProcessing(intervalMs = 5000): void {
    if (this.processingInterval) {
      console.log("Background processing already running");
      return;
    }
    
    console.log(`Starting background job processing every ${intervalMs}ms`);
    
    this.processingInterval = setInterval(async () => {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      try {
        const processed = await this.processPendingJobs(5);
        if (processed > 0) {
          console.log(`Processed ${processed} embedding jobs`);
        }
      } catch (error) {
        console.error("Background processing error:", error);
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  stopBackgroundProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log("Background processing stopped");
    }
  }
}

export const embeddingJobService = new EmbeddingJobService();
