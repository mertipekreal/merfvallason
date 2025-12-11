/**
 * Kader Motoru v2.0 - Advanced Fate Simulation System
 * - Multi-dimensional fate calculation
 * - Synchronization pattern detection (Jung's Meaningful Coincidence)
 * - Time-series analysis
 * - Consciousness level tracking
 * - Butterfly effect simulation
 * - Global Dream Dataset Analysis (DreamBank integration)
 */

import { db } from "./db";
import { dreams } from "@shared/schema";
import { sql, desc, ilike, or } from "drizzle-orm";

// ===== ENUMS & TYPES =====

export enum DifficultyLevel {
  BLESSED = 0,      // Kolay şartlar (0-2)
  FORTUNATE = 1,    // Şanslı (2-4)
  BALANCED = 2,     // Dengeli (4-6)
  CHALLENGING = 3,  // Zorlayıcı (6-8)
  EXTREME = 4       // Ekstrem (8-10)
}

export enum ConsciousnessLevel {
  NPC = 0.2,        // Non-Player Character
  AWAKENING = 0.4,  // Uyanış
  PLAYER = 0.6,     // Oyuncu
  ARCHITECT = 0.85, // Mimar
  ASCENDED = 1.0    // Yükseltilmiş
}

export enum SynchronizationType {
  NONE = 0.0,
  WEAK = 0.3,       // Ufak çakışmalar
  MODERATE = 0.6,   // Dikkat çekici örüntüler
  STRONG = 0.9,     // Kuvvetli bağlantılar
  PERFECT = 1.0     // Tam uyum
}

export interface Skill {
  name: string;
  proficiency: number;        // 0.0 - 1.0
  resonanceFrequency: number; // 0.0 - 1.0 (Evrensel enerjiyle rezonans)
  masteryLevel: number;       // 1-10
  yearsPracticed: number;
  isInnate: boolean;          // Doğuştan mı?
}

export interface OriginFactors {
  socioeconomicLevel: number;    // 0-10 (Aile zenginliği)
  parentalSupport: number;       // 0-10 (Anne-babaların desteği)
  culturalEntropy: number;       // 0-10 (Kültürel baskılar)
  geographicalAdvantage: number; // 0-10 (Yer avantajı)
  healthBaseline: number;        // 0-10 (Başlangıç sağlığı)
}

export interface DreamState {
  lucidityLevel: number;       // 0.0-1.0 (Lüsid rüya oranı)
  vividness: number;           // 0.0-1.0 (Rüyanın netliği)
  symbolDensity: number;       // 0.0-1.0 (Sembolik içerik yoğunluğu)
  dejavuIntensity: number;     // 0.0-1.0 (Dejavu şiddeti)
  precognitionSignal: number;  // 0.0-1.0 (Önceden görme sinyali)
  emotionalCharge: number;     // -1.0 to 1.0 (Duygusal yük)
}

export interface TimeSeriesPoint {
  timestamp: Date;
  fateScore: number;
  consciousnessLevel: number;
  synchronicityIndex: number;
  decisionQuality: number;
  outcomeResonance: number;
}

export interface SynchronicityMatch {
  event: string;
  symbol: string;
  similarity: number;
  timeDelta: number;
}

// Global Dream Dataset Types
export interface GlobalDreamMatch {
  dreamId: string;
  title: string;
  matchedThemes: string[];
  matchedObjects: string[];
  emotion: string;
  similarity: number;
  dreamerInfo?: string;
  source: string;
}

export interface DreamPatternStats {
  totalDreams: number;
  themeFrequency: Record<string, number>;
  emotionDistribution: Record<string, number>;
  objectFrequency: Record<string, number>;
  avgIntensity: number;
}

export interface CollectiveDreamInsight {
  matchingDreams: GlobalDreamMatch[];
  patternStats: DreamPatternStats;
  collectiveThemes: string[];
  synchronicityScore: number;
  archetypeMatches: string[];
}

export interface HumanProfile {
  id: string;
  name: string;
  birthDate: Date;
  personalityType: string;
  originFactors: OriginFactors;
  skills: Skill[];
  age: number;
  baseScore: number;
  potentialCeiling: number;
  resilienceFactor: number;
  currentConsciousness: number;
}

export interface FateSimulationResult {
  profileId: string;
  fateScore: number;
  fateTrajectory: string;
  consciousnessLevel: ConsciousnessLevel;
  synchronizationType: SynchronizationType;
  synchronicityMatches: SynchronicityMatch[];
  dreamAnalysis: {
    energySignature: number;
    isProphetic: boolean;
    interpretation: string;
  };
  butterflyEffects: string[];
  recommendations: string[];
  timestamp: Date;
}

// ===== HELPER FUNCTIONS =====

function calculateSkillPower(skill: Skill): number {
  const basePower = skill.proficiency * skill.masteryLevel;
  const innateBonus = skill.isInnate ? 1.5 : 1.0;
  const experienceMult = 1.0 + (skill.yearsPracticed * 0.1);
  return basePower * innateBonus * experienceMult * skill.resonanceFrequency;
}

function calculateDifficulty(origin: OriginFactors): number {
  const avgFactors = (
    origin.socioeconomicLevel +
    origin.parentalSupport +
    origin.culturalEntropy +
    origin.geographicalAdvantage +
    origin.healthBaseline
  ) / 5;
  return 10 - avgFactors; // Ters ölçek
}

function getDifficultyLevel(difficulty: number): DifficultyLevel {
  if (difficulty < 2) return DifficultyLevel.BLESSED;
  if (difficulty < 4) return DifficultyLevel.FORTUNATE;
  if (difficulty < 6) return DifficultyLevel.BALANCED;
  if (difficulty < 8) return DifficultyLevel.CHALLENGING;
  return DifficultyLevel.EXTREME;
}

function getConsciousnessName(level: number): string {
  if (level <= 0.2) return 'NPC';
  if (level <= 0.4) return 'Uyanış';
  if (level <= 0.6) return 'Oyuncu';
  if (level <= 0.85) return 'Mimar';
  return 'Yükseltilmiş';
}

function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  let editDistance = Math.max(longer.length, shorter.length);
  for (let i = 0; i < shorter.length; i++) {
    if (i < longer.length && shorter[i] === longer[i]) {
      editDistance--;
    }
  }
  
  return 1.0 - (editDistance / longer.length);
}

// ===== HUMAN CV ENGINE =====

export class HumanCVEngine {
  static calculateAge(birthDate: Date): number {
    const today = new Date();
    const diffTime = today.getTime() - birthDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
  }

  static calculateBaseScore(skills: Skill[], originFactors: OriginFactors): number {
    const totalSkillPower = skills.reduce((sum, skill) => sum + calculateSkillPower(skill), 0);
    const difficulty = calculateDifficulty(originFactors);
    const difficultyMultiplier = 1.0 + (difficulty / 10);
    return (totalSkillPower * difficultyMultiplier) + 100;
  }

  static calculatePotentialCeiling(baseScore: number, age: number, skills: Skill[], healthBaseline: number): number {
    const ageFactor = Math.min(1.5, 1.0 + (age / 50));
    const skillCountBonus = 1.0 + (skills.length * 0.2);
    const healthFactor = healthBaseline / 10;
    const ceiling = baseScore * ageFactor * skillCountBonus * (0.5 + healthFactor);
    return Math.min(ceiling, 10000);
  }

  static calculateResilience(originFactors: OriginFactors, skills: Skill[]): number {
    const difficulty = calculateDifficulty(originFactors);
    const innateCount = skills.filter(s => s.isInnate).length;
    return 1.0 + (difficulty / 10) + (innateCount * 0.15);
  }

  static createProfile(
    id: string,
    name: string,
    birthDate: Date,
    personalityType: string,
    originFactors: OriginFactors,
    skills: Skill[]
  ): HumanProfile {
    const age = this.calculateAge(birthDate);
    const baseScore = this.calculateBaseScore(skills, originFactors);
    const potentialCeiling = this.calculatePotentialCeiling(baseScore, age, skills, originFactors.healthBaseline);
    const resilienceFactor = this.calculateResilience(originFactors, skills);

    return {
      id,
      name,
      birthDate,
      personalityType,
      originFactors,
      skills,
      age,
      baseScore,
      potentialCeiling,
      resilienceFactor,
      currentConsciousness: ConsciousnessLevel.PLAYER
    };
  }

  static getProfileSummary(profile: HumanProfile): Record<string, any> {
    const topSkills = [...profile.skills]
      .sort((a, b) => calculateSkillPower(b) - calculateSkillPower(a))
      .slice(0, 3)
      .map(s => ({ name: s.name, power: Math.round(calculateSkillPower(s) * 100) / 100 }));

    return {
      name: profile.name,
      age: profile.age,
      personality: profile.personalityType,
      baseScore: Math.round(profile.baseScore * 100) / 100,
      potentialCeiling: Math.round(profile.potentialCeiling * 100) / 100,
      resilience: Math.round(profile.resilienceFactor * 100) / 100,
      skillCount: profile.skills.length,
      difficultyLevel: getDifficultyLevel(calculateDifficulty(profile.originFactors)),
      consciousnessLevel: getConsciousnessName(profile.currentConsciousness),
      topSkills
    };
  }
}

// ===== SYNCHRONICITY DETECTOR =====

export class SynchronicityDetector {
  private recentEvents: Array<{ type: string; timestamp: Date; metadata: Record<string, any> }> = [];
  private patternHistory: Array<{ pattern: string; strength: number }> = [];

  addEvent(eventType: string, timestamp: Date, metadata: Record<string, any> = {}): void {
    this.recentEvents.push({ type: eventType, timestamp, metadata });
    if (this.recentEvents.length > 100) {
      this.recentEvents.shift();
    }
  }

  detectPatterns(dreamSymbols: string[]): { type: SynchronizationType; matches: SynchronicityMatch[] } {
    const matches: SynchronicityMatch[] = [];
    const now = new Date();

    for (const event of this.recentEvents.slice(-20)) {
      for (const symbol of dreamSymbols) {
        const similarity = stringSimilarity(symbol.toLowerCase(), event.type.toLowerCase());
        if (similarity > 0.6) {
          matches.push({
            event: event.type,
            symbol,
            similarity,
            timeDelta: Math.floor((now.getTime() - event.timestamp.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }

    let type: SynchronizationType;
    if (matches.length === 0) {
      type = SynchronizationType.NONE;
    } else if (matches.length === 1) {
      type = SynchronizationType.WEAK;
    } else if (matches.length <= 3) {
      type = SynchronizationType.MODERATE;
    } else if (matches.length <= 6) {
      type = SynchronizationType.STRONG;
    } else {
      type = SynchronizationType.PERFECT;
    }

    return { type, matches };
  }

  getPatternHistory(): Array<{ pattern: string; strength: number }> {
    return [...this.patternHistory];
  }
}

// ===== DREAM ANALYZER =====

export class DreamAnalyzer {
  static getEnergySignature(dream: DreamState): number {
    return (
      (dream.lucidityLevel * 0.25) +
      (dream.vividness * 0.20) +
      (dream.symbolDensity * 0.15) +
      (dream.dejavuIntensity * 0.20) +
      (dream.precognitionSignal * 0.20)
    );
  }

  static isProphetic(dream: DreamState): boolean {
    return dream.precognitionSignal > 0.7 && dream.lucidityLevel > 0.6;
  }

  static interpretDream(dream: DreamState, energySignature: number): string {
    const interpretations: string[] = [];

    if (dream.lucidityLevel > 0.7) {
      interpretations.push('Yüksek lüsidite - bilinç kontrolü güçlü');
    }
    if (dream.dejavuIntensity > 0.6) {
      interpretations.push('Dejavu sinyalleri - geçmiş/gelecek bağlantısı tespit edildi');
    }
    if (dream.precognitionSignal > 0.5) {
      interpretations.push('Önceden görme potansiyeli - dikkatli olun');
    }
    if (dream.emotionalCharge > 0.5) {
      interpretations.push('Pozitif duygusal yük - enerji akışı olumlu');
    } else if (dream.emotionalCharge < -0.5) {
      interpretations.push('Negatif duygusal yük - arınma gerekebilir');
    }
    if (energySignature > 0.7) {
      interpretations.push('Güçlü enerji imzası - önemli mesajlar içerebilir');
    }

    return interpretations.length > 0 
      ? interpretations.join('. ') + '.'
      : 'Standart rüya aktivitesi - belirgin bir mesaj tespit edilmedi.';
  }
}

// ===== GLOBAL DREAM ANALYZER (Database Integration) =====

// Common archetypes in dream analysis (Jung)
const ARCHETYPES = {
  water: ['su', 'deniz', 'nehir', 'göl', 'yağmur', 'sel', 'dalga', 'okyanus', 'water', 'sea', 'river', 'lake', 'rain', 'flood', 'ocean'],
  flying: ['uçmak', 'uçuş', 'kanat', 'gökyüzü', 'kuş', 'flying', 'flight', 'wings', 'sky', 'bird', 'soaring'],
  falling: ['düşmek', 'düşüş', 'uçurum', 'boşluk', 'falling', 'fall', 'cliff', 'abyss', 'void'],
  death: ['ölüm', 'ölmek', 'cenaze', 'mezar', 'death', 'dying', 'funeral', 'grave', 'end'],
  chase: ['kovalamak', 'kaçmak', 'takip', 'chase', 'running', 'pursuit', 'escape', 'flee'],
  lost: ['kaybolmak', 'kayıp', 'yol', 'labirent', 'lost', 'losing', 'maze', 'wandering', 'searching'],
  naked: ['çıplak', 'utanç', 'naked', 'exposed', 'shame', 'vulnerable'],
  teeth: ['diş', 'dişler', 'teeth', 'tooth', 'falling teeth'],
  exam: ['sınav', 'test', 'okul', 'exam', 'test', 'school', 'unprepared'],
  animal: ['hayvan', 'köpek', 'kedi', 'yılan', 'at', 'animal', 'dog', 'cat', 'snake', 'horse', 'wolf', 'bear'],
  house: ['ev', 'oda', 'kapı', 'pencere', 'house', 'home', 'room', 'door', 'window', 'building'],
  shadow: ['gölge', 'karanlık', 'shadow', 'darkness', 'dark figure', 'unknown person'],
  anima: ['kadın', 'anne', 'kız', 'woman', 'mother', 'girl', 'feminine', 'goddess'],
  animus: ['erkek', 'baba', 'oğul', 'man', 'father', 'boy', 'masculine', 'hero'],
  transformation: ['dönüşüm', 'değişim', 'metamorfoz', 'transformation', 'change', 'metamorphosis', 'rebirth']
};

export class GlobalDreamAnalyzer {
  /**
   * Search for matching dreams in the global database
   */
  static async findMatchingDreams(
    searchTerms: string[],
    limit: number = 20
  ): Promise<GlobalDreamMatch[]> {
    if (!db || searchTerms.length === 0) {
      return [];
    }

    try {
      // Build search conditions for themes, objects, and description
      const searchConditions = searchTerms.map(term => 
        or(
          ilike(dreams.description, `%${term}%`),
          ilike(dreams.title, `%${term}%`),
          sql`${dreams.themes}::text ILIKE ${'%' + term + '%'}`,
          sql`${dreams.objects}::text ILIKE ${'%' + term + '%'}`
        )
      );

      const results = await db
        .select()
        .from(dreams)
        .where(or(...searchConditions))
        .orderBy(desc(dreams.createdAt))
        .limit(limit);

      return results.map(dream => {
        const dreamThemes = (dream.themes as string[]) || [];
        const dreamObjects = (dream.objects as string[]) || [];
        
        // Calculate which terms matched
        const matchedThemes = searchTerms.filter(term =>
          dreamThemes.some(t => t.toLowerCase().includes(term.toLowerCase())) ||
          dream.description.toLowerCase().includes(term.toLowerCase())
        );
        const matchedObjects = searchTerms.filter(term =>
          dreamObjects.some(o => o.toLowerCase().includes(term.toLowerCase()))
        );

        // Calculate similarity score
        const similarity = (matchedThemes.length + matchedObjects.length) / (searchTerms.length * 2);

        return {
          dreamId: dream.id,
          title: dream.title,
          matchedThemes,
          matchedObjects,
          emotion: dream.emotion,
          similarity: Math.min(similarity + 0.3, 1.0),
          dreamerInfo: dream.dreamerName || dream.dreamerGender || undefined,
          source: dream.source
        };
      }).sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('GlobalDreamAnalyzer.findMatchingDreams error:', error);
      return [];
    }
  }

  /**
   * Get statistical analysis of dream patterns
   */
  static async getPatternStats(): Promise<DreamPatternStats> {
    if (!db) {
      return {
        totalDreams: 0,
        themeFrequency: {},
        emotionDistribution: {},
        objectFrequency: {},
        avgIntensity: 5
      };
    }

    try {
      const allDreams = await db.select().from(dreams).limit(1000);

      const themeFrequency: Record<string, number> = {};
      const emotionDistribution: Record<string, number> = {};
      const objectFrequency: Record<string, number> = {};
      let totalIntensity = 0;

      for (const dream of allDreams) {
        // Count emotions
        emotionDistribution[dream.emotion] = (emotionDistribution[dream.emotion] || 0) + 1;
        
        // Count themes
        const themes = (dream.themes as string[]) || [];
        for (const theme of themes) {
          themeFrequency[theme] = (themeFrequency[theme] || 0) + 1;
        }
        
        // Count objects
        const objects = (dream.objects as string[]) || [];
        for (const obj of objects) {
          objectFrequency[obj] = (objectFrequency[obj] || 0) + 1;
        }
        
        totalIntensity += dream.intensity || 5;
      }

      return {
        totalDreams: allDreams.length,
        themeFrequency,
        emotionDistribution,
        objectFrequency,
        avgIntensity: allDreams.length > 0 ? totalIntensity / allDreams.length : 5
      };
    } catch (error) {
      console.error('GlobalDreamAnalyzer.getPatternStats error:', error);
      return {
        totalDreams: 0,
        themeFrequency: {},
        emotionDistribution: {},
        objectFrequency: {},
        avgIntensity: 5
      };
    }
  }

  /**
   * Detect archetypes in given symbols/themes
   */
  static detectArchetypes(symbols: string[]): string[] {
    const detectedArchetypes: Set<string> = new Set();
    const lowerSymbols = symbols.map(s => s.toLowerCase());

    for (const [archetype, keywords] of Object.entries(ARCHETYPES)) {
      for (const symbol of lowerSymbols) {
        if (keywords.some(kw => symbol.includes(kw) || kw.includes(symbol))) {
          detectedArchetypes.add(archetype);
          break;
        }
      }
    }

    return Array.from(detectedArchetypes);
  }

  /**
   * Get archetype interpretation in Turkish
   */
  static getArchetypeInterpretation(archetype: string): string {
    const interpretations: Record<string, string> = {
      water: 'Su - Bilinçaltı, duygular, arınma ve yenilenme',
      flying: 'Uçuş - Özgürlük, yükseliş, sınırların aşılması',
      falling: 'Düşüş - Kontrol kaybı, güvensizlik, endişe',
      death: 'Ölüm - Dönüşüm, son ve yeni başlangıç, bırakma',
      chase: 'Kovalanma - Kaçınılan durumlar, bastırılmış korkular',
      lost: 'Kaybolmak - Yön arayışı, kimlik sorgulaması',
      naked: 'Çıplaklık - Savunmasızlık, gerçek benliğin ortaya çıkması',
      teeth: 'Dişler - Görünüm kaygısı, güç ve kendine güven',
      exam: 'Sınav - Değerlendirilme korkusu, yetersizlik hissi',
      animal: 'Hayvan - İçgüdüsel doğa, bastırılmış arzular',
      house: 'Ev - Benlik, iç dünya, güvenli alan',
      shadow: 'Gölge - Karanlık ben, kabul edilmeyen yönler',
      anima: 'Anima - İçsel dişil enerji, duygusallık',
      animus: 'Animus - İçsel eril enerji, mantık ve güç',
      transformation: 'Dönüşüm - Büyük değişim, evrim, yeniden doğuş'
    };
    return interpretations[archetype] || archetype;
  }

  /**
   * Calculate collective synchronicity from dream patterns
   */
  static async calculateCollectiveSynchronicity(
    symbols: string[],
    emotion: string
  ): Promise<CollectiveDreamInsight> {
    const matchingDreams = await this.findMatchingDreams(symbols, 30);
    const patternStats = await this.getPatternStats();
    const archetypes = this.detectArchetypes(symbols);

    // Calculate synchronicity score based on matches
    let synchronicityScore = 0;
    if (matchingDreams.length > 0) {
      const avgSimilarity = matchingDreams.reduce((sum, d) => sum + d.similarity, 0) / matchingDreams.length;
      const matchRatio = Math.min(matchingDreams.length / 10, 1.0);
      synchronicityScore = (avgSimilarity * 0.6 + matchRatio * 0.4);
    }

    // Find collective themes from matching dreams
    const collectiveThemes: Record<string, number> = {};
    for (const dream of matchingDreams) {
      for (const theme of dream.matchedThemes) {
        collectiveThemes[theme] = (collectiveThemes[theme] || 0) + 1;
      }
    }

    const sortedThemes = Object.entries(collectiveThemes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme]) => theme);

    return {
      matchingDreams: matchingDreams.slice(0, 10),
      patternStats,
      collectiveThemes: sortedThemes,
      synchronicityScore,
      archetypeMatches: archetypes.map(a => this.getArchetypeInterpretation(a))
    };
  }
}

// ===== FATE ENGINE (MAIN) =====

export class FateEngine {
  private profile: HumanProfile;
  private synchronicity: SynchronicityDetector;
  private timeSeries: TimeSeriesPoint[] = [];
  private butterflyEffects: string[] = [];

  constructor(profile: HumanProfile) {
    this.profile = profile;
    this.synchronicity = new SynchronicityDetector();
  }

  addLifeEvent(eventType: string, metadata: Record<string, any> = {}): void {
    this.synchronicity.addEvent(eventType, new Date(), metadata);
  }

  processDream(dreamState: DreamState, dreamSymbols: string[] = []): FateSimulationResult {
    // 1. Dream Analysis
    const energySignature = DreamAnalyzer.getEnergySignature(dreamState);
    const isProphetic = DreamAnalyzer.isProphetic(dreamState);
    const interpretation = DreamAnalyzer.interpretDream(dreamState, energySignature);

    // 2. Synchronicity Detection
    const { type: syncType, matches } = this.synchronicity.detectPatterns(dreamSymbols);

    // 3. Calculate Fate Trajectory
    const fateScore = this.calculateFateTrajectory(energySignature, syncType);

    // 4. Update Consciousness
    this.profile.currentConsciousness = this.updateConsciousness(
      energySignature,
      syncType,
      isProphetic
    );

    // 5. Generate Butterfly Effects
    const butterflyEffects = this.generateButterflyEffects(fateScore, syncType);
    this.butterflyEffects.push(...butterflyEffects);

    // 6. Add to time series
    const tsPoint: TimeSeriesPoint = {
      timestamp: new Date(),
      fateScore,
      consciousnessLevel: this.profile.currentConsciousness,
      synchronicityIndex: syncType,
      decisionQuality: this.estimateDecisionQuality(),
      outcomeResonance: energySignature
    };
    this.timeSeries.push(tsPoint);

    // 7. Generate recommendations
    const recommendations = this.generateRecommendations(fateScore, syncType, dreamState);

    return {
      profileId: this.profile.id,
      fateScore,
      fateTrajectory: this.getFateTrajectoryName(fateScore),
      consciousnessLevel: this.getConsciousnessEnum(this.profile.currentConsciousness),
      synchronizationType: syncType,
      synchronicityMatches: matches,
      dreamAnalysis: {
        energySignature,
        isProphetic,
        interpretation
      },
      butterflyEffects,
      recommendations,
      timestamp: new Date()
    };
  }

  private calculateFateTrajectory(energySig: number, syncType: SynchronizationType): number {
    const baseCv = this.profile.baseScore;
    const syncMultiplier = syncType * 3.0 + 1.0;
    const consciousnessFactor = 0.5 + this.profile.currentConsciousness;
    const resilienceBoost = this.profile.resilienceFactor;

    const fateTrajectory = (
      baseCv *
      (1.0 + energySig) *
      syncMultiplier *
      consciousnessFactor *
      resilienceBoost
    ) / 100;

    return Math.min(Math.max(fateTrajectory, 0), 100);
  }

  private updateConsciousness(
    energySig: number,
    syncType: SynchronizationType,
    isProphetic: boolean
  ): number {
    let newLevel = this.profile.currentConsciousness;

    // Energy boost
    if (energySig > 0.7) {
      newLevel += 0.05;
    }

    // Synchronicity boost
    if (syncType >= SynchronizationType.STRONG) {
      newLevel += 0.1;
    } else if (syncType >= SynchronizationType.MODERATE) {
      newLevel += 0.05;
    }

    // Prophetic dreams are powerful
    if (isProphetic) {
      newLevel += 0.15;
    }

    // Natural decay
    newLevel -= 0.02;

    return Math.min(Math.max(newLevel, 0.1), 1.0);
  }

  private estimateDecisionQuality(): number {
    const consciousnessWeight = this.profile.currentConsciousness * 0.4;
    const resilienceWeight = Math.min(this.profile.resilienceFactor / 3, 0.3);
    const randomFactor = 0.3 * Math.random();
    return consciousnessWeight + resilienceWeight + randomFactor;
  }

  private generateButterflyEffects(fateScore: number, syncType: SynchronizationType): string[] {
    const effects: string[] = [];

    if (fateScore > 70 && syncType >= SynchronizationType.STRONG) {
      effects.push('Kritik karar noktası yaklaşıyor - küçük seçimler büyük sonuçlar doğurabilir');
    }
    if (fateScore > 50 && syncType >= SynchronizationType.MODERATE) {
      effects.push('Bağlantılar güçleniyor - yeni fırsatlar ortaya çıkabilir');
    }
    if (this.profile.currentConsciousness >= ConsciousnessLevel.ARCHITECT) {
      effects.push('Mimar seviyesinde bilinç - gerçekliği şekillendirme kapasitesi aktif');
    }

    return effects;
  }

  private generateRecommendations(
    fateScore: number,
    syncType: SynchronizationType,
    dreamState: DreamState
  ): string[] {
    const recs: string[] = [];

    if (fateScore < 30) {
      recs.push('Enerji seviyenizi yükseltin - meditasyon veya doğa yürüyüşü önerilir');
    }
    if (syncType === SynchronizationType.NONE) {
      recs.push('Farkındalığı artırın - günlük tutmak senkronizasyonları fark etmenize yardımcı olabilir');
    }
    if (dreamState.lucidityLevel < 0.3) {
      recs.push('Lüsid rüya pratikleri yapın - bilinç kontrolünü güçlendirin');
    }
    if (dreamState.emotionalCharge < -0.3) {
      recs.push('Duygusal arınma gerekli - geçmiş travmalarla yüzleşmeyi düşünün');
    }
    if (this.profile.currentConsciousness < ConsciousnessLevel.PLAYER) {
      recs.push('Farkındalık seviyenizi artırın - hayatınızdaki örüntüleri gözlemleyin');
    }

    return recs;
  }

  private getFateTrajectoryName(score: number): string {
    if (score >= 80) return 'Yükselen Kader';
    if (score >= 60) return 'Olumlu Akış';
    if (score >= 40) return 'Dengeli Yol';
    if (score >= 20) return 'Zorlayıcı Dönem';
    return 'Karanlık Gece';
  }

  private getConsciousnessEnum(level: number): ConsciousnessLevel {
    if (level <= 0.2) return ConsciousnessLevel.NPC;
    if (level <= 0.4) return ConsciousnessLevel.AWAKENING;
    if (level <= 0.6) return ConsciousnessLevel.PLAYER;
    if (level <= 0.85) return ConsciousnessLevel.ARCHITECT;
    return ConsciousnessLevel.ASCENDED;
  }

  getTimeSeries(): TimeSeriesPoint[] {
    return [...this.timeSeries];
  }

  getProfile(): HumanProfile {
    return { ...this.profile };
  }

  getButterflyEffects(): string[] {
    return [...this.butterflyEffects];
  }
}

// ===== SINGLETON SERVICE =====

class FateEngineService {
  private engines: Map<string, FateEngine> = new Map();
  private profiles: Map<string, HumanProfile> = new Map();

  createProfile(
    id: string,
    name: string,
    birthDate: Date,
    personalityType: string,
    originFactors: OriginFactors,
    skills: Skill[]
  ): HumanProfile {
    const profile = HumanCVEngine.createProfile(id, name, birthDate, personalityType, originFactors, skills);
    this.profiles.set(id, profile);
    this.engines.set(id, new FateEngine(profile));
    return profile;
  }

  getProfile(id: string): HumanProfile | undefined {
    return this.profiles.get(id);
  }

  getAllProfiles(): HumanProfile[] {
    return Array.from(this.profiles.values());
  }

  getEngine(profileId: string): FateEngine | undefined {
    return this.engines.get(profileId);
  }

  runSimulation(profileId: string, dreamState: DreamState, dreamSymbols: string[] = []): FateSimulationResult | null {
    const engine = this.engines.get(profileId);
    if (!engine) return null;
    return engine.processDream(dreamState, dreamSymbols);
  }

  addLifeEvent(profileId: string, eventType: string, metadata: Record<string, any> = {}): boolean {
    const engine = this.engines.get(profileId);
    if (!engine) return false;
    engine.addLifeEvent(eventType, metadata);
    return true;
  }

  deleteProfile(id: string): boolean {
    this.profiles.delete(id);
    this.engines.delete(id);
    return true;
  }
}

export const fateEngineService = new FateEngineService();
