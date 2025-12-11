import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Music, 
  TrendingUp, 
  Heart, 
  Zap, 
  Clock,
  Users,
  Lightbulb,
  ExternalLink,
  Search,
  Disc,
  BarChart3,
  Activity,
  Sparkles,
  ListMusic,
  Brain,
  Target,
  SkipForward,
  Calendar,
  Shuffle,
  Radio,
  Sun,
  Moon,
  Sunrise,
  CloudSun,
  PartyPopper,
  Coffee,
  Dumbbell,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Megaphone,
  Tag,
  DollarSign,
  HardDrive
} from "lucide-react";
import { SiSpotify } from "react-icons/si";

interface TrackInsightResult {
  success: boolean;
  track: {
    id: string;
    name: string;
    artist: string;
    album: string;
    releaseDate: string;
    popularity: number;
    duration: number;
    previewUrl: string | null;
    spotifyUrl: string;
    albumArt: string;
  };
  features: {
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
  };
  trendScore: {
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
  };
  emotionScore: {
    score: number;
    label: string;
    mood: string;
    characteristics: string[];
  };
  playlistFits: Array<{
    name: string;
    score: number;
    reason: string;
  }>;
  artistInfo: {
    name: string;
    followers: number;
    popularity: number;
    genres: string[];
  };
}

interface AlgorithmAnalysisResult {
  success: boolean;
  bart: {
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
  };
  playlistType: {
    type: 'editorial' | 'algorithmic' | 'algotorial' | 'niche_mix' | 'user_generated';
    typeTr: string;
    confidence: number;
    characteristics: string[];
    examples: string[];
    algorithmWeight: number;
    curatorWeight: number;
  };
  discovery: {
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
  };
  skipRate: {
    predictedSkipRate: number;
    skipRisk: string;
    skipRiskTr: string;
    factors: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
      description: string;
    }>;
    criticalMoments: Array<{
      timestamp: string;
      risk: number;
      reason: string;
    }>;
    optimizationTips: string[];
  };
  features2025: {
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
  };
  artistStrategy: {
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
  };
}

export default function SpotifyInsight() {
  const { toast } = useToast();
  const [trackInput, setTrackInput] = useState("");
  const [result, setResult] = useState<TrackInsightResult | null>(null);
  const [algorithmResult, setAlgorithmResult] = useState<AlgorithmAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const analyzeTrack = useMutation({
    mutationFn: async (input: string) => {
      const response = await apiRequest("POST", "/api/spotify/track-insight", { trackInput: input });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult(data);
        toast({
          title: "Analiz Tamamlandı",
          description: `${data.track.name} başarıyla analiz edildi`,
        });
      } else {
        toast({
          title: "Hata",
          description: data.error || "Analiz yapılamadı",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Şarkı analizi yapılamadı",
        variant: "destructive",
      });
    },
  });

  const analyzeAlgorithm = useMutation({
    mutationFn: async (input: string) => {
      const response = await apiRequest("POST", "/api/spotify/algorithm-analysis", { trackInput: input });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.analysis) {
        setAlgorithmResult({ success: true, ...data.analysis });
        toast({
          title: "Algoritma Analizi Tamamlandı",
          description: "Spotify algoritma detayları hazır",
        });
      } else {
        toast({
          title: "Hata",
          description: data.error || "Algoritma analizi yapılamadı",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Algoritma analizi yapılamadı",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!trackInput.trim()) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir Spotify şarkı linki veya ID girin",
        variant: "destructive",
      });
      return;
    }
    analyzeTrack.mutate(trackInput.trim());
    analyzeAlgorithm.mutate(trackInput.trim());
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 70) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const getEmotionColor = (score: number): string => {
    if (score > 0.3) return "text-green-500";
    if (score > -0.3) return "text-yellow-500";
    return "text-blue-500";
  };

  const getEligibilityIcon = (status: string) => {
    switch (status) {
      case 'eligible': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'borderline': 
      case 'needs_pitch':
      case 'needs_more_plays':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getEligibilityLabel = (status: string): string => {
    switch (status) {
      case 'eligible': return 'Uygun';
      case 'borderline': return 'Sınırda';
      case 'needs_pitch': return 'Pitch Gerekli';
      case 'needs_more_plays': return 'Daha Fazla Dinlenme Gerekli';
      case 'unlikely': return 'Düşük İhtimal';
      default: return status;
    }
  };

  const getTimeSlotIcon = (slot: string) => {
    if (slot.includes('Sabah') || slot.includes('morning')) return <Sunrise className="h-4 w-4" />;
    if (slot.includes('Öğlen') || slot.includes('noon')) return <Sun className="h-4 w-4" />;
    if (slot.includes('Akşam') || slot.includes('evening')) return <CloudSun className="h-4 w-4" />;
    if (slot.includes('Gece') || slot.includes('night')) return <Moon className="h-4 w-4" />;
    if (slot.includes('Parti') || slot.includes('party')) return <PartyPopper className="h-4 w-4" />;
    if (slot.includes('Kahve') || slot.includes('coffee')) return <Coffee className="h-4 w-4" />;
    if (slot.includes('Spor') || slot.includes('workout')) return <Dumbbell className="h-4 w-4" />;
    if (slot.includes('Çalışma') || slot.includes('study')) return <BookOpen className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getRoyaltyStatusColor = (status: string): string => {
    switch (status) {
      case 'above_threshold': return 'text-green-500';
      case 'at_risk': return 'text-yellow-500';
      case 'below_threshold': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getRoyaltyStatusLabel = (status: string): string => {
    switch (status) {
      case 'above_threshold': return 'Eşik Üstünde';
      case 'at_risk': return 'Risk Altında';
      case 'below_threshold': return 'Eşik Altında';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-500/10">
          <SiSpotify className="h-6 w-6 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Şarkı Analizi</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Spotify şarkılarını analiz edin, algoritma ve keşif skorlarını görün
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Şarkı Ara
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="track-input" className="sr-only">Spotify Şarkı Linki veya ID</Label>
              <Input
                id="track-input"
                placeholder="Spotify şarkı linki veya ID yapıştırın..."
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                data-testid="input-track"
              />
            </div>
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzeTrack.isPending || analyzeAlgorithm.isPending}
              data-testid="button-analyze"
            >
              {(analyzeTrack.isPending || analyzeAlgorithm.isPending) ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analiz Et
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Örnek: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
          </p>
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  {result.track.albumArt && (
                    <img 
                      src={result.track.albumArt} 
                      alt={result.track.album}
                      className="w-40 h-40 rounded-lg shadow-lg mb-4"
                      data-testid="img-album-art"
                    />
                  )}
                  <h2 className="text-lg font-bold" data-testid="text-track-name">{result.track.name}</h2>
                  <p className="text-muted-foreground text-sm" data-testid="text-track-artist">{result.track.artist}</p>
                  <p className="text-xs text-muted-foreground">{result.track.album}</p>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(result.track.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Disc className="h-3 w-3" />
                      {result.track.releaseDate}
                    </span>
                  </div>

                  <a 
                    href={result.track.spotifyUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-3"
                  >
                    <Button variant="outline" size="sm" data-testid="button-open-spotify">
                      <SiSpotify className="h-4 w-4 mr-2 text-green-500" />
                      Spotify'da Aç
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Sanatçı
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Takipçi</span>
                  <span className="font-medium" data-testid="text-artist-followers">
                    {formatNumber(result.artistInfo.followers)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Popülerlik</span>
                  <span className="font-medium">{result.artistInfo.popularity}/100</span>
                </div>
                {result.artistInfo.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {result.artistInfo.genres.slice(0, 3).map((genre, i) => (
                      <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-genre-${i}`}>
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {algorithmResult && (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    BaRT Skoru
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-3">
                    <span className={`text-4xl font-bold ${getScoreColor(algorithmResult.bart.overallScore)}`} data-testid="text-bart-score">
                      {algorithmResult.bart.overallScore}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">Algoritma Uyumu</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span>Collaborative Filtering</span>
                      <Badge variant={getScoreBadgeVariant(algorithmResult.bart.collaborativeFilteringScore)} className="text-xs">
                        {algorithmResult.bart.collaborativeFilteringScore}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>NLP Tags</span>
                      <Badge variant={getScoreBadgeVariant(algorithmResult.bart.nlpTagScore)} className="text-xs">
                        {algorithmResult.bart.nlpTagScore}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Raw Audio</span>
                      <Badge variant={getScoreBadgeVariant(algorithmResult.bart.rawAudioScore)} className="text-xs">
                        {algorithmResult.bart.rawAudioScore}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="text-xs" data-testid="tab-overview">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Genel
                </TabsTrigger>
                <TabsTrigger value="algorithm" className="text-xs" data-testid="tab-algorithm">
                  <Brain className="h-3 w-3 mr-1" />
                  Algoritma
                </TabsTrigger>
                <TabsTrigger value="features2025" className="text-xs" data-testid="tab-2025">
                  <Sparkles className="h-3 w-3 mr-1" />
                  2025
                </TabsTrigger>
                <TabsTrigger value="strategy" className="text-xs" data-testid="tab-strategy">
                  <Target className="h-3 w-3 mr-1" />
                  Strateji
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Trend Skoru
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`text-4xl font-bold ${getScoreColor(result.trendScore.score)}`} data-testid="text-trend-score">
                          {result.trendScore.score}
                        </span>
                        <div>
                          <Badge variant="outline" data-testid="badge-trend-label">{result.trendScore.label}</Badge>
                        </div>
                      </div>
                      <Progress value={result.trendScore.score} className="h-2 mb-3" />
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Enerji</span>
                          <span>{result.trendScore.breakdown.energyContribution}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dans</span>
                          <span>{result.trendScore.breakdown.danceabilityContribution}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Popülerlik</span>
                          <span>{result.trendScore.breakdown.popularityContribution}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Heart className="h-4 w-4 text-pink-500" />
                        Duygu Analizi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`text-4xl font-bold ${getEmotionColor(result.emotionScore.score)}`} data-testid="text-emotion-score">
                          {result.emotionScore.score > 0 ? "+" : ""}{result.emotionScore.score.toFixed(2)}
                        </span>
                        <div>
                          <Badge variant="outline" data-testid="badge-mood">{result.emotionScore.mood}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{result.emotionScore.label}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        {result.emotionScore.characteristics.slice(0, 4).map((char, i) => (
                          <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-characteristic-${i}`}>
                            {char}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Ses Özellikleri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Enerji", value: result.features.energy },
                        { label: "Dans", value: result.features.danceability },
                        { label: "Valence", value: result.features.valence },
                        { label: "Akustik", value: result.features.acousticness },
                      ].map((feature, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{feature.label}</span>
                            <span className="font-medium">{Math.round(feature.value * 100)}%</span>
                          </div>
                          <Progress value={feature.value * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{Math.round(result.features.tempo)}</p>
                        <p className="text-xs text-muted-foreground">BPM</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{result.track.popularity}</p>
                        <p className="text-xs text-muted-foreground">Popülerlik</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{result.features.releaseAgeDays}</p>
                        <p className="text-xs text-muted-foreground">Gün Önce</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ListMusic className="h-4 w-4" />
                      Önerilen Playlist Uyumları
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.playlistFits.map((fit, i) => (
                        <div key={i} className="flex items-center justify-between" data-testid={`playlist-fit-${i}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{fit.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{fit.reason}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Progress value={fit.score} className="w-20 h-2" />
                            <span className={`text-sm font-medium w-10 text-right ${getScoreColor(fit.score)}`}>
                              {fit.score}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="algorithm" className="space-y-4">
                {algorithmResult ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Radio className="h-4 w-4 text-green-500" />
                            Discovery Skorları
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Algoritmik playlist giriş potansiyeli
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Discover Weekly</span>
                                {getEligibilityIcon(algorithmResult.discovery.eligibilityStatus.discoverWeekly)}
                              </div>
                              <span className={`font-bold ${getScoreColor(algorithmResult.discovery.discoverWeeklyScore)}`}>
                                {algorithmResult.discovery.discoverWeeklyScore}
                              </span>
                            </div>
                            <Progress value={algorithmResult.discovery.discoverWeeklyScore} className="h-2" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Release Radar</span>
                                {getEligibilityIcon(algorithmResult.discovery.eligibilityStatus.releaseRadar)}
                              </div>
                              <span className={`font-bold ${getScoreColor(algorithmResult.discovery.releaseRadarScore)}`}>
                                {algorithmResult.discovery.releaseRadarScore}
                              </span>
                            </div>
                            <Progress value={algorithmResult.discovery.releaseRadarScore} className="h-2" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Daily Mix</span>
                                {getEligibilityIcon(algorithmResult.discovery.eligibilityStatus.dailyMix)}
                              </div>
                              <span className={`font-bold ${getScoreColor(algorithmResult.discovery.dailyMixScore)}`}>
                                {algorithmResult.discovery.dailyMixScore}
                              </span>
                            </div>
                            <Progress value={algorithmResult.discovery.dailyMixScore} className="h-2" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Daylist</span>
                              <span className={`font-bold ${getScoreColor(algorithmResult.discovery.daylistScore)}`}>
                                {algorithmResult.discovery.daylistScore}
                              </span>
                            </div>
                            <Progress value={algorithmResult.discovery.daylistScore} className="h-2" />
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Genel Keşif Potansiyeli</p>
                            <p className={`text-2xl font-bold ${getScoreColor(algorithmResult.discovery.overallDiscoveryPotential)}`}>
                              {algorithmResult.discovery.overallDiscoveryPotential}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <SkipForward className="h-4 w-4 text-orange-500" />
                            Skip Rate Analizi
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Tahmini atlanma riski
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center mb-4">
                            <span className={`text-4xl font-bold ${algorithmResult.skipRate.predictedSkipRate > 40 ? 'text-red-500' : algorithmResult.skipRate.predictedSkipRate > 25 ? 'text-yellow-500' : 'text-green-500'}`}>
                              %{algorithmResult.skipRate.predictedSkipRate}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1">{algorithmResult.skipRate.skipRiskTr}</p>
                          </div>
                          
                          <div className="space-y-2">
                            {algorithmResult.skipRate.factors.slice(0, 4).map((factor, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{factor.factor}</span>
                                <span className={getImpactColor(factor.impact)}>
                                  {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : '~'}{factor.weight}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          {algorithmResult.skipRate.criticalMoments.length > 0 && (
                            <>
                              <Separator className="my-3" />
                              <div>
                                <p className="text-xs font-medium mb-2">Kritik Anlar</p>
                                <div className="space-y-1">
                                  {algorithmResult.skipRate.criticalMoments.slice(0, 3).map((moment, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{moment.timestamp}</span>
                                      <Badge variant={moment.risk > 60 ? "destructive" : "secondary"} className="text-xs">
                                        %{moment.risk}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          BaRT Algoritma Detayları
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-medium mb-2">Kullanıcı Davranış Sinyalleri</p>
                            <div className="space-y-1">
                              {algorithmResult.bart.breakdown.userBehaviorSignals.map((signal, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{signal}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium mb-2">İçerik Etiketleri</p>
                            <div className="flex flex-wrap gap-1">
                              {algorithmResult.bart.breakdown.contentTags.slice(0, 6).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium mb-2">Ses Karakteristikleri</p>
                            <div className="space-y-1">
                              {algorithmResult.bart.breakdown.audioCharacteristics.slice(0, 4).map((char, i) => (
                                <p key={i} className="text-xs text-muted-foreground">{char}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        {algorithmResult.bart.recommendations.length > 0 && (
                          <>
                            <Separator className="my-4" />
                            <div>
                              <p className="text-xs font-medium mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                                Öneriler
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {algorithmResult.bart.recommendations.map((rec, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">{rec}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card data-testid="card-playlist-type">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ListMusic className="h-4 w-4 text-purple-500" />
                          Playlist Türü Sınıflandırması
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Şarkının playlist türü uyumu
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <Badge variant="outline" className="text-sm" data-testid="badge-playlist-type">
                              {algorithmResult.playlistType.typeTr}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1" data-testid="text-playlist-confidence">
                              Güven: %{Math.round(algorithmResult.playlistType.confidence * 100)}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <Brain className="h-3 w-3 text-blue-500" />
                                <span data-testid="text-algorithm-weight">Algoritma: %{algorithmResult.playlistType.algorithmWeight}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-green-500" />
                                <span data-testid="text-curator-weight">Küratör: %{algorithmResult.playlistType.curatorWeight}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {algorithmResult.playlistType.characteristics.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium mb-2">Karakteristikler</p>
                            <div className="flex flex-wrap gap-1">
                              {algorithmResult.playlistType.characteristics.map((char, i) => (
                                <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-playlist-char-${i}`}>
                                  {char}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {algorithmResult.playlistType.examples.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-2">Örnek Playlistler</p>
                            <div className="flex flex-wrap gap-1">
                              {algorithmResult.playlistType.examples.slice(0, 4).map((example, i) => (
                                <Badge key={i} variant="outline" className="text-xs" data-testid={`badge-playlist-example-${i}`}>
                                  {example}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {algorithmResult.discovery.actionItems.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Aksiyon Önerileri
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {algorithmResult.discovery.actionItems.map((item, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/50">
                                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="min-h-[300px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Brain className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Algoritma analizi yükleniyor...</p>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="features2025" className="space-y-4">
                {algorithmResult ? (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sun className="h-4 w-4 text-yellow-500" />
                          Daylist Uyumu
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Günün farklı saatlerinde playlist uyumu
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 mb-4">
                          <span className={`text-4xl font-bold ${getScoreColor(algorithmResult.features2025.daylistFit.score)}`}>
                            {algorithmResult.features2025.daylistFit.score}
                          </span>
                          <div>
                            <p className="text-sm text-muted-foreground">Daylist Skoru</p>
                            <Progress value={algorithmResult.features2025.daylistFit.score} className="h-2 w-24 mt-1" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium mb-2">En İyi Zaman Dilimleri</p>
                            <div className="space-y-2">
                              {algorithmResult.features2025.daylistFit.bestTimeSlots.map((slot, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50">
                                  {getTimeSlotIcon(slot)}
                                  <span>{slot}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium mb-2">Mood Kategorileri</p>
                            <div className="flex flex-wrap gap-1">
                              {algorithmResult.features2025.daylistFit.moodCategories.map((mood, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {mood}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Shuffle className="h-4 w-4 text-blue-500" />
                            Smart Shuffle
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <span className={`text-3xl font-bold ${getScoreColor(algorithmResult.features2025.smartShuffleBoost)}`}>
                              +{algorithmResult.features2025.smartShuffleBoost}%
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">Boost Potansiyeli</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-500" />
                            Blend Uyumu
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <span className={`text-3xl font-bold ${getScoreColor(algorithmResult.features2025.blendCompatibility)}`}>
                              {algorithmResult.features2025.blendCompatibility}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">Uyumluluk Skoru</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <PartyPopper className="h-4 w-4 text-pink-500" />
                            Jam Session
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <span className={`text-3xl font-bold ${getScoreColor(algorithmResult.features2025.jamSessionFit)}`}>
                              {algorithmResult.features2025.jamSessionFit}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">Uygunluk Skoru</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          AI Playlist Promptları
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Bu şarkı için uygun AI playlist açıklamaları
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {algorithmResult.features2025.aiPlaylistPrompts.map((prompt, i) => (
                            <div key={i} className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                              <p className="text-sm italic">"{prompt}"</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="min-h-[300px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">2025 özellikleri yükleniyor...</p>
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="strategy" className="space-y-4">
                {algorithmResult ? (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Megaphone className="h-4 w-4 text-blue-500" />
                          Pitching Önerileri
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="p-3 rounded-lg bg-muted/50 mb-3">
                              <p className="text-xs text-muted-foreground">Optimal Pitch Penceresi</p>
                              <p className="font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {algorithmResult.artistStrategy.pitchingRecommendations.optimalPitchWindow}
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-xs font-medium mb-2">Hedef Playlistler</p>
                              <div className="space-y-1">
                                {algorithmResult.artistStrategy.pitchingRecommendations.targetPlaylists.map((playlist, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <ListMusic className="h-3 w-3 text-green-500" />
                                    <span>{playlist}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium mb-2">Pitch Notları</p>
                            <div className="space-y-2">
                              {algorithmResult.artistStrategy.pitchingRecommendations.pitchNotes.map((note, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <Lightbulb className="h-3 w-3 text-yellow-500 mt-1 flex-shrink-0" />
                                  <span>{note}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Tag className="h-4 w-4 text-purple-500" />
                          Metadata Önerileri
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs font-medium mb-2">Mood Etiketleri</p>
                            <div className="flex flex-wrap gap-1">
                              {algorithmResult.artistStrategy.pitchingRecommendations.metadataSuggestions.moods.map((mood, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {mood}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium mb-2">Genre Etiketleri</p>
                            <div className="flex flex-wrap gap-1">
                              {algorithmResult.artistStrategy.pitchingRecommendations.metadataSuggestions.genres.map((genre, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {genre}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium mb-2">Kültür</p>
                            <div className="flex flex-wrap gap-1">
                              {algorithmResult.artistStrategy.pitchingRecommendations.metadataSuggestions.cultures.map((culture, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {culture}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium mb-2">Enstrümanlar</p>
                            <div className="flex flex-wrap gap-1">
                              {algorithmResult.artistStrategy.pitchingRecommendations.metadataSuggestions.instruments.map((instrument, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {instrument}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            Royalty Projeksiyonu
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Durum</span>
                              <Badge 
                                variant={algorithmResult.artistStrategy.royaltyProjection.currentStatus === 'above_threshold' ? 'default' : algorithmResult.artistStrategy.royaltyProjection.currentStatus === 'at_risk' ? 'secondary' : 'destructive'}
                              >
                                {getRoyaltyStatusLabel(algorithmResult.artistStrategy.royaltyProjection.currentStatus)}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Tahmini Yıllık Stream</span>
                              <span className="font-medium">
                                {formatNumber(algorithmResult.artistStrategy.royaltyProjection.estimatedAnnualStreams)}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Aylık Büyüme Gereksinimi</span>
                              <span className="font-medium">
                                %{algorithmResult.artistStrategy.royaltyProjection.monthlyGrowthNeeded}
                              </span>
                            </div>
                            
                            <Separator />
                            
                            <div>
                              <p className="text-xs font-medium mb-2">Stratejiler</p>
                              <div className="space-y-1">
                                {algorithmResult.artistStrategy.royaltyProjection.strategies.map((strategy, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <CheckCircle className="h-3 w-3 text-green-500 mt-0.5" />
                                    <span>{strategy}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-gray-500" />
                            Teknik Limitler
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Playlist Kapasitesi</span>
                              <span className="text-sm font-medium">
                                {algorithmResult.artistStrategy.technicalLimits.playlistCapacity}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">İndirme Limiti</span>
                              <span className="text-sm font-medium">
                                {algorithmResult.artistStrategy.technicalLimits.downloadLimits}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Klasör Senkronizasyonu</span>
                              {algorithmResult.artistStrategy.technicalLimits.folderSyncWarning ? (
                                <Badge variant="destructive" className="text-xs">Uyarı</Badge>
                              ) : (
                                <Badge variant="default" className="text-xs">OK</Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Kapak Uyumu</span>
                              {algorithmResult.artistStrategy.technicalLimits.coverArtCompliance ? (
                                <Badge variant="default" className="text-xs">Uygun</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">Güncelle</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <Card className="min-h-[300px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Target className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Strateji analizi yükleniyor...</p>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {!result && !analyzeTrack.isPending && (
        <Card className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Music className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-empty-title">Şarkı Analizi Başlatın</h3>
              <p className="text-muted-foreground text-sm mt-1" data-testid="text-empty-description">
                Spotify şarkı linkini veya ID'sini girerek<br />
                detaylı algoritma ve keşif analizi alın
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <Badge variant="outline" data-testid="badge-feature-1">BaRT Skoru</Badge>
              <Badge variant="outline" data-testid="badge-feature-2">Discovery Analizi</Badge>
              <Badge variant="outline" data-testid="badge-feature-3">Skip Rate</Badge>
              <Badge variant="outline" data-testid="badge-feature-4">2025 Özellikleri</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
