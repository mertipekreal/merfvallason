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
  Activity,
  ArrowRightLeft,
  Clock,
  TrendingUp,
  Eye,
  Music2,
  Lightbulb,
  BarChart3,
  Calendar
} from "lucide-react";
import { SiTiktok, SiSpotify } from "react-icons/si";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

interface BridgeResult {
  success: boolean;
  track: {
    id: string;
    name: string;
    artist: string;
    albumArt: string;
  };
  soundId: string;
  tiktokSeries: {
    totalViews: number;
    peakDate: string;
    peakViews: number;
    dataPoints: TimeSeriesPoint[];
  };
  spotifySeries: {
    totalStreams: number;
    peakDate: string;
    peakStreams: number;
    dataPoints: TimeSeriesPoint[];
  };
  bridgeAnalysis: {
    bridgeStrength: number;
    lagHours: number;
    lagDays: number;
    correlation: number;
    tiktokPeakDate: string;
    spotifyPeakDate: string;
    verdict: string;
    insights: string[];
  };
}

export default function TikTokBridge() {
  const { toast } = useToast();
  const [soundId, setSoundId] = useState("");
  const [trackInput, setTrackInput] = useState("");
  const [result, setResult] = useState<BridgeResult | null>(null);

  const analyzeBridge = useMutation({
    mutationFn: async (data: { soundId: string; trackInput: string }) => {
      const response = await apiRequest("POST", "/api/spotify/bridge", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult(data);
        toast({
          title: "Analiz Tamamlandı",
          description: `Köprü gücü: ${data.bridgeAnalysis.bridgeStrength}%`,
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
        description: error.message || "Köprü analizi yapılamadı",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!soundId.trim() || !trackInput.trim()) {
      toast({
        title: "Uyarı",
        description: "Lütfen hem TikTok ses ID hem de Spotify şarkı linkini girin",
        variant: "destructive",
      });
      return;
    }
    analyzeBridge.mutate({ soundId: soundId.trim(), trackInput: trackInput.trim() });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStrengthColor = (strength: number): string => {
    if (strength >= 80) return "text-green-500";
    if (strength >= 60) return "text-yellow-500";
    if (strength >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getStrengthBg = (strength: number): string => {
    if (strength >= 80) return "bg-green-500/10 border-green-500/20";
    if (strength >= 60) return "bg-yellow-500/10 border-yellow-500/20";
    if (strength >= 40) return "bg-orange-500/10 border-orange-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  const prepareChartData = () => {
    if (!result) return [];
    
    return result.tiktokSeries.dataPoints.map((point, i) => ({
      date: point.timestamp.split("-").slice(1).join("/"),
      tiktok: point.value,
      spotify: result.spotifySeries.dataPoints[i]?.value || 0,
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-r from-pink-500/10 to-green-500/10">
          <ArrowRightLeft className="h-6 w-6 text-pink-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">TikTok-Spotify Köprüsü</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            TikTok viral etkisinin Spotify'a yansımasını analiz edin
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Köprü Analizi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sound-id" className="flex items-center gap-2">
                <SiTiktok className="h-4 w-4" />
                TikTok Ses ID
              </Label>
              <Input
                id="sound-id"
                placeholder="TikTok ses ID'si..."
                value={soundId}
                onChange={(e) => setSoundId(e.target.value)}
                data-testid="input-sound-id"
              />
              <p className="text-xs text-muted-foreground">
                Örnek: 7123456789012345678
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="track-input" className="flex items-center gap-2">
                <SiSpotify className="h-4 w-4 text-green-500" />
                Spotify Şarkı
              </Label>
              <Input
                id="track-input"
                placeholder="Spotify şarkı linki veya ID..."
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                data-testid="input-track"
              />
            </div>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={analyzeBridge.isPending}
            className="w-full md:w-auto"
            data-testid="button-analyze-bridge"
          >
            {analyzeBridge.isPending ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Analiz Ediliyor...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Köprüyü Analiz Et
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center mx-auto mb-2">
                <SiTiktok className="h-8 w-8 text-white" />
              </div>
              <p className="font-medium text-sm">TikTok</p>
              <p className="text-xs text-muted-foreground" data-testid="text-sound-id">#{result.soundId}</p>
            </div>
            
            <div className="flex flex-col items-center">
              <ArrowRightLeft className="h-6 w-6 text-muted-foreground mb-1" />
              <Badge variant="outline" className="text-xs">
                {result.bridgeAnalysis.lagDays} gün
              </Badge>
            </div>
            
            <div className="text-center">
              {result.track.albumArt && (
                <img 
                  src={result.track.albumArt} 
                  alt={result.track.name}
                  className="w-16 h-16 rounded-full shadow-lg mx-auto mb-2"
                  data-testid="img-track-art"
                />
              )}
              <p className="font-medium text-sm" data-testid="text-track-name">{result.track.name}</p>
              <p className="text-xs text-muted-foreground">{result.track.artist}</p>
            </div>
          </div>

          <Card className={`border ${getStrengthBg(result.bridgeAnalysis.bridgeStrength)}`}>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className={`text-5xl font-bold ${getStrengthColor(result.bridgeAnalysis.bridgeStrength)}`} data-testid="text-bridge-strength">
                  {result.bridgeAnalysis.bridgeStrength}%
                </p>
                <p className="text-lg font-medium mt-2" data-testid="text-verdict">{result.bridgeAnalysis.verdict}</p>
                <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {result.bridgeAnalysis.lagHours} saat gecikme
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {(result.bridgeAnalysis.correlation * 100).toFixed(0)}% korelasyon
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Zaman Serisi Karşılaştırması
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareChartData()}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => formatNumber(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatNumber(value)}
                      labelStyle={{ color: "black" }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="tiktok" 
                      stroke="#ff0050" 
                      name="TikTok Views"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="spotify" 
                      stroke="#1DB954" 
                      name="Spotify Streams"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <SiTiktok className="h-4 w-4" />
                  TikTok Metrikleri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-pink-500" data-testid="text-tiktok-views">
                      {formatNumber(result.tiktokSeries.totalViews)}
                    </p>
                    <p className="text-xs text-muted-foreground">Toplam Görüntülenme</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-pink-500">
                      {formatNumber(result.tiktokSeries.peakViews)}
                    </p>
                    <p className="text-xs text-muted-foreground">Peak Görüntülenme</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Peak: {result.tiktokSeries.peakDate}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <SiSpotify className="h-4 w-4 text-green-500" />
                  Spotify Metrikleri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-500" data-testid="text-spotify-streams">
                      {formatNumber(result.spotifySeries.totalStreams)}
                    </p>
                    <p className="text-xs text-muted-foreground">Toplam Dinlenme</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500">
                      {formatNumber(result.spotifySeries.peakStreams)}
                    </p>
                    <p className="text-xs text-muted-foreground">Peak Dinlenme</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Peak: {result.spotifySeries.peakDate}
                </div>
              </CardContent>
            </Card>
          </div>

          {result.bridgeAnalysis.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  Köprü İçgörüleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.bridgeAnalysis.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" data-testid={`text-insight-${i}`}>
                      <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!result && !analyzeBridge.isPending && (
        <Card className="min-h-[400px] flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-pink-500/10 to-green-500/10 flex items-center justify-center">
              <ArrowRightLeft className="h-8 w-8 text-pink-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg" data-testid="text-empty-title">TikTok-Spotify Köprü Analizi</h3>
              <p className="text-muted-foreground text-sm mt-1" data-testid="text-empty-description">
                TikTok'ta viral olan bir sesin Spotify'daki<br />
                stream etkisini analiz edin
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              <Badge variant="outline" data-testid="badge-feature-1">Köprü Gücü</Badge>
              <Badge variant="outline" data-testid="badge-feature-2">Gecikme Analizi</Badge>
              <Badge variant="outline" data-testid="badge-feature-3">Korelasyon</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
