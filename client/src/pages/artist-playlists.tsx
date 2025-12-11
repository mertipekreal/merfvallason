import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Music,
  Activity,
  Zap,
  Heart,
  Timer,
  ListMusic,
  Target,
  TrendingUp,
  Clock,
  Lightbulb,
  BarChart3,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  SkipForward,
  Brain,
  Crosshair,
  Radio,
  Sun,
  Moon,
  Car,
  Headphones,
  Mic,
  Calendar,
  Flame,
  Eye,
  Share2,
  Instagram,
  Youtube,
} from "lucide-react";
import { SiSpotify, SiTiktok } from "react-icons/si";

interface OpenerTrack {
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

interface AlgorithmicPlaylist {
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
  openerTracks?: OpenerTrack[];
  sequencingStrategy?: string;
  algorithmicAdvantages?: string[];
}

interface DeepAnalysis {
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

interface ApifyData {
  topCities?: Array<{ city: string; country: string; listeners: number }>;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    wikipedia?: string;
  };
  featuredPlaylists?: Array<{ name: string; followers: number; url?: string }>;
  relatedArtists?: Array<{ name: string; id: string }>;
  albums?: Array<{
    id: string;
    name: string;
    releaseDate: string;
    totalTracks: number;
    type: 'album' | 'single' | 'compilation';
  }>;
  scrapedAt?: string;
}

interface ArtistPlaylistsResult {
  success: boolean;
  dataSource?: 'spotify' | 'spotify+apify';
  artist: {
    id: string;
    name: string;
    popularity: number;
    followers: number;
    genres: string[];
    monthlyListeners?: number;
    verified?: boolean;
    biography?: string;
    imageUrl?: string;
  };
  soundProfile: {
    avgEnergy: number;
    avgValence: number;
    avgDanceability: number;
    avgTempo: number;
    avgAcousticness: number;
    avgInstrumentalness: number;
    dominantMood: string;
    genres: string[];
  };
  topTracks: Array<{
    id: string;
    name: string;
    albumArt: string;
    popularity: number;
    energy: number;
    valence: number;
    danceability: number;
    tempo: number;
    playCount?: number;
  }>;
  algorithmicPlaylists: AlgorithmicPlaylist[];
  deepAnalysis: DeepAnalysis;
  apifyData?: ApifyData;
}

interface SearchArtist {
  id: string;
  name: string;
  popularity: number;
  followers: number;
  genres: string[];
}

export default function ArtistPlaylists() {
  const { toast } = useToast();
  const [artistInput, setArtistInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<ArtistPlaylistsResult | null>(null);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [useApify, setUseApify] = useState(false);

  const searchArtists = useQuery<{ success: boolean; artists: SearchArtist[] }>({
    queryKey: ['/api/spotify/search-artist', searchQuery],
    enabled: searchQuery.length >= 2,
  });

  const generatePlaylists = useMutation({
    mutationFn: async (data: { artistInput: string; useApify: boolean }) => {
      const response = await apiRequest("POST", "/api/spotify/artist-playlists", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult(data);
        setSearchQuery("");
        toast({
          title: "Analiz Tamamlandı",
          description: `${data.algorithmicPlaylists.length} playlist önerisi oluşturuldu`,
        });
      } else {
        toast({
          title: "Hata",
          description: data.error || "Playlist önerileri oluşturulamadı",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Sanatçı analizi yapılamadı",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!artistInput.trim()) {
      toast({
        title: "Uyarı",
        description: "Lütfen bir sanatçı adı veya Spotify linki girin",
        variant: "destructive",
      });
      return;
    }
    generatePlaylists.mutate({ artistInput: artistInput.trim(), useApify });
  };

  const selectArtist = (artist: SearchArtist) => {
    setArtistInput(artist.id);
    setSearchQuery("");
    generatePlaylists.mutate({ artistInput: artist.id, useApify });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-cyan-500";
    if (score >= 40) return "text-yellow-500";
    return "text-orange-500";
  };

  const getStreamPotentialColor = (potential: string): string => {
    switch (potential) {
      case 'çok_yüksek': return "bg-green-500/20 text-green-400 border-green-500/30";
      case 'yüksek': return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case 'orta': return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    }
  };

  const getCurationTypeLabel = (type: string): string => {
    switch (type) {
      case 'fan_account': return "Fan Hesabı";
      case 'editorial': return "Editöryel";
      case 'mood': return "Mood";
      case 'activity': return "Aktivite";
      case 'discovery': return "Keşif";
      case 'seasonal': return "Mevsimsel";
      case 'contextual': return "Bağlamsal";
      default: return type;
    }
  };

  const getCurationTypeIcon = (type: string) => {
    switch (type) {
      case 'fan_account': return Users;
      case 'editorial': return Sparkles;
      case 'mood': return Heart;
      case 'activity': return Activity;
      case 'discovery': return TrendingUp;
      case 'seasonal': return Sun;
      case 'contextual': return Moon;
      default: return ListMusic;
    }
  };

  const getPlaylistIcon = (id: string) => {
    const icons: Record<string, any> = {
      'workout': Activity,
      'road_trip': Car,
      'late_night': Moon,
      'summer': Sun,
      'rainy_day': Radio,
      'romantic': Heart,
      'focus': Headphones,
      'karaoke': Mic,
      'throwback': Calendar,
      'acoustic': Music,
      'vibes': Flame,
    };
    return icons[id] || ListMusic;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-500/10">
          <ListMusic className="h-6 w-6 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Algoritmik Playlist Önerileri</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Sanatçı verilerine göre en uygun playlist yapılarını keşfedin
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SiSpotify className="h-4 w-4 text-green-500" />
            Sanatçı Analizi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="artist-input">Sanatçı</Label>
            <div className="relative">
              <Input
                id="artist-input"
                placeholder="Sanatçı adı veya Spotify linki..."
                value={artistInput}
                onChange={(e) => {
                  setArtistInput(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                data-testid="input-artist"
              />
              {searchQuery.length >= 2 && searchArtists.data?.artists && searchArtists.data.artists.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchArtists.data.artists.map((artist) => (
                    <button
                      key={artist.id}
                      onClick={() => selectArtist(artist)}
                      className="w-full px-4 py-2 text-left hover-elevate flex items-center justify-between"
                      data-testid={`button-select-artist-${artist.id}`}
                    >
                      <div>
                        <p className="font-medium">{artist.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(artist.followers)} takipçi
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {artist.genres.slice(0, 2).map((genre, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Button 
              onClick={handleAnalyze} 
              disabled={generatePlaylists.isPending}
              className="w-full md:w-auto"
              data-testid="button-analyze-artist"
            >
              {generatePlaylists.isPending ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Playlist Önerileri Oluştur
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-2">
              <Switch
                id="apify-mode"
                checked={useApify}
                onCheckedChange={setUseApify}
                data-testid="switch-apify-mode"
              />
              <Label htmlFor="apify-mode" className="text-sm cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-cyan-500" />
                  Zenginleştirilmiş Veri
                </span>
              </Label>
            </div>
          </div>
          
          {useApify && (
            <p className="text-xs text-muted-foreground">
              Aktif: Gerçek aylık dinleyiciler, şehir dağılımları, oynatma sayıları ve daha fazlası alınacak.
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Tabs defaultValue="playlists" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="playlists" data-testid="tab-playlists">
              <ListMusic className="h-4 w-4 mr-2" />
              Playlistler
            </TabsTrigger>
            <TabsTrigger value="openers" data-testid="tab-openers">
              <Play className="h-4 w-4 mr-2" />
              Açılış Şarkıları
            </TabsTrigger>
            <TabsTrigger value="analysis" data-testid="tab-analysis">
              <Brain className="h-4 w-4 mr-2" />
              Derin Analiz
            </TabsTrigger>
          </TabsList>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Sanatçı Profili: {result.artist.name}
                {result.dataSource === 'spotify+apify' && (
                  <Badge variant="outline" className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Zenginleştirilmiş
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  {(result.artist.imageUrl || result.topTracks[0]?.albumArt) && (
                    <img 
                      src={result.artist.imageUrl || result.topTracks[0].albumArt} 
                      alt={result.artist.name}
                      className="w-20 h-20 rounded-lg shadow-lg"
                      data-testid="img-artist-art"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-xl flex items-center gap-2" data-testid="text-artist-name">
                      {result.artist.name}
                      {result.artist.verified && (
                        <Badge variant="secondary" className="text-xs">Doğrulanmış</Badge>
                      )}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {formatNumber(result.artist.followers)} takipçi
                      {result.artist.monthlyListeners && (
                        <span className="ml-2 text-cyan-500">
                          {formatNumber(result.artist.monthlyListeners)} aylık dinleyici
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {result.artist.genres.slice(0, 3).map((genre, i) => (
                        <Badge key={i} variant="outline" className="text-xs" data-testid={`badge-genre-${i}`}>
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold text-cyan-500" data-testid="text-popularity">
                      {result.artist.popularity}
                    </p>
                    <p className="text-xs text-muted-foreground">Popülarite</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-2xl font-bold" data-testid="text-mood">
                      {result.soundProfile.dominantMood.split('&')[0].trim()}
                    </p>
                    <p className="text-xs text-muted-foreground">Baskın Mood</p>
                  </div>
                </div>
              </div>
              
              {result.apifyData?.topCities && result.apifyData.topCities.length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-muted/20 border border-muted">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-cyan-500" />
                    En Çok Dinleyen Şehirler
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {result.apifyData.topCities.slice(0, 5).map((city, i) => (
                      <div key={i} className="text-center p-2 rounded bg-muted/30">
                        <p className="font-medium text-sm">{city.city}</p>
                        <p className="text-xs text-muted-foreground">{city.country}</p>
                        <p className="text-xs text-cyan-500">{formatNumber(city.listeners)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label: "Enerji", value: result.soundProfile.avgEnergy, icon: Zap, color: "text-yellow-500" },
                  { label: "Pozitiflik", value: result.soundProfile.avgValence, icon: Heart, color: "text-pink-500" },
                  { label: "Dans", value: result.soundProfile.avgDanceability, icon: Music, color: "text-purple-500" },
                  { label: "Akustik", value: result.soundProfile.avgAcousticness, icon: Activity, color: "text-cyan-500" },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm">
                        <item.icon className={`h-3 w-3 ${item.color}`} />
                        {item.label}
                      </span>
                      <span className="text-sm font-medium">{Math.round(item.value * 100)}%</span>
                    </div>
                    <Progress value={item.value * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <TabsContent value="playlists" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ListMusic className="h-5 w-5 text-green-500" />
                Önerilen Algoritmik Playlistler
              </h2>
              <Badge variant="outline">{result.algorithmicPlaylists.length} öneri</Badge>
            </div>
            
            <div className="space-y-4">
              {result.algorithmicPlaylists.map((playlist, index) => {
                const isExpanded = expandedPlaylist === playlist.id;
                const CurationIcon = getCurationTypeIcon(playlist.curationType);
                const PlaylistIcon = getPlaylistIcon(playlist.id);
                
                return (
                  <Card key={playlist.id} className="overflow-hidden" data-testid={`card-playlist-${index}`}>
                    <button
                      onClick={() => setExpandedPlaylist(isExpanded ? null : playlist.id)}
                      className="w-full text-left"
                      data-testid={`button-expand-playlist-${index}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                              <PlaylistIcon className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                                {playlist.nameTr}
                                <Badge variant="secondary" className="text-xs">
                                  {getCurationTypeLabel(playlist.curationType)}
                                </Badge>
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                {playlist.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${getScoreColor(playlist.score)}`}>
                                {playlist.score}
                              </p>
                              <p className="text-xs text-muted-foreground">Uyum Skoru</p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </button>

                    {isExpanded && (
                      <CardContent className="border-t pt-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <Target className="h-4 w-4 mx-auto mb-1 text-cyan-500" />
                            <p className="text-sm font-medium">{playlist.trackCountSuggestion}</p>
                            <p className="text-xs text-muted-foreground">Şarkı Sayısı</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <Clock className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                            <p className="text-sm font-medium">{playlist.optimalDuration}</p>
                            <p className="text-xs text-muted-foreground">Süre</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <Users className="h-4 w-4 mx-auto mb-1 text-green-500" />
                            <p className="text-sm font-medium line-clamp-1">{playlist.targetAudience.split(' ')[0]}</p>
                            <p className="text-xs text-muted-foreground">Hedef Kitle</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/30">
                            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStreamPotentialColor(playlist.streamPotential)}`}
                            >
                              {playlist.streamPotential.replace('_', ' ')}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">Stream Potansiyeli</p>
                          </div>
                        </div>

                        {playlist.openerTracks && playlist.openerTracks.length > 0 && (
                          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-green-500">
                              <Play className="h-4 w-4" />
                              Önerilen Açılış Şarkıları
                            </h4>
                            <div className="space-y-2">
                              {playlist.openerTracks.map((opener, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-card/50">
                                  {opener.albumArt && (
                                    <img src={opener.albumArt} alt={opener.trackName} className="w-10 h-10 rounded" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{opener.trackName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Açılış Skoru: <span className={getScoreColor(opener.openerScore)}>{opener.openerScore}</span>
                                    </p>
                                  </div>
                                  <div className="text-right text-xs">
                                    <p className="text-green-500">Hook: {opener.impactMetrics.hookPotential}%</p>
                                    <p className="text-cyan-500">Tutma: {opener.impactMetrics.retentionPrediction}%</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {playlist.sequencingStrategy && (
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <p className="text-sm flex items-center gap-2">
                              <SkipForward className="h-4 w-4 text-purple-500" />
                              <span className="font-medium">Sıralama Stratejisi:</span>
                              <span className="text-muted-foreground">{playlist.sequencingStrategy}</span>
                            </p>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            Hedef Ses Özellikleri
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: "Enerji", data: playlist.audioTargets.energy },
                              { label: "Pozitiflik", data: playlist.audioTargets.valence },
                              { label: "Dans", data: playlist.audioTargets.danceability },
                              { label: "Tempo", data: playlist.audioTargets.tempo, isTempo: true },
                            ].map((target, i) => (
                              <div key={i} className="text-xs space-y-1">
                                <p className="font-medium">{target.label}</p>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Min: {target.isTempo ? Math.round(target.data.min) : Math.round(target.data.min * 100)}%</span>
                                  <span>Max: {target.isTempo ? Math.round(target.data.max) : Math.round(target.data.max * 100)}%</span>
                                </div>
                                <p className="text-cyan-500">
                                  Optimal: {target.isTempo ? Math.round(target.data.optimal) : Math.round(target.data.optimal * 100)}{target.isTempo ? ' BPM' : '%'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Lightbulb className="h-3 w-3 text-yellow-500" />
                              Kürasyon İpuçları
                            </h4>
                            <ul className="space-y-1">
                              {playlist.keyInsights.map((insight, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-cyan-500 mt-1">•</span>
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {playlist.algorithmicAdvantages && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-green-500" />
                                Algoritma Avantajları
                              </h4>
                              <ul className="space-y-1">
                                {playlist.algorithmicAdvantages.map((adv, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    {adv}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            <strong>Potansiyel Erişim:</strong> {playlist.potentialReach}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="openers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4 text-green-500" />
                  Açılış Şarkısı Önerileri
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Bu şarkılarla playlist açarsanız dinleyici tutma oranı artar
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.topTracks.map((track, i) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center gap-4">
                      {track.albumArt && (
                        <img src={track.albumArt} alt={track.name} className="w-16 h-16 rounded-lg shadow" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{track.name}</h4>
                        <p className="text-sm text-muted-foreground">Popülarite: {track.popularity}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-lg font-bold">
                          {Math.round(track.popularity * 0.8 + track.energy * 10 + track.danceability * 10)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Açılış Skoru</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded bg-card">
                        <p className="text-lg font-bold text-yellow-500">{Math.round(track.energy * 100)}%</p>
                        <p className="text-xs text-muted-foreground">Enerji</p>
                      </div>
                      <div className="p-2 rounded bg-card">
                        <p className="text-lg font-bold text-pink-500">{Math.round(track.valence * 100)}%</p>
                        <p className="text-xs text-muted-foreground">Pozitiflik</p>
                      </div>
                      <div className="p-2 rounded bg-card">
                        <p className="text-lg font-bold text-purple-500">{Math.round(track.danceability * 100)}%</p>
                        <p className="text-xs text-muted-foreground">Dans</p>
                      </div>
                      <div className="p-2 rounded bg-card">
                        <p className="text-lg font-bold text-cyan-500">{track.tempo}</p>
                        <p className="text-xs text-muted-foreground">BPM</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {track.energy > 0.7 && <Badge variant="secondary">Yüksek Enerji</Badge>}
                      {track.danceability > 0.7 && <Badge variant="secondary">Dans Edilebilir</Badge>}
                      {track.valence > 0.6 && <Badge variant="secondary">Pozitif</Badge>}
                      {track.popularity > 60 && <Badge variant="secondary">Popüler</Badge>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {result.deepAnalysis && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      Sanatçı DNA'sı
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/30">
                        <h4 className="font-medium text-sm mb-2">Seslik İmza</h4>
                        <p className="text-muted-foreground">{result.deepAnalysis.artistDNA.sonicalSignature}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <h4 className="font-medium text-sm mb-2">Enerji Profili</h4>
                        <p className="text-muted-foreground">{result.deepAnalysis.artistDNA.energyProfile}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <h4 className="font-medium text-sm mb-2">Tempo Karakteri</h4>
                        <p className="text-muted-foreground">{result.deepAnalysis.artistDNA.tempoCharacter}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/30">
                        <h4 className="font-medium text-sm mb-2">Prodüksiyon Tarzı</h4>
                        <p className="text-muted-foreground">{result.deepAnalysis.artistDNA.productionStyle}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Crosshair className="h-4 w-4 text-cyan-500" />
                      Pazar Pozisyonu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Rekabet Avantajları</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.deepAnalysis.marketPosition.competitiveEdge.map((edge, i) => (
                            <Badge key={i} variant="outline" className="text-green-500 border-green-500/30">
                              {edge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2">Crossover Potansiyeli</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.deepAnalysis.marketPosition.crossoverAppeal.map((appeal, i) => (
                            <Badge key={i} variant="outline">
                              {appeal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <p className="text-sm">
                        <span className="font-medium">Playlist Potansiyeli:</span>{" "}
                        <span className="text-cyan-500">{result.deepAnalysis.marketPosition.playlistPotential}</span>
                      </p>
                      <p className="text-sm mt-1">
                        <span className="font-medium">Fan Tabanı:</span>{" "}
                        <span className="text-muted-foreground">{result.deepAnalysis.marketPosition.fanbaseType}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Radio className="h-4 w-4 text-green-500" />
                      Streaming Stratejisi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Peak Dinleme Saatleri
                        </h4>
                        <ul className="space-y-1">
                          {result.deepAnalysis.streamingStrategy.peakListeningHours.map((hour, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="text-green-500">•</span>
                              {hour}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Hedef Playlistler
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {result.deepAnalysis.streamingStrategy.playlistTargets.map((target, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {target}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm font-medium mb-2">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        İdeal Yayın Günü: <span className="text-green-500">{result.deepAnalysis.streamingStrategy.idealReleaseDay}</span>
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3 text-yellow-500" />
                        Algoritma İpuçları
                      </h4>
                      <ul className="space-y-1">
                        {result.deepAnalysis.streamingStrategy.algorithmTips.map((tip, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-yellow-500 mt-1">→</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-pink-500" />
                      İçerik Önerileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <SiTiktok className="h-6 w-6 mx-auto mb-2" />
                        <p className={`text-2xl font-bold ${getScoreColor(result.deepAnalysis.contentRecommendations.tiktokPotential)}`}>
                          {Math.round(result.deepAnalysis.contentRecommendations.tiktokPotential)}
                        </p>
                        <p className="text-xs text-muted-foreground">TikTok Potansiyeli</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Instagram className="h-6 w-6 mx-auto mb-2" />
                        <p className={`text-2xl font-bold ${getScoreColor(result.deepAnalysis.contentRecommendations.instagramReelsFit)}`}>
                          {Math.round(result.deepAnalysis.contentRecommendations.instagramReelsFit)}
                        </p>
                        <p className="text-xs text-muted-foreground">Instagram Reels</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <Youtube className="h-6 w-6 mx-auto mb-2" />
                        <p className={`text-2xl font-bold ${getScoreColor(result.deepAnalysis.contentRecommendations.youtubeShortsFit)}`}>
                          {Math.round(result.deepAnalysis.contentRecommendations.youtubeShortsFit)}
                        </p>
                        <p className="text-xs text-muted-foreground">YouTube Shorts</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
                      <h4 className="font-medium text-sm mb-2">Önerilen Klip Süreleri</h4>
                      <div className="flex gap-2">
                        {result.deepAnalysis.contentRecommendations.suggestedClipDurations.map((dur, i) => (
                          <Badge key={i} variant="secondary">
                            {dur} saniye
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <Flame className="h-3 w-3 text-orange-500" />
                        Viral Hook Potansiyelleri
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.deepAnalysis.contentRecommendations.viralHooks.map((hook, i) => (
                          <Badge key={i} variant="outline" className="text-orange-500 border-orange-500/30">
                            {hook}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!result && !generatePlaylists.isPending && (
        <Card className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <ListMusic className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-empty-title">Algoritmik Playlist Önerileri</h3>
              <p className="text-muted-foreground text-sm mt-1" data-testid="text-empty-description">
                Bir sanatçının ses profiline göre<br />
                en uygun playlist yapılarını keşfedin
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <Badge variant="outline" data-testid="badge-feature-1">15+ Playlist Türü</Badge>
              <Badge variant="outline" data-testid="badge-feature-2">Açılış Şarkısı Analizi</Badge>
              <Badge variant="outline" data-testid="badge-feature-3">Derin Analiz</Badge>
              <Badge variant="outline" data-testid="badge-feature-4">İçerik Önerileri</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
