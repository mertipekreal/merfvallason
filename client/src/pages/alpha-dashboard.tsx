import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Moon,
  Sun,
  Brain,
  BarChart3,
  Calendar,
  AlertTriangle,
  RefreshCcw,
  ChevronRight,
  Eye,
  Layers,
  Zap,
  Cloud,
  Sparkles,
  Target,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

interface AlphaDashboardData {
  marketDirection: {
    direction: 'up' | 'down' | 'neutral';
    confidenceScore: number;
    expectedReturn: number;
    riskLevel: 'low' | 'medium' | 'high';
    signalStrength: 'weak' | 'moderate' | 'strong';
    primaryMessage: string;
    secondaryMessage: string;
  };
  layerBreakdown: {
    hardDataScore: number;
    technicalScore: number;
    samScore: number;
    economicScore: number;
    emotionScore: number;
    microstructureScore: number;
    weights: {
      hard: number;
      technical: number;
      sam: number;
      economic: number;
      emotion: number;
      microstructure: number;
    };
  };
  nightOwlStatus: {
    activityLevel: number;
    isActive: boolean;
    panicIndicator: number;
    marketSignal: 'fear' | 'neutral' | 'greed';
    interpretation: string;
    nightPosts: number;
    totalPosts: number;
  };
  dreamMarket: {
    fearIndex: number;
    hopeIndex: number;
    netScore: number;
    dominantThemes: string[];
    marketCorrelation: string;
    dreamsAnalyzed: number;
  };
  economicCalendar: {
    vixLevel: number;
    fearGreedIndex: number;
    yieldCurve: number;
    marketRegime: string;
    upcomingEvents: Array<{
      event: string;
      date: string;
      impact: 'low' | 'medium' | 'high';
    }>;
  };
  keyFactors: {
    bullish: string[];
    bearish: string[];
    uncertainty: string[];
  };
  timestamp: Date;
  modelVersion: string;
}

interface NightOwlWidgetData {
  activityRatio: number;
  nightSentiment: number;
  daySentiment: number;
  sentimentDissonance: number;
  panicIndicator: number;
  fearKeywords: string[];
  nightPosts: number;
  totalPosts: number;
  marketSignal: 'fear' | 'neutral' | 'greed';
  interpretation: string;
  hourlyActivity: Array<{ hour: number; count: number; sentiment: number }>;
  isNightOwlWindow: boolean;
}

interface DreamMarketWidgetData {
  fearRatio: number;
  hopeRatio: number;
  netFearScore: number;
  dominantThemes: string[];
  marketCorrelation: string;
  hvdcCategories: Array<{ category: string; count: number; percentage: number }>;
  historicalCorrelation: number;
  dreamCount: number;
  recentDreams: Array<{
    title: string;
    emotion: string;
    fearLevel: number;
    timestamp: Date;
  }>;
}

function FlipCard({ 
  front, 
  back, 
  isFlipped, 
  onFlip 
}: { 
  front: React.ReactNode; 
  back: React.ReactNode; 
  isFlipped: boolean; 
  onFlip: () => void;
}) {
  return (
    <div 
      className="relative w-full h-full perspective-1000"
      style={{ perspective: '1000px' }}
    >
      <div 
        className={`relative w-full h-full transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        <div 
          className="absolute w-full h-full backface-hidden"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {front}
        </div>
        <div 
          className="absolute w-full h-full backface-hidden rotate-y-180"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}

function MarketDirectionCard({ 
  data, 
  isFlipped, 
  onFlip,
  isLoading
}: { 
  data?: AlphaDashboardData; 
  isFlipped: boolean; 
  onFlip: () => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  const direction = data?.marketDirection?.direction ?? 'neutral';
  const confidence = data?.marketDirection?.confidenceScore ?? 50;
  const signalStrength = data?.marketDirection?.signalStrength ?? 'moderate';
  
  const directionColors = {
    up: 'text-emerald-400',
    down: 'text-rose-400',
    neutral: 'text-amber-400'
  };
  
  const directionBg = {
    up: 'bg-emerald-500/10 border-emerald-500/20',
    down: 'bg-rose-500/10 border-rose-500/20',
    neutral: 'bg-amber-500/10 border-amber-500/20'
  };
  
  const directionIcon = {
    up: <TrendingUp className="w-10 h-10" />,
    down: <TrendingDown className="w-10 h-10" />,
    neutral: <Activity className="w-10 h-10" />
  };
  
  const directionText = {
    up: 'YUKARI',
    down: 'ASAGI',
    neutral: 'YATAY'
  };

  const front = (
    <Card className={`h-full border ${directionBg[direction]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Piyasa Yonu
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onFlip}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-flip-market"
          >
            <Info className="w-4 h-4 mr-1" />
            Neden?
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-xl ${directionBg[direction]} ${directionColors[direction]}`}>
            {directionIcon[direction]}
          </div>
          <div className="flex-1">
            <p className={`text-3xl font-bold ${directionColors[direction]}`} data-testid="text-market-direction">
              {directionText[direction]}
            </p>
            <p className="text-sm text-muted-foreground">
              {signalStrength === 'strong' ? 'Guclu sinyal' : signalStrength === 'moderate' ? 'Orta sinyal' : 'Zayif sinyal'}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Guven Skoru</span>
            <span className="font-semibold" data-testid="text-confidence">{confidence}%</span>
          </div>
          <Progress value={confidence} className="h-2" />
        </div>
        
        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium" data-testid="text-primary-message">
            {data?.marketDirection?.primaryMessage ?? 'Analiz yukleniyor...'}
          </p>
          <p className="text-xs text-muted-foreground" data-testid="text-secondary-message">
            {data?.marketDirection?.secondaryMessage ?? ''}
          </p>
        </div>
        
        {data?.marketDirection?.riskLevel && (
          <Badge 
            className={
              data.marketDirection.riskLevel === 'high' 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                : data.marketDirection.riskLevel === 'medium'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }
            data-testid="badge-risk-level"
          >
            Risk: {data.marketDirection.riskLevel === 'high' ? 'Yuksek' : data.marketDirection.riskLevel === 'medium' ? 'Orta' : 'Dusuk'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  const back = (
    <Card className="h-full border border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            6 Katmanli Analiz
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onFlip}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-flip-back"
          >
            <ChevronRight className="w-4 h-4 mr-1" />
            Geri
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <LayerBar label="Hard Data" score={data?.layerBreakdown?.hardDataScore ?? 50} weight={30} color="bg-blue-500" />
        <LayerBar label="Technical" score={data?.layerBreakdown?.technicalScore ?? 50} weight={25} color="bg-cyan-500" />
        <LayerBar label="SAM" score={data?.layerBreakdown?.samScore ?? 50} weight={25} color="bg-purple-500" />
        <LayerBar label="Economic" score={data?.layerBreakdown?.economicScore ?? 50} weight={10} color="bg-amber-500" />
        <LayerBar label="Emotion" score={data?.layerBreakdown?.emotionScore ?? 50} weight={5} color="bg-rose-500" />
        <LayerBar label="Microstructure" score={data?.layerBreakdown?.microstructureScore ?? 50} weight={5} color="bg-emerald-500" />
        
        <Separator className="my-2" />
        <p className="text-xs text-muted-foreground text-center">
          Model: {data?.modelVersion ?? 'alpha-v1.0.0'}
        </p>
      </CardContent>
    </Card>
  );

  return <FlipCard front={front} back={back} isFlipped={isFlipped} onFlip={onFlip} />;
}

function LayerBar({ label, score, weight, color }: { label: string; score: number; weight: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{score.toFixed(0)}%</span>
          <span className="text-muted-foreground/60">({weight}%)</span>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function NightOwlWidget({ data, isLoading }: { data?: NightOwlWidgetData; isLoading: boolean }) {
  const currentHour = new Date().getHours();
  const isNightOwlWindow = currentHour >= 2 && currentHour < 5;
  
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const activityLevel = data?.activityRatio ?? 0;
  const panicIndicator = data?.panicIndicator ?? 0;
  const marketSignal = data?.marketSignal ?? 'neutral';
  
  const signalColors = {
    fear: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    neutral: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    greed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  };

  return (
    <Card className={`h-full border ${isNightOwlWindow ? 'border-purple-500/30 bg-purple-950/20' : 'border-border'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Moon className="w-4 h-4 text-purple-400" />
            Night Owl
          </CardTitle>
          {isNightOwlWindow && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Aktif
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">02:00-05:00 aktivitesi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${signalColors[marketSignal]}`}>
            {marketSignal === 'fear' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : marketSignal === 'greed' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <Activity className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xl font-bold" data-testid="text-night-activity">
              {(activityLevel * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Gece aktivitesi</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Panik Gostergesi</span>
            <span className={panicIndicator > 0.6 ? 'text-rose-400' : 'text-muted-foreground'}>
              {(panicIndicator * 100).toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={panicIndicator * 100} 
            className="h-1.5"
          />
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-night-interpretation">
          {data?.interpretation ?? 'Gece aktivite verisi bekleniyor...'}
        </p>
        
        {data?.fearKeywords && data.fearKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.fearKeywords.slice(0, 3).map((keyword, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DreamMarketWidget({ data, isLoading }: { data?: DreamMarketWidgetData; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const fearRatio = data?.fearRatio ?? 0.5;
  const netFearScore = data?.netFearScore ?? 0;
  const dominantThemes = data?.dominantThemes ?? [];
  
  const fearLevel = netFearScore > 0.3 ? 'high' : netFearScore < -0.3 ? 'low' : 'neutral';
  
  const fearColors = {
    high: 'text-rose-400',
    neutral: 'text-amber-400',
    low: 'text-emerald-400'
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-400" />
            Dream-Market
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {data?.dreamCount ?? 0} ruya
          </Badge>
        </div>
        <CardDescription className="text-xs">Kolektif bilincalti analizi</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-rose-400" data-testid="text-fear-ratio">
              {(fearRatio * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Korku</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center flex-1">
            <p className="text-lg font-bold text-emerald-400" data-testid="text-hope-ratio">
              {((1 - fearRatio) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Umut</p>
          </div>
        </div>
        
        <div className="h-2 rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 relative">
          <div 
            className="absolute w-2 h-4 bg-white rounded-full -top-1 shadow-lg transition-all duration-500"
            style={{ left: `${(1 - fearRatio) * 100}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Baskın Temalar</p>
          <div className="flex flex-wrap gap-1">
            {dominantThemes.map((theme, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {theme}
              </Badge>
            ))}
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-dream-correlation">
          {data?.marketCorrelation ?? 'Korelasyon analizi yukleniyor...'}
        </p>
      </CardContent>
    </Card>
  );
}

function EconomicCalendarStrip({ data, isLoading }: { data?: AlphaDashboardData; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 w-24" />
            <Skeleton className="h-12 flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const vixLevel = data?.economicCalendar?.vixLevel ?? 20;
  const fearGreedIndex = data?.economicCalendar?.fearGreedIndex ?? 50;
  const yieldCurve = data?.economicCalendar?.yieldCurve ?? 0;
  const marketRegime = data?.economicCalendar?.marketRegime ?? 'neutral';
  const upcomingEvents = data?.economicCalendar?.upcomingEvents ?? [];
  
  const vixColor = vixLevel > 30 ? 'text-rose-400' : vixLevel > 20 ? 'text-amber-400' : 'text-emerald-400';
  const fgColor = fearGreedIndex < 30 ? 'text-rose-400' : fearGreedIndex > 70 ? 'text-emerald-400' : 'text-amber-400';
  const ycColor = yieldCurve < 0 ? 'text-rose-400' : 'text-emerald-400';

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">VIX</p>
              <p className={`text-xl font-bold ${vixColor}`} data-testid="text-vix-level">
                {vixLevel.toFixed(1)}
              </p>
            </div>
            
            <Separator orientation="vertical" className="h-10" />
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Korku/Acgozluluk</p>
              <p className={`text-xl font-bold ${fgColor}`} data-testid="text-fear-greed">
                {fearGreedIndex.toFixed(0)}
              </p>
            </div>
            
            <Separator orientation="vertical" className="h-10" />
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Verim Egrisi</p>
              <p className={`text-xl font-bold ${ycColor}`} data-testid="text-yield-curve">
                {yieldCurve > 0 ? '+' : ''}{yieldCurve.toFixed(2)}%
              </p>
            </div>
            
            <Separator orientation="vertical" className="h-10" />
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Rejim</p>
              <Badge variant="secondary" className="text-xs" data-testid="badge-regime">
                {marketRegime}
              </Badge>
            </div>
          </div>
          
          {upcomingEvents.length > 0 && (
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-2">
                {upcomingEvents.slice(0, 2).map((event, idx) => (
                  <div 
                    key={idx} 
                    className={`px-3 py-1.5 rounded-lg border text-xs ${
                      event.impact === 'high' 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : event.impact === 'medium'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    <p className="font-medium">{event.event}</p>
                    <p className="text-[10px] opacity-70">{new Date(event.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function KeyFactorsWidget({ data, isLoading }: { data?: AlphaDashboardData; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const bullish = data?.keyFactors?.bullish ?? [];
  const bearish = data?.keyFactors?.bearish ?? [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Onemli Faktorler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bullish.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              Yukari Yonlu
            </p>
            <ul className="space-y-1">
              {bullish.slice(0, 2).map((factor, idx) => (
                <li key={idx} className="text-xs text-muted-foreground pl-4 border-l border-emerald-500/30">
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {bearish.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-rose-400 flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              Asagi Yonlu
            </p>
            <ul className="space-y-1">
              {bearish.slice(0, 2).map((factor, idx) => (
                <li key={idx} className="text-xs text-muted-foreground pl-4 border-l border-rose-500/30">
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {bullish.length === 0 && bearish.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Faktor analizi yukleniyor...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AlphaDashboard() {
  const [isMarketFlipped, setIsMarketFlipped] = useState(false);
  
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<AlphaDashboardData>({
    queryKey: ['/api/alpha/dashboard'],
    refetchInterval: 60000,
  });
  
  const { data: nightOwlData, isLoading: nightOwlLoading } = useQuery<NightOwlWidgetData>({
    queryKey: ['/api/alpha/night-owl'],
    refetchInterval: 120000,
  });
  
  const { data: dreamMarketData, isLoading: dreamMarketLoading } = useQuery<DreamMarketWidgetData>({
    queryKey: ['/api/alpha/dream-market'],
    refetchInterval: 120000,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/alpha/refresh');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alpha/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alpha/night-owl'] });
      queryClient.invalidateQueries({ queryKey: ['/api/alpha/dream-market'] });
    }
  });

  const lastUpdated = dashboardData?.timestamp 
    ? new Date(dashboardData.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <div className="p-6 space-y-6" data-testid="alpha-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Brain className="w-7 h-7 text-primary" />
            Alpha Signals
          </h1>
          <p className="text-muted-foreground text-sm">
            6 katmanli finansal istihbarat sistemi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span data-testid="text-last-updated">Son: {lastUpdated}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="button-refresh"
          >
            <RefreshCcw className={`w-4 h-4 mr-1.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12 auto-rows-min">
        <div className="lg:col-span-6 lg:row-span-2 min-h-[320px]">
          <MarketDirectionCard 
            data={dashboardData} 
            isFlipped={isMarketFlipped}
            onFlip={() => setIsMarketFlipped(!isMarketFlipped)}
            isLoading={dashboardLoading}
          />
        </div>
        
        <div className="lg:col-span-3">
          <NightOwlWidget data={nightOwlData} isLoading={nightOwlLoading} />
        </div>
        
        <div className="lg:col-span-3">
          <DreamMarketWidget data={dreamMarketData} isLoading={dreamMarketLoading} />
        </div>
        
        <div className="lg:col-span-3">
          <KeyFactorsWidget data={dashboardData} isLoading={dashboardLoading} />
        </div>
        
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                Model Durumu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Versiyon</span>
                <span className="font-mono">{dashboardData?.modelVersion ?? 'alpha-v1.0.0'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Veri Kalitesi</span>
                <Badge variant="secondary" className="text-xs">Iyi</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Aktif Katmanlar</span>
                <span className="font-medium">6/6</span>
              </div>
              <Separator className="my-2" />
              <p className="text-[10px] text-muted-foreground">
                Hard Data, Technical, SAM, Economic, Emotion, Microstructure
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <EconomicCalendarStrip data={dashboardData} isLoading={dashboardLoading} />
    </div>
  );
}
