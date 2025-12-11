import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Database, 
  Video, 
  Brain, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TrendingUp,
  Loader2
} from "lucide-react";
import { SiTiktok, SiInstagram } from "react-icons/si";

interface CollectionJob {
  id: string;
  platform: string;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  targetCount: number;
  collectedCount: number;
  successCount: number;
  errorCount: number;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  errors?: string[];
}

interface BulkJobsResponse {
  success: boolean;
  queueEnabled: boolean;
  jobs: CollectionJob[];
}

interface IngestionProgress {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  total: number;
  imported: number;
  errors: string[];
  startedAt?: string;
  completedAt?: string;
}

export default function BulkDataCollectionPage() {
  const { toast } = useToast();
  
  const [tiktokTarget, setTiktokTarget] = useState(10000);
  const [instagramTarget, setInstagramTarget] = useState(10000);
  const [dreamTarget, setDreamTarget] = useState(15000);

  const { data: dreamProgress, refetch: refetchDreamProgress } = useQuery<IngestionProgress>({
    queryKey: ['/api/dreambank/progress'],
    refetchInterval: 3000,
  });

  const { data: videoStats } = useQuery<{
    total: number;
    tiktok: number;
    instagram: number;
    withEmbeddings: number;
    avgEngagement: number;
  }>({
    queryKey: ['/api/v2/videos/stats'],
  });

  const { data: dreamStats } = useQuery<{
    total: number;
    dreambank: number;
    user: number;
  }>({
    queryKey: ['/api/dreambank/stats'],
  });

  const { data: bulkJobsData } = useQuery<BulkJobsResponse>({
    queryKey: ['/api/bulk/jobs'],
    refetchInterval: 5000,
  });

  const activeJobs = bulkJobsData?.jobs || [];

  const startTikTokMutation = useMutation({
    mutationFn: async (count: number) => {
      return apiRequest('POST', '/api/bulk/tiktok/start', { targetCount: count });
    },
    onSuccess: () => {
      toast({ title: "TikTok veri toplama başlatıldı" });
      queryClient.invalidateQueries({ queryKey: ['/api/bulk/jobs'] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const startInstagramMutation = useMutation({
    mutationFn: async (count: number) => {
      return apiRequest('POST', '/api/bulk/instagram/start', { targetCount: count });
    },
    onSuccess: () => {
      toast({ title: "Instagram veri toplama başlatıldı" });
      queryClient.invalidateQueries({ queryKey: ['/api/bulk/jobs'] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const startDreamMutation = useMutation({
    mutationFn: async (count: number) => {
      return apiRequest('POST', '/api/bulk/dreambank/start', { targetCount: count, batchSize: 200 });
    },
    onSuccess: () => {
      toast({ title: "DreamBank veri toplama başlatıldı (veritabanında kaydedildi)" });
      refetchDreamProgress();
      queryClient.invalidateQueries({ queryKey: ['/api/bulk/jobs'] });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Pause className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      running: 'bg-primary/20 text-primary',
      completed: 'bg-green-500/20 text-green-500',
      failed: 'bg-red-500/20 text-red-500',
      error: 'bg-red-500/20 text-red-500',
      cancelled: 'bg-orange-500/20 text-orange-500',
      pending: 'bg-muted text-muted-foreground',
      idle: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      running: 'Çalışıyor',
      completed: 'Tamamlandı',
      failed: 'Başarısız',
      error: 'Hata',
      cancelled: 'İptal Edildi',
      pending: 'Bekliyor',
      idle: 'Boşta',
    };
    return (
      <Badge className={variants[status] || variants.pending}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Toplu Veri Toplama Merkezi
          </h1>
          <p className="text-muted-foreground mt-1">
            TikTok, Instagram ve DreamBank'ten büyük miktarda veri toplayın
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/bulk/jobs'] });
            queryClient.invalidateQueries({ queryKey: ['/api/v2/videos/stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/dreambank/stats'] });
            refetchDreamProgress();
          }}
          data-testid="button-refresh-all"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Video className="h-4 w-4" />
              Toplam Video
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-videos">
              {videoStats?.total?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              TikTok: {videoStats?.tiktok || 0} | Instagram: {videoStats?.instagram || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Toplam Rüya
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-dreams">
              {dreamStats?.total?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              DreamBank: {dreamStats?.dreambank || 0} | Kullanıcı: {dreamStats?.user || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Ortalama Etkileşim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-engagement">
              {videoStats?.avgEngagement?.toFixed(2) || 0}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Video etkileşim oranı
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Embedding'li
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-with-embeddings">
              {videoStats?.withEmbeddings?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              İşlenmiş video sayısı
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tiktok" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tiktok" className="flex items-center gap-2" data-testid="tab-tiktok">
            <SiTiktok className="h-4 w-4" />
            TikTok
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex items-center gap-2" data-testid="tab-instagram">
            <SiInstagram className="h-4 w-4" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="dreambank" className="flex items-center gap-2" data-testid="tab-dreambank">
            <Brain className="h-4 w-4" />
            DreamBank
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tiktok">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiTiktok className="h-5 w-5" />
                TikTok Video Toplama
              </CardTitle>
              <CardDescription>
                Türkiye ve global hashtag'lerden TikTok videoları toplayın. 
                %70 Türkiye, %30 global dağılım uygulanır.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="tiktok-count">Hedef Video Sayısı</Label>
                  <Input
                    id="tiktok-count"
                    type="number"
                    value={tiktokTarget}
                    onChange={(e) => setTiktokTarget(parseInt(e.target.value) || 0)}
                    min={100}
                    max={50000}
                    data-testid="input-tiktok-count"
                  />
                </div>
                <Button 
                  onClick={() => startTikTokMutation.mutate(tiktokTarget)}
                  disabled={startTikTokMutation.isPending}
                  data-testid="button-start-tiktok"
                >
                  {startTikTokMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Toplamayı Başlat
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="font-medium mb-1">Türkiye Hashtag'leri</div>
                  <div className="text-muted-foreground text-xs">
                    #keşfet, #türkiye, #istanbul, #fyptr, #turkiye
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="font-medium mb-1">Global Hashtag'ler</div>
                  <div className="text-muted-foreground text-xs">
                    #fyp, #foryou, #viral, #trending, #explore
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instagram">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SiInstagram className="h-5 w-5" />
                Instagram Video Toplama
              </CardTitle>
              <CardDescription>
                Türkiye ve global hashtag'lerden Instagram reels ve videoları toplayın.
                %70 Türkiye, %30 global dağılım uygulanır.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="instagram-count">Hedef Video Sayısı</Label>
                  <Input
                    id="instagram-count"
                    type="number"
                    value={instagramTarget}
                    onChange={(e) => setInstagramTarget(parseInt(e.target.value) || 0)}
                    min={100}
                    max={50000}
                    data-testid="input-instagram-count"
                  />
                </div>
                <Button 
                  onClick={() => startInstagramMutation.mutate(instagramTarget)}
                  disabled={startInstagramMutation.isPending}
                  data-testid="button-start-instagram"
                >
                  {startInstagramMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Toplamayı Başlat
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="font-medium mb-1">Türkiye Hashtag'leri</div>
                  <div className="text-muted-foreground text-xs">
                    #türkiye, #istanbul, #keşfet, #turkey, #turkiye
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="font-medium mb-1">Global Hashtag'ler</div>
                  <div className="text-muted-foreground text-xs">
                    #explore, #viral, #trending, #reels, #explorepage
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dreambank">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                DreamBank Rüya Toplama
              </CardTitle>
              <CardDescription>
                Hugging Face üzerindeki DreamBank araştırma veri setinden rüyalar içe aktarın.
                Hall-Van de Castle psikolojik kodlama sistemi ile zenginleştirilmiş.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="dream-count">Hedef Rüya Sayısı</Label>
                  <Input
                    id="dream-count"
                    type="number"
                    value={dreamTarget}
                    onChange={(e) => setDreamTarget(parseInt(e.target.value) || 0)}
                    min={100}
                    max={28000}
                    data-testid="input-dream-count"
                  />
                </div>
                <Button 
                  onClick={() => startDreamMutation.mutate(dreamTarget)}
                  disabled={startDreamMutation.isPending || dreamProgress?.status === 'running'}
                  data-testid="button-start-dreambank"
                >
                  {startDreamMutation.isPending || dreamProgress?.status === 'running' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  İçe Aktarmayı Başlat
                </Button>
              </div>

              {dreamProgress && dreamProgress.status !== 'idle' && (
                <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(dreamProgress.status)}
                      <span className="font-medium">DreamBank İçe Aktarma</span>
                    </div>
                    {getStatusBadge(dreamProgress.status)}
                  </div>
                  <Progress 
                    value={(dreamProgress.progress / dreamProgress.total) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>İşlenen: {dreamProgress.progress?.toLocaleString()}</span>
                    <span>İçe Aktarılan: {dreamProgress.imported?.toLocaleString()}</span>
                    <span>Toplam: {dreamProgress.total?.toLocaleString()}</span>
                  </div>
                  {dreamProgress.errors && dreamProgress.errors.length > 0 && (
                    <div className="text-xs text-red-500 mt-2">
                      Son hatalar: {dreamProgress.errors.slice(-3).join(', ')}
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="font-medium mb-1">DreamBank Özellikleri</div>
                <div className="text-muted-foreground text-xs space-y-1">
                  <div>• Hall-Van de Castle psikolojik kodlama sistemi</div>
                  <div>• Otomatik duygu ve tema çıkarımı</div>
                  <div>• NFT nadirlik puanı hesaplama</div>
                  <div>• 28.000+ araştırma kalitesinde rüya kaydı</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {activeJobs && activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aktif İşler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div 
                  key={job.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="font-medium capitalize">{job.platform}</div>
                      <div className="text-xs text-muted-foreground">
                        {job.collectedCount?.toLocaleString()} / {job.targetCount?.toLocaleString()} video
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={job.progress || (job.collectedCount / job.targetCount) * 100} 
                      className="w-32 h-2"
                    />
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
