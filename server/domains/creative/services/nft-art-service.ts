import { getDb } from '../../../db';
import { 
  nftAssets, dreamMetadata, dreams,
  DreamEmotionCategory, NFTMetadata, DreamMetadata, Dream
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { runwayService } from './runway-service';

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Database not available');
  return db;
}

export class NFTArtService {
  async generateArtPrompt(dream: Dream, metadata: DreamMetadata | null): Promise<string> {
    const parts: string[] = [];
    
    if (dream.title) {
      parts.push(dream.title);
    }
    
    if (dream.description && dream.description.length > 10) {
      const desc = dream.description.length > 300 
        ? dream.description.substring(0, 300) + '...'
        : dream.description;
      parts.push(desc);
    }
    
    const emotionProfile = metadata?.emotionProfile || {};
    const emotions = Object.entries(emotionProfile)
      .filter(([_, score]) => (score as number) > 10)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([emotion]) => emotion);
    
    if (emotions.length > 0) {
      parts.push(`Emotions: ${emotions.join(', ')}`);
    }
    
    const locations = (metadata?.locations || [dream.location]).filter(Boolean) as string[];
    if (locations.length > 0) {
      parts.push(`Setting: ${locations.join(', ')}`);
    }
    
    const characters = (metadata?.mainCharacters || []).filter(Boolean) as string[];
    if (characters.length > 0) {
      parts.push(`Characters: ${characters.join(', ')}`);
    }
    
    const motifs = (metadata?.motifs || []).filter(Boolean) as string[];
    if (motifs.length > 0) {
      parts.push(`Themes: ${motifs.join(', ')}`);
    }

    const prompt = parts.join('. ');
    
    console.log('Generated unique art prompt:', prompt.substring(0, 200) + '...');
    
    return prompt;
  }

  async generateArtWithRunway(prompt: string): Promise<string> {
    try {
      console.log('Generating art with Runway API...');
      const imageUrl = await runwayService.generateImageDirect(prompt, '1024:1024');
      console.log('Runway art generated:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Runway image generation failed:', error);
      throw new Error(`Failed to generate art with Runway: ${(error as Error).message}`);
    }
  }

  calculateRarityScore(dream: Dream, metadata: DreamMetadata | null): number {
    let score = 0;
    
    const emotionProfile = metadata?.emotionProfile || {};
    const emotionValues = Object.values(emotionProfile) as number[];
    
    if (emotionValues.length > 0) {
      const avg = emotionValues.reduce((a, b) => a + b, 0) / emotionValues.length;
      const variance = emotionValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / emotionValues.length;
      score += Math.min(variance / 500, 25);
    }
    
    const motifCount = (metadata?.motifs || []).length;
    score += Math.min(motifCount * 5, 20);
    
    const dejavuIntensity = metadata?.dejavuIntensity || 0;
    score += dejavuIntensity * 2;
    
    const intensity = dream.intensity || 5;
    score += intensity * 2;
    
    const clarity = metadata?.clarity || 'medium';
    if (clarity === 'high') score += 15;
    else if (clarity === 'medium') score += 8;
    else score += 3;
    
    const characterCount = (metadata?.mainCharacters || []).length;
    score += Math.min(characterCount * 3, 10);
    
    return Math.min(Math.round(score), 100);
  }

  async createNFTAsset(dreamId: string, userId?: string): Promise<typeof nftAssets.$inferSelect> {
    const db = requireDb();
    
    const [dream] = await db.select().from(dreams).where(eq(dreams.id, dreamId)).limit(1);
    if (!dream) throw new Error('Dream not found');
    
    const [metadata] = await db.select().from(dreamMetadata).where(eq(dreamMetadata.dreamId, dreamId)).limit(1);
    
    const assetId = randomUUID();
    const artPrompt = await this.generateArtPrompt(dream, metadata || null);
    const rarityScore = this.calculateRarityScore(dream, metadata || null);
    
    await db.insert(nftAssets).values({
      id: assetId,
      dreamId,
      userId: userId || null,
      status: 'pending',
      artPrompt,
      rarityScore,
    });
    
    const [asset] = await db.select().from(nftAssets).where(eq(nftAssets.id, assetId)).limit(1);
    return asset;
  }

  async generateArtForAsset(assetId: string): Promise<typeof nftAssets.$inferSelect> {
    const db = requireDb();
    
    const [asset] = await db.select().from(nftAssets).where(eq(nftAssets.id, assetId)).limit(1);
    if (!asset) throw new Error('NFT asset not found');
    
    await db.update(nftAssets)
      .set({ status: 'generating' })
      .where(eq(nftAssets.id, assetId));
    
    try {
      const imageUrl = await this.generateArtWithRunway(asset.artPrompt || '');
      
      const [dream] = await db.select().from(dreams).where(eq(dreams.id, asset.dreamId)).limit(1);
      const [metadata] = await db.select().from(dreamMetadata).where(eq(dreamMetadata.dreamId, asset.dreamId)).limit(1);
      
      const nftMetadata = this.createNFTMetadata(dream, metadata, asset.rarityScore, imageUrl);
      
      await db.update(nftAssets)
        .set({ 
          status: 'ready',
          imageUrl,
          metadata: nftMetadata,
          completedAt: new Date(),
        })
        .where(eq(nftAssets.id, assetId));
      
      const [updatedAsset] = await db.select().from(nftAssets).where(eq(nftAssets.id, assetId)).limit(1);
      return updatedAsset;
    } catch (error) {
      await db.update(nftAssets)
        .set({ 
          status: 'failed',
          errorMessage: (error as Error).message,
        })
        .where(eq(nftAssets.id, assetId));
      
      throw error;
    }
  }

  createNFTMetadata(dream: Dream, metadata: DreamMetadata | null, rarityScore: number, imageUrl: string): NFTMetadata {
    const emotionProfile = metadata?.emotionProfile || {};
    const primaryEmotion = Object.entries(emotionProfile)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    
    return {
      name: `DuyguMotor Dreamscape: ${dream.title}`,
      description: `Bilinçaltının derinliklerinden gelen benzersiz bir rüya görselleştirmesi.

Dominant Duygu: ${primaryEmotion?.[0] || 'Bilinmeyen'}
Nadirlık Skoru: ${rarityScore}%
Berraklık: ${metadata?.clarity || 'normal'}
Motifler: ${(metadata?.motifs || []).join(', ') || 'Yok'}

Bu NFT, rüyaların ve bilinçaltının gizemli alemine bir pencere açıyor.`,
      image: imageUrl,
      external_url: `https://duygumotor.app/dreams/${dream.id}`,
      attributes: [
        {
          trait_type: 'Dominant Duygu',
          value: primaryEmotion?.[0] || 'Bilinmeyen',
        },
        {
          trait_type: 'Duygusal Yoğunluk',
          value: typeof primaryEmotion?.[1] === 'number' ? primaryEmotion[1] : 0,
          display_type: 'number',
        },
        {
          trait_type: 'Nadirlık Skoru',
          value: rarityScore,
          display_type: 'number',
        },
        {
          trait_type: 'Berraklık',
          value: metadata?.clarity || 'normal',
        },
        {
          trait_type: 'Mekan',
          value: dream.location,
        },
        {
          trait_type: 'Yoğunluk',
          value: dream.intensity,
          display_type: 'number',
        },
        {
          trait_type: 'DejaVu Şiddeti',
          value: metadata?.dejavuIntensity || 0,
          display_type: 'number',
        },
        {
          trait_type: 'Motif Sayısı',
          value: (metadata?.motifs || []).length,
          display_type: 'number',
        },
      ],
    };
  }

  async getAssetStatus(assetId: string): Promise<typeof nftAssets.$inferSelect | null> {
    const db = requireDb();
    const [asset] = await db.select().from(nftAssets).where(eq(nftAssets.id, assetId)).limit(1);
    return asset || null;
  }

  async getAssetsByDream(dreamId: string): Promise<typeof nftAssets.$inferSelect[]> {
    const db = requireDb();
    return db.select().from(nftAssets).where(eq(nftAssets.dreamId, dreamId));
  }

  async getAllAssets(userId?: string): Promise<typeof nftAssets.$inferSelect[]> {
    const db = requireDb();
    if (userId) {
      return db.select().from(nftAssets).where(eq(nftAssets.userId, userId));
    }
    return db.select().from(nftAssets);
  }
}

export const nftArtService = new NFTArtService();
