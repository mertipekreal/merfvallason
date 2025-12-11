import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Play,
  Pause,
  RefreshCw,
  Loader2,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Hash,
  Users,
  MapPin,
  Globe,
  Clock,
  ArrowLeft,
  BarChart3,
  Settings,
  CheckCircle2,
  AlertCircle,
  Zap
} from "lucide-react";
import { SiTiktok, SiInstagram } from "react-icons/si";
import { Link } from "wouter";

interface WeeklyConfig {
  dailyVideoCount: number;
  turkeyPercent: number;
  globalPercent: number;
}

interface WeeklyStatus {
  success: boolean;
  isRunning: boolean;
  currentWeek: string;
  config: WeeklyConfig;
}

interface ScrapeHistoryItem {
  id: string;
  weekNumber: string;
  platform: string;
  region: string;
  status: string;
  targetCount: number;
  actualCount: number;
  turkeyCount: number;
  globalCount: number;
  createdAt: string;
  completedAt?: string;
}

const COLORS = ["#22c55e", "#ef4444", "#6b7280", "#3b82f6", "#f59e0b", "#8b5cf6"];

export default function WeeklyInsights() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [dailyTarget, setDailyTarget] = useState(2500);
  const [turkeyPercent, setTurkeyPercent] = useState(70);

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<WeeklyStatus>({
    queryKey: ["/api/weekly/status"],
    refetchInterval: 5000,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery<{ success: boolean; history: ScrapeHistoryItem[] }>({
    queryKey: ["/api/weekly/history"],
  });

  const { data: insightsData, isLoading: insightsLoading } = useQuery<{ success: boolean; currentWeek: string; insights: any[]; config: WeeklyConfig }>({
    queryKey: ["/api/weekly/insights"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<WeeklyConfig>) => {
      const res = await apiRequest("POST", "/api/weekly/config", config);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Config Updated", description: "Weekly scraping configuration updated successfully" });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const startScrapeMutation = useMutation({
    mutationFn: async (platform: "tiktok" | "instagram") => {
      const res = await apiRequest("POST", `/api/weekly/scrape/${platform}`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Scraping Complete", 
        description: `Collected ${data.result?.totalCount || 0} items (${data.result?.turkeyCount || 0} Turkey, ${data.result?.globalCount || 0} Global)` 
      });
      refetchStatus();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["/api/weekly/insights"] });
    },
    onError: (error: any) => {
      toast({ title: "Scraping Failed", description: error.message, variant: "destructive" });
    },
  });

  const startFullScrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/weekly/scrape-all", {});
      return res.json();
    },
    onSuccess: (data) => {
      const tiktokCount = data.result?.tiktok?.totalCount || 0;
      const instaCount = data.result?.instagram?.totalCount || 0;
      toast({ 
        title: "Full Weekly Scrape Complete", 
        description: `TikTok: ${tiktokCount} items, Instagram: ${instaCount} items` 
      });
      refetchStatus();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ["/api/weekly/insights"] });
    },
    onError: (error: any) => {
      toast({ title: "Full Scrape Failed", description: error.message, variant: "destructive" });
    },
  });

  const isRunning = statusData?.isRunning || startScrapeMutation.isPending || startFullScrapeMutation.isPending;
  const currentWeek = statusData?.currentWeek || insightsData?.currentWeek || "N/A";

  const mockDailyStats = [
    { day: "Pzt", tiktok: 2500, instagram: 2400 },
    { day: "Sal", tiktok: 2450, instagram: 2500 },
    { day: "Çar", tiktok: 2600, instagram: 2350 },
    { day: "Per", tiktok: 2400, instagram: 2500 },
    { day: "Cum", tiktok: 2550, instagram: 2450 },
    { day: "Cmt", tiktok: 2500, instagram: 2500 },
    { day: "Paz", tiktok: 2600, instagram: 2400 },
  ];

  const regionData = [
    { name: "Türkiye", value: turkeyPercent, color: "#ef4444" },
    { name: "Global", value: 100 - turkeyPercent, color: "#3b82f6" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
                <BarChart3 className="h-6 w-6" />
                Weekly Insights
              </h1>
              <p className="text-muted-foreground">Haftalık içerik analizi ve trendler</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isRunning ? "default" : "secondary"} className="gap-1" data-testid="badge-status">
              {isRunning ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Çalışıyor
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Hazır
                </>
              )}
            </Badge>
            <Badge variant="outline" className="gap-1" data-testid="badge-week">
              <Calendar className="h-3 w-3" />
              {currentWeek}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Günlük Hedef</p>
                  <p className="text-2xl font-bold" data-testid="text-daily-target">
                    {(statusData?.config?.dailyVideoCount || dailyTarget).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Eye className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">video / platform / gün</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Haftalık Hedef</p>
                  <p className="text-2xl font-bold" data-testid="text-weekly-target">
                    {((statusData?.config?.dailyVideoCount || dailyTarget) * 7 * 2).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">toplam video (TikTok + Instagram)</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Türkiye Oranı</p>
                  <p className="text-2xl font-bold" data-testid="text-turkey-ratio">
                    %{statusData?.config?.turkeyPercent || turkeyPercent}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-red-500/10">
                  <MapPin className="h-5 w-5 text-red-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">#keşfet #türkiye</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Global Oranı</p>
                  <p className="text-2xl font-bold" data-testid="text-global-ratio">
                    %{100 - (statusData?.config?.turkeyPercent || turkeyPercent)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-blue-500/10">
                  <Globe className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">#fyp #viral</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4" />
              Genel Bakış
            </TabsTrigger>
            <TabsTrigger value="scrape" className="gap-2" data-testid="tab-scrape">
              <Zap className="h-4 w-4" />
              Veri Çekme
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4" />
              Ayarlar
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2" data-testid="tab-history">
              <Clock className="h-4 w-4" />
              Geçmiş
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Günlük Veri Toplama
                  </CardTitle>
                  <CardDescription>Son 7 günlük veri toplama performansı</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mockDailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="tiktok" name="TikTok" fill="#000000" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="instagram" name="Instagram" fill="#E1306C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Bölge Dağılımı
                  </CardTitle>
                  <CardDescription>Türkiye vs Global içerik oranı</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={regionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {regionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Aktif Hashtag'ler
                </CardTitle>
                <CardDescription>Türkiye ve Global için kullanılan hashtag'ler</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Türkiye Hashtag'leri</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["#keşfet", "#türkiye", "#istanbul", "#ankara", "#izmir", "#fyptr", "#tiktokturkiye"].map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-red-600 bg-red-50 dark:bg-red-950">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Global Hashtag'ler</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["#fyp", "#foryou", "#viral", "#trending", "#explore"].map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-blue-600 bg-blue-50 dark:bg-blue-950">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scrape" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SiTiktok className="h-5 w-5" />
                    TikTok Veri Çekme
                  </CardTitle>
                  <CardDescription>
                    Haftalık hedef: {((statusData?.config?.dailyVideoCount || dailyTarget) * 7).toLocaleString()} video
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Türkiye: %{statusData?.config?.turkeyPercent || turkeyPercent}</span>
                    <span>Global: %{100 - (statusData?.config?.turkeyPercent || turkeyPercent)}</span>
                  </div>
                  <Progress value={0} className="h-2" />
                  <Button
                    onClick={() => startScrapeMutation.mutate("tiktok")}
                    disabled={isRunning}
                    className="w-full gap-2"
                    data-testid="button-scrape-tiktok"
                  >
                    {startScrapeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Çekiliyor...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        TikTok Verisini Çek
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SiInstagram className="h-5 w-5" />
                    Instagram Veri Çekme
                  </CardTitle>
                  <CardDescription>
                    Haftalık hedef: {((statusData?.config?.dailyVideoCount || dailyTarget) * 7).toLocaleString()} post
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Türkiye: %{statusData?.config?.turkeyPercent || turkeyPercent}</span>
                    <span>Global: %{100 - (statusData?.config?.turkeyPercent || turkeyPercent)}</span>
                  </div>
                  <Progress value={0} className="h-2" />
                  <Button
                    onClick={() => startScrapeMutation.mutate("instagram")}
                    disabled={isRunning}
                    className="w-full gap-2"
                    data-testid="button-scrape-instagram"
                  >
                    {startScrapeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Çekiliyor...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Instagram Verisini Çek
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Tam Haftalık Veri Çekme
                </CardTitle>
                <CardDescription>
                  TikTok ve Instagram'dan aynı anda veri çek (toplam {((statusData?.config?.dailyVideoCount || dailyTarget) * 7 * 2).toLocaleString()} içerik)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => startFullScrapeMutation.mutate()}
                  disabled={isRunning}
                  className="w-full gap-2"
                  size="lg"
                  data-testid="button-scrape-all"
                >
                  {startFullScrapeMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Tüm Platformlardan Çekiliyor...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5" />
                      Haftalık Veriyi Şimdi Çek
                    </>
                  )}
                </Button>
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground">
                Bu işlem, bu haftanın verilerini hemen çekmeye başlar. Her Pazartesi otomatik olarak çalışır.
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Haftalık Scraping Ayarları
                </CardTitle>
                <CardDescription>Veri toplama parametrelerini yapılandırın</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Günlük Video Hedefi</Label>
                    <Badge variant="secondary">{dailyTarget.toLocaleString()}</Badge>
                  </div>
                  <Slider
                    value={[dailyTarget]}
                    onValueChange={(value) => setDailyTarget(value[0])}
                    min={100}
                    max={5000}
                    step={100}
                    data-testid="slider-daily-target"
                  />
                  <p className="text-xs text-muted-foreground">
                    Her platform için günlük çekilecek video sayısı
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <Label>Türkiye Oranı</Label>
                    </div>
                    <Badge variant="secondary">%{turkeyPercent}</Badge>
                  </div>
                  <Slider
                    value={[turkeyPercent]}
                    onValueChange={(value) => setTurkeyPercent(value[0])}
                    min={0}
                    max={100}
                    step={5}
                    data-testid="slider-turkey-percent"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Global: %{100 - turkeyPercent}</span>
                    <span>Türkiye: %{turkeyPercent}</span>
                  </div>
                </div>

                <Button
                  onClick={() => updateConfigMutation.mutate({
                    dailyVideoCount: dailyTarget,
                    turkeyPercent,
                    globalPercent: 100 - turkeyPercent,
                  })}
                  disabled={updateConfigMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-save-settings"
                >
                  {updateConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Ayarları Kaydet
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Otomatik Zamanlama
                </CardTitle>
                <CardDescription>Haftalık veri çekme zamanlaması</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Her Pazartesi 03:00</p>
                    <p className="text-sm text-muted-foreground">
                      Son 7 günün verileri otomatik olarak çekilir
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Otomatik zamanlama özellikleri:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>TikTok ve Instagram'dan eşzamanlı veri çekimi</li>
                    <li>Bölgesel dağılım (Türkiye/Global) otomatik uygulanır</li>
                    <li>Günlük 2,500 video hedefi x 7 gün = 17,500 video/platform</li>
                    <li>Apify Scale planı limitlerine uygun throttling</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Scraping Geçmişi
                    </CardTitle>
                    <CardDescription>Son veri çekme işlemleri</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchHistory()} className="gap-2" data-testid="button-refresh-history">
                    <RefreshCw className="h-4 w-4" />
                    Yenile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !historyData?.history?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz veri çekme geçmişi yok</p>
                    <p className="text-sm">Veri çekmeye başlayın</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyData.history.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                        data-testid={`history-item-${item.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-muted">
                            {item.platform === "tiktok" ? (
                              <SiTiktok className="h-4 w-4" />
                            ) : (
                              <SiInstagram className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{item.platform}</span>
                              <Badge variant="outline" className="text-xs">{item.weekNumber}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Türkiye: {item.turkeyCount} | Global: {item.globalCount}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{item.actualCount.toLocaleString()} / {item.targetCount.toLocaleString()}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {item.status === "completed" ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : item.status === "running" ? (
                              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                            )}
                            {new Date(item.createdAt).toLocaleString("tr-TR")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
