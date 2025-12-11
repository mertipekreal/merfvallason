import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  ListMusic, 
  Music,
  Activity,
  Zap,
  Heart,
  Gauge,
  Timer,
  Users,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight
} from "lucide-react";
import { SiSpotify } from "react-icons/si";

interface PlaylistFitResult {
  success: boolean;
  track: {
    id: string;
    name: string;
    artist: string;
    albumArt: string;
  };
  playlist: {
    id: string;
    name: string;
    owner: string;
    followers: number;
    trackCount: number;
    image: string;
  };
  trackFeatures: {
    energy: number;
    valence: number;
    danceability: number;
    tempo: number;
  };
  playlistProfile: {
    avgEnergy: number;
    avgValence: number;
    avgDanceability: number;
    avgTempo: number;
    avgAcousticness: number;
    avgInstrumentalness: number;
    trackCount: number;
    totalFollowers: number;
  };
  fitResult: {
    score: number;
    label: string;
    compatibility: {
      energy: number;
      valence: number;
      danceability: number;
      tempo: number;
    };
    suggestions: string[];
  };
}

export default function PlaylistFit() {
  const { toast } = useToast();
  const [trackInput, setTrackInput] = useState("");
  const [playlistInput, setPlaylistInput] = useState("");
  const [result, setResult] = useState<PlaylistFitResult | null>(null);

  const checkFit = useMutation({
    mutationFn: async (data: { trackInput: string; playlistInput: string }) => {
      const response = await apiRequest("POST", "/api/spotify/playlist-fit", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult(data);
        toast({
          title: "Analiz Tamamlandı",
          description: `Uyum skoru: ${data.fitResult.score}%`,
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
        description: error.message || "Playlist uyumu hesaplanamadı",
        variant: "destructive",
      });
    },
  });

  const handleCheck = () => {
    if (!trackInput.trim() || !playlistInput.trim()) {
      toast({
        title: "Uyarı",
        description: "Lütfen hem şarkı hem de playlist linkini girin",
        variant: "destructive",
      });
      return;
    }
    checkFit.mutate({ trackInput: trackInput.trim(), playlistInput: playlistInput.trim() });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBg = (score: number): string => {
    if (score >= 80) return "bg-green-500/10 border-green-500/20";
    if (score >= 60) return "bg-yellow-500/10 border-yellow-500/20";
    if (score >= 40) return "bg-orange-500/10 border-orange-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10">
          <ListMusic className="h-6 w-6 text-purple-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Playlist Uyumu</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Şarkının bir playlist'e ne kadar uygun olduğunu analiz edin
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SiSpotify className="h-4 w-4 text-green-500" />
            Uyum Analizi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="track-input">Şarkı</Label>
              <Input
                id="track-input"
                placeholder="Spotify şarkı linki veya ID..."
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                data-testid="input-track"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-input">Playlist</Label>
              <Input
                id="playlist-input"
                placeholder="Spotify playlist linki veya ID..."
                value={playlistInput}
                onChange={(e) => setPlaylistInput(e.target.value)}
                data-testid="input-playlist"
              />
            </div>
          </div>
          <Button 
            onClick={handleCheck} 
            disabled={checkFit.isPending}
            className="w-full md:w-auto"
            data-testid="button-check-fit"
          >
            {checkFit.isPending ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Analiz Ediliyor...
              </>
            ) : (
              <>
                <Gauge className="h-4 w-4 mr-2" />
                Uyumu Kontrol Et
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4 py-6">
            <div className="text-center">
              {result.track.albumArt && (
                <img 
                  src={result.track.albumArt} 
                  alt={result.track.name}
                  className="w-20 h-20 rounded-lg shadow-lg mx-auto mb-2"
                  data-testid="img-track-art"
                />
              )}
              <p className="font-medium text-sm" data-testid="text-track-name">{result.track.name}</p>
              <p className="text-xs text-muted-foreground">{result.track.artist}</p>
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            
            <div className="text-center">
              {result.playlist.image && (
                <img 
                  src={result.playlist.image} 
                  alt={result.playlist.name}
                  className="w-20 h-20 rounded-lg shadow-lg mx-auto mb-2"
                  data-testid="img-playlist-art"
                />
              )}
              <p className="font-medium text-sm" data-testid="text-playlist-name">{result.playlist.name}</p>
              <p className="text-xs text-muted-foreground">{result.playlist.owner}</p>
            </div>
          </div>

          <Card className={`border ${getScoreBg(result.fitResult.score)}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className={`text-6xl font-bold ${getScoreColor(result.fitResult.score)}`} data-testid="text-fit-score">
                  {result.fitResult.score}%
                </p>
                <Badge variant="outline" className="mt-2" data-testid="badge-fit-label">
                  {result.fitResult.label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Özellik Karşılaştırması
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { 
                    label: "Enerji", 
                    track: result.trackFeatures.energy, 
                    playlist: result.playlistProfile.avgEnergy,
                    compat: result.fitResult.compatibility.energy,
                    icon: Zap
                  },
                  { 
                    label: "Pozitiflik", 
                    track: result.trackFeatures.valence, 
                    playlist: result.playlistProfile.avgValence,
                    compat: result.fitResult.compatibility.valence,
                    icon: Heart
                  },
                  { 
                    label: "Dans", 
                    track: result.trackFeatures.danceability, 
                    playlist: result.playlistProfile.avgDanceability,
                    compat: result.fitResult.compatibility.danceability,
                    icon: Music
                  },
                  { 
                    label: "Tempo", 
                    track: result.trackFeatures.tempo / 200, 
                    playlist: result.playlistProfile.avgTempo / 200,
                    compat: result.fitResult.compatibility.tempo,
                    icon: Timer
                  },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        <item.icon className="h-3 w-3" />
                        {item.label}
                      </span>
                      <span className={getScoreColor(item.compat)}>
                        {item.compat}% uyum
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Şarkı</span>
                          <span>{Math.round(item.track * 100)}%</span>
                        </div>
                        <Progress value={item.track * 100} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Playlist</span>
                          <span>{Math.round(item.playlist * 100)}%</span>
                        </div>
                        <Progress value={item.playlist * 100} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Playlist Bilgisi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{result.playlist.trackCount}</p>
                      <p className="text-xs text-muted-foreground">Şarkı</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatNumber(result.playlist.followers)}</p>
                      <p className="text-xs text-muted-foreground">Takipçi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {result.fitResult.suggestions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Öneriler
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.fitResult.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-suggestion-${i}`}>
                          {result.fitResult.score >= 70 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          )}
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {!result && !checkFit.isPending && (
        <Card className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
              <ListMusic className="h-8 w-8 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-empty-title">Playlist Uyumu Analizi</h3>
              <p className="text-muted-foreground text-sm mt-1" data-testid="text-empty-description">
                Bir şarkının playlist'e ne kadar uygun olduğunu<br />
                ses özelliklerine göre analiz edin
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <Badge variant="outline" data-testid="badge-feature-1">Enerji Karşılaştırma</Badge>
              <Badge variant="outline" data-testid="badge-feature-2">Tempo Analizi</Badge>
              <Badge variant="outline" data-testid="badge-feature-3">Mood Uyumu</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
