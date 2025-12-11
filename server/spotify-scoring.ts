import type { TrackData, PlaylistData } from "./spotify-service";

export interface TrackFeatures {
  energy: number;
  valence: number;
  danceability: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  artistFollowers: number;
  artistPopularity: number;
  trackPopularity: number;
  releaseAgeDays: number;
  duration: number;
}

export interface PlaylistProfile {
  avgEnergy: number;
  avgValence: number;
  avgDanceability: number;
  avgTempo: number;
  avgAcousticness: number;
  avgInstrumentalness: number;
  trackCount: number;
  totalFollowers: number;
}

export interface TrendScoreResult {
  score: number;
  breakdown: {
    energyContribution: number;
    danceabilityContribution: number;
    popularityContribution: number;
    freshnessContribution: number;
    tempoContribution: number;
  };
  label: string;
  insights: string[];
}

export interface EmotionScoreResult {
  score: number;
  label: string;
  mood: string;
  characteristics: string[];
}

export interface PlaylistFitResult {
  score: number;
  label: string;
  compatibility: {
    energy: number;
    valence: number;
    danceability: number;
    tempo: number;
  };
  suggestions: string[];
}

export interface ExamplePlaylistFit {
  name: string;
  score: number;
  reason: string;
}

export function buildTrackFeatures(trackData: TrackData): TrackFeatures {
  const releaseDate = new Date(trackData.metadata.album.release_date);
  const now = new Date();
  const releaseAgeDays = Math.floor((now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    energy: trackData.audioFeatures.energy,
    valence: trackData.audioFeatures.valence,
    danceability: trackData.audioFeatures.danceability,
    tempo: trackData.audioFeatures.tempo,
    acousticness: trackData.audioFeatures.acousticness,
    instrumentalness: trackData.audioFeatures.instrumentalness,
    speechiness: trackData.audioFeatures.speechiness,
    liveness: trackData.audioFeatures.liveness,
    loudness: trackData.audioFeatures.loudness,
    artistFollowers: trackData.artist.followers.total,
    artistPopularity: trackData.artist.popularity,
    trackPopularity: trackData.metadata.popularity,
    releaseAgeDays,
    duration: trackData.audioFeatures.duration_ms / 1000,
  };
}

export function buildPlaylistProfile(playlistData: PlaylistData): PlaylistProfile {
  const tracks = playlistData.tracks;
  
  if (tracks.length === 0) {
    return {
      avgEnergy: 0.5,
      avgValence: 0.5,
      avgDanceability: 0.5,
      avgTempo: 120,
      avgAcousticness: 0.5,
      avgInstrumentalness: 0,
      trackCount: 0,
      totalFollowers: playlistData.metadata.followers.total,
    };
  }

  const sum = tracks.reduce(
    (acc, track) => ({
      energy: acc.energy + track.audioFeatures.energy,
      valence: acc.valence + track.audioFeatures.valence,
      danceability: acc.danceability + track.audioFeatures.danceability,
      tempo: acc.tempo + track.audioFeatures.tempo,
      acousticness: acc.acousticness + track.audioFeatures.acousticness,
      instrumentalness: acc.instrumentalness + track.audioFeatures.instrumentalness,
    }),
    { energy: 0, valence: 0, danceability: 0, tempo: 0, acousticness: 0, instrumentalness: 0 }
  );

  const count = tracks.length;

  return {
    avgEnergy: sum.energy / count,
    avgValence: sum.valence / count,
    avgDanceability: sum.danceability / count,
    avgTempo: sum.tempo / count,
    avgAcousticness: sum.acousticness / count,
    avgInstrumentalness: sum.instrumentalness / count,
    trackCount: count,
    totalFollowers: playlistData.metadata.followers.total,
  };
}

export function computeTrendScore(features: TrackFeatures): TrendScoreResult {
  const energyContribution = features.energy * 20;
  const danceabilityContribution = features.danceability * 20;
  const popularityContribution = (features.trackPopularity / 100) * 25;
  
  let freshnessContribution = 0;
  if (features.releaseAgeDays <= 30) {
    freshnessContribution = 20;
  } else if (features.releaseAgeDays <= 90) {
    freshnessContribution = 15;
  } else if (features.releaseAgeDays <= 180) {
    freshnessContribution = 10;
  } else if (features.releaseAgeDays <= 365) {
    freshnessContribution = 5;
  }

  let tempoContribution = 0;
  if (features.tempo >= 100 && features.tempo <= 130) {
    tempoContribution = 15;
  } else if (features.tempo >= 80 && features.tempo <= 150) {
    tempoContribution = 10;
  } else {
    tempoContribution = 5;
  }

  const score = Math.min(100, Math.round(
    energyContribution + danceabilityContribution + popularityContribution + freshnessContribution + tempoContribution
  ));

  const insights: string[] = [];
  
  if (features.energy > 0.7) {
    insights.push("Yüksek enerji seviyesi viral potansiyeli artırıyor");
  }
  if (features.danceability > 0.7) {
    insights.push("Dans edilebilirlik TikTok için ideal");
  }
  if (features.releaseAgeDays <= 30) {
    insights.push("Yeni çıkış - keşfet algoritmalarında avantajlı");
  }
  if (features.tempo >= 100 && features.tempo <= 130) {
    insights.push("Tempo viral içerikler için optimum aralıkta");
  }
  if (features.trackPopularity > 70) {
    insights.push("Yüksek popülariteye sahip");
  }

  let label: string;
  if (score >= 80) label = "Çok Yüksek Potansiyel";
  else if (score >= 60) label = "Yüksek Potansiyel";
  else if (score >= 40) label = "Orta Potansiyel";
  else if (score >= 20) label = "Düşük Potansiyel";
  else label = "Çok Düşük Potansiyel";

  return {
    score,
    breakdown: {
      energyContribution: Math.round(energyContribution),
      danceabilityContribution: Math.round(danceabilityContribution),
      popularityContribution: Math.round(popularityContribution),
      freshnessContribution,
      tempoContribution,
    },
    label,
    insights,
  };
}

export function computeEmotionScore(features: TrackFeatures): EmotionScoreResult {
  const valenceWeight = features.valence * 2 - 1;
  const energyModifier = (features.energy - 0.5) * 0.3;
  const acousticModifier = features.acousticness * 0.2;
  
  let score = valenceWeight + energyModifier - acousticModifier * (1 - features.valence);
  score = Math.max(-1, Math.min(1, score));
  score = Math.round(score * 100) / 100;

  let mood: string;
  let label: string;
  const characteristics: string[] = [];

  if (score > 0.5) {
    mood = "Mutlu";
    label = "Pozitif";
  } else if (score > 0.2) {
    mood = "Neşeli";
    label = "Hafif Pozitif";
  } else if (score > -0.2) {
    mood = "Nötr";
    label = "Dengeli";
  } else if (score > -0.5) {
    mood = "Melankolik";
    label = "Hafif Negatif";
  } else {
    mood = "Hüzünlü";
    label = "Negatif";
  }

  if (features.energy > 0.7) characteristics.push("Enerjik");
  else if (features.energy < 0.3) characteristics.push("Sakin");

  if (features.acousticness > 0.7) characteristics.push("Akustik");
  if (features.instrumentalness > 0.5) characteristics.push("Enstrümantal");
  if (features.danceability > 0.7) characteristics.push("Ritmik");
  if (features.speechiness > 0.3) characteristics.push("Vokal Ağırlıklı");
  if (features.liveness > 0.6) characteristics.push("Canlı Performans Hissi");

  return {
    score,
    label,
    mood,
    characteristics,
  };
}

export function computePlaylistFitScore(features: TrackFeatures, profile: PlaylistProfile): PlaylistFitResult {
  const energyDiff = Math.abs(features.energy - profile.avgEnergy);
  const valenceDiff = Math.abs(features.valence - profile.avgValence);
  const danceabilityDiff = Math.abs(features.danceability - profile.avgDanceability);
  const tempoDiff = Math.abs(features.tempo - profile.avgTempo) / 200;

  const energyScore = Math.round((1 - energyDiff) * 100);
  const valenceScore = Math.round((1 - valenceDiff) * 100);
  const danceabilityScore = Math.round((1 - danceabilityDiff) * 100);
  const tempoScore = Math.round((1 - Math.min(tempoDiff, 1)) * 100);

  const totalScore = Math.round(
    energyScore * 0.3 + valenceScore * 0.25 + danceabilityScore * 0.25 + tempoScore * 0.2
  );

  const suggestions: string[] = [];
  
  if (energyDiff > 0.3) {
    suggestions.push(features.energy > profile.avgEnergy 
      ? "Şarkı playlist'ten daha enerjik - geçiş için fade kullanın"
      : "Şarkı playlist'ten daha sakin - enerji düşüşü yaratabilir");
  }
  if (valenceDiff > 0.3) {
    suggestions.push(features.valence > profile.avgValence
      ? "Daha pozitif bir şarkı - mood yükseltici olabilir"
      : "Daha melankolik - playlist atmosferini değiştirebilir");
  }
  if (tempoDiff > 0.2) {
    suggestions.push("Tempo farkı belirgin - geçişlerde dikkatli olun");
  }

  let label: string;
  if (totalScore >= 85) label = "Mükemmel Uyum";
  else if (totalScore >= 70) label = "İyi Uyum";
  else if (totalScore >= 50) label = "Orta Uyum";
  else if (totalScore >= 30) label = "Zayıf Uyum";
  else label = "Uyumsuz";

  return {
    score: totalScore,
    label,
    compatibility: {
      energy: energyScore,
      valence: valenceScore,
      danceability: danceabilityScore,
      tempo: tempoScore,
    },
    suggestions,
  };
}

export function computeExamplePlaylistFits(features: TrackFeatures): ExamplePlaylistFit[] {
  const playlists: ExamplePlaylistFit[] = [];

  const chillScore = Math.round(
    (1 - features.energy) * 30 + features.acousticness * 30 + (1 - features.danceability) * 20 + features.valence * 20
  );
  playlists.push({
    name: "Chill Vibes",
    score: Math.min(100, chillScore),
    reason: features.acousticness > 0.5 ? "Akustik yapısı uyumlu" : "Sakin atmosfer için uygun",
  });

  const partyScore = Math.round(
    features.energy * 35 + features.danceability * 35 + features.valence * 20 + (features.tempo > 110 ? 10 : 0)
  );
  playlists.push({
    name: "Party Mix",
    score: Math.min(100, partyScore),
    reason: features.danceability > 0.7 ? "Yüksek dans edilebilirlik" : "Parti enerjisi potansiyeli",
  });

  const focusScore = Math.round(
    features.instrumentalness * 40 + (1 - features.speechiness) * 30 + (features.tempo >= 90 && features.tempo <= 120 ? 20 : 10) + features.energy * 0.5 * 20
  );
  playlists.push({
    name: "Focus & Study",
    score: Math.min(100, focusScore),
    reason: features.instrumentalness > 0.3 ? "Düşük vokal oranı" : "Konsantrasyon için uygun tempo",
  });

  const workoutScore = Math.round(
    features.energy * 40 + (features.tempo > 120 ? 30 : features.tempo > 100 ? 20 : 10) + features.danceability * 20 + (features.loudness > -8 ? 10 : 5)
  );
  playlists.push({
    name: "Workout Energy",
    score: Math.min(100, workoutScore),
    reason: features.energy > 0.7 ? "Yüksek enerji seviyesi" : "Motivasyon potansiyeli",
  });

  const romanticScore = Math.round(
    features.valence * 25 + features.acousticness * 25 + (1 - features.energy) * 25 + (features.tempo < 100 ? 25 : 15)
  );
  playlists.push({
    name: "Romantic Evening",
    score: Math.min(100, romanticScore),
    reason: features.acousticness > 0.4 ? "Samimi atmosfer" : "Duygusal potansiyel",
  });

  return playlists.sort((a, b) => b.score - a.score);
}

export interface ArtistSoundProfile {
  avgEnergy: number;
  avgValence: number;
  avgDanceability: number;
  avgTempo: number;
  avgAcousticness: number;
  avgInstrumentalness: number;
  avgSpeechiness: number;
  avgLiveness: number;
  dominantMood: string;
  genres: string[];
}

export interface OpenerTrackRecommendation {
  trackId: string;
  trackName: string;
  albumArt: string;
  openerScore: number;
  reasoning: string[];
  impactMetrics: {
    hookPotential: number;
    retentionPrediction: number;
    skipRiskReduction: number;
    algorithmBoost: number;
  };
  bestForPlaylists: string[];
}

export interface AlgorithmicPlaylistRecommendation {
  id: string;
  name: string;
  nameTr: string;
  description: string;
  score: number;
  targetAudience: string;
  optimalDuration: string;
  trackCountSuggestion: number;
  curationType: 'fan_account' | 'editorial' | 'mood' | 'activity' | 'discovery' | 'seasonal' | 'contextual';
  audioTargets: {
    energy: { min: number; max: number; optimal: number };
    valence: { min: number; max: number; optimal: number };
    danceability: { min: number; max: number; optimal: number };
    tempo: { min: number; max: number; optimal: number };
  };
  keyInsights: string[];
  potentialReach: string;
  streamPotential: 'çok_yüksek' | 'yüksek' | 'orta' | 'düşük';
  openerTracks?: OpenerTrackRecommendation[];
  sequencingStrategy: string;
  algorithmicAdvantages: string[];
}

export interface DeepAnalysis {
  artistDNA: {
    sonicalSignature: string;
    emotionalRange: { min: number; max: number; dominant: string };
    energyProfile: string;
    tempoCharacter: string;
    productionStyle: string;
  };
  marketPosition: {
    competitiveEdge: string[];
    playlistPotential: string;
    crossoverAppeal: string[];
    fanbaseType: string;
  };
  streamingStrategy: {
    peakListeningHours: string[];
    idealReleaseDay: string;
    playlistTargets: string[];
    algorithmTips: string[];
  };
  contentRecommendations: {
    tiktokPotential: number;
    instagramReelsFit: number;
    youtubeShortsFit: number;
    suggestedClipDurations: number[];
    viralHooks: string[];
  };
}

export function buildArtistSoundProfile(avgFeatures: {
  energy: number;
  valence: number;
  danceability: number;
  tempo: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
}, genres: string[]): ArtistSoundProfile {
  let dominantMood: string;
  
  if (avgFeatures.valence > 0.6 && avgFeatures.energy > 0.6) {
    dominantMood = "Enerjik & Mutlu";
  } else if (avgFeatures.valence > 0.6 && avgFeatures.energy <= 0.6) {
    dominantMood = "Pozitif & Sakin";
  } else if (avgFeatures.valence <= 0.4 && avgFeatures.energy > 0.6) {
    dominantMood = "Yoğun & Dramatik";
  } else if (avgFeatures.valence <= 0.4 && avgFeatures.energy <= 0.4) {
    dominantMood = "Melankolik & Derin";
  } else {
    dominantMood = "Dengeli & Çok Yönlü";
  }

  return {
    avgEnergy: avgFeatures.energy,
    avgValence: avgFeatures.valence,
    avgDanceability: avgFeatures.danceability,
    avgTempo: avgFeatures.tempo,
    avgAcousticness: avgFeatures.acousticness,
    avgInstrumentalness: avgFeatures.instrumentalness,
    avgSpeechiness: avgFeatures.speechiness,
    avgLiveness: avgFeatures.liveness,
    dominantMood,
    genres,
  };
}

export function analyzeOpenerPotential(
  tracks: Array<{
    id: string;
    name: string;
    albumArt: string;
    popularity: number;
    energy: number;
    valence: number;
    danceability: number;
    tempo: number;
  }>,
  playlistType: string
): OpenerTrackRecommendation[] {
  return tracks.map(track => {
    let hookPotential = 0;
    let retentionPrediction = 0;
    let skipRiskReduction = 0;
    let algorithmBoost = 0;
    const reasoning: string[] = [];
    const bestFor: string[] = [];

    // Hook Potential - ilk 30 saniyede yakalama gücü
    if (track.energy > 0.7) {
      hookPotential += 30;
      reasoning.push("Yüksek enerji anında dikkat çeker");
    }
    if (track.danceability > 0.65) {
      hookPotential += 25;
      reasoning.push("Ritim hemen yakalanır");
    }
    if (track.tempo >= 100 && track.tempo <= 130) {
      hookPotential += 20;
      reasoning.push("Optimum tempo aralığında");
    }
    if (track.popularity > 60) {
      hookPotential += 25;
      reasoning.push("Tanınırlık avantajı var");
    }

    // Retention Prediction - dinleyiciyi tutma
    if (track.valence > 0.5 && track.energy > 0.5) {
      retentionPrediction += 35;
      reasoning.push("Pozitif enerji dinleyiciyi tutar");
    }
    if (track.popularity > 50) {
      retentionPrediction += 30;
      reasoning.push("Popüler parçalar güven verir");
    }
    if (track.danceability > 0.6) {
      retentionPrediction += 20;
      bestFor.push("Parti Playlistleri");
    }
    if (track.energy < 0.4 && track.valence > 0.4) {
      retentionPrediction += 15;
      bestFor.push("Chill/Relax Playlistleri");
    }

    // Skip Risk Reduction
    if (track.popularity > 70) {
      skipRiskReduction += 40;
    } else if (track.popularity > 50) {
      skipRiskReduction += 25;
    }
    if (track.energy > 0.6 && track.danceability > 0.6) {
      skipRiskReduction += 30;
    }
    if (track.valence > 0.5) {
      skipRiskReduction += 15;
    }
    if (track.tempo >= 90 && track.tempo <= 140) {
      skipRiskReduction += 15;
    }

    // Algorithm Boost - Spotify algoritması için
    if (track.popularity > 60) {
      algorithmBoost += 30;
      reasoning.push("Algoritma bu parçayı tanıyor");
    }
    if (track.energy > 0.65 && track.danceability > 0.65) {
      algorithmBoost += 25;
      reasoning.push("Yüksek etkileşim metrikleri");
    }
    if (track.valence > 0.55) {
      algorithmBoost += 20;
    }
    algorithmBoost += Math.min(25, track.popularity * 0.25);

    // Best For kategorileri
    if (track.energy > 0.75) bestFor.push("Spor/Antrenman");
    if (track.valence > 0.7) bestFor.push("Mutlu Anlar");
    if (track.energy < 0.4) bestFor.push("Akustik/Sakin");
    if (track.danceability > 0.75) bestFor.push("Dans/Parti");
    if (track.tempo < 100) bestFor.push("Gece/Relax");
    if (bestFor.length === 0) bestFor.push("Genel Amaçlı");

    const openerScore = Math.round(
      (hookPotential * 0.3 + retentionPrediction * 0.25 + skipRiskReduction * 0.25 + algorithmBoost * 0.2)
    );

    return {
      trackId: track.id,
      trackName: track.name,
      albumArt: track.albumArt,
      openerScore: Math.min(100, openerScore),
      reasoning: reasoning.slice(0, 4),
      impactMetrics: {
        hookPotential: Math.min(100, hookPotential),
        retentionPrediction: Math.min(100, retentionPrediction),
        skipRiskReduction: Math.min(100, skipRiskReduction),
        algorithmBoost: Math.min(100, algorithmBoost),
      },
      bestForPlaylists: Array.from(new Set(bestFor)),
    };
  }).sort((a, b) => b.openerScore - a.openerScore);
}

export function generateDeepAnalysis(
  profile: ArtistSoundProfile,
  artistName: string,
  artistPopularity: number,
  followerCount: number
): DeepAnalysis {
  // Sonical Signature
  let sonicalSignature = "";
  if (profile.avgEnergy > 0.7 && profile.avgDanceability > 0.7) {
    sonicalSignature = "Yüksek enerjili, dans odaklı pop/elektronik";
  } else if (profile.avgAcousticness > 0.5) {
    sonicalSignature = "Akustik ağırlıklı, organik prodüksiyon";
  } else if (profile.avgEnergy > 0.6 && profile.avgValence < 0.4) {
    sonicalSignature = "Yoğun, dramatik ve güçlü";
  } else if (profile.avgValence > 0.6) {
    sonicalSignature = "Pozitif, ışıklı ve neşeli";
  } else {
    sonicalSignature = "Dengeli, çok yönlü üretim tarzı";
  }

  // Energy Profile
  let energyProfile = "";
  if (profile.avgEnergy > 0.75) {
    energyProfile = "Süper Enerjik - Sahne performansı odaklı";
  } else if (profile.avgEnergy > 0.6) {
    energyProfile = "Enerjik - Aktif dinleme için ideal";
  } else if (profile.avgEnergy > 0.4) {
    energyProfile = "Orta Enerji - Her ortama uyumlu";
  } else {
    energyProfile = "Sakin - Arka plan ve relax için ideal";
  }

  // Tempo Character
  let tempoCharacter = "";
  if (profile.avgTempo > 130) {
    tempoCharacter = "Hızlı tempolu - Club/EDM odaklı";
  } else if (profile.avgTempo > 110) {
    tempoCharacter = "Orta-hızlı - Pop/Dance crossover";
  } else if (profile.avgTempo > 90) {
    tempoCharacter = "Orta tempo - Versatil kullanım";
  } else {
    tempoCharacter = "Yavaş tempo - Ballad/Romantik";
  }

  // Production Style
  let productionStyle = "";
  if (profile.avgInstrumentalness > 0.4) {
    productionStyle = "Enstrümantal ağırlıklı, minimal vokal";
  } else if (profile.avgAcousticness > 0.5) {
    productionStyle = "Organik, akustik enstrümantasyon";
  } else if (profile.avgSpeechiness > 0.2) {
    productionStyle = "Vokal odaklı, rap/spoken word elementleri";
  } else {
    productionStyle = "Modern pop prodüksiyon, dengeli mix";
  }

  // Competitive Edge
  const competitiveEdge: string[] = [];
  if (profile.avgDanceability > 0.7) {
    competitiveEdge.push("Dans playlistlerinde güçlü konum");
  }
  if (profile.avgEnergy > 0.7) {
    competitiveEdge.push("Spor/Fitness playlistleri için ideal");
  }
  if (profile.avgAcousticness > 0.5) {
    competitiveEdge.push("Akustik/Chill kategorisinde rekabetçi");
  }
  if (artistPopularity > 70) {
    competitiveEdge.push("Yüksek tanınırlık algoritma avantajı");
  }
  if (profile.genres.some(g => g.includes('turkish') || g.includes('pop'))) {
    competitiveEdge.push("Türkiye pazarında güçlü konum");
  }
  if (competitiveEdge.length === 0) {
    competitiveEdge.push("Niş pazarda sadık dinleyici kitlesi");
  }

  // Crossover Appeal
  const crossoverAppeal: string[] = [];
  if (profile.avgDanceability > 0.6 && profile.avgEnergy > 0.6) {
    crossoverAppeal.push("Uluslararası dans müziği pazarı");
  }
  if (profile.avgAcousticness > 0.4) {
    crossoverAppeal.push("Singer-songwriter kategorisi");
  }
  if (profile.avgValence > 0.6) {
    crossoverAppeal.push("Feel-good/Summer playlist'ler");
  }
  if (profile.avgEnergy < 0.4) {
    crossoverAppeal.push("Lo-fi/Ambient kategorileri");
  }
  if (crossoverAppeal.length === 0) {
    crossoverAppeal.push("Ana akım pop kategorileri");
  }

  // Fanbase Type
  let fanbaseType = "";
  if (followerCount > 1000000) {
    fanbaseType = "Geniş kitle - Mainstream appeal";
  } else if (followerCount > 100000) {
    fanbaseType = "Orta-büyük kitle - Sadık fan tabanı";
  } else if (followerCount > 10000) {
    fanbaseType = "Büyüyen kitle - Keşif potansiyeli yüksek";
  } else {
    fanbaseType = "Niş kitle - Dedike hayranlar";
  }

  // Peak Listening Hours (Türkiye için)
  const peakListeningHours: string[] = [];
  if (profile.avgEnergy > 0.6) {
    peakListeningHours.push("08:00-10:00 (Sabah motivasyonu)");
    peakListeningHours.push("17:00-19:00 (İş çıkışı)");
  }
  if (profile.avgEnergy < 0.5) {
    peakListeningHours.push("21:00-00:00 (Gece sakinliği)");
    peakListeningHours.push("06:00-08:00 (Sabah uyanışı)");
  }
  if (profile.avgDanceability > 0.7) {
    peakListeningHours.push("22:00-02:00 (Gece hayatı)");
  }
  if (peakListeningHours.length === 0) {
    peakListeningHours.push("12:00-14:00 (Öğle molası)");
    peakListeningHours.push("19:00-21:00 (Akşam dinlenmesi)");
  }

  // Ideal Release Day
  let idealReleaseDay = "";
  if (profile.avgDanceability > 0.7 || profile.avgEnergy > 0.7) {
    idealReleaseDay = "Cuma - Hafta sonu öncesi maksimum etki";
  } else if (profile.avgAcousticness > 0.5) {
    idealReleaseDay = "Pazartesi - Hafta başı sakin başlangıç";
  } else {
    idealReleaseDay = "Cuma - Spotify algoritmaları için optimal";
  }

  // Playlist Targets
  const playlistTargets: string[] = [];
  if (profile.avgDanceability > 0.65) {
    playlistTargets.push("Today's Top Hits");
    playlistTargets.push("Dance Hits");
  }
  if (profile.avgValence > 0.6) {
    playlistTargets.push("Good Vibes");
    playlistTargets.push("Happy Hits");
  }
  if (profile.avgEnergy > 0.7) {
    playlistTargets.push("Workout");
    playlistTargets.push("Power Hour");
  }
  if (profile.avgAcousticness > 0.5) {
    playlistTargets.push("Acoustic Covers");
    playlistTargets.push("Peaceful Piano adjacent");
  }
  if (profile.genres.some(g => g.includes('turkish'))) {
    playlistTargets.push("Türkçe Pop");
    playlistTargets.push("Türkiye Top 50");
  }

  // Algorithm Tips
  const algorithmTips: string[] = [
    "İlk 30 saniye kritik - hook'u öne çıkarın",
    "Skip oranını düşük tutmak için güçlü açılış",
    "Playlist eklenmeler için pitch deadline'larını takip edin",
  ];
  if (artistPopularity < 50) {
    algorithmTips.push("Release Radar için pre-save kampanyası önemli");
    algorithmTips.push("Discover Weekly için tutarlı yayın takvimi");
  }
  if (profile.avgDanceability > 0.6) {
    algorithmTips.push("TikTok viral anları için 15-30 saniyelik kesitler hazırlayın");
  }

  // TikTok Potential
  let tiktokPotential = 0;
  if (profile.avgDanceability > 0.7) tiktokPotential += 30;
  if (profile.avgEnergy > 0.7) tiktokPotential += 25;
  if (profile.avgTempo >= 100 && profile.avgTempo <= 130) tiktokPotential += 25;
  if (profile.avgValence > 0.5) tiktokPotential += 10;
  tiktokPotential += Math.min(10, artistPopularity / 10);

  // Instagram Reels Fit
  let instagramReelsFit = 0;
  if (profile.avgValence > 0.5) instagramReelsFit += 25;
  if (profile.avgDanceability > 0.6) instagramReelsFit += 25;
  if (profile.avgEnergy > 0.5 && profile.avgEnergy < 0.8) instagramReelsFit += 25;
  instagramReelsFit += Math.min(25, artistPopularity / 4);

  // YouTube Shorts Fit
  let youtubeShortsFit = 0;
  if (profile.avgEnergy > 0.6) youtubeShortsFit += 25;
  if (profile.avgDanceability > 0.55) youtubeShortsFit += 20;
  if (profile.avgTempo >= 90 && profile.avgTempo <= 140) youtubeShortsFit += 20;
  youtubeShortsFit += Math.min(35, artistPopularity / 3);

  // Suggested Clip Durations
  const suggestedClipDurations: number[] = [];
  if (profile.avgTempo > 120) {
    suggestedClipDurations.push(15, 30);
  } else if (profile.avgTempo > 100) {
    suggestedClipDurations.push(15, 30, 60);
  } else {
    suggestedClipDurations.push(30, 60);
  }

  // Viral Hooks
  const viralHooks: string[] = [];
  if (profile.avgDanceability > 0.7) {
    viralHooks.push("Dans challenge potansiyeli yüksek");
  }
  if (profile.avgValence > 0.7) {
    viralHooks.push("Pozitif içerik trendi için uygun");
  }
  if (profile.avgEnergy > 0.7) {
    viralHooks.push("Spor/Fitness içerik eşleşmesi");
  }
  if (profile.avgAcousticness > 0.5) {
    viralHooks.push("Cover/Akustik versiyon trendi");
  }
  if (profile.avgTempo >= 100 && profile.avgTempo <= 120) {
    viralHooks.push("Transition video uyumu");
  }
  if (viralHooks.length === 0) {
    viralHooks.push("Storytelling içerik formatı");
  }

  return {
    artistDNA: {
      sonicalSignature,
      emotionalRange: {
        min: Math.max(0, profile.avgValence - 0.2),
        max: Math.min(1, profile.avgValence + 0.2),
        dominant: profile.dominantMood,
      },
      energyProfile,
      tempoCharacter,
      productionStyle,
    },
    marketPosition: {
      competitiveEdge,
      playlistPotential: artistPopularity > 60 ? "Yüksek - Editöryal playlist şansı var" : "Orta - Algoritmik keşif odaklı",
      crossoverAppeal,
      fanbaseType,
    },
    streamingStrategy: {
      peakListeningHours,
      idealReleaseDay,
      playlistTargets,
      algorithmTips,
    },
    contentRecommendations: {
      tiktokPotential: Math.min(100, tiktokPotential),
      instagramReelsFit: Math.min(100, instagramReelsFit),
      youtubeShortsFit: Math.min(100, youtubeShortsFit),
      suggestedClipDurations,
      viralHooks,
    },
  };
}

export function generateAlgorithmicPlaylists(
  profile: ArtistSoundProfile,
  artistName: string,
  artistPopularity: number,
  topTracks?: Array<{
    id: string;
    name: string;
    albumArt: string;
    popularity: number;
    energy: number;
    valence: number;
    danceability: number;
    tempo: number;
  }>
): AlgorithmicPlaylistRecommendation[] {
  const playlists: AlgorithmicPlaylistRecommendation[] = [];

  // Opener tracks analysis
  const openerAnalysis = topTracks ? analyzeOpenerPotential(topTracks, 'general') : undefined;

  // 1. This Is / Best Of
  const bestOfScore = Math.round(
    artistPopularity * 0.4 + 
    profile.avgEnergy * 25 + 
    profile.avgDanceability * 20 + 
    (profile.avgValence > 0.5 ? 15 : 10)
  );
  playlists.push({
    id: 'best_of',
    name: `This Is ${artistName}`,
    nameTr: `En İyileri: ${artistName}`,
    description: `${artistName}'ın en popüler ve en çok dinlenen şarkılarından oluşan tanımlayıcı playlist`,
    score: Math.min(100, bestOfScore),
    targetAudience: "Mevcut hayranlar ve yeni keşfediciler",
    optimalDuration: "2-3 saat",
    trackCountSuggestion: 50,
    curationType: 'fan_account',
    audioTargets: {
      energy: { min: profile.avgEnergy - 0.15, max: profile.avgEnergy + 0.2, optimal: profile.avgEnergy },
      valence: { min: profile.avgValence - 0.2, max: profile.avgValence + 0.2, optimal: profile.avgValence },
      danceability: { min: profile.avgDanceability - 0.15, max: profile.avgDanceability + 0.15, optimal: profile.avgDanceability },
      tempo: { min: profile.avgTempo - 20, max: profile.avgTempo + 25, optimal: profile.avgTempo },
    },
    keyInsights: [
      "Sanatçının en tanınan parçalarını öne çıkarın",
      "Kronolojik değil, popülariteye göre sıralayın",
      "İlk 5 şarkı kritik - en güçlüler olmalı",
    ],
    potentialReach: artistPopularity > 70 ? "1M+ aylık dinleyici" : artistPopularity > 50 ? "100K-1M dinleyici" : "10K-100K dinleyici",
    streamPotential: artistPopularity > 70 ? 'çok_yüksek' : artistPopularity > 50 ? 'yüksek' : 'orta',
    openerTracks: openerAnalysis?.slice(0, 3),
    sequencingStrategy: "Popülariteye göre azalan sıra, her 5 şarkıda bir gizli hazine",
    algorithmicAdvantages: [
      "Yüksek completion rate beklentisi",
      "Skip oranı düşük tutulmalı",
      "Save/like oranını artırır",
    ],
  });

  // 2. Essentials
  const essentialsScore = Math.round(
    artistPopularity * 0.3 + 
    profile.avgEnergy * 20 + 
    profile.avgValence * 20 + 
    (profile.genres.length > 0 ? 20 : 10) + 
    10
  );
  playlists.push({
    id: 'essentials',
    name: `${artistName} Essentials`,
    nameTr: `${artistName} Temel Parçalar`,
    description: `Yeni dinleyiciler için mükemmel giriş noktası - sanatçının müzikal kimliğini yansıtan seçki`,
    score: Math.min(100, essentialsScore),
    targetAudience: "Sanatçıyı yeni keşfedenler",
    optimalDuration: "45 dakika - 1 saat",
    trackCountSuggestion: 20,
    curationType: 'editorial',
    audioTargets: {
      energy: { min: profile.avgEnergy - 0.1, max: profile.avgEnergy + 0.15, optimal: profile.avgEnergy },
      valence: { min: profile.avgValence - 0.15, max: profile.avgValence + 0.15, optimal: profile.avgValence },
      danceability: { min: profile.avgDanceability - 0.1, max: profile.avgDanceability + 0.1, optimal: profile.avgDanceability },
      tempo: { min: profile.avgTempo - 15, max: profile.avgTempo + 15, optimal: profile.avgTempo },
    },
    keyInsights: [
      "Sanatçının farklı dönemlerinden örnekler ekleyin",
      "Çeşitlilik gösterin ama tutarlı kalın",
      "Hit olmayan ama güçlü parçalar da dahil edin",
    ],
    potentialReach: "Yeni fan kazanımı için ideal",
    streamPotential: 'yüksek',
    openerTracks: openerAnalysis?.filter(t => t.impactMetrics.retentionPrediction > 60).slice(0, 2),
    sequencingStrategy: "Hook'u güçlü parçayla aç, ortada keşif, güçlü kapanış",
    algorithmicAdvantages: [
      "Discover Weekly'ye düşme şansı yüksek",
      "Related artists önerilerinde görünürlük",
    ],
  });

  // 3. Vibes (dans/enerji varsa)
  if (profile.avgDanceability > 0.55 || profile.avgEnergy > 0.6) {
    const vibesScore = Math.round(
      profile.avgDanceability * 35 + 
      profile.avgEnergy * 30 + 
      profile.avgValence * 25 + 
      (profile.avgTempo > 100 ? 10 : 5)
    );
    playlists.push({
      id: 'vibes',
      name: `${artistName} Vibes`,
      nameTr: `${artistName} Havası`,
      description: `Sanatçının enerjik ve dans edilebilir parçalarından oluşan parti atmosferi`,
      score: Math.min(100, vibesScore),
      targetAudience: "Parti ve eğlence anları",
      optimalDuration: "1-2 saat",
      trackCountSuggestion: 30,
      curationType: 'mood',
      audioTargets: {
        energy: { min: 0.55, max: 1.0, optimal: Math.max(0.7, profile.avgEnergy) },
        valence: { min: 0.45, max: 1.0, optimal: Math.max(0.6, profile.avgValence) },
        danceability: { min: 0.55, max: 1.0, optimal: Math.max(0.7, profile.avgDanceability) },
        tempo: { min: 100, max: 140, optimal: Math.max(110, profile.avgTempo) },
      },
      keyInsights: [
        "Yüksek enerji tutarlılığı sağlayın",
        "Tempo düşüşlerinden kaçının",
        "Remixler ve canlı versiyonlar eklenebilir",
      ],
      potentialReach: "Playlist yerleştirme potansiyeli yüksek",
      streamPotential: 'yüksek',
      openerTracks: openerAnalysis?.filter(t => t.impactMetrics.hookPotential > 70).slice(0, 2),
      sequencingStrategy: "Enerjik başla, orta kısımda pik yap, güçlü bitir",
      algorithmicAdvantages: [
        "Mood-based önerilerde öne çıkar",
        "Parti playlistlerine yerleşme şansı",
      ],
    });
  }

  // 4. Acoustic/Chill (akustik veya düşük enerji varsa)
  if (profile.avgAcousticness > 0.3 || profile.avgEnergy < 0.5) {
    const acousticScore = Math.round(
      profile.avgAcousticness * 40 + 
      (1 - profile.avgEnergy) * 25 + 
      profile.avgValence * 20 + 
      15
    );
    playlists.push({
      id: 'acoustic',
      name: `${artistName} Unplugged`,
      nameTr: `${artistName} Akustik`,
      description: `Sanatçının sakin, akustik ve stripped-down versiyonları`,
      score: Math.min(100, acousticScore),
      targetAudience: "Sakin anlar ve arka plan müziği",
      optimalDuration: "1-1.5 saat",
      trackCountSuggestion: 25,
      curationType: 'mood',
      audioTargets: {
        energy: { min: 0.15, max: 0.55, optimal: Math.min(0.45, profile.avgEnergy) },
        valence: { min: 0.3, max: 0.7, optimal: profile.avgValence },
        danceability: { min: 0.2, max: 0.55, optimal: Math.min(0.45, profile.avgDanceability) },
        tempo: { min: 60, max: 110, optimal: Math.min(100, profile.avgTempo) },
      },
      keyInsights: [
        "Akustik versiyonları ve canlı kayıtları tercih edin",
        "Tutarlı düşük enerji seviyesi koruyun",
        "Gece/çalışma listeleri için ideal",
      ],
      potentialReach: "Chill playlist'lere yerleştirme şansı",
      streamPotential: 'orta',
      sequencingStrategy: "Yavaş başla, orta düzey tut, sakin bitir",
      algorithmicAdvantages: [
        "Sleep/Focus kategorilerinde görünürlük",
        "Arka plan müziği olarak yüksek süre",
      ],
    });
  }

  // 5. Deep Cuts
  const deepCutsScore = Math.round(
    artistPopularity * 0.2 + 
    profile.avgEnergy * 15 + 
    profile.avgValence * 15 + 
    40
  );
  playlists.push({
    id: 'deep_cuts',
    name: `${artistName} Deep Cuts`,
    nameTr: `${artistName} Gizli Hazineler`,
    description: `Hardcore fanlar için - daha az bilinen ama değerli parçalar`,
    score: Math.min(100, deepCutsScore),
    targetAudience: "Sadık hayranlar ve koleksiyoncular",
    optimalDuration: "2+ saat",
    trackCountSuggestion: 40,
    curationType: 'discovery',
    audioTargets: {
      energy: { min: profile.avgEnergy - 0.25, max: profile.avgEnergy + 0.25, optimal: profile.avgEnergy },
      valence: { min: profile.avgValence - 0.3, max: profile.avgValence + 0.3, optimal: profile.avgValence },
      danceability: { min: profile.avgDanceability - 0.2, max: profile.avgDanceability + 0.2, optimal: profile.avgDanceability },
      tempo: { min: profile.avgTempo - 30, max: profile.avgTempo + 30, optimal: profile.avgTempo },
    },
    keyInsights: [
      "B-side'ları ve bonus parçaları dahil edin",
      "Albüm parçalarını single'lara tercih edin",
      "Sanatçının müzikal evrimini gösterin",
    ],
    potentialReach: "Niş ama sadık dinleyici kitlesi",
    streamPotential: 'düşük',
    sequencingStrategy: "Kronolojik veya tematik gruplama",
    algorithmicAdvantages: [
      "Superfan segmentinde güçlü",
      "Uzun oturum süresi potansiyeli",
    ],
  });

  // 6. Workout
  if (profile.avgDanceability > 0.5 && profile.avgEnergy > 0.5) {
    const workoutScore = Math.round(
      profile.avgEnergy * 40 + 
      profile.avgDanceability * 30 + 
      (profile.avgTempo > 120 ? 20 : profile.avgTempo > 100 ? 15 : 10) + 
      10
    );
    playlists.push({
      id: 'workout',
      name: `${artistName} Workout`,
      nameTr: `${artistName} Spor`,
      description: `Antrenman ve egzersiz için yüksek enerjili parçalar`,
      score: Math.min(100, workoutScore),
      targetAudience: "Spor ve fitness tutkunları",
      optimalDuration: "45 dakika - 1 saat",
      trackCountSuggestion: 20,
      curationType: 'activity',
      audioTargets: {
        energy: { min: 0.7, max: 1.0, optimal: Math.max(0.8, profile.avgEnergy) },
        valence: { min: 0.4, max: 1.0, optimal: Math.max(0.6, profile.avgValence) },
        danceability: { min: 0.6, max: 1.0, optimal: Math.max(0.75, profile.avgDanceability) },
        tempo: { min: 115, max: 160, optimal: Math.max(125, profile.avgTempo) },
      },
      keyInsights: [
        "Sadece en yüksek enerjili parçaları seçin",
        "Enerji düşüşü olmamalı",
        "Tempo 120+ BPM tutun",
      ],
      potentialReach: "Spor playlistlerine yerleştirme şansı",
      streamPotential: 'yüksek',
      openerTracks: openerAnalysis?.filter(t => t.bestForPlaylists.includes("Spor/Antrenman")).slice(0, 2),
      sequencingStrategy: "Isınma -> Pik -> Soğuma şeklinde enerji eğrisi",
      algorithmicAdvantages: [
        "Fitness kategorisinde görünürlük",
        "Aktivite bazlı önerilerde öne çıkar",
      ],
    });
  }

  // 7. Chronology
  const chronologyScore = Math.round(
    artistPopularity * 0.25 + 
    50 + 
    (profile.genres.length > 2 ? 15 : 10)
  );
  playlists.push({
    id: 'chronology',
    name: `${artistName} Complete`,
    nameTr: `${artistName} Kronoloji`,
    description: `Sanatçının tüm diskografisi kronolojik sırayla - tam koleksiyon`,
    score: Math.min(100, chronologyScore),
    targetAudience: "Arşiv meraklıları ve müzik tarihçileri",
    optimalDuration: "10+ saat",
    trackCountSuggestion: 100,
    curationType: 'fan_account',
    audioTargets: {
      energy: { min: 0.0, max: 1.0, optimal: profile.avgEnergy },
      valence: { min: 0.0, max: 1.0, optimal: profile.avgValence },
      danceability: { min: 0.0, max: 1.0, optimal: profile.avgDanceability },
      tempo: { min: 40, max: 200, optimal: profile.avgTempo },
    },
    keyInsights: [
      "Yayın tarihine göre sıralayın",
      "Tüm albüm ve single'ları dahil edin",
      "Feat. parçaları da ekleyin",
    ],
    potentialReach: "Sadık fan tabanı",
    streamPotential: 'orta',
    sequencingStrategy: "Kesinlikle kronolojik - ilk albümden son çıkışa",
    algorithmicAdvantages: [
      "Uzun oturum süresi",
      "Sanatçı keşfi için ideal",
    ],
  });

  // 8. Late Night / Gece (yeni)
  const lateNightScore = Math.round(
    (1 - profile.avgEnergy) * 30 + 
    profile.avgAcousticness * 25 + 
    (profile.avgTempo < 100 ? 25 : 10) + 
    20
  );
  playlists.push({
    id: 'late_night',
    name: `${artistName} After Hours`,
    nameTr: `${artistName} Gece Seansı`,
    description: `Gece geç saatler için sakin ve düşündürücü parçalar`,
    score: Math.min(100, lateNightScore),
    targetAudience: "Gece kuşları ve düşünceli anlar",
    optimalDuration: "1-2 saat",
    trackCountSuggestion: 25,
    curationType: 'contextual',
    audioTargets: {
      energy: { min: 0.1, max: 0.5, optimal: 0.35 },
      valence: { min: 0.2, max: 0.6, optimal: 0.4 },
      danceability: { min: 0.2, max: 0.5, optimal: 0.35 },
      tempo: { min: 60, max: 100, optimal: 80 },
    },
    keyInsights: [
      "Düşük tempo ve enerji tutun",
      "Melankolik ama bunaltıcı olmayan seçim",
      "Akustik versiyonları tercih edin",
    ],
    potentialReach: "Late Night kategorisi hedeflemesi",
    streamPotential: 'orta',
    sequencingStrategy: "Yavaş başla, tutarlı düşük enerji, nazik kapanış",
    algorithmicAdvantages: [
      "22:00-03:00 arası önerilerde öne çık",
      "Sleep timer kullanıcıları için ideal",
    ],
  });

  // 9. Road Trip / Yolculuk (yeni)
  if (profile.avgEnergy > 0.45 || profile.avgValence > 0.45) {
    const roadTripScore = Math.round(
      profile.avgEnergy * 25 + 
      profile.avgValence * 30 + 
      (profile.avgTempo >= 90 && profile.avgTempo <= 130 ? 25 : 10) + 
      20
    );
    playlists.push({
      id: 'road_trip',
      name: `${artistName} Road Trip`,
      nameTr: `${artistName} Yolculuk`,
      description: `Uzun yolculuklar için mükemmel eşlikçi - sing-along parçalar`,
      score: Math.min(100, roadTripScore),
      targetAudience: "Sürücüler ve yolcular",
      optimalDuration: "2-4 saat",
      trackCountSuggestion: 50,
      curationType: 'activity',
      audioTargets: {
        energy: { min: 0.45, max: 0.85, optimal: 0.65 },
        valence: { min: 0.45, max: 0.9, optimal: 0.65 },
        danceability: { min: 0.4, max: 0.8, optimal: 0.6 },
        tempo: { min: 90, max: 130, optimal: 110 },
      },
      keyInsights: [
        "Herkesin bildiği hit'leri dahil edin",
        "Sing-along potansiyeli yüksek şarkılar",
        "Enerji düşüşlerini minimize edin",
      ],
      potentialReach: "Road Trip/Driving playlistleri",
      streamPotential: 'yüksek',
      openerTracks: openerAnalysis?.filter(t => t.impactMetrics.hookPotential > 60 && t.openerScore > 65).slice(0, 2),
      sequencingStrategy: "Tanınan parçayla başla, enerji dalgaları oluştur",
      algorithmicAdvantages: [
        "Uzun oturum süresi (seyahat)",
        "Driving mode'da önerilme şansı",
      ],
    });
  }

  // 10. Throwback / Nostalji (yeni)
  const throwbackScore = Math.round(
    artistPopularity * 0.3 + 
    profile.avgValence * 25 + 
    (profile.genres.some(g => g.includes('pop')) ? 25 : 15) + 
    20
  );
  playlists.push({
    id: 'throwback',
    name: `${artistName} Throwback`,
    nameTr: `${artistName} Nostalji`,
    description: `Sanatçının en sevilen eski parçaları - nostalji dolu anlar`,
    score: Math.min(100, throwbackScore),
    targetAudience: "Eski hayranlar ve nostalji sevenler",
    optimalDuration: "1.5-2 saat",
    trackCountSuggestion: 35,
    curationType: 'fan_account',
    audioTargets: {
      energy: { min: profile.avgEnergy - 0.2, max: profile.avgEnergy + 0.2, optimal: profile.avgEnergy },
      valence: { min: profile.avgValence - 0.15, max: profile.avgValence + 0.25, optimal: profile.avgValence + 0.1 },
      danceability: { min: profile.avgDanceability - 0.15, max: profile.avgDanceability + 0.15, optimal: profile.avgDanceability },
      tempo: { min: profile.avgTempo - 20, max: profile.avgTempo + 20, optimal: profile.avgTempo },
    },
    keyInsights: [
      "2+ yıl önceki parçalara odaklan",
      "Dönemin hit'lerini öne çıkar",
      "Unutulmuş güzellikleri hatırlat",
    ],
    potentialReach: "Nostalji/Throwback kategorileri",
    streamPotential: 'orta',
    sequencingStrategy: "En eski -> günümüze veya rastgele nostalji",
    algorithmicAdvantages: [
      "Throwback kategorisinde görünürlük",
      "Eski hayranları geri kazanma",
    ],
  });

  // 11. Focus / Çalışma (yeni - instrumental veya düşük speechiness varsa)
  if (profile.avgInstrumentalness > 0.1 || profile.avgSpeechiness < 0.15) {
    const focusScore = Math.round(
      (1 - profile.avgSpeechiness) * 25 + 
      profile.avgInstrumentalness * 25 + 
      (profile.avgTempo >= 80 && profile.avgTempo <= 120 ? 25 : 10) + 
      (profile.avgEnergy >= 0.3 && profile.avgEnergy <= 0.6 ? 25 : 10)
    );
    playlists.push({
      id: 'focus',
      name: `${artistName} Focus`,
      nameTr: `${artistName} Odaklanma`,
      description: `Çalışma ve odaklanma için dikkat dağıtmayan parçalar`,
      score: Math.min(100, focusScore),
      targetAudience: "Çalışanlar ve öğrenciler",
      optimalDuration: "2-3 saat",
      trackCountSuggestion: 40,
      curationType: 'activity',
      audioTargets: {
        energy: { min: 0.3, max: 0.6, optimal: 0.45 },
        valence: { min: 0.3, max: 0.7, optimal: 0.5 },
        danceability: { min: 0.3, max: 0.6, optimal: 0.45 },
        tempo: { min: 80, max: 120, optimal: 100 },
      },
      keyInsights: [
        "Ani enerji değişimlerinden kaçının",
        "Vokal ağırlıklı parçaları minimize edin",
        "Tutarlı bir akış sağlayın",
      ],
      potentialReach: "Focus/Productivity playlistleri",
      streamPotential: 'orta',
      sequencingStrategy: "Sabit enerji seviyesi, yumuşak geçişler",
      algorithmicAdvantages: [
        "Çalışma saatlerinde önerilme",
        "Uzun loop potansiyeli",
      ],
    });
  }

  // 12. Summer / Yaz (mevsimsel - yeni)
  if (profile.avgValence > 0.45 && profile.avgEnergy > 0.5) {
    const summerScore = Math.round(
      profile.avgValence * 35 + 
      profile.avgEnergy * 30 + 
      profile.avgDanceability * 25 + 
      10
    );
    playlists.push({
      id: 'summer',
      name: `${artistName} Summer`,
      nameTr: `${artistName} Yaz`,
      description: `Yaz günleri için pozitif ve enerjik parçalar`,
      score: Math.min(100, summerScore),
      targetAudience: "Yaz aktiviteleri ve tatil",
      optimalDuration: "2-3 saat",
      trackCountSuggestion: 40,
      curationType: 'seasonal',
      audioTargets: {
        energy: { min: 0.55, max: 0.9, optimal: 0.7 },
        valence: { min: 0.55, max: 1.0, optimal: 0.75 },
        danceability: { min: 0.55, max: 0.9, optimal: 0.7 },
        tempo: { min: 100, max: 135, optimal: 115 },
      },
      keyInsights: [
        "Pozitif ve güneşli havayı yansıt",
        "Plaj/havuz atmosferi",
        "Feel-good factor yüksek tutun",
      ],
      potentialReach: "Summer Hits kategorisi",
      streamPotential: 'yüksek',
      openerTracks: openerAnalysis?.filter(t => t.bestForPlaylists.includes("Mutlu Anlar")).slice(0, 2),
      sequencingStrategy: "Gün boyunca dinlenebilir akış",
      algorithmicAdvantages: [
        "Yaz aylarında öne çıkma",
        "Tatil/plaj context'inde görünürlük",
      ],
    });
  }

  // 13. Rainy Day / Yağmurlu Gün (mevsimsel/mood - yeni)
  if (profile.avgValence < 0.6 || profile.avgAcousticness > 0.35) {
    const rainyScore = Math.round(
      (1 - profile.avgEnergy) * 25 + 
      profile.avgAcousticness * 30 + 
      (profile.avgValence >= 0.3 && profile.avgValence <= 0.6 ? 25 : 15) + 
      20
    );
    playlists.push({
      id: 'rainy_day',
      name: `${artistName} Rainy Day`,
      nameTr: `${artistName} Yağmurlu Gün`,
      description: `Yağmurlu günler için hüzünlü ama huzurlu parçalar`,
      score: Math.min(100, rainyScore),
      targetAudience: "İç dünyasına dönenler",
      optimalDuration: "1.5-2 saat",
      trackCountSuggestion: 30,
      curationType: 'mood',
      audioTargets: {
        energy: { min: 0.2, max: 0.55, optimal: 0.4 },
        valence: { min: 0.25, max: 0.55, optimal: 0.4 },
        danceability: { min: 0.25, max: 0.5, optimal: 0.4 },
        tempo: { min: 70, max: 110, optimal: 90 },
      },
      keyInsights: [
        "Melankolik ama depresif olmayan seçim",
        "Yağmur sesi ile uyumlu tempolar",
        "Duygusal derinlik",
      ],
      potentialReach: "Mood-based discovery",
      streamPotential: 'orta',
      sequencingStrategy: "Tutarlı melankolik atmosfer",
      algorithmicAdvantages: [
        "Yağmurlu hava context'inde önerilme",
        "Mood filtresinde görünürlük",
      ],
    });
  }

  // 14. Romantic / Romantik (mood - yeni)
  if (profile.avgAcousticness > 0.3 || profile.avgValence > 0.4) {
    const romanticScore = Math.round(
      profile.avgAcousticness * 30 + 
      (1 - profile.avgEnergy) * 20 + 
      profile.avgValence * 25 + 
      (profile.avgTempo < 110 ? 25 : 10)
    );
    playlists.push({
      id: 'romantic',
      name: `${artistName} Romantic`,
      nameTr: `${artistName} Romantik`,
      description: `Romantik anlar için duygusal ve samimi parçalar`,
      score: Math.min(100, romanticScore),
      targetAudience: "Çiftler ve romantik ruh halleri",
      optimalDuration: "1-1.5 saat",
      trackCountSuggestion: 25,
      curationType: 'mood',
      audioTargets: {
        energy: { min: 0.2, max: 0.55, optimal: 0.4 },
        valence: { min: 0.4, max: 0.75, optimal: 0.55 },
        danceability: { min: 0.3, max: 0.6, optimal: 0.45 },
        tempo: { min: 70, max: 110, optimal: 90 },
      },
      keyInsights: [
        "Duygusal ve samimi atmosfer",
        "Slow dance potansiyeli",
        "Aşk temalı şarkılar",
      ],
      potentialReach: "Romantic/Date Night playlistleri",
      streamPotential: 'orta',
      sequencingStrategy: "Yumuşak başla, duygu yoğunluğunu artır",
      algorithmicAdvantages: [
        "Akşam saatlerinde önerilme",
        "Valentine's/özel günlerde görünürlük",
      ],
    });
  }

  // 15. Karaoke / Sing-Along (yeni)
  if (profile.avgSpeechiness < 0.3 && profile.avgValence > 0.4) {
    const karaokeScore = Math.round(
      (1 - profile.avgInstrumentalness) * 30 + 
      profile.avgValence * 25 + 
      artistPopularity * 0.3 + 
      (profile.avgTempo >= 90 && profile.avgTempo <= 130 ? 25 : 10)
    );
    playlists.push({
      id: 'karaoke',
      name: `${artistName} Sing-Along`,
      nameTr: `${artistName} Şarkı Söyle`,
      description: `Beraber söylemek için en eğlenceli hit'ler`,
      score: Math.min(100, karaokeScore),
      targetAudience: "Karaoke severler ve grup eğlenceleri",
      optimalDuration: "1-2 saat",
      trackCountSuggestion: 30,
      curationType: 'activity',
      audioTargets: {
        energy: { min: 0.5, max: 0.9, optimal: 0.7 },
        valence: { min: 0.5, max: 1.0, optimal: 0.7 },
        danceability: { min: 0.45, max: 0.85, optimal: 0.65 },
        tempo: { min: 90, max: 130, optimal: 110 },
      },
      keyInsights: [
        "Herkesin bildiği parçalar",
        "Kolay söylenebilir melodiler",
        "Nakarat ağırlıklı şarkılar",
      ],
      potentialReach: "Sing-Along/Karaoke kategorileri",
      streamPotential: 'yüksek',
      openerTracks: openerAnalysis?.filter(t => t.openerScore > 60 && t.impactMetrics.retentionPrediction > 50).slice(0, 2),
      sequencingStrategy: "Bilinen hit'lerle başla, eğlenceyi yükselt",
      algorithmicAdvantages: [
        "Sosyal etkinliklerde önerilme",
        "Yüksek etkileşim potansiyeli",
      ],
    });
  }

  return playlists.sort((a, b) => b.score - a.score);
}
