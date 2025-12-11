import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Globe2, 
  Music2, 
  Video, 
  RefreshCcw, 
  Users,
  BarChart3,
  Zap,
  Database,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers
} from "lucide-react";
import { SiTiktok, SiInstagram, SiSpotify } from "react-icons/si";

interface BehaviorStatus {
  vista: {
    configured: boolean;
    lastSync: string | null;
    totalProfiles: number;
    totalEvents: number;
  };
  chartmetric: {
    configured: boolean;
    lastSync: string | null;
    totalArtists: number;
    totalEvents: number;
  };
  engine: {
    totalBehaviorEvents: number;
    socialEventsProcessed: number;
    streamingEventsProcessed: number;
    pendingSocialEvents: number;
    pendingStreamingEvents: number;
    lastProcessed: string | null;
  };
  healthy: boolean;
}

interface BehaviorSummary {
  entityId: string;
  entityName: string;
  period: string;
  totalEvents: number;
  avgIntensity: number;
  peakIntensity: number;
  socialContribution: number;
  streamingContribution: number;
  platformBreakdown: Record<string, number>;
  trendDirection: 'up' | 'down' | 'stable';
  topContent: Array<{
    contentId: string;
    platform: string;
    intensity: number;
    metrics: Record<string, number>;
  }>;
}

interface TurkeyVsGlobal {
  turkey: { events: number; avgIntensity: number };
  global: { events: number; avgIntensity: number };
}

interface Entity {
  id: string;
  type: string;
  name: string;
  description?: string;
  country?: string;
  genres?: string[];
  tags?: string[];
  createdAt: string;
}

interface TimelinePoint {
  timestamp: string;
  entityId: string;
  entityName: string;
  intensity: number;
  sourceType: 'social' | 'streaming';
  platform: string;
  rawMetrics: Record<string, number>;
}

export default function BehaviorDashboard() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [selectedRegion, setSelectedRegion] = useState<'turkey' | 'global' | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const { data: status, isLoading: statusLoading } = useQuery<BehaviorStatus>({
    queryKey: ['/api/behavior/status'],
    refetchInterval: 30000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<BehaviorSummary>({
    queryKey: ['/api/behavior/summary', selectedPeriod, selectedRegion, selectedPlatform],
    enabled: !!status,
  });

  const { data: turkeyVsGlobal } = useQuery<TurkeyVsGlobal>({
    queryKey: ['/api/behavior/turkey-vs-global'],
  });

  const { data: entities } = useQuery<Entity[]>({
    queryKey: ['/api/behavior/entities'],
  });

  const { data: timeline } = useQuery<TimelinePoint[]>({
    queryKey: ['/api/behavior/timeline', selectedRegion, selectedPlatform],
  });

  const syncVistaMutation = useMutation({
    mutationFn: (platform: string) => apiRequest('POST', '/api/behavior/sync/vista', { platform }),
    onSuccess: () => {
      toast({ title: "Vista Social sync başlatıldı" });
      queryClient.invalidateQueries({ queryKey: ['/api/behavior'] });
    },
    onError: () => {
      toast({ title: "Vista sync başarısız", variant: "destructive" });
    },
  });

  const syncChartmetricMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/behavior/sync/chartmetric'),
    onSuccess: () => {
      toast({ title: "Chartmetric sync başlatıldı" });
      queryClient.invalidateQueries({ queryKey: ['/api/behavior'] });
    },
    onError: () => {
      toast({ title: "Chartmetric sync başarısız", variant: "destructive" });
    },
  });

  const processEventsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/behavior/process', { limit: 100 }),
    onSuccess: (data: any) => {
      toast({ 
        title: "Event'ler işlendi", 
        description: `${data.total} event normalize edildi`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/behavior'] });
    },
    onError: () => {
      toast({ title: "Event processing başarısız", variant: "destructive" });
    },
  });

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'tiktok': return <SiTiktok className="w-4 h-4" />;
      case 'instagram': return <SiInstagram className="w-4 h-4" />;
      case 'spotify': return <SiSpotify className="w-4 h-4" />;
      case 'chartmetric': return <BarChart3 className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 80) return 'text-green-500 bg-green-500/10';
    if (intensity >= 60) return 'text-cyan-500 bg-cyan-500/10';
    if (intensity >= 40) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-muted-foreground bg-muted';
  };

  return (
    <div className="space-y-6" data-testid="behavior-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Behavior Layer</h1>
          <p className="text-muted-foreground">Birleşik davranış analitiği ve z-score normalizasyonu</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(v: any) => setSelectedPeriod(v)}>
            <SelectTrigger className="w-32" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Bugün</SelectItem>
              <SelectItem value="week">Bu Hafta</SelectItem>
              <SelectItem value="month">Bu Ay</SelectItem>
              <SelectItem value="all">Tümü</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedRegion} onValueChange={(v: any) => setSelectedRegion(v)}>
            <SelectTrigger className="w-32" data-testid="select-region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Bölgeler</SelectItem>
              <SelectItem value="turkey">Türkiye</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Entity</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-entities">
              {entities?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.vista?.totalProfiles || 0} profil senkronize
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Behavior Event</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-behavior-events">
              {status?.engine?.totalBehaviorEvents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {(status?.engine?.pendingSocialEvents || 0) + (status?.engine?.pendingStreamingEvents || 0)} beklemede
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Yoğunluk</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" data-testid="text-avg-intensity">
                {summary?.avgIntensity?.toFixed(1) || 50}
              </span>
              {summary?.trendDirection && getTrendIcon(summary.trendDirection)}
            </div>
            <Progress value={summary?.avgIntensity || 50} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Yoğunluk</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-peak-intensity">
              {summary?.peakIntensity?.toFixed(1) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Son {selectedPeriod === 'day' ? '24 saat' : selectedPeriod === 'week' ? '7 gün' : '30 gün'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="w-5 h-5" />
              Türkiye vs Global
            </CardTitle>
            <CardDescription>Bölgesel davranış karşılaştırması</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg border bg-gradient-to-br from-red-500/10 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-red-500/50 text-red-400">
                    Türkiye
                  </Badge>
                </div>
                <div className="text-3xl font-bold" data-testid="text-turkey-events">
                  {turkeyVsGlobal?.turkey?.events || 0}
                </div>
                <p className="text-sm text-muted-foreground">event</p>
                <div className="mt-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">
                    Ort. Yoğunluk: {turkeyVsGlobal?.turkey?.avgIntensity?.toFixed(1) || 0}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-500/10 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                    Global
                  </Badge>
                </div>
                <div className="text-3xl font-bold" data-testid="text-global-events">
                  {turkeyVsGlobal?.global?.events || 0}
                </div>
                <p className="text-sm text-muted-foreground">event</p>
                <div className="mt-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">
                    Ort. Yoğunluk: {turkeyVsGlobal?.global?.avgIntensity?.toFixed(1) || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Platform Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.platformBreakdown && Object.entries(summary.platformBreakdown).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(platform)}
                    <span className="capitalize">{platform}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {(!summary?.platformBreakdown || Object.keys(summary.platformBreakdown).length === 0) && (
                <p className="text-sm text-muted-foreground">Henüz platform verisi yok</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sync" data-testid="tab-sync">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Senkronizasyon
          </TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            <Clock className="w-4 h-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="entities" data-testid="tab-entities">
            <Users className="w-4 h-4 mr-2" />
            Entity'ler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Video className="w-5 h-5 text-pink-500" />
                  Vista Social
                </CardTitle>
                <CardDescription>TikTok & Instagram profil senkronizasyonu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {status?.vista?.configured ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {status?.vista?.configured ? 'API yapılandırılmış' : 'Mock mod aktif'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Profiller</p>
                    <p className="font-medium">{status?.vista?.totalProfiles || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Eventler</p>
                    <p className="font-medium">{status?.vista?.totalEvents || 0}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => syncVistaMutation.mutate('tiktok')}
                    disabled={syncVistaMutation.isPending}
                    data-testid="button-sync-tiktok"
                  >
                    <SiTiktok className="w-3 h-3 mr-1" />
                    TikTok
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => syncVistaMutation.mutate('instagram')}
                    disabled={syncVistaMutation.isPending}
                    data-testid="button-sync-instagram"
                  >
                    <SiInstagram className="w-3 h-3 mr-1" />
                    Instagram
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Chartmetric
                </CardTitle>
                <CardDescription>Chart & playlist takibi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {status?.chartmetric?.configured ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {status?.chartmetric?.configured ? 'API yapılandırılmış' : 'Mock mod aktif'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Sanatçılar</p>
                    <p className="font-medium">{status?.chartmetric?.totalArtists || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Eventler</p>
                    <p className="font-medium">{status?.chartmetric?.totalEvents || 0}</p>
                  </div>
                </div>
                <Separator />
                <Button 
                  size="sm" 
                  onClick={() => syncChartmetricMutation.mutate()}
                  disabled={syncChartmetricMutation.isPending}
                  data-testid="button-sync-chartmetric"
                >
                  <RefreshCcw className={`w-3 h-3 mr-1 ${syncChartmetricMutation.isPending ? 'animate-spin' : ''}`} />
                  Sanatçıları Senkronize Et
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5 text-cyan-500" />
                  Behavior Engine
                </CardTitle>
                <CardDescription>Z-score normalizasyonu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {status?.engine?.totalBehaviorEvents || 0} behavior event
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Social Beklemede</p>
                    <p className="font-medium">{status?.engine?.pendingSocialEvents || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Streaming Beklemede</p>
                    <p className="font-medium">{status?.engine?.pendingStreamingEvents || 0}</p>
                  </div>
                </div>
                <Separator />
                <Button 
                  size="sm" 
                  onClick={() => processEventsMutation.mutate()}
                  disabled={processEventsMutation.isPending}
                  data-testid="button-process-events"
                >
                  <Play className={`w-3 h-3 mr-1 ${processEventsMutation.isPending ? 'animate-spin' : ''}`} />
                  Event'leri İşle
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Behavior Timeline
              </CardTitle>
              <CardDescription>Normalize edilmiş davranış akışı</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {timeline && timeline.length > 0 ? timeline.map((point, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-4 p-3 rounded-lg border hover-elevate"
                      data-testid={`timeline-item-${idx}`}
                    >
                      <div className={`p-2 rounded-full ${getIntensityColor(point.intensity)}`}>
                        {getPlatformIcon(point.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{point.entityName}</span>
                          <Badge variant="outline" className="shrink-0">
                            {point.sourceType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(point.timestamp).toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{point.intensity.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">yoğunluk</p>
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mb-2 opacity-50" />
                      <p>Henüz timeline verisi yok</p>
                      <p className="text-sm">Veri senkronize edip event'leri işleyin</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Entity'ler
              </CardTitle>
              <CardDescription>Çoklu platform kimlik yönetimi</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {entities && entities.length > 0 ? entities.map((entity) => (
                    <div 
                      key={entity.id} 
                      className="flex items-center gap-4 p-3 rounded-lg border hover-elevate"
                      data-testid={`entity-item-${entity.id}`}
                    >
                      <div className="p-2 rounded-full bg-primary/10">
                        <Music2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{entity.name}</span>
                          <Badge variant="outline" className="capitalize">
                            {entity.type}
                          </Badge>
                          {entity.country && (
                            <Badge variant="secondary">{entity.country}</Badge>
                          )}
                        </div>
                        {entity.genres && entity.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entity.genres.slice(0, 3).map((genre, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {new Date(entity.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mb-2 opacity-50" />
                      <p>Henüz entity yok</p>
                      <p className="text-sm">Vista veya Chartmetric ile senkronize edin</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
