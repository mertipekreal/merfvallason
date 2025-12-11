import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingDown, 
  TrendingUp,
  Activity, 
  BarChart3,
  RefreshCcw,
  AlertTriangle,
  Brain,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Calendar,
  Clock,
  Percent,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CrisisEvent {
  date: string;
  name: string;
  expectedDrop: number;
  category: string;
}

interface BacktestResult {
  eventDate: string;
  eventName: string;
  dreamSentiment: number;
  dreamCount: number;
  fearKeywords: string[];
  marketChange: number;
  prediction: 'correct' | 'incorrect' | 'neutral' | 'no_data' | 'insufficient_sample';
  lag: number;
  confidence: number;
}

interface ComprehensiveBacktestSummary {
  totalEvents: number;
  correctPredictions: number;
  incorrectPredictions: number;
  neutralPredictions: number;
  noDataEvents: number;
  insufficientSampleEvents: number;
  accuracy: number;
  bestLag: number;
  avgConfidence: number;
  byCategory: Record<string, { correct: number; total: number; accuracy: number }>;
  byDecade: Record<string, { correct: number; total: number; accuracy: number }>;
}

const categoryLabels: Record<string, string> = {
  bear_market: "Ayı Piyasası",
  oil_crisis: "Petrol Krizi",
  political: "Politik",
  commodity: "Emtia",
  recession: "Durgunluk",
  crash: "Çöküş",
  geopolitical: "Jeopolitik",
  war: "Savaş",
  bond_crisis: "Tahvil Krizi",
  crisis: "Kriz",
  bubble: "Balon",
  terrorism: "Terör",
  fraud: "Dolandırıcılık",
  subprime: "Subprime",
  financial_crisis: "Finansal Kriz",
  recovery: "Toparlanma",
  flash_crash: "Flash Crash",
  downgrade: "Not İndirimi",
  debt_crisis: "Borç Krizi",
  china: "Çin",
  volatility: "Volatilite",
  selloff: "Satış Dalgası",
  pandemic: "Pandemi",
  fed: "Fed",
  inflation: "Enflasyon",
  banking: "Bankacılık",
  currency: "Döviz",
};

const predictionIcons = {
  correct: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  incorrect: <XCircle className="h-4 w-4 text-red-500" />,
  neutral: <MinusCircle className="h-4 w-4 text-yellow-500" />,
  no_data: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
  insufficient_sample: <AlertTriangle className="h-4 w-4 text-orange-500" />,
};

const predictionLabels: Record<string, string> = {
  correct: "Doğru",
  incorrect: "Yanlış",
  neutral: "Nötr",
  no_data: "Veri Yok",
  insufficient_sample: "Yetersiz Örnek",
};

export default function BacktestDashboard() {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState<CrisisEvent | null>(null);
  const [eventResults, setEventResults] = useState<BacktestResult[]>([]);
  const [comprehensiveResults, setComprehensiveResults] = useState<{
    results: BacktestResult[];
    summary: ComprehensiveBacktestSummary;
  } | null>(null);

  const { data: crisisData, isLoading: eventsLoading } = useQuery<{ 
    status: string; 
    count: number; 
    events: CrisisEvent[] 
  }>({
    queryKey: ['/api/backtest/crisis-events'],
  });

  const friday13thMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/backtest/friday13th');
      return response.json();
    },
    onSuccess: (data: { results: BacktestResult[] }) => {
      setEventResults(data.results);
      toast({
        title: "Friday 13th Testi Tamamlandı",
        description: `${data.results.length} sonuç bulundu`,
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Test başarısız oldu",
        variant: "destructive",
      });
    },
  });

  const comprehensiveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/backtest/comprehensive-1971-2024');
      return response.json();
    },
    onSuccess: (data: { results: BacktestResult[]; summary: ComprehensiveBacktestSummary }) => {
      setComprehensiveResults(data);
      toast({
        title: "Kapsamlı Backtest Tamamlandı",
        description: `%${data.summary.accuracy.toFixed(1)} doğruluk oranı`,
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Kapsamlı test başarısız oldu",
        variant: "destructive",
      });
    },
  });

  const events = crisisData?.events || [];

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      crash: "bg-red-500/20 text-red-400 border-red-500/30",
      financial_crisis: "bg-red-500/20 text-red-400 border-red-500/30",
      pandemic: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      war: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      bear_market: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      bubble: "bg-pink-500/20 text-pink-400 border-pink-500/30",
      terrorism: "bg-red-600/20 text-red-500 border-red-600/30",
      recession: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      oil_crisis: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      fed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      china: "bg-red-400/20 text-red-300 border-red-400/30",
      recovery: "bg-green-500/20 text-green-400 border-green-500/30",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Rüya-Piyasa Backtest
          </h1>
          <p className="text-muted-foreground mt-1">
            1971-2024 tarihsel kriz olaylarında rüya sentiment analizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => friday13thMutation.mutate()}
            disabled={friday13thMutation.isPending}
            data-testid="button-friday13th-test"
          >
            {friday13thMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            Friday 13th Test
          </Button>
          <Button
            onClick={() => comprehensiveMutation.mutate()}
            disabled={comprehensiveMutation.isPending}
            data-testid="button-comprehensive-test"
          >
            {comprehensiveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            Kapsamlı Backtest
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kriz</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-events">
              {crisisData?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">1973-2024 arası</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Doğruluk</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500" data-testid="text-accuracy">
              {comprehensiveResults ? `${comprehensiveResults.summary.accuracy.toFixed(1)}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Doğru tahminler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">En İyi Lag</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-best-lag">
              {comprehensiveResults ? `${comprehensiveResults.summary.bestLag} gün` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Önceden tahmin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Güven</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-confidence">
              {comprehensiveResults ? `${comprehensiveResults.summary.avgConfidence.toFixed(0)}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Tahmin güveni</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" data-testid="tab-events">
            Kriz Olayları ({events.length})
          </TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">
            Test Sonuçları
          </TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">
            Kategori Analizi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tarihsel Kriz Olayları</CardTitle>
              <CardDescription>
                1973'ten 2024'e kadar önemli piyasa krizleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {events.map((event, index) => (
                      <div
                        key={`${event.date}-${index}`}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover-elevate cursor-pointer"
                        onClick={() => setSelectedEvent(event)}
                        data-testid={`event-row-${index}`}
                      >
                        <div className="flex items-center gap-3">
                          {event.expectedDrop < 0 ? (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium">{event.name}</p>
                            <p className="text-sm text-muted-foreground">{event.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={getCategoryColor(event.category)}
                          >
                            {categoryLabels[event.category] || event.category}
                          </Badge>
                          <span className={`font-mono text-sm ${event.expectedDrop < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {event.expectedDrop > 0 ? '+' : ''}{event.expectedDrop}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Test Sonuçları</CardTitle>
                <CardDescription>
                  En son çalıştırılan backtest sonuçları
                </CardDescription>
              </CardHeader>
              <CardContent>
                {eventResults.length === 0 && !comprehensiveResults ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Henüz test çalıştırılmadı</p>
                    <p className="text-sm">Yukarıdaki butonları kullanarak test başlatın</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {(comprehensiveResults?.results || eventResults).slice(0, 50).map((result, index) => (
                        <div
                          key={`${result.eventDate}-${result.lag}-${index}`}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            {predictionIcons[result.prediction]}
                            <div>
                              <p className="font-medium text-sm">{result.eventName}</p>
                              <p className="text-xs text-muted-foreground">
                                Lag: {result.lag} gün | Rüya: {result.dreamCount}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono text-sm ${result.marketChange < 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {result.marketChange > 0 ? '+' : ''}{result.marketChange.toFixed(2)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Sentiment: {result.dreamSentiment.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Korku Anahtar Kelimeleri</CardTitle>
                <CardDescription>
                  Tespit edilen korku kalıpları
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(comprehensiveResults?.results || eventResults).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Test sonuçları bekleniyor</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      new Set(
                        (comprehensiveResults?.results || eventResults)
                          .flatMap(r => r.fearKeywords)
                      )
                    ).slice(0, 30).map((keyword, index) => (
                      <Badge 
                        key={keyword} 
                        variant="outline"
                        className="bg-red-500/10 text-red-400 border-red-500/20"
                      >
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {!comprehensiveResults ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Kategori analizi için kapsamlı backtest çalıştırın</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Kategori Bazında Doğruluk</CardTitle>
                  <CardDescription>
                    Her kriz kategorisi için tahmin başarısı
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {Object.entries(comprehensiveResults.summary.byCategory)
                        .sort((a, b) => b[1].accuracy - a[1].accuracy)
                        .map(([category, stats]) => (
                          <div key={category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {categoryLabels[category] || category}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {stats.correct}/{stats.total} ({stats.accuracy.toFixed(0)}%)
                              </span>
                            </div>
                            <Progress 
                              value={stats.accuracy} 
                              className="h-2"
                            />
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>On Yıl Bazında Doğruluk</CardTitle>
                  <CardDescription>
                    Her on yıl için tahmin başarısı
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(comprehensiveResults.summary.byDecade)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([decade, stats]) => (
                        <div key={decade} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{decade}</span>
                            <span className="text-sm text-muted-foreground">
                              {stats.correct}/{stats.total} ({stats.accuracy.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress 
                            value={stats.accuracy} 
                            className="h-2"
                          />
                        </div>
                      ))}
                  </div>

                  <Separator className="my-6" />

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-500">
                        {comprehensiveResults.summary.correctPredictions}
                      </p>
                      <p className="text-xs text-muted-foreground">Doğru Tahmin</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-500">
                        {comprehensiveResults.summary.incorrectPredictions}
                      </p>
                      <p className="text-xs text-muted-foreground">Yanlış Tahmin</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-500">
                        {comprehensiveResults.summary.neutralPredictions}
                      </p>
                      <p className="text-xs text-muted-foreground">Nötr</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-muted-foreground">
                        {comprehensiveResults.summary.noDataEvents}
                      </p>
                      <p className="text-xs text-muted-foreground">Veri Yok</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
