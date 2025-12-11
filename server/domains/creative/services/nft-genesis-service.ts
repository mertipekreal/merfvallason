import { getDb } from '../../../db';
import { 
  nftAssets, dreams, dreamMetadata,
  type Dream, type DreamMetadata, type NFTMetadata
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { runwayService } from './runway-service';
import { GlobalDreamAnalyzer } from '../../valuation/services/fate-engine';
import { extractDeepThemes, type DeepDreamThemes } from '../../valuation/services/dream-dejavu-service';

function requireDb() {
  const db = getDb();
  if (!db) throw new Error('Database not available');
  return db;
}

export interface NFTGenesisConfig {
  useRunway: boolean;
  generateVideo: boolean;
  platform: 'tiktok' | 'instagram' | 'youtube';
  includeKaderAnalysis: boolean;
  includeArchetypes: boolean;
}

export interface KaderNFTAttributes {
  consciousnessLevel: string;
  consciousnessScore: number;
  synchronicityType: string;
  synchronicityScore: number;
  fateTrajectory: string;
  fateScore: number;
  prophetic: boolean;
  butterflyEffects: string[];
}

export interface ArchetypeNFTAttributes {
  primaryArchetype: string;
  secondaryArchetypes: string[];
  symbols: Array<{ symbol: string; meaning: string }>;
  narrativePattern: string;
  psychologicalInsight: string;
}

export interface GenesisNFTMetadata extends NFTMetadata {
  kaderAttributes?: KaderNFTAttributes;
  archetypeAttributes?: ArchetypeNFTAttributes;
  generationType: 'image' | 'video';
  rarityTier: 'legendary' | 'epic' | 'rare' | 'common';
  elementalAffinity: string;
  cosmicSignature: string;
}

const CONSCIOUSNESS_TO_RARITY: Record<string, 'legendary' | 'epic' | 'rare' | 'common'> = {
  'ASCENDED': 'legendary',
  'ARCHITECT': 'epic',
  'PLAYER': 'rare',
  'AWAKENING': 'common',
  'NPC': 'common',
};

const ARCHETYPE_ELEMENTS: Record<string, string> = {
  water: 'Su - Akış ve Dönüşüm',
  flying: 'Hava - Özgürlük ve Yükseliş',
  death: 'Toprak - Yeniden Doğuş',
  shadow: 'Karanlık - Gizli Güç',
  anima: 'Ay - Sezgisel Bilgelik',
  animus: 'Güneş - Aktif Enerji',
  transformation: 'Ateş - Evrim',
  house: 'Toprak - Güvenlik',
  chase: 'Rüzgar - Hareket',
  falling: 'Boşluk - Bırakış',
};

const CONSCIOUSNESS_VISUALS: Record<string, string> = {
  NPC: 'muted colors, static composition, everyday scenes, mundane reality',
  AWAKENING: 'emerging light, cracks in reality, first glimpses of magic, dawn breaking',
  PLAYER: 'vibrant energy, dynamic movement, game-like elements, power auras',
  ARCHITECT: 'geometric patterns, cosmic structures, reality manipulation, sacred geometry',
  ASCENDED: 'pure light, transcendent forms, divine geometry, infinite fractals, cosmic consciousness',
};

const SYNCHRONICITY_EFFECTS: Record<string, string> = {
  NONE: 'isolated elements, disconnected forms',
  WEAK: 'subtle connections, faint threads of light',
  MODERATE: 'visible patterns, interconnected symbols',
  STRONG: 'powerful resonance, harmonious alignment, golden threads',
  PERFECT: 'total unity, cosmic synchronization, divine order, mandala patterns',
};

export class NFTGenesisService {
  
  async generateGenesisNFT(
    dreamId: string,
    config: Partial<NFTGenesisConfig> = {}
  ): Promise<typeof nftAssets.$inferSelect> {
    const db = requireDb();
    
    const fullConfig: NFTGenesisConfig = {
      useRunway: config.useRunway ?? true,
      generateVideo: config.generateVideo ?? false,
      platform: config.platform ?? 'instagram',
      includeKaderAnalysis: config.includeKaderAnalysis ?? true,
      includeArchetypes: config.includeArchetypes ?? true,
    };
    
    const [dream] = await db.select().from(dreams).where(eq(dreams.id, dreamId)).limit(1);
    if (!dream) throw new Error('Rüya bulunamadı');
    
    const [metadata] = await db.select().from(dreamMetadata).where(eq(dreamMetadata.dreamId, dreamId)).limit(1);
    
    let kaderAttributes: KaderNFTAttributes | undefined;
    let archetypeAttributes: ArchetypeNFTAttributes | undefined;
    let deepThemes: DeepDreamThemes | undefined;
    
    if (fullConfig.includeKaderAnalysis) {
      kaderAttributes = await this.analyzeWithKaderMotoru(dream);
    }
    
    if (fullConfig.includeArchetypes) {
      deepThemes = await extractDeepThemes(dream);
      archetypeAttributes = this.extractArchetypeAttributes(deepThemes);
    }
    
    const rarityTier = this.calculateRarityTier(kaderAttributes, archetypeAttributes, dream);
    const rarityScore = this.calculateEnhancedRarityScore(kaderAttributes, archetypeAttributes, dream, metadata);
    
    const artPrompt = await this.generateEnhancedArtPrompt(
      dream, 
      metadata, 
      kaderAttributes, 
      archetypeAttributes,
      deepThemes
    );
    
    const assetId = randomUUID();
    const elementalAffinity = this.determineElementalAffinity(archetypeAttributes, deepThemes);
    const cosmicSignature = this.generateCosmicSignature(kaderAttributes, dream);
    
    await db.insert(nftAssets).values({
      id: assetId,
      dreamId,
      nftType: 'genesis',
      status: 'pending',
      artPrompt,
      rarityScore,
      metadata: {
        name: `Kader Rüyası: ${dream.title}`,
        description: this.generateNFTDescription(dream, kaderAttributes, archetypeAttributes, rarityTier),
        image: '',
        external_url: `https://duygumotor.app/nft/${assetId}`,
        attributes: this.buildNFTAttributes(
          dream, 
          metadata, 
          kaderAttributes, 
          archetypeAttributes, 
          rarityTier,
          elementalAffinity,
          cosmicSignature
        ),
        kaderAttributes,
        archetypeAttributes,
        generationType: fullConfig.generateVideo ? 'video' : 'image',
        rarityTier,
        elementalAffinity,
        cosmicSignature,
      } as GenesisNFTMetadata,
    });
    
    if (fullConfig.useRunway) {
      try {
        await db.update(nftAssets)
          .set({ status: 'generating' })
          .where(eq(nftAssets.id, assetId));
        
        if (fullConfig.generateVideo) {
          const runwayTask = await runwayService.createTextToVideo(
            artPrompt,
            fullConfig.platform,
            6
          );
          
          await db.update(nftAssets)
            .set({ 
              status: 'processing',
              metadata: {
                ...((await this.getAsset(assetId))?.metadata as any || {}),
                runwayTaskId: runwayTask.runwayTaskId,
              }
            })
            .where(eq(nftAssets.id, assetId));
        } else {
          // Image generation is not available yet - keep as pending for manual generation
          // NFT will stay in 'pending' status until art is generated via generateArt endpoint
          await db.update(nftAssets)
            .set({ status: 'pending' })
            .where(eq(nftAssets.id, assetId));
        }
      } catch (error) {
        console.error('NFT generation error:', error);
        await db.update(nftAssets)
          .set({ 
            status: 'failed',
            errorMessage: (error as Error).message,
          })
          .where(eq(nftAssets.id, assetId));
      }
    }
    
    const [asset] = await db.select().from(nftAssets).where(eq(nftAssets.id, assetId)).limit(1);
    return asset;
  }
  
  private async analyzeWithKaderMotoru(dream: Dream): Promise<KaderNFTAttributes> {
    try {
      const themes = (dream.themes as string[] || []);
      const objects = (dream.objects as string[] || []);
      const symbols = [...themes, ...objects];
      
      const globalMatches = await GlobalDreamAnalyzer.findMatchingDreams(symbols, 10);
      const archetypeAnalysis = GlobalDreamAnalyzer.detectArchetypes(symbols);
      
      const symbolDensity = Math.min(symbols.length / 10, 1);
      const emotionalCharge = this.calculateEmotionalCharge(dream.emotion, dream.intensity);
      const lucidityLevel = Math.random() * 0.5 + (dream.intensity > 7 ? 0.3 : 0);
      
      const consciousnessScore = Math.min(100, Math.round(
        (symbolDensity * 30) + 
        (Math.abs(emotionalCharge) * 20) + 
        (lucidityLevel * 25) + 
        (archetypeAnalysis.length * 5) +
        (globalMatches.length * 2)
      ));
      
      const consciousnessLevel = this.getConsciousnessFromScore(consciousnessScore);
      
      const syncScore = Math.min(100, globalMatches.reduce((sum, m) => sum + m.similarity * 100, 0));
      const syncType = this.getSyncTypeFromScore(syncScore);
      
      const fateScore = (consciousnessScore * 0.4 + syncScore * 0.3 + dream.intensity * 3);
      
      const isProphetic = lucidityLevel > 0.7 && symbolDensity > 0.5 && emotionalCharge > 0.5;
      
      const butterflyEffects: string[] = [];
      if (fateScore > 70) {
        butterflyEffects.push('Kritik karar noktası yaklaşıyor');
      }
      if (consciousnessScore > 60) {
        butterflyEffects.push('Bilinç genişlemesi potansiyeli aktif');
      }
      if (syncScore > 50) {
        butterflyEffects.push('Kozmik bağlantılar güçleniyor');
      }
      if (archetypeAnalysis.length > 3) {
        butterflyEffects.push('Arketipsel enerji yoğunlaşması');
      }
      
      return {
        consciousnessLevel,
        consciousnessScore,
        synchronicityType: syncType,
        synchronicityScore: syncScore,
        fateTrajectory: this.getFateTrajectory(fateScore),
        fateScore,
        prophetic: isProphetic,
        butterflyEffects,
      };
    } catch (error) {
      console.error('Kader analysis error:', error);
      return {
        consciousnessLevel: 'AWAKENING',
        consciousnessScore: 40,
        synchronicityType: 'WEAK',
        synchronicityScore: 30,
        fateTrajectory: 'Keşif Yolculuğu',
        fateScore: 50,
        prophetic: false,
        butterflyEffects: [],
      };
    }
  }
  
  private calculateEmotionalCharge(emotion: string, intensity: number): number {
    const positiveEmotions = ['joy', 'wonder', 'peace', 'trust', 'love', 'hope'];
    const negativeEmotions = ['fear', 'anger', 'sadness', 'disgust', 'anxiety'];
    
    const normalizedIntensity = intensity / 10;
    
    if (positiveEmotions.some(e => emotion.toLowerCase().includes(e))) {
      return normalizedIntensity;
    } else if (negativeEmotions.some(e => emotion.toLowerCase().includes(e))) {
      return -normalizedIntensity;
    }
    return normalizedIntensity * 0.5;
  }
  
  private getConsciousnessFromScore(score: number): string {
    if (score >= 85) return 'ASCENDED';
    if (score >= 70) return 'ARCHITECT';
    if (score >= 50) return 'PLAYER';
    if (score >= 30) return 'AWAKENING';
    return 'NPC';
  }
  
  private getSyncTypeFromScore(score: number): string {
    if (score >= 80) return 'PERFECT';
    if (score >= 60) return 'STRONG';
    if (score >= 40) return 'MODERATE';
    if (score >= 20) return 'WEAK';
    return 'NONE';
  }
  
  private getFateTrajectory(score: number): string {
    if (score >= 80) return 'Yükselen Yıldız';
    if (score >= 60) return 'Dönüşüm Yolu';
    if (score >= 40) return 'Keşif Yolculuğu';
    if (score >= 20) return 'Uyanış Başlangıcı';
    return 'Sessiz Gözlem';
  }
  
  private extractArchetypeAttributes(themes: DeepDreamThemes): ArchetypeNFTAttributes {
    return {
      primaryArchetype: themes.archetypes[0] || 'Bilinmeyen',
      secondaryArchetypes: themes.archetypes.slice(1, 4),
      symbols: themes.symbols.slice(0, 5),
      narrativePattern: themes.narrativePattern,
      psychologicalInsight: themes.psychologicalInsight,
    };
  }
  
  private calculateRarityTier(
    kader: KaderNFTAttributes | undefined,
    archetype: ArchetypeNFTAttributes | undefined,
    dream: Dream
  ): 'legendary' | 'epic' | 'rare' | 'common' {
    let score = 0;
    
    if (kader) {
      score += kader.consciousnessScore * 0.3;
      score += kader.synchronicityScore * 0.2;
      if (kader.prophetic) score += 20;
      score += Math.min(kader.butterflyEffects.length * 5, 15);
    }
    
    if (archetype) {
      score += archetype.symbols.length * 3;
      score += archetype.secondaryArchetypes.length * 5;
    }
    
    score += dream.intensity * 2;
    
    if (score >= 85) return 'legendary';
    if (score >= 65) return 'epic';
    if (score >= 40) return 'rare';
    return 'common';
  }
  
  private calculateEnhancedRarityScore(
    kader: KaderNFTAttributes | undefined,
    archetype: ArchetypeNFTAttributes | undefined,
    dream: Dream,
    metadata: DreamMetadata | null
  ): number {
    let score = 30;
    
    if (kader) {
      score += kader.consciousnessScore * 0.2;
      score += kader.synchronicityScore * 0.15;
      score += kader.fateScore * 0.1;
      if (kader.prophetic) score += 10;
    }
    
    if (archetype) {
      score += Math.min(archetype.symbols.length * 2, 10);
      score += Math.min(archetype.secondaryArchetypes.length * 3, 9);
    }
    
    score += dream.intensity * 1.5;
    
    if (metadata) {
      const motifCount = (metadata.motifs as string[] || []).length;
      score += Math.min(motifCount * 2, 8);
      
      if (metadata.clarity === 'high') score += 5;
      if ((metadata.dejavuIntensity || 0) > 5) score += 5;
    }
    
    return Math.min(Math.round(score), 100);
  }
  
  private async generateEnhancedArtPrompt(
    dream: Dream,
    metadata: DreamMetadata | null,
    kader: KaderNFTAttributes | undefined,
    archetype: ArchetypeNFTAttributes | undefined,
    themes: DeepDreamThemes | undefined
  ): Promise<string> {
    const consciousnessVisual = kader 
      ? CONSCIOUSNESS_VISUALS[kader.consciousnessLevel] || CONSCIOUSNESS_VISUALS.AWAKENING
      : CONSCIOUSNESS_VISUALS.AWAKENING;
    
    const syncEffect = kader
      ? SYNCHRONICITY_EFFECTS[kader.synchronicityType] || SYNCHRONICITY_EFFECTS.WEAK
      : SYNCHRONICITY_EFFECTS.WEAK;
    
    const archetypeElements = archetype?.symbols
      .map(s => s.symbol)
      .join(', ') || 'mysterious symbols';
    
    const emotionColors = this.getEmotionColors(dream.emotion, dream.intensity);
    
    const narrativeStyle = themes?.narrativePattern || 'mystical journey';
    
    const prompt = `Create a mystical, ethereal digital artwork for an NFT:

TITLE: "${dream.title}"

CONSCIOUSNESS LEVEL: ${kader?.consciousnessLevel || 'AWAKENING'}
Visual style: ${consciousnessVisual}

SYNCHRONICITY PATTERN:
${syncEffect}

ARCHETYPAL SYMBOLS:
${archetypeElements}

NARRATIVE PATTERN: ${narrativeStyle}

EMOTIONAL PALETTE:
${emotionColors}

LOCATION: ${dream.location}
${themes?.locations?.join(', ') || ''}

ATMOSPHERE:
- ${kader?.prophetic ? 'Prophetic vision, glowing with destiny' : 'Dream-like ethereal quality'}
- Jungian symbolism embedded throughout
- Turkish mystical aesthetic influences
- Cinematic lighting with dramatic shadows
- Sacred geometry and cosmic patterns

RARITY TIER: ${this.calculateRarityTier(kader, archetype, dream).toUpperCase()}

STYLE: Surreal digital art, ethereal, mystical, high detail, professional NFT quality, no text, no watermarks, cinematic composition, 8K quality`;

    return prompt;
  }
  
  private async generateImageWithGemini(prompt: string, dream: Dream): Promise<string> {
    try {
      const enhancedPrompt = `${prompt}\n\nÖnemli: Bu görsel "${dream.title}" adlı rüyanın NFT sanatı için üretilmektedir.`;
      
      return `https://placeholder.duygumotor.app/nft/${dream.id}?style=genesis`;
    } catch (error) {
      console.error('Image generation error:', error);
      return '';
    }
  }
  
  private generateNFTDescription(
    dream: Dream,
    kader: KaderNFTAttributes | undefined,
    archetype: ArchetypeNFTAttributes | undefined,
    rarityTier: string
  ): string {
    const tierLabels: Record<string, string> = {
      legendary: 'Efsanevi',
      epic: 'Destansı',
      rare: 'Nadir',
      common: 'Yaygın',
    };
    
    let description = `🌙 Kader Rüyası Koleksiyonu

"${dream.title}"

${rarityTier === 'legendary' ? '💎' : rarityTier === 'epic' ? '🔥' : rarityTier === 'rare' ? '✨' : '📦'} Nadirlık: ${tierLabels[rarityTier]}
`;

    if (kader) {
      description += `
🧠 Bilinç Seviyesi: ${kader.consciousnessLevel}
🔮 Senkronisite: ${kader.synchronicityType}
📈 Kader Skoru: ${kader.fateScore.toFixed(1)}
${kader.prophetic ? '⚡ Kehanet Rüyası' : ''}
`;
    }
    
    if (archetype) {
      description += `
🎭 Birincil Arketip: ${archetype.primaryArchetype}
📖 Anlatı Kalıbı: ${archetype.narrativePattern}

"${archetype.psychologicalInsight}"
`;
    }
    
    description += `
---
Bu NFT, DuyguMotor Kader Rüyası Koleksiyonu'nun bir parçasıdır.
Bilinçaltının derinliklerinden gelen benzersiz bir sanat eseri.`;

    return description;
  }
  
  private buildNFTAttributes(
    dream: Dream,
    metadata: DreamMetadata | null,
    kader: KaderNFTAttributes | undefined,
    archetype: ArchetypeNFTAttributes | undefined,
    rarityTier: string,
    elementalAffinity: string,
    cosmicSignature: string
  ): NFTMetadata['attributes'] {
    const attributes: NFTMetadata['attributes'] = [
      { trait_type: 'Nadirlık Seviyesi', value: rarityTier },
      { trait_type: 'Element', value: elementalAffinity },
      { trait_type: 'Kozmik İmza', value: cosmicSignature },
      { trait_type: 'Ana Duygu', value: dream.emotion },
      { trait_type: 'Yoğunluk', value: dream.intensity, display_type: 'number' },
      { trait_type: 'Mekan', value: dream.location },
    ];
    
    if (kader) {
      attributes.push(
        { trait_type: 'Bilinç Seviyesi', value: kader.consciousnessLevel },
        { trait_type: 'Bilinç Skoru', value: kader.consciousnessScore, display_type: 'number' },
        { trait_type: 'Senkronisite', value: kader.synchronicityType },
        { trait_type: 'Senkronisite Skoru', value: Math.round(kader.synchronicityScore), display_type: 'number' },
        { trait_type: 'Kader Yörüngesi', value: kader.fateTrajectory },
        { trait_type: 'Kader Skoru', value: Math.round(kader.fateScore), display_type: 'number' },
        { trait_type: 'Kehanet', value: kader.prophetic ? 'Evet' : 'Hayır' },
        { trait_type: 'Kelebek Etkisi Sayısı', value: kader.butterflyEffects.length, display_type: 'number' },
      );
    }
    
    if (archetype) {
      attributes.push(
        { trait_type: 'Birincil Arketip', value: archetype.primaryArchetype },
        { trait_type: 'Anlatı Kalıbı', value: archetype.narrativePattern },
        { trait_type: 'Sembol Sayısı', value: archetype.symbols.length, display_type: 'number' },
      );
      
      archetype.secondaryArchetypes.forEach((arch, i) => {
        attributes.push({ trait_type: `İkincil Arketip ${i + 1}`, value: arch });
      });
    }
    
    if (metadata) {
      attributes.push(
        { trait_type: 'Berraklık', value: metadata.clarity || 'medium' },
        { trait_type: 'DejaVu Yoğunluğu', value: metadata.dejavuIntensity || 0, display_type: 'number' },
      );
    }
    
    return attributes;
  }
  
  private determineElementalAffinity(
    archetype: ArchetypeNFTAttributes | undefined,
    themes: DeepDreamThemes | undefined
  ): string {
    if (!archetype && !themes) return 'Eter - Bilinmeyen';
    
    const allSymbols = [
      archetype?.primaryArchetype || '',
      ...(archetype?.secondaryArchetypes || []),
      ...(themes?.archetypes || []),
    ].map(s => s.toLowerCase());
    
    for (const [key, value] of Object.entries(ARCHETYPE_ELEMENTS)) {
      if (allSymbols.some(s => s.includes(key))) {
        return value;
      }
    }
    
    return 'Eter - Kozmik Enerji';
  }
  
  private generateCosmicSignature(kader: KaderNFTAttributes | undefined, dream: Dream): string {
    const signatures = [
      'Yıldız Tozu', 'Ay Işığı', 'Güneş Patlaması', 'Nebula Özü',
      'Kara Delik', 'Kuasar Işıması', 'Galaktik Spiral', 'Kozmik Dans',
      'Evren Çekirdeği', 'Zaman Kristali', 'Boyut Kapısı', 'Sonsuzluk Halkası'
    ];
    
    if (kader?.prophetic) {
      return 'Kehanet Yıldızı';
    }
    
    if (kader?.consciousnessLevel === 'ASCENDED') {
      return 'Yükseltilmiş Özü';
    }
    
    const hash = dream.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return signatures[hash % signatures.length];
  }
  
  private getConsciousnessScore(level: string): number {
    const scores: Record<string, number> = {
      NPC: 20,
      AWAKENING: 40,
      PLAYER: 60,
      ARCHITECT: 85,
      ASCENDED: 100,
    };
    return scores[level] || 40;
  }
  
  private getEmotionColors(emotion: string, intensity: number): string {
    const colorMaps: Record<string, string> = {
      fear: 'deep indigo, midnight blue, silver accents, ominous shadows',
      wonder: 'cosmic purple, ethereal gold, starlight white, aurora greens',
      peace: 'soft lavender, warm amber, gentle cream, rose quartz pink',
      surprise: 'electric yellow, shocking pink, vibrant orange, sudden white flashes',
      anticipation: 'burning orange, deep crimson, golden flames, dramatic reds',
      trust: 'forest green, warm gold, earthy brown, stable blue',
      joy: 'sunshine yellow, bright coral, cheerful turquoise, warm white',
      sadness: 'deep blue, misty grey, pale purple, silver tears',
      anger: 'fiery red, burning orange, black smoke, crimson shadows',
    };
    
    const baseColors = colorMaps[emotion.toLowerCase()] || 'mystical purple, cosmic blue, ethereal white';
    
    if (intensity >= 8) {
      return `INTENSE: ${baseColors}, with dramatic contrasts and powerful energy`;
    } else if (intensity >= 5) {
      return `MODERATE: ${baseColors}, balanced and harmonious`;
    } else {
      return `SUBTLE: ${baseColors}, soft and dreamlike`;
    }
  }
  
  private async getAsset(assetId: string): Promise<typeof nftAssets.$inferSelect | null> {
    const db = requireDb();
    const [asset] = await db.select().from(nftAssets).where(eq(nftAssets.id, assetId)).limit(1);
    return asset || null;
  }
  
  async getGenesisNFTs(limit = 50): Promise<typeof nftAssets.$inferSelect[]> {
    const db = requireDb();
    return db.select()
      .from(nftAssets)
      .where(eq(nftAssets.nftType, 'genesis'))
      .orderBy(desc(nftAssets.createdAt))
      .limit(limit);
  }
  
  async getTopRarityNFTs(limit = 20): Promise<typeof nftAssets.$inferSelect[]> {
    const db = requireDb();
    const { and } = await import('drizzle-orm');
    return db.select()
      .from(nftAssets)
      .where(and(eq(nftAssets.nftType, 'genesis'), eq(nftAssets.status, 'ready')))
      .orderBy(desc(nftAssets.rarityScore))
      .limit(limit);
  }
  
  async getDreamNFTs(dreamId: string): Promise<typeof nftAssets.$inferSelect[]> {
    const db = requireDb();
    return db.select()
      .from(nftAssets)
      .where(eq(nftAssets.dreamId, dreamId));
  }
  
  async getNFTStats(): Promise<{
    total: number;
    ready: number;
    pending: number;
    failed: number;
    avgRarity: number;
    byTier: Record<string, number>;
  }> {
    const db = requireDb();
    const allNFTs = await db.select().from(nftAssets).where(eq(nftAssets.nftType, 'genesis'));
    
    const stats = {
      total: allNFTs.length,
      ready: allNFTs.filter(n => n.status === 'ready').length,
      pending: allNFTs.filter(n => n.status === 'pending' || n.status === 'generating').length,
      failed: allNFTs.filter(n => n.status === 'failed').length,
      avgRarity: 0,
      byTier: { legendary: 0, epic: 0, rare: 0, common: 0 },
    };
    
    if (allNFTs.length > 0) {
      stats.avgRarity = Math.round(
        allNFTs.reduce((sum, n) => sum + n.rarityScore, 0) / allNFTs.length
      );
      
      allNFTs.forEach(nft => {
        const meta = nft.metadata as GenesisNFTMetadata | null;
        const tier = meta?.rarityTier || (
          nft.rarityScore >= 85 ? 'legendary' :
          nft.rarityScore >= 65 ? 'epic' :
          nft.rarityScore >= 40 ? 'rare' : 'common'
        );
        stats.byTier[tier]++;
      });
    }
    
    return stats;
  }
}

export const nftGenesisService = new NFTGenesisService();
