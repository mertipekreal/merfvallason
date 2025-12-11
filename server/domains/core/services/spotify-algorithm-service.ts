/**
 * Spotify Algorithm Analysis Service
 * 
 * Bu servis Spotify'ın algoritma mekaniklerini analiz eder:
 * - BaRT (Bandits for Recs at Spotify) simülasyonu
 * - Playlist türü tespiti (Editoryal/Algoritmik/Hibrit)
 * - Discover Weekly & Release Radar giriş puanı
 * - Skip Rate tahmini
 * - 2025 özellik uyumluluğu (Daylist, AI Playlist, Smart Shuffle)
 */

import type { TrackData, PlaylistData } from "./spotify-service";

// ==================== INTERFACES ====================

export interface BaRTAnalysis {
  collaborativeFilteringScore: number;
  nlpTagScore: number;
  rawAudioScore: number;
  overallScore: number;
  breakdown: {
    userBehaviorSignals: string[];
    contentTags: string[];
    audioCharacteristics: string[];
  };
  recommendations: string[];
}

export interface PlaylistTypeClassification {
  type: 'editorial' | 'algorithmic' | 'algotorial' | 'niche_mix' | 'user_generated';
  typeTr: string;
  confidence: number;
  characteristics: string[];
  examples: string[];
  algorithmWeight: number;
  curatorWeight: number;
}

export interface DiscoveryScore {
  discoverWeeklyScore: number;
  releaseRadarScore: number;
  dailyMixScore: number;
  daylistScore: number;
  overallDiscoveryPotential: number;
  eligibilityStatus: {
    discoverWeekly: 'eligible' | 'borderline' | 'unlikely';
    releaseRadar: 'eligible' | 'needs_pitch' | 'unlikely';
    dailyMix: 'eligible' | 'needs_more_plays' | 'unlikely';
  };
  insights: string[];
  actionItems: string[];
}

export interface SkipRateAnalysis {
  predictedSkipRate: number;
  skipRisk: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  skipRiskTr: string;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }[];
  criticalMoments: {
    timestamp: string;
    risk: number;
    reason: string;
  }[];
  optimizationTips: string[];
}

export interface Feature2025Compatibility {
  daylistFit: {
    score: number;
    bestTimeSlots: string[];
    moodCategories: string[];
  };
  aiPlaylistPrompts: string[];
  smartShuffleBoost: number;
  fewerRepeatsImpact: 'positive' | 'neutral' | 'negative';
  blendCompatibility: number;
  jamSessionFit: number;
}

export interface ArtistStrategy {
  pitchingRecommendations: {
    optimalPitchWindow: string;
    targetPlaylists: string[];
    metadataSuggestions: {
      moods: string[];
      genres: string[];
      cultures: string[];
      instruments: string[];
    };
    pitchNotes: string[];
  };
  royaltyProjection: {
    currentStatus: 'above_threshold' | 'at_risk' | 'below_threshold';
    estimatedAnnualStreams: number;
    monthlyGrowthNeeded: number;
    strategies: string[];
  };
  technicalLimits: {
    playlistCapacity: string;
    downloadLimits: string;
    folderSyncWarning: boolean;
    coverArtCompliance: boolean;
  };
}

export interface AlgorithmAnalysisResult {
  bart: BaRTAnalysis;
  playlistType: PlaylistTypeClassification;
  discovery: DiscoveryScore;
  skipRate: SkipRateAnalysis;
  features2025: Feature2025Compatibility;
  artistStrategy: ArtistStrategy;
}

// ==================== CONSTANTS ====================

const EDITORIAL_PLAYLISTS = [
  'RapCaviar', 'New Music Friday', "Today's Top Hits", 'Viva Latino',
  'Hot Country', 'Rock This', 'Jazz Vibes', 'Classical Essentials',
  'Türkçe Pop', 'Türkçe Rock', 'Anadolu Rock', 'Arabesque'
];

const ALGORITHMIC_PLAYLISTS = [
  'Discover Weekly', 'Release Radar', 'On Repeat', 'Repeat Rewind',
  'Your Time Capsule', 'Tastebreakers', 'Daily Mix'
];

const ALGOTORIAL_PLAYLISTS = [
  'Happy Hits', 'Mood Booster', 'Chill Hits', 'Workout',
  'Deep Focus', 'Sleep', 'Peaceful Piano', 'Coffee Break Jazz'
];

const NICHE_MIX_PATTERNS = [
  'Goblincore', 'Cottagecore', 'Dark Academia', 'Yemek Pişirme',
  'Cooking', 'Driving', 'Gaming', 'Study', 'Meditation'
];

const MOOD_TAGS = [
  'energetic', 'calm', 'happy', 'sad', 'romantic', 'aggressive',
  'dreamy', 'melancholic', 'uplifting', 'dark', 'chill', 'intense'
];

const GENRE_TAGS = [
  'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'jazz', 'classical',
  'country', 'folk', 'indie', 'metal', 'punk', 'latin', 'turkish',
  'arabesk', 'trap', 'drill', 'lo-fi', 'ambient', 'house', 'techno'
];

// ==================== BaRT ANALYSIS ====================

export function analyzeBaRT(trackData: TrackData): BaRTAnalysis {
  const { audioFeatures, metadata, artist } = trackData;
  
  // 1. Collaborative Filtering Score (User behavior simulation)
  const cfScore = calculateCollaborativeFilteringScore(metadata.popularity, artist.popularity, artist.followers.total);
  
  // 2. NLP Tag Score (Content-based)
  const nlpResult = calculateNLPTagScore(artist.genres, audioFeatures, metadata.explicit);
  
  // 3. Raw Audio Analysis Score
  const rawAudioResult = calculateRawAudioScore(audioFeatures);
  
  // Overall BaRT score (weighted average)
  const overallScore = Math.round(
    cfScore * 0.40 + nlpResult.score * 0.30 + rawAudioResult.score * 0.30
  );
  
  const recommendations: string[] = [];
  
  if (cfScore < 50) {
    recommendations.push("Playlist ekleme ve kaydetme sayısını artırın");
    recommendations.push("Sosyal medyada paylaşımları teşvik edin");
  }
  if (nlpResult.score < 50) {
    recommendations.push("Metadata etiketlerini güncelleyin (mood, genre, culture)");
    recommendations.push("Şarkı açıklamasına anahtar kelimeler ekleyin");
  }
  if (rawAudioResult.score < 50) {
    recommendations.push("Ses özelliklerini viral trendlere yaklaştırın");
    recommendations.push("Tempo ve enerji dengesini optimize edin");
  }
  
  if (overallScore >= 70) {
    recommendations.push("Algoritmik playlistlere giriş potansiyeliniz yüksek");
  }
  
  return {
    collaborativeFilteringScore: cfScore,
    nlpTagScore: nlpResult.score,
    rawAudioScore: rawAudioResult.score,
    overallScore,
    breakdown: {
      userBehaviorSignals: generateUserBehaviorSignals(cfScore, metadata.popularity),
      contentTags: nlpResult.tags,
      audioCharacteristics: rawAudioResult.characteristics,
    },
    recommendations,
  };
}

function calculateCollaborativeFilteringScore(trackPop: number, artistPop: number, followers: number): number {
  // Spotify uses collaborative filtering based on:
  // - What similar users listen to
  // - Playlist co-occurrence
  // - Save/follow patterns
  
  let score = 0;
  
  // Track popularity (0-100) contributes 40%
  score += (trackPop / 100) * 40;
  
  // Artist popularity contributes 30%
  score += (artistPop / 100) * 30;
  
  // Follower count (logarithmic scale) contributes 30%
  const followerScore = Math.min(30, Math.log10(Math.max(1, followers)) * 6);
  score += followerScore;
  
  return Math.round(Math.min(100, score));
}

function calculateNLPTagScore(genres: string[], audioFeatures: any, isExplicit: boolean): { score: number; tags: string[] } {
  const tags: string[] = [];
  let score = 50; // Base score
  
  // Genre tags
  genres.forEach(genre => {
    const normalizedGenre = genre.toLowerCase();
    if (GENRE_TAGS.some(g => normalizedGenre.includes(g))) {
      tags.push(genre);
      score += 5;
    }
  });
  
  // Mood inference from audio features
  if (audioFeatures.valence > 0.7) {
    tags.push('happy', 'uplifting');
    score += 10;
  } else if (audioFeatures.valence < 0.3) {
    tags.push('melancholic', 'sad');
    score += 5;
  }
  
  if (audioFeatures.energy > 0.7) {
    tags.push('energetic', 'intense');
    score += 10;
  } else if (audioFeatures.energy < 0.3) {
    tags.push('calm', 'chill');
    score += 8;
  }
  
  if (audioFeatures.danceability > 0.7) {
    tags.push('danceable', 'groovy');
    score += 8;
  }
  
  if (audioFeatures.acousticness > 0.6) {
    tags.push('acoustic', 'organic');
    score += 5;
  }
  
  if (audioFeatures.instrumentalness > 0.5) {
    tags.push('instrumental');
    score += 3;
  }
  
  if (isExplicit) {
    tags.push('explicit');
  }
  
  return { score: Math.min(100, score), tags: Array.from(new Set(tags)) };
}

function calculateRawAudioScore(audioFeatures: any): { score: number; characteristics: string[] } {
  const characteristics: string[] = [];
  let score = 0;
  
  // Energy (ideal range: 0.5-0.8 for mainstream)
  if (audioFeatures.energy >= 0.5 && audioFeatures.energy <= 0.8) {
    score += 20;
    characteristics.push(`Optimal enerji: ${Math.round(audioFeatures.energy * 100)}%`);
  } else if (audioFeatures.energy > 0.8) {
    score += 15;
    characteristics.push(`Yüksek enerji: ${Math.round(audioFeatures.energy * 100)}%`);
  } else {
    score += 10;
    characteristics.push(`Düşük enerji: ${Math.round(audioFeatures.energy * 100)}%`);
  }
  
  // Danceability (ideal: >0.6 for playlists)
  if (audioFeatures.danceability >= 0.6) {
    score += 20;
    characteristics.push(`Yüksek dans edilebilirlik: ${Math.round(audioFeatures.danceability * 100)}%`);
  } else if (audioFeatures.danceability >= 0.4) {
    score += 12;
    characteristics.push(`Orta dans edilebilirlik: ${Math.round(audioFeatures.danceability * 100)}%`);
  } else {
    score += 5;
    characteristics.push(`Düşük dans edilebilirlik: ${Math.round(audioFeatures.danceability * 100)}%`);
  }
  
  // Tempo (sweet spot: 100-130 BPM)
  if (audioFeatures.tempo >= 100 && audioFeatures.tempo <= 130) {
    score += 20;
    characteristics.push(`İdeal tempo: ${Math.round(audioFeatures.tempo)} BPM`);
  } else if (audioFeatures.tempo >= 80 && audioFeatures.tempo <= 150) {
    score += 12;
    characteristics.push(`Kabul edilebilir tempo: ${Math.round(audioFeatures.tempo)} BPM`);
  } else {
    score += 5;
    characteristics.push(`Ekstrem tempo: ${Math.round(audioFeatures.tempo)} BPM`);
  }
  
  // Valence (positive songs generally perform better)
  if (audioFeatures.valence >= 0.5) {
    score += 15;
    characteristics.push(`Pozitif mood: ${Math.round(audioFeatures.valence * 100)}%`);
  } else {
    score += 8;
    characteristics.push(`Melankolik mood: ${Math.round(audioFeatures.valence * 100)}%`);
  }
  
  // Duration (ideal: 2:30-3:30)
  const durationSec = audioFeatures.duration_ms / 1000;
  if (durationSec >= 150 && durationSec <= 210) {
    score += 15;
    characteristics.push(`İdeal süre: ${Math.floor(durationSec / 60)}:${String(Math.floor(durationSec % 60)).padStart(2, '0')}`);
  } else if (durationSec >= 120 && durationSec <= 240) {
    score += 10;
    characteristics.push(`Kabul edilebilir süre: ${Math.floor(durationSec / 60)}:${String(Math.floor(durationSec % 60)).padStart(2, '0')}`);
  } else {
    score += 3;
    characteristics.push(`Uzun/Kısa süre: ${Math.floor(durationSec / 60)}:${String(Math.floor(durationSec % 60)).padStart(2, '0')}`);
  }
  
  // Loudness (modern masters: -8 to -5 LUFS)
  if (audioFeatures.loudness >= -8 && audioFeatures.loudness <= -5) {
    score += 10;
    characteristics.push(`Modern mastering: ${audioFeatures.loudness.toFixed(1)} dB`);
  } else {
    score += 5;
    characteristics.push(`Mastering: ${audioFeatures.loudness.toFixed(1)} dB`);
  }
  
  return { score: Math.min(100, score), characteristics };
}

function generateUserBehaviorSignals(cfScore: number, popularity: number): string[] {
  const signals: string[] = [];
  
  if (popularity >= 70) {
    signals.push("Yüksek kaydetme oranı");
    signals.push("Sık playlist ekleme");
    signals.push("Güçlü repeat dinleme");
  } else if (popularity >= 50) {
    signals.push("Orta kaydetme oranı");
    signals.push("Bazı playlist eklemeleri");
  } else if (popularity >= 30) {
    signals.push("Büyüyen dinleyici kitlesi");
    signals.push("Keşif potansiyeli mevcut");
  } else {
    signals.push("Düşük kullanıcı etkileşimi");
    signals.push("Organik büyüme gerekli");
  }
  
  if (cfScore >= 70) {
    signals.push("Güçlü co-listen patternleri");
  }
  
  return signals;
}

// ==================== PLAYLIST TYPE CLASSIFICATION ====================

export function classifyPlaylistType(playlistData: PlaylistData): PlaylistTypeClassification {
  const { metadata, tracks } = playlistData;
  const name = metadata.name.toLowerCase();
  const owner = metadata.owner.display_name.toLowerCase();
  const description = (metadata.description || '').toLowerCase();
  
  // Check for Spotify official playlists
  const isSpotifyOwned = owner === 'spotify' || owner.includes('spotify');
  
  // Check against known playlist types
  let matchType: PlaylistTypeClassification['type'] = 'user_generated';
  let confidence = 0.5;
  let characteristics: string[] = [];
  let examples: string[] = [];
  let algorithmWeight = 0;
  let curatorWeight = 0;
  
  // Editorial check
  for (const editorial of EDITORIAL_PLAYLISTS) {
    if (name.includes(editorial.toLowerCase())) {
      matchType = 'editorial';
      confidence = 0.95;
      characteristics = [
        "İnsan küratörler tarafından yönetilir",
        "Haftalık düzenli güncelleme",
        "Yeni çıkışlara öncelik",
        "Genre veya mood odaklı"
      ];
      examples = ['RapCaviar', 'New Music Friday', "Today's Top Hits"];
      algorithmWeight = 20;
      curatorWeight = 80;
      break;
    }
  }
  
  // Algorithmic check
  if (matchType === 'user_generated') {
    for (const algo of ALGORITHMIC_PLAYLISTS) {
      if (name.includes(algo.toLowerCase())) {
        matchType = 'algorithmic';
        confidence = 0.95;
        characteristics = [
          "Tamamen algoritma tarafından oluşturulur",
          "Kişiselleştirilmiş öneri sistemi",
          "Dinleme geçmişine dayalı",
          "Haftalık/günlük otomatik güncelleme"
        ];
        examples = ['Discover Weekly', 'Release Radar', 'Daily Mix'];
        algorithmWeight = 95;
        curatorWeight = 5;
        break;
      }
    }
  }
  
  // Algotorial (Hybrid) check
  if (matchType === 'user_generated') {
    for (const hybrid of ALGOTORIAL_PLAYLISTS) {
      if (name.includes(hybrid.toLowerCase())) {
        matchType = 'algotorial';
        confidence = 0.85;
        characteristics = [
          "Hibrit küratörlük modeli",
          "İnsan seçimi + algoritma iyileştirmesi",
          "Mood/aktivite odaklı",
          "Geniş hedef kitle"
        ];
        examples = ['Happy Hits', 'Mood Booster', 'Deep Focus'];
        algorithmWeight = 50;
        curatorWeight = 50;
        break;
      }
    }
  }
  
  // Niche Mix check
  if (matchType === 'user_generated') {
    for (const niche of NICHE_MIX_PATTERNS) {
      if (name.includes(niche.toLowerCase()) || description.includes(niche.toLowerCase())) {
        matchType = 'niche_mix';
        confidence = 0.80;
        characteristics = [
          "Mikro-hedef kitleye özel",
          "Estetik veya aktivite bazlı",
          "Algoritma + trend analizi",
          "Düşük rekabet avantajı"
        ];
        examples = ['Goblincore Mix', 'Cottagecore Vibes', 'Gaming Session'];
        algorithmWeight = 70;
        curatorWeight = 30;
        break;
      }
    }
  }
  
  // User generated fallback
  if (matchType === 'user_generated') {
    if (isSpotifyOwned) {
      matchType = 'algotorial';
      confidence = 0.70;
      algorithmWeight = 60;
      curatorWeight = 40;
    } else {
      confidence = 0.90;
      algorithmWeight = 10;
      curatorWeight = 90;
    }
    characteristics = [
      "Kullanıcı tarafından oluşturuldu",
      "Kişisel zevklere göre düzenlenmiş",
      "Organik paylaşım potansiyeli",
      "Topluluk büyümesi mümkün"
    ];
    examples = ['Kişisel playlist', 'Arkadaş playlistleri'];
  }
  
  const typeLabels: Record<string, string> = {
    'editorial': 'Editoryal Liste',
    'algorithmic': 'Algoritmik Liste',
    'algotorial': 'Hibrit (Algotoryal) Liste',
    'niche_mix': 'Niş Mix',
    'user_generated': 'Kullanıcı Listesi'
  };
  
  return {
    type: matchType,
    typeTr: typeLabels[matchType],
    confidence,
    characteristics,
    examples,
    algorithmWeight,
    curatorWeight,
  };
}

// ==================== DISCOVERY SCORE ====================

export function calculateDiscoveryScore(trackData: TrackData): DiscoveryScore {
  const { audioFeatures, metadata, artist } = trackData;
  
  const releaseDate = new Date(metadata.album.release_date);
  const now = new Date();
  const daysSinceRelease = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Discover Weekly Score (target: popularity ~30, 10k-20k streams)
  let dwScore = 0;
  
  // Popularity sweet spot for DW: 20-40 (not too popular, not too unknown)
  if (metadata.popularity >= 20 && metadata.popularity <= 40) {
    dwScore += 40;
  } else if (metadata.popularity >= 10 && metadata.popularity <= 50) {
    dwScore += 25;
  } else if (metadata.popularity > 50) {
    dwScore += 10; // Too popular for "discovery"
  } else {
    dwScore += 15; // Too unknown
  }
  
  // Audio features alignment
  if (audioFeatures.energy >= 0.4 && audioFeatures.energy <= 0.8) dwScore += 15;
  if (audioFeatures.danceability >= 0.5) dwScore += 15;
  if (audioFeatures.valence >= 0.3 && audioFeatures.valence <= 0.7) dwScore += 10;
  
  // Artist factors
  if (artist.popularity >= 20 && artist.popularity <= 50) dwScore += 20;
  
  // Release Radar Score (requires pitch 7 days before release)
  let rrScore = 0;
  
  if (daysSinceRelease <= 7) {
    rrScore = 90; // New release, high priority
  } else if (daysSinceRelease <= 14) {
    rrScore = 70;
  } else if (daysSinceRelease <= 30) {
    rrScore = 40;
  } else {
    rrScore = 10; // Too old for Release Radar
  }
  
  // Boost for good audio features
  if (audioFeatures.energy >= 0.5 && audioFeatures.danceability >= 0.5) {
    rrScore = Math.min(100, rrScore + 10);
  }
  
  // Daily Mix Score
  let dmScore = 0;
  
  // Daily Mix favors songs with strong repeat potential
  if (metadata.popularity >= 40) dmScore += 30;
  if (audioFeatures.danceability >= 0.6) dmScore += 20;
  if (audioFeatures.energy >= 0.5 && audioFeatures.energy <= 0.8) dmScore += 20;
  if (audioFeatures.valence >= 0.4) dmScore += 15;
  if (artist.popularity >= 40) dmScore += 15;
  
  // Daylist Score (hyper-personalized, updates 12x daily)
  let daylistScore = 0;
  
  // Daylist rewards songs that fit specific moods/times
  if (audioFeatures.energy < 0.4) {
    daylistScore += 20; // Morning/evening calm fits
  }
  if (audioFeatures.energy >= 0.7) {
    daylistScore += 25; // Workout/afternoon energy fits
  }
  if (audioFeatures.valence >= 0.6) {
    daylistScore += 20; // Happy hours fit
  }
  if (audioFeatures.acousticness >= 0.5) {
    daylistScore += 15; // Chill times fit
  }
  if (audioFeatures.danceability >= 0.6) {
    daylistScore += 20; // Party time fit
  }
  
  // Calculate eligibility
  const dwEligibility = dwScore >= 60 ? 'eligible' : dwScore >= 40 ? 'borderline' : 'unlikely';
  const rrEligibility = daysSinceRelease <= 7 ? 'eligible' : daysSinceRelease <= 30 ? 'needs_pitch' : 'unlikely';
  const dmEligibility = dmScore >= 50 ? 'eligible' : dmScore >= 30 ? 'needs_more_plays' : 'unlikely';
  
  // Overall discovery potential
  const overallDiscoveryPotential = Math.round(
    (dwScore * 0.30 + rrScore * 0.25 + dmScore * 0.25 + daylistScore * 0.20)
  );
  
  // Generate insights
  const insights: string[] = [];
  const actionItems: string[] = [];
  
  if (dwScore >= 60) {
    insights.push("Discover Weekly için güçlü aday");
  } else if (dwScore >= 40) {
    insights.push("Discover Weekly potansiyeli mevcut, iyileştirme gerekli");
    actionItems.push("Popularity Index'i 20-40 aralığına çekin");
  }
  
  if (rrScore >= 70) {
    insights.push("Release Radar için ideal zamanlama");
  } else if (daysSinceRelease > 30) {
    insights.push("Release Radar penceresi geçmiş");
    actionItems.push("Sonraki single için 28 gün önceden pitch yapın");
  }
  
  if (dmScore >= 50) {
    insights.push("Daily Mix'lere girme potansiyeli yüksek");
  }
  
  if (daylistScore >= 60) {
    insights.push("Daylist'ler için uygun profil");
  }
  
  if (metadata.popularity < 20) {
    actionItems.push("Playlist ekleme kampanyası başlatın");
    actionItems.push("Sosyal medya paylaşımlarını artırın");
  }
  
  if (artist.followers.total < 10000) {
    actionItems.push("Sanatçı takipçi sayısını organik büyütün");
  }
  
  return {
    discoverWeeklyScore: Math.min(100, dwScore),
    releaseRadarScore: Math.min(100, rrScore),
    dailyMixScore: Math.min(100, dmScore),
    daylistScore: Math.min(100, daylistScore),
    overallDiscoveryPotential,
    eligibilityStatus: {
      discoverWeekly: dwEligibility,
      releaseRadar: rrEligibility,
      dailyMix: dmEligibility,
    },
    insights,
    actionItems,
  };
}

// ==================== SKIP RATE ANALYSIS ====================

export function analyzeSkipRate(trackData: TrackData): SkipRateAnalysis {
  const { audioFeatures, metadata, artist } = trackData;
  
  const factors: SkipRateAnalysis['factors'] = [];
  let skipRateBase = 30; // Average skip rate baseline
  
  // Factor 1: Track Popularity
  if (metadata.popularity >= 70) {
    skipRateBase -= 15;
    factors.push({
      factor: "Yüksek Popülariteye",
      impact: 'positive',
      weight: 15,
      description: "Tanınır şarkılar daha az atlanır"
    });
  } else if (metadata.popularity >= 40) {
    skipRateBase -= 5;
    factors.push({
      factor: "Orta Popülarite",
      impact: 'positive',
      weight: 5,
      description: "Makul tanınırlık seviyesi"
    });
  } else {
    skipRateBase += 10;
    factors.push({
      factor: "Düşük Popülarite",
      impact: 'negative',
      weight: 10,
      description: "Bilinmeyen şarkılar daha çok atlanır"
    });
  }
  
  // Factor 2: Energy Level
  if (audioFeatures.energy >= 0.6 && audioFeatures.energy <= 0.8) {
    skipRateBase -= 8;
    factors.push({
      factor: "Optimal Enerji",
      impact: 'positive',
      weight: 8,
      description: "Dikkat çekici ama yorucu olmayan enerji"
    });
  } else if (audioFeatures.energy > 0.9) {
    skipRateBase += 5;
    factors.push({
      factor: "Aşırı Yüksek Enerji",
      impact: 'negative',
      weight: 5,
      description: "Yorucu hissedebilir"
    });
  } else if (audioFeatures.energy < 0.3) {
    skipRateBase += 8;
    factors.push({
      factor: "Çok Düşük Enerji",
      impact: 'negative',
      weight: 8,
      description: "Sıkıcı algılanabilir"
    });
  }
  
  // Factor 3: Song Duration
  const durationSec = audioFeatures.duration_ms / 1000;
  if (durationSec >= 150 && durationSec <= 210) {
    skipRateBase -= 10;
    factors.push({
      factor: "İdeal Süre (2:30-3:30)",
      impact: 'positive',
      weight: 10,
      description: "Streaming için optimal uzunluk"
    });
  } else if (durationSec > 300) {
    skipRateBase += 15;
    factors.push({
      factor: "Uzun Şarkı (5+ dk)",
      impact: 'negative',
      weight: 15,
      description: "Uzun şarkılar daha çok atlanır"
    });
  } else if (durationSec < 120) {
    skipRateBase += 5;
    factors.push({
      factor: "Kısa Şarkı (<2 dk)",
      impact: 'negative',
      weight: 5,
      description: "Çok kısa, yetersiz hissedebilir"
    });
  }
  
  // Factor 4: Intro Length (estimated from speechiness in first segment)
  if (audioFeatures.speechiness < 0.1 && audioFeatures.energy > 0.5) {
    skipRateBase -= 5;
    factors.push({
      factor: "Hızlı Giriş",
      impact: 'positive',
      weight: 5,
      description: "İlk 10 saniyede yakalama"
    });
  }
  
  // Factor 5: Danceability
  if (audioFeatures.danceability >= 0.65) {
    skipRateBase -= 7;
    factors.push({
      factor: "Yüksek Dans Edilebilirlik",
      impact: 'positive',
      weight: 7,
      description: "Ritim dinleyiciyi tutar"
    });
  }
  
  // Factor 6: Valence (mood)
  if (audioFeatures.valence >= 0.5 && audioFeatures.valence <= 0.8) {
    skipRateBase -= 5;
    factors.push({
      factor: "Pozitif Mood",
      impact: 'positive',
      weight: 5,
      description: "Mutlu şarkılar daha çok dinlenir"
    });
  } else if (audioFeatures.valence < 0.2) {
    skipRateBase += 5;
    factors.push({
      factor: "Çok Hüzünlü",
      impact: 'negative',
      weight: 5,
      description: "Aşırı melankolik mood risk"
    });
  }
  
  // Factor 7: Artist Recognition
  if (artist.followers.total >= 1000000) {
    skipRateBase -= 12;
    factors.push({
      factor: "Ünlü Sanatçı",
      impact: 'positive',
      weight: 12,
      description: "1M+ takipçi güven sağlar"
    });
  } else if (artist.followers.total >= 100000) {
    skipRateBase -= 5;
    factors.push({
      factor: "Tanınan Sanatçı",
      impact: 'positive',
      weight: 5,
      description: "100K+ takipçi"
    });
  }
  
  // Clamp skip rate
  const predictedSkipRate = Math.max(5, Math.min(70, skipRateBase));
  
  // Determine risk level
  let skipRisk: SkipRateAnalysis['skipRisk'];
  let skipRiskTr: string;
  
  if (predictedSkipRate <= 15) {
    skipRisk = 'very_low';
    skipRiskTr = 'Çok Düşük Risk';
  } else if (predictedSkipRate <= 25) {
    skipRisk = 'low';
    skipRiskTr = 'Düşük Risk';
  } else if (predictedSkipRate <= 40) {
    skipRisk = 'medium';
    skipRiskTr = 'Orta Risk';
  } else if (predictedSkipRate <= 55) {
    skipRisk = 'high';
    skipRiskTr = 'Yüksek Risk';
  } else {
    skipRisk = 'very_high';
    skipRiskTr = 'Çok Yüksek Risk';
  }
  
  // Critical moments analysis
  const criticalMoments: SkipRateAnalysis['criticalMoments'] = [
    {
      timestamp: "0:00-0:10",
      risk: audioFeatures.energy < 0.4 ? 70 : 30,
      reason: audioFeatures.energy < 0.4 ? "Yavaş giriş riski" : "Giriş enerjisi yeterli"
    },
    {
      timestamp: "0:30-0:45",
      risk: audioFeatures.danceability < 0.5 ? 50 : 20,
      reason: "Nakarat öncesi beklenti"
    },
    {
      timestamp: "1:30-2:00",
      risk: 35,
      reason: "Orta bölüm monotonluk riski"
    }
  ];
  
  if (durationSec > 240) {
    criticalMoments.push({
      timestamp: "3:00+",
      risk: 60,
      reason: "Uzun şarkı yorgunluğu"
    });
  }
  
  // Optimization tips
  const optimizationTips: string[] = [];
  
  if (audioFeatures.energy < 0.5) {
    optimizationTips.push("İlk 10 saniyede enerjiyi artırın");
  }
  if (durationSec > 240) {
    optimizationTips.push("Radyo edit versiyonu (3:00-3:30) çıkarın");
  }
  if (metadata.popularity < 40) {
    optimizationTips.push("Playlist kampanyası ile tanınırlık artırın");
  }
  if (audioFeatures.danceability < 0.5) {
    optimizationTips.push("Remix versiyonu ile dans edilebilirlik ekleyin");
  }
  if (predictedSkipRate > 40) {
    optimizationTips.push("Hook'u ilk 15 saniyeye taşıyın");
    optimizationTips.push("Intro süresini 10 saniyenin altına düşürün");
  }
  
  return {
    predictedSkipRate,
    skipRisk,
    skipRiskTr,
    factors,
    criticalMoments,
    optimizationTips,
  };
}

// ==================== 2025 FEATURES COMPATIBILITY ====================

export function analyze2025Features(trackData: TrackData): Feature2025Compatibility {
  const { audioFeatures, metadata } = trackData;
  
  // Daylist analysis (12 updates per day, hyper-personalized)
  const daylistMoods: string[] = [];
  const daylistTimeSlots: string[] = [];
  let daylistScore = 0;
  
  // Morning vibes (calm, acoustic)
  if (audioFeatures.energy < 0.4 && audioFeatures.acousticness > 0.3) {
    daylistTimeSlots.push("Sabah Uyanış (06:00-09:00)");
    daylistMoods.push("Peaceful Morning");
    daylistScore += 20;
  }
  
  // Work hours (focus, instrumental-ish)
  if (audioFeatures.instrumentalness > 0.3 || audioFeatures.speechiness < 0.1) {
    daylistTimeSlots.push("Çalışma Saatleri (09:00-17:00)");
    daylistMoods.push("Deep Focus");
    daylistScore += 15;
  }
  
  // Afternoon energy (medium-high energy)
  if (audioFeatures.energy >= 0.5 && audioFeatures.energy <= 0.8) {
    daylistTimeSlots.push("Öğleden Sonra (14:00-18:00)");
    daylistMoods.push("Afternoon Boost");
    daylistScore += 15;
  }
  
  // Evening chill
  if (audioFeatures.valence >= 0.4 && audioFeatures.energy <= 0.6) {
    daylistTimeSlots.push("Akşam Relax (18:00-21:00)");
    daylistMoods.push("Evening Wind Down");
    daylistScore += 15;
  }
  
  // Party time
  if (audioFeatures.danceability >= 0.7 && audioFeatures.energy >= 0.7) {
    daylistTimeSlots.push("Parti Zamanı (21:00-02:00)");
    daylistMoods.push("Night Out");
    daylistScore += 20;
  }
  
  // Late night
  if (audioFeatures.energy < 0.3 && audioFeatures.acousticness > 0.4) {
    daylistTimeSlots.push("Gece Geç (23:00-06:00)");
    daylistMoods.push("Late Night Thoughts");
    daylistScore += 15;
  }
  
  // AI Playlist prompts (natural language playlist generation)
  const aiPlaylistPrompts: string[] = [];
  
  if (audioFeatures.valence > 0.6 && audioFeatures.energy > 0.6) {
    aiPlaylistPrompts.push("Beni mutlu eden yüksek enerjili şarkılar");
    aiPlaylistPrompts.push("Positive vibes for a good mood");
  }
  if (audioFeatures.danceability > 0.7) {
    aiPlaylistPrompts.push("Parti için dans müziği");
    aiPlaylistPrompts.push("Songs that make me want to dance");
  }
  if (audioFeatures.acousticness > 0.5) {
    aiPlaylistPrompts.push("Akustik ve samimi şarkılar");
    aiPlaylistPrompts.push("Unplugged acoustic vibes");
  }
  if (audioFeatures.energy < 0.4) {
    aiPlaylistPrompts.push("Sakinleştirici ve huzurlu müzik");
    aiPlaylistPrompts.push("Calm music for relaxation");
  }
  if (audioFeatures.tempo > 120 && audioFeatures.energy > 0.7) {
    aiPlaylistPrompts.push("Spor ve antrenman için motive edici");
    aiPlaylistPrompts.push("High energy workout music");
  }
  
  // Smart Shuffle boost (every 3rd song is a recommendation)
  let smartShuffleBoost = 50; // Base
  
  if (audioFeatures.danceability >= 0.6) smartShuffleBoost += 15;
  if (audioFeatures.energy >= 0.5 && audioFeatures.energy <= 0.8) smartShuffleBoost += 15;
  if (metadata.popularity >= 30 && metadata.popularity <= 60) smartShuffleBoost += 20;
  
  // Fewer Repeats impact (affects highly played songs)
  const fewerRepeatsImpact = metadata.popularity >= 70 ? 'negative' : 
                            metadata.popularity >= 40 ? 'neutral' : 'positive';
  
  // Blend compatibility (2-10 person taste matching)
  let blendCompatibility = 50;
  
  // Mainstream appeal helps blend
  if (metadata.popularity >= 50) blendCompatibility += 20;
  if (audioFeatures.danceability >= 0.6) blendCompatibility += 15;
  if (audioFeatures.valence >= 0.5) blendCompatibility += 15;
  
  // Jam Session fit (32 person capacity)
  let jamSessionFit = 50;
  
  if (audioFeatures.energy >= 0.6) jamSessionFit += 20;
  if (audioFeatures.danceability >= 0.7) jamSessionFit += 20;
  if (metadata.popularity >= 60) jamSessionFit += 10;
  
  return {
    daylistFit: {
      score: Math.min(100, daylistScore),
      bestTimeSlots: daylistTimeSlots,
      moodCategories: daylistMoods,
    },
    aiPlaylistPrompts: aiPlaylistPrompts.slice(0, 5),
    smartShuffleBoost: Math.min(100, smartShuffleBoost),
    fewerRepeatsImpact,
    blendCompatibility: Math.min(100, blendCompatibility),
    jamSessionFit: Math.min(100, jamSessionFit),
  };
}

// ==================== ARTIST STRATEGY ====================

export function generateArtistStrategy(trackData: TrackData): ArtistStrategy {
  const { audioFeatures, metadata, artist } = trackData;
  
  const releaseDate = new Date(metadata.album.release_date);
  const now = new Date();
  const daysSinceRelease = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Pitching recommendations
  const targetPlaylists: string[] = [];
  const moods: string[] = [];
  const cultures: string[] = [];
  const instruments: string[] = [];
  
  // Determine target playlists based on audio features
  if (audioFeatures.danceability > 0.7 && audioFeatures.energy > 0.7) {
    targetPlaylists.push("Workout", "Party Hits", "Dance Hits");
    moods.push("Energetic", "Euphoric", "Powerful");
  }
  if (audioFeatures.valence > 0.6) {
    targetPlaylists.push("Happy Hits", "Mood Booster", "Feel Good");
    moods.push("Happy", "Uplifting", "Positive");
  }
  if (audioFeatures.acousticness > 0.5) {
    targetPlaylists.push("Acoustic Hits", "Peaceful Piano", "Coffee Break");
    moods.push("Intimate", "Romantic", "Mellow");
    instruments.push("Acoustic Guitar", "Piano");
  }
  if (audioFeatures.energy < 0.4) {
    targetPlaylists.push("Chill Hits", "Deep Focus", "Sleep");
    moods.push("Calm", "Relaxing", "Dreamy");
  }
  
  // Turkish culture detection
  if (artist.genres.some(g => g.toLowerCase().includes('turkish') || g.toLowerCase().includes('türk'))) {
    cultures.push("Turkey", "Turkish Pop", "Anadolu");
    targetPlaylists.push("Türkçe Pop", "Türkçe Hits");
  }
  
  // Pitching notes
  const pitchNotes: string[] = [];
  
  if (daysSinceRelease < 7) {
    pitchNotes.push("Aktif Release Radar penceresi - hemen pitch yapın");
  } else if (daysSinceRelease < 30) {
    pitchNotes.push("Sonraki çıkış için 28 gün önceden pitch hazırlığı yapın");
  } else {
    pitchNotes.push("Yeni single planlaması ile fresh start yapın");
  }
  
  pitchNotes.push("Spotify for Artists'ten pitch formunu doldurun");
  pitchNotes.push("Mood, genre ve culture etiketlerini eksiksiz seçin");
  
  // Royalty projection
  const estimatedMonthlyStreams = metadata.popularity * 500; // Rough estimate
  const estimatedAnnualStreams = estimatedMonthlyStreams * 12;
  
  let royaltyStatus: 'above_threshold' | 'at_risk' | 'below_threshold';
  let monthlyGrowthNeeded = 0;
  
  if (estimatedAnnualStreams >= 1000) {
    royaltyStatus = 'above_threshold';
  } else if (estimatedAnnualStreams >= 500) {
    royaltyStatus = 'at_risk';
    monthlyGrowthNeeded = Math.ceil((1000 - estimatedAnnualStreams) / 12);
  } else {
    royaltyStatus = 'below_threshold';
    monthlyGrowthNeeded = Math.ceil((1000 - estimatedAnnualStreams) / 12);
  }
  
  const royaltyStrategies: string[] = [];
  
  if (royaltyStatus !== 'above_threshold') {
    royaltyStrategies.push("Playlist kampanyası başlatın");
    royaltyStrategies.push("Sosyal medya paylaşımlarını artırın");
    royaltyStrategies.push("Remix/cover versiyonları çıkarın");
  }
  royaltyStrategies.push("Pre-save kampanyası uygulayın");
  royaltyStrategies.push("Fan etkileşimini artırın");
  
  // Technical limits
  const technicalLimits = {
    playlistCapacity: "Max 10.000 şarkı/playlist",
    downloadLimits: "Cihaz başı 10.000, toplam 50.000 şarkı",
    folderSyncWarning: artist.followers.total > 50000, // Large catalog risk
    coverArtCompliance: true, // Assuming compliant, would need image analysis
  };
  
  return {
    pitchingRecommendations: {
      optimalPitchWindow: "Yayın tarihinden 28 gün (4 hafta) önce",
      targetPlaylists: targetPlaylists.slice(0, 6),
      metadataSuggestions: {
        moods: moods.slice(0, 4),
        genres: artist.genres.slice(0, 4),
        cultures: cultures.length > 0 ? cultures : ["Global"],
        instruments: instruments.length > 0 ? instruments : ["Synthesizer", "Drums"],
      },
      pitchNotes,
    },
    royaltyProjection: {
      currentStatus: royaltyStatus,
      estimatedAnnualStreams,
      monthlyGrowthNeeded,
      strategies: royaltyStrategies,
    },
    technicalLimits,
  };
}

// ==================== FULL ANALYSIS ====================

export function performFullAlgorithmAnalysis(trackData: TrackData): AlgorithmAnalysisResult {
  return {
    bart: analyzeBaRT(trackData),
    playlistType: {
      type: 'user_generated',
      typeTr: 'Genel Analiz',
      confidence: 1,
      characteristics: ['Şarkı bazlı analiz'],
      examples: [],
      algorithmWeight: 50,
      curatorWeight: 50,
    },
    discovery: calculateDiscoveryScore(trackData),
    skipRate: analyzeSkipRate(trackData),
    features2025: analyze2025Features(trackData),
    artistStrategy: generateArtistStrategy(trackData),
  };
}

export function performPlaylistAlgorithmAnalysis(
  playlistData: PlaylistData,
  sampleTrack?: TrackData
): { playlistType: PlaylistTypeClassification; trackAnalysis?: AlgorithmAnalysisResult } {
  const playlistType = classifyPlaylistType(playlistData);
  
  if (sampleTrack) {
    return {
      playlistType,
      trackAnalysis: performFullAlgorithmAnalysis(sampleTrack),
    };
  }
  
  return { playlistType };
}

export const spotifyAlgorithmService = {
  analyzeBaRT,
  classifyPlaylistType,
  calculateDiscoveryScore,
  analyzeSkipRate,
  analyze2025Features,
  generateArtistStrategy,
  performFullAlgorithmAnalysis,
  performPlaylistAlgorithmAnalysis,
};
