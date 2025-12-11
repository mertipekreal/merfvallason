import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock,
  RefreshCcw,
  AlertTriangle,
  Brain,
  Zap,
  BarChart3,
  Target,
  Timer,
  Shield,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Moon,
  Sun,
  LineChart,
  Layers,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface SessionAnalysis {
  currentSession: string;
  sessionStart: string;
  sessionEnd: string;
  isOptimalTrading: boolean;
  volatilityExpectation: string;
  recommendedAction: string;
  signalMultiplier: number;
  nextOptimalSession: {
    session: string;
    startsIn: number;
  };
  sessionStats: {
    avgVolume: number;
    avgVolatility: number;
    winRate: number;
  };
}

interface LayerScore {
  score: number;
  confidence: number;
  signals: string[];
  weight: number;
}

interface CombinedSignal {
  symbol: string;
  timestamp: string;
  direction: string;
  confidence: number;
  expectedAccuracy: number;
  layers: {
    hardData: LayerScore;
    technical: LayerScore;
    sam: LayerScore;
    economic: LayerScore;
  };
  session: {
    current: string;
    isOptimal: boolean;
    multiplier: number;
    adjustedConfidence: number;
  };
  action: {
    shouldTrade: boolean;
    positionSizeMultiplier: number;
    entryTiming: string;
    stopLossPercent: number;
    takeProfitPercent: number;
    reason: string;
  };
  bullishFactors: string[];
  bearishFactors: string[];
  riskFactors: string[];
}

interface EconomicIndicators {
  vix: number | null;
  yieldCurve: number | null;
  consumerSentiment: number | null;
  unemployment: number | null;
  fedRate: number | null;
  cpi: number | null;
  fearGreedSignal: string;
}

interface SAMMetrics {
  nightOwl: {
    panicIndicator: number;
    sentimentDissonance: number;
    nightActivityRatio: number;
  };
  dfi: {
    score: number;
    trend: string;
  };
  socialSentiment: number;
}

interface SessionPerformance {
  session: string;
  sessionName: string;
  sessionNameTR: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgConfidence: number;
  avgReturn: number;
  profitFactor: number;
  expectedWinRate: number;
  performanceVsExpected: number;
  isOptimal: boolean;
}

interface BacktestSummary {
  period: string;
  startDate: string;
  endDate: string;
  sessions: SessionPerformance[];
  overallStats: {
    totalTrades: number;
    overallWinRate: number;
    optimalSessionWinRate: number;
    nonOptimalSessionWinRate: number;
    optimalVsNonOptimalDiff: number;
  };
  recommendations: string[];
}

const sessionNames: Record<string, string> = {
  pre_market: "Piyasa Oncesi",
  london_open: "Londra Acilis",
  london_am: "Londra Sabah",
  ny_premarket: "NY Oncesi",
  ny_am_power_hour: "NY Sabah Guc Saati",
  ny_midday: "NY Oglen",
  ny_pm_power_hour: "NY Aksam Guc Saati",
  after_hours: "Mesai Sonrasi",
  closed: "Piyasa Kapali"
};

const volatilityColors: Record<string, string> = {
  low: "text-blue-500",
  medium: "text-yellow-500",
  high: "text-orange-500",
  extreme: "text-red-500"
};

const directionColors: Record<string, string> = {
  STRONG_BUY: "text-green-500 bg-green-500/10",
  BUY: "text-green-400 bg-green-500/10",
  NEUTRAL: "text-muted-foreground bg-muted",
  SELL: "text-red-400 bg-red-500/10",
  STRONG_SELL: "text-red-500 bg-red-500/10"
};

const directionLabels: Record<string, string> = {
  STRONG_BUY: "GUCLU AL",
  BUY: "AL",
  NEUTRAL: "NOTR",
  SELL: "SAT",
  STRONG_SELL: "GUCLU SAT"
};

export default function TradingDashboard() {
  const [symbol, setSymbol] = useState("SPY");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: sessionData, isLoading: sessionLoading, refetch: refetchSession } = useQuery<{
    status: string;
    session: SessionAnalysis;
  }>({
    queryKey: ['/api/trading/session'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: signalData, isLoading: signalLoading, refetch: refetchSignal } = useQuery<{
    status: string;
    signal: CombinedSignal;
  }>({
    queryKey: ['/api/trading/signal', symbol],
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const { data: economicData, isLoading: economicLoading } = useQuery<{
    status: string;
    indicators: EconomicIndicators;
  }>({
    queryKey: ['/api/market/economic-indicators'],
    refetchInterval: 300000,
  });

  const { data: samData, isLoading: samLoading } = useQuery<{
    status: string;
    metrics: SAMMetrics;
  }>({
    queryKey: ['/api/market/sam-metrics'],
    refetchInterval: 120000,
  });

  const { data: backtestData, isLoading: backtestLoading } = useQuery<{
    status: string;
    performance: BacktestSummary;
  }>({
    queryKey: ['/api/backtest/session-performance', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/backtest/session-performance?symbol=${symbol}`);
      if (!res.ok) throw new Error('Failed to fetch backtest data');
      return res.json();
    },
    refetchInterval: 300000,
  });

  const handleRefresh = () => {
    refetchSession();
    refetchSignal();
    queryClient.invalidateQueries({ queryKey: ['/api/market/economic-indicators'] });
    queryClient.invalidateQueries({ queryKey: ['/api/market/sam-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['/api/backtest/session-performance', symbol] });
  };

  const session = sessionData?.session;
  const signal = signalData?.signal;
  const economic = economicData?.indicators;
  const sam = samData?.metrics;
  const backtest = backtestData?.performance;

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes} dk`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}s ${mins}dk` : `${hours} saat`;
  };

  const getScoreColor = (score: number) => {
    if (score > 30) return "text-green-500";
    if (score > 0) return "text-green-400";
    if (score < -30) return "text-red-500";
    if (score < 0) return "text-red-400";
    return "text-muted-foreground";
  };

  const getProgressColor = (value: number) => {
    if (value >= 70) return "bg-green-500";
    if (value >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="p-6 space-y-6" data-testid="trading-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Merkezi</h1>
          <p className="text-muted-foreground">4-Katmanli Sinyal Sistemi + Seans Optimizasyonu</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Sembol"
            className="w-24"
            data-testid="input-symbol"
          />
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="icon"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="button-auto-refresh"
          >
            {autoRefresh ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-session-status">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Seans Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessionLoading ? (
              <div className="h-24 flex items-center justify-center">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
            ) : session ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    {sessionNames[session.currentSession] || session.currentSession}
                  </span>
                  <Badge variant={session.isOptimalTrading ? "default" : "secondary"}>
                    {session.isOptimalTrading ? "OPTIMAL" : "BEKLE"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Volatilite:</span>
                  <span className={`font-medium ${volatilityColors[session.volatilityExpectation]}`}>
                    {session.volatilityExpectation.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Sonraki optimal: {sessionNames[session.nextOptimalSession.session]}
                    {" - "}{formatMinutes(session.nextOptimalSession.startsIn)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>Tarihi basari: %{(session.sessionStats.winRate * 100).toFixed(0)}</span>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Veri yuklenemedi</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2" data-testid="card-combined-signal">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Birlesik Sinyal - {symbol}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signalLoading ? (
              <div className="h-24 flex items-center justify-center">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
            ) : signal ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Yon</span>
                  <Badge className={`text-lg px-3 py-1 ${directionColors[signal.direction]}`}>
                    {directionLabels[signal.direction] || signal.direction}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Guven</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">%{signal.confidence.toFixed(0)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Beklenen Dogruluk</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">%{signal.expectedAccuracy.toFixed(0)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Islem</span>
                  <Badge variant={signal.action.shouldTrade ? "default" : "secondary"}>
                    {signal.action.shouldTrade ? "ISLEM YAP" : "BEKLE"}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">Sinyal yuklenemedi</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="layers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="layers" data-testid="tab-layers">
            <Layers className="h-4 w-4 mr-2" />
            Katmanlar
          </TabsTrigger>
          <TabsTrigger value="economic" data-testid="tab-economic">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ekonomik
          </TabsTrigger>
          <TabsTrigger value="sam" data-testid="tab-sam">
            <Brain className="h-4 w-4 mr-2" />
            SAM
          </TabsTrigger>
          <TabsTrigger value="action" data-testid="tab-action">
            <Target className="h-4 w-4 mr-2" />
            Aksiyon
          </TabsTrigger>
          <TabsTrigger value="backtest" data-testid="tab-backtest">
            <BarChart3 className="h-4 w-4 mr-2" />
            Backtest
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="space-y-4">
          {signal ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-layer-harddata">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Hard Data
                    <Badge variant="outline" className="ml-auto">%{(signal.layers.hardData.weight * 100).toFixed(0)}</Badge>
                  </CardTitle>
                  <CardDescription>Options Flow, Dark Pool, Insider</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${getScoreColor(signal.layers.hardData.score)}`}>
                        {signal.layers.hardData.score > 0 ? '+' : ''}{signal.layers.hardData.score.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Guven: %{signal.layers.hardData.confidence.toFixed(0)}
                      </span>
                    </div>
                    <Progress value={Math.abs(signal.layers.hardData.score)} className="h-2" />
                    <div className="space-y-1">
                      {signal.layers.hardData.signals.slice(0, 3).map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{s}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-layer-technical">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <LineChart className="h-4 w-4" />
                    Teknik
                    <Badge variant="outline" className="ml-auto">%{(signal.layers.technical.weight * 100).toFixed(0)}</Badge>
                  </CardTitle>
                  <CardDescription>ICT, RSI, Trend, FVG</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${getScoreColor(signal.layers.technical.score)}`}>
                        {signal.layers.technical.score > 0 ? '+' : ''}{signal.layers.technical.score.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Guven: %{signal.layers.technical.confidence.toFixed(0)}
                      </span>
                    </div>
                    <Progress value={Math.abs(signal.layers.technical.score)} className="h-2" />
                    <div className="space-y-1">
                      {signal.layers.technical.signals.slice(0, 3).map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{s}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-layer-sam">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    SAM
                    <Badge variant="outline" className="ml-auto">%{(signal.layers.sam.weight * 100).toFixed(0)}</Badge>
                  </CardTitle>
                  <CardDescription>Night Owl, DFI, Duygu</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${getScoreColor(signal.layers.sam.score)}`}>
                        {signal.layers.sam.score > 0 ? '+' : ''}{signal.layers.sam.score.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Guven: %{signal.layers.sam.confidence.toFixed(0)}
                      </span>
                    </div>
                    <Progress value={Math.abs(signal.layers.sam.score)} className="h-2" />
                    <div className="space-y-1">
                      {signal.layers.sam.signals.slice(0, 3).map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{s}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-layer-economic">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Ekonomik
                    <Badge variant="outline" className="ml-auto">%{(signal.layers.economic.weight * 100).toFixed(0)}</Badge>
                  </CardTitle>
                  <CardDescription>VIX, Verim Egrisi, FRED</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${getScoreColor(signal.layers.economic.score)}`}>
                        {signal.layers.economic.score > 0 ? '+' : ''}{signal.layers.economic.score.toFixed(0)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Guven: %{signal.layers.economic.confidence.toFixed(0)}
                      </span>
                    </div>
                    <Progress value={Math.abs(signal.layers.economic.score)} className="h-2" />
                    <div className="space-y-1">
                      {signal.layers.economic.signals.slice(0, 3).map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{s}</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Katman verileri yuklenemedi
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="economic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-vix">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  VIX (Korku Endeksi)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {economicLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : economic && economic.vix !== null ? (
                  <div className="space-y-2">
                    <span className={`text-3xl font-bold ${
                      economic.vix > 30 ? 'text-red-500' : 
                      economic.vix > 20 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {economic.vix.toFixed(1)}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {economic.vix > 30 ? 'Yuksek korku' : 
                       economic.vix > 20 ? 'Normal' : 'Dusuk korku'}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-yield-curve">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Verim Egrisi (10Y-2Y)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {economicLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : economic && economic.yieldCurve !== null ? (
                  <div className="space-y-2">
                    <span className={`text-3xl font-bold ${
                      economic.yieldCurve < 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {economic.yieldCurve.toFixed(2)}%
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {economic.yieldCurve < 0 ? 'Ters egri - Durgunluk sinyali' : 'Normal egri'}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-consumer-sentiment">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Tuketici Guveni
                </CardTitle>
              </CardHeader>
              <CardContent>
                {economicLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : economic && economic.consumerSentiment !== null ? (
                  <div className="space-y-2">
                    <span className={`text-3xl font-bold ${
                      economic.consumerSentiment > 80 ? 'text-green-500' : 
                      economic.consumerSentiment > 60 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      {economic.consumerSentiment.toFixed(0)}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {economic.consumerSentiment > 80 ? 'Guclu guven' : 
                       economic.consumerSentiment > 60 ? 'Orta guven' : 'Dusuk guven'}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-fed-rate">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Fed Faiz Orani
                </CardTitle>
              </CardHeader>
              <CardContent>
                {economicLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : economic && economic.fedRate !== null ? (
                  <div className="space-y-2">
                    <span className="text-3xl font-bold">{economic.fedRate.toFixed(2)}%</span>
                    <p className="text-sm text-muted-foreground">Etkin federal fon orani</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-unemployment">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Issizlik Orani
                </CardTitle>
              </CardHeader>
              <CardContent>
                {economicLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : economic && economic.unemployment !== null ? (
                  <div className="space-y-2">
                    <span className={`text-3xl font-bold ${
                      economic.unemployment > 6 ? 'text-red-500' : 
                      economic.unemployment > 4 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      %{economic.unemployment.toFixed(1)}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {economic.unemployment > 6 ? 'Yuksek' : 
                       economic.unemployment > 4 ? 'Normal' : 'Dusuk'}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-fear-greed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Korku/Acgozluluk
                </CardTitle>
              </CardHeader>
              <CardContent>
                {economicLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : economic?.fearGreedSignal ? (
                  <div className="space-y-2">
                    <Badge variant={
                      economic.fearGreedSignal === 'extreme_fear' ? 'destructive' :
                      economic.fearGreedSignal === 'fear' ? 'secondary' :
                      economic.fearGreedSignal === 'extreme_greed' ? 'default' : 'outline'
                    } className="text-lg px-3 py-1">
                      {economic.fearGreedSignal === 'extreme_fear' ? 'ASIRI KORKU' :
                       economic.fearGreedSignal === 'fear' ? 'KORKU' :
                       economic.fearGreedSignal === 'extreme_greed' ? 'ASIRI ACGOZLULUK' :
                       economic.fearGreedSignal === 'greed' ? 'ACGOZLULUK' : 'NOTR'}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {economic.fearGreedSignal.includes('fear') ? 'Kontrarian alim firsati' : 
                       economic.fearGreedSignal.includes('greed') ? 'Dikkatli ol' : 'Dengeli piyasa'}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sam" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-night-owl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Night Owl Indikatoru
                </CardTitle>
                <CardDescription>02:00-05:00 aktivite analizi</CardDescription>
              </CardHeader>
              <CardContent>
                {samLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : sam?.nightOwl ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Panik Indikatoru</span>
                      <span className={`text-xl font-bold ${
                        sam.nightOwl.panicIndicator > 0.7 ? 'text-red-500' : 
                        sam.nightOwl.panicIndicator > 0.4 ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        %{(sam.nightOwl.panicIndicator * 100).toFixed(0)}
                      </span>
                    </div>
                    <Progress value={sam.nightOwl.panicIndicator * 100} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duygu Uyumsuzlugu</span>
                      <span className="text-lg font-medium">
                        %{(sam.nightOwl.sentimentDissonance * 100).toFixed(0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Gece Aktivitesi</span>
                      <span className="text-lg font-medium">
                        %{(sam.nightOwl.nightActivityRatio * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-dfi">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Dream Fear Index
                </CardTitle>
                <CardDescription>Ruya korku/umut analizi</CardDescription>
              </CardHeader>
              <CardContent>
                {samLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : sam?.dfi ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">DFI Skoru</span>
                      <span className={`text-3xl font-bold ${
                        sam.dfi.score > 20 ? 'text-green-500' : 
                        sam.dfi.score < -20 ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {sam.dfi.score > 0 ? '+' : ''}{sam.dfi.score.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {sam.dfi.score > 20 ? 'Umut hakim - Yukselis sinyali' : 
                       sam.dfi.score < -20 ? 'Korku hakim - Dusus riski' : 'Dengeli'}
                    </p>
                    <Badge variant="outline">
                      Trend: {sam.dfi.trend === 'up' ? 'Yukseliyor' : 
                              sam.dfi.trend === 'down' ? 'Dusuyor' : 'Yatay'}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-social-sentiment">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Sosyal Duygu
                </CardTitle>
                <CardDescription>Twitter, Reddit, StockTwits</CardDescription>
              </CardHeader>
              <CardContent>
                {samLoading ? (
                  <Activity className="h-6 w-6 animate-pulse" />
                ) : sam?.socialSentiment !== undefined ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Genel Duygu</span>
                      <span className={`text-3xl font-bold ${
                        sam.socialSentiment > 0.2 ? 'text-green-500' : 
                        sam.socialSentiment < -0.2 ? 'text-red-500' : 'text-yellow-500'
                      }`}>
                        {sam.socialSentiment > 0 ? '+' : ''}{(sam.socialSentiment * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={50 + sam.socialSentiment * 50} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      {sam.socialSentiment > 0.2 ? 'Pozitif - Yukselis beklentisi' : 
                       sam.socialSentiment < -0.2 ? 'Negatif - Dusus beklentisi' : 'Notr'}
                    </p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Veri yok</span>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="action" className="space-y-4">
          {signal ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card data-testid="card-trade-action">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Islem Onerileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="font-medium">Islem Yap</span>
                    <Badge variant={signal.action.shouldTrade ? "default" : "secondary"}>
                      {signal.action.shouldTrade ? "EVET" : "HAYIR"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pozisyon Carpani</span>
                    <span className="font-medium">x{signal.action.positionSizeMultiplier.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Giris Zamani</span>
                    <span className="font-medium">{signal.action.entryTiming}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stop Loss</span>
                    <span className="font-medium text-red-500">%{signal.action.stopLossPercent.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Take Profit</span>
                    <span className="font-medium text-green-500">%{signal.action.takeProfitPercent.toFixed(1)}</span>
                  </div>
                  <Separator />
                  <p className="text-sm text-muted-foreground">{signal.action.reason}</p>
                </CardContent>
              </Card>

              <Card data-testid="card-factors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Faktorler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {signal.bullishFactors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                            <ArrowUpRight className="h-4 w-4" />
                            Yukselis Faktorleri
                          </h4>
                          <ul className="space-y-1">
                            {signal.bullishFactors.map((f, i) => (
                              <li key={i} className="text-sm text-muted-foreground pl-5">• {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {signal.bearishFactors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                            <ArrowDownRight className="h-4 w-4" />
                            Dusus Faktorleri
                          </h4>
                          <ul className="space-y-1">
                            {signal.bearishFactors.map((f, i) => (
                              <li key={i} className="text-sm text-muted-foreground pl-5">• {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {signal.riskFactors.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-yellow-500 mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Risk Faktorleri
                          </h4>
                          <ul className="space-y-1">
                            {signal.riskFactors.map((f, i) => (
                              <li key={i} className="text-sm text-muted-foreground pl-5">• {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aksiyon onerileri yuklenemedi
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="backtest" className="space-y-4">
          {backtestLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Activity className="h-8 w-8 animate-pulse" />
            </div>
          ) : backtest ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card data-testid="card-total-trades">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Toplam Islem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-3xl font-bold">{backtest.overallStats.totalTrades}</span>
                    <p className="text-sm text-muted-foreground">{backtest.period}</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-overall-winrate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Genel Basari</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className={`text-3xl font-bold ${
                      backtest.overallStats.overallWinRate >= 60 ? 'text-green-500' :
                      backtest.overallStats.overallWinRate >= 50 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      %{backtest.overallStats.overallWinRate.toFixed(1)}
                    </span>
                  </CardContent>
                </Card>

                <Card data-testid="card-optimal-winrate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Optimal Seanslar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-3xl font-bold text-green-500">
                      %{backtest.overallStats.optimalSessionWinRate.toFixed(1)}
                    </span>
                    <p className="text-sm text-muted-foreground">London, NY AM/PM</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-nonoptimal-winrate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Diger Seanslar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className={`text-3xl font-bold ${
                      backtest.overallStats.nonOptimalSessionWinRate >= 50 ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                      %{backtest.overallStats.nonOptimalSessionWinRate.toFixed(1)}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Fark: {backtest.overallStats.optimalVsNonOptimalDiff > 0 ? '+' : ''}
                      {backtest.overallStats.optimalVsNonOptimalDiff.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="card-session-breakdown">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Seans Bazli Performans
                  </CardTitle>
                  <CardDescription>Her seans icin ayri basari oranlari</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {backtest.sessions.map((s) => (
                      <div key={s.session} className="flex items-center gap-4" data-testid={`row-session-${s.session}`}>
                        <div className="w-32 flex items-center gap-2">
                          {s.isOptimal && <Badge variant="default" className="text-xs">OPTIMAL</Badge>}
                          <span className="text-sm font-medium">{s.sessionNameTR}</span>
                        </div>
                        <div className="flex-1">
                          <Progress 
                            value={s.winRate} 
                            className={`h-4 ${s.isOptimal ? 'bg-primary/20' : 'bg-muted'}`}
                          />
                        </div>
                        <div className="w-20 text-right">
                          <span className={`font-bold ${
                            s.winRate >= 60 ? 'text-green-500' :
                            s.winRate >= 50 ? 'text-yellow-500' : 'text-red-500'
                          }`}>
                            %{s.winRate.toFixed(0)}
                          </span>
                        </div>
                        <div className="w-16 text-right text-sm text-muted-foreground">
                          {s.totalTrades} islem
                        </div>
                        <div className="w-20 text-right">
                          <span className={`text-sm ${
                            s.performanceVsExpected > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {s.performanceVsExpected > 0 ? '+' : ''}{s.performanceVsExpected.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-recommendations">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Oneriler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {backtest.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Backtest verileri yuklenemedi
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
