import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Database, 
  Download, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw,
  Search,
  User,
  Hash,
  ArrowLeft,
  Plug,
  AlertCircle,
  Globe,
  MapPin,
  Zap,
  Sparkles,
  Brain
} from "lucide-react";
import { SiTiktok, SiInstagram, SiX } from "react-icons/si";
import { Link } from "wouter";

interface ScrapeJob {
  id: string;
  platform: string;
  type: string;
  query: string;
  region?: string;
  status: string;
  resultsCount?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ConnectionStatus {
  initialized: boolean;
  hasToken?: boolean;
  account?: {
    username: string;
    email: string;
    plan: string;
  };
}

interface RegionConfig {
  turkey: number;
  global: number;
}

export default function DataSources() {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<"tiktok" | "instagram" | "twitter">("tiktok");
  const [scrapeType, setScrapeType] = useState<"hashtag" | "profile">("hashtag");
  const [queryInput, setQueryInput] = useState("");
  const [limit, setLimit] = useState(50);
  const [turkeyPercent, setTurkeyPercent] = useState(70);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{ success: boolean } & ConnectionStatus>({
    queryKey: ["/api/apify/status"],
  });

  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery<{ success: boolean; jobs: ScrapeJob[] }>({
    queryKey: ["/api/apify/jobs"],
  });

  const { data: regionData, refetch: refetchRegion } = useQuery<{ success: boolean; config: RegionConfig }>({
    queryKey: ["/api/apify/region"],
  });

  const initMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/apify/init");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bağlantı Başarılı", description: "AI veri sistemi aktif edildi" });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({ 
        title: "Bağlantı Hatası", 
        description: error.message || "Sistem bağlantısı kurulamadı",
        variant: "destructive"
      });
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: async ({ platform, type, query, limit }: { platform: string; type: string; query: string[]; limit: number }) => {
      const res = await apiRequest("POST", `/api/apify/scrape/${platform}`, { type, query, limit });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Veri Toplama Tamamlandı", 
        description: `${data.job?.resultsCount || 0} kayıt başarıyla toplandı` 
      });
      refetchJobs();
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Veri Toplama Başarısız", 
        description: error.message || "Veriler toplanamadı",
        variant: "destructive"
      });
    },
  });

  const regionMutation = useMutation({
    mutationFn: async ({ turkey, global }: { turkey: number; global: number }) => {
      const res = await apiRequest("POST", "/api/apify/region", { turkey, global });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bölge Güncellendi", description: `Türkiye %${turkeyPercent}, Global %${100 - turkeyPercent}` });
      refetchRegion();
    },
    onError: (error: any) => {
      toast({ title: "Güncelleme Başarısız", description: error.message, variant: "destructive" });
    },
  });

  const regionalScrapeMutation = useMutation({
    mutationFn: async ({ platform, limit }: { platform: string; limit: number }) => {
      const res = await apiRequest("POST", `/api/apify/scrape/regional/${platform}`, { limit });
      return res.json();
    },
    onSuccess: (data: any) => {
      const totalResults = data.jobs?.reduce((sum: number, job: ScrapeJob) => sum + (job.resultsCount || 0), 0) || 0;
      toast({ 
        title: "Bölgesel Veri Toplama Tamamlandı", 
        description: `${totalResults} kayıt toplandı (Türkiye %${data.regionConfig?.turkey}, Global %${data.regionConfig?.global})` 
      });
      refetchJobs();
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: (error: any) => {
      toast({ title: "Bölgesel Toplama Başarısız", description: error.message, variant: "destructive" });
    },
  });

  const handleScrape = () => {
    if (!queryInput.trim()) {
      toast({ title: "Hata", description: "Lütfen bir arama sorgusu girin", variant: "destructive" });
      return;
    }

    const queries = queryInput.split(",").map(q => q.trim()).filter(Boolean);
    scrapeMutation.mutate({ platform, type: scrapeType, query: queries, limit });
  };

  const getPlatformIcon = (p: string) => {
    switch (p) {
      case "tiktok": return <SiTiktok className="h-4 w-4" />;
      case "instagram": return <SiInstagram className="h-4 w-4" />;
      case "twitter": return <SiX className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "running": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isConnected = status?.initialized;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Veri Kaynakları</h1>
              <p className="text-muted-foreground">Sosyal medya verilerini AI ile analiz edin</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Bağlantı Durumu
              </CardTitle>
              <CardDescription>
                Yapay zeka veri toplama sistemini aktifleştirin
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Bağlantı kontrol ediliyor...</span>
                </div>
              ) : isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Sistem Aktif</span>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kullanıcı:</span>
                      <span data-testid="text-username">{status?.account?.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan:</span>
                      <Badge variant="secondary" data-testid="badge-plan">{status?.account?.plan}</Badge>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => refetchStatus()}
                    className="w-full gap-2"
                    data-testid="button-refresh-status"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Durumu Yenile
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {status?.hasToken ? (
                    <>
                      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                        <AlertCircle className="h-5 w-5" />
                        <span>Sistem hazır, aktivasyon bekliyor</span>
                      </div>
                      <Button 
                        onClick={() => initMutation.mutate()}
                        disabled={initMutation.isPending}
                        className="w-full gap-2"
                        data-testid="button-connect"
                      >
                        {initMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Bağlanıyor...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Sistemi Aktifleştir
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <XCircle className="h-5 w-5" />
                        <span>API anahtarı yapılandırılmamış</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Veri toplama sistemini kullanabilmek için API anahtarını Secrets panelinden ekleyin.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Bölge Ayarları
              </CardTitle>
              <CardDescription>
                Veri dağılımını bölgeye göre yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Türkiye</span>
                  </div>
                  <Badge variant="secondary" data-testid="badge-turkey-percent">%{turkeyPercent}</Badge>
                </div>
                <Slider
                  value={[turkeyPercent]}
                  onValueChange={(value) => setTurkeyPercent(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                  data-testid="slider-turkey"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Global</span>
                  </div>
                  <Badge variant="secondary" data-testid="badge-global-percent">%{100 - turkeyPercent}</Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => regionMutation.mutate({ turkey: turkeyPercent, global: 100 - turkeyPercent })}
                  disabled={regionMutation.isPending || !isConnected}
                  className="flex-1"
                  data-testid="button-save-region"
                >
                  {regionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Ayarları Kaydet
                </Button>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Hızlı bölgesel veri toplama:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => regionalScrapeMutation.mutate({ platform: "tiktok", limit })}
                    disabled={regionalScrapeMutation.isPending || !isConnected}
                    className="gap-1"
                    data-testid="button-regional-tiktok"
                  >
                    {regionalScrapeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <SiTiktok className="h-3 w-3" />}
                    TikTok
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => regionalScrapeMutation.mutate({ platform: "instagram", limit })}
                    disabled={regionalScrapeMutation.isPending || !isConnected}
                    className="gap-1"
                    data-testid="button-regional-instagram"
                  >
                    {regionalScrapeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <SiInstagram className="h-3 w-3" />}
                    Instagram
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => regionalScrapeMutation.mutate({ platform: "twitter", limit })}
                    disabled={regionalScrapeMutation.isPending || !isConnected}
                    className="gap-1"
                    data-testid="button-regional-twitter"
                  >
                    {regionalScrapeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <SiX className="h-3 w-3" />}
                    Twitter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Özel Veri Toplama
              </CardTitle>
              <CardDescription>
                TikTok, Instagram veya Twitter'dan belirli verileri toplayın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="tiktok" className="gap-2" data-testid="tab-tiktok">
                    <SiTiktok className="h-4 w-4" />
                    TikTok
                  </TabsTrigger>
                  <TabsTrigger value="instagram" className="gap-2" data-testid="tab-instagram">
                    <SiInstagram className="h-4 w-4" />
                    Instagram
                  </TabsTrigger>
                  <TabsTrigger value="twitter" className="gap-2" data-testid="tab-twitter">
                    <SiX className="h-4 w-4" />
                    Twitter/X
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Arama Türü</Label>
                    <Select value={scrapeType} onValueChange={(v) => setScrapeType(v as typeof scrapeType)}>
                      <SelectTrigger data-testid="select-scrape-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hashtag">
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4" />
                            Hashtag / Anahtar Kelime
                          </div>
                        </SelectItem>
                        <SelectItem value="profile">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Profil / Kullanıcı Adı
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {scrapeType === "hashtag" ? "Hashtag'ler / Anahtar Kelimeler" : "Kullanıcı Adları"}
                    </Label>
                    <Input 
                      placeholder={scrapeType === "hashtag" ? "müzik, dans, viral" : "kullanici1, kullanici2"}
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      data-testid="input-query"
                    />
                    <p className="text-xs text-muted-foreground">
                      Birden fazla değeri virgülle ayırın
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Sonuç Limiti: {limit}</Label>
                    <Input
                      type="range"
                      min={10}
                      max={500}
                      step={10}
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value))}
                      data-testid="input-limit"
                    />
                  </div>

                  <Button 
                    onClick={handleScrape}
                    disabled={!isConnected || scrapeMutation.isPending}
                    className="w-full gap-2"
                    data-testid="button-scrape"
                  >
                    {scrapeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Toplanıyor...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Veri Toplamaya Başla
                      </>
                    )}
                  </Button>
                  
                  {!isConnected && (
                    <p className="text-xs text-center text-muted-foreground">
                      Veri toplamaya başlamak için önce sistemi aktifleştirin
                    </p>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Son İşlemler</CardTitle>
                <CardDescription>Veri toplama işlemlerinin geçmişi</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchJobs()}
                className="gap-2"
                data-testid="button-refresh-jobs"
              >
                <RefreshCw className="h-4 w-4" />
                Yenile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !jobsData?.jobs?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Henüz veri toplama işlemi yok</p>
                <p className="text-sm">Veri toplamaya başlayın</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobsData.jobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    data-testid={`job-item-${job.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        {getPlatformIcon(job.platform)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{job.platform}</span>
                          <Badge variant="outline" className="text-xs">
                            {job.type === "hashtag" ? "Hashtag" : "Profil"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{job.query}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        {job.resultsCount !== undefined && (
                          <p className="font-medium">{job.resultsCount} kayıt</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                      {getStatusIcon(job.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
