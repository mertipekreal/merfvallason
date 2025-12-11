import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Activity, 
  BarChart3,
  RefreshCcw,
  Search,
  AlertTriangle,
  Brain,
  MessageSquare,
  Shield,
  Zap,
  Globe,
  Building,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface BistMarketSummary {
  bist100: { value: number; change: number; changePercent: number };
  bist30: { value: number; change: number; changePercent: number };
  bist50: { value: number; change: number; changePercent: number };
  timestamp: string;
}

interface CurrencyRate {
  symbol: string;
  buying: number;
  selling: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
}

interface SectorPerformance {
  sector: string;
  performance: number;
  topStocks: string[];
}

interface TechnicalAnalysis {
  symbol: string;
  indicators: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    sma20: number;
    sma50: number;
    bollingerBands: { upper: number; middle: number; lower: number };
  };
  signals: Array<{ type: string; signal: 'buy' | 'sell' | 'hold'; strength: number }>;
  overall: 'bullish' | 'bearish' | 'neutral';
}

interface MLPrediction {
  symbol: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  horizon: string;
  direction: 'up' | 'down' | 'sideways';
  signals: string[];
}

interface RiskMetrics {
  var95: number;
  var99: number;
  sharpeRatio: number;
  beta: number;
  maxDrawdown: number;
  volatility: number;
}

interface SentimentData {
  overall: number;
  bullish: number;
  bearish: number;
  neutral: number;
  trending: string[];
  topMentions: Array<{ symbol: string; mentions: number; sentiment: number }>;
}

export default function MarketDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("THYAO");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: marketData, isLoading: marketLoading } = useQuery<BistMarketSummary>({
    queryKey: ['/api/bist/market'],
    refetchInterval: 60000,
  });

  const { data: currencies } = useQuery<{ rates: CurrencyRate[] }>({
    queryKey: ['/api/bist/currencies'],
    refetchInterval: 60000,
  });

  const { data: gainers } = useQuery<{ stocks: StockQuote[] }>({
    queryKey: ['/api/bist/gainers'],
  });

  const { data: losers } = useQuery<{ stocks: StockQuote[] }>({
    queryKey: ['/api/bist/losers'],
  });

  const { data: sectors } = useQuery<{ sectors: SectorPerformance[] }>({
    queryKey: ['/api/bist/sectors'],
  });

  const { data: technicals } = useQuery<TechnicalAnalysis>({
    queryKey: ['/api/bist/technicals', selectedSymbol],
    enabled: !!selectedSymbol,
  });

  const { data: mlPrediction } = useQuery<MLPrediction>({
    queryKey: ['/api/ml/predict', selectedSymbol],
    enabled: !!selectedSymbol,
  });

  const { data: riskMetrics } = useQuery<RiskMetrics>({
    queryKey: ['/api/risk/metrics', selectedSymbol],
    enabled: !!selectedSymbol,
  });

  const { data: sentiment } = useQuery<SentimentData>({
    queryKey: ['/api/sentiment/market'],
  });

  const { data: searchResults } = useQuery<{ results: Array<{ symbol: string; name: string }> }>({
    queryKey: ['/api/bist/search', searchQuery],
    enabled: searchQuery.length >= 2,
  });

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(decimals) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(decimals) + "M";
    if (num >= 1000) return (num / 1000).toFixed(decimals) + "K";
    return num.toFixed(decimals);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const getChangeBg = (change: number) => {
    if (change > 0) return "bg-green-500/10";
    if (change < 0) return "bg-red-500/10";
    return "bg-muted";
  };

  const getRsiColor = (rsi: number) => {
    if (rsi >= 70) return "text-red-500";
    if (rsi <= 30) return "text-green-500";
    return "text-yellow-500";
  };

  const getSignalBadge = (signal: 'buy' | 'sell' | 'hold' | 'bullish' | 'bearish' | 'neutral') => {
    switch (signal) {
      case 'buy':
      case 'bullish':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Al</Badge>;
      case 'sell':
      case 'bearish':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Sat</Badge>;
      default:
        return <Badge variant="secondary">Bekle</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="market-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Piyasa Gösterge Paneli</h1>
          <p className="text-muted-foreground">BIST, teknik analiz, ML tahminleri ve risk metrikleri</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hisse ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
              data-testid="input-search-symbol"
            />
            {searchResults?.results && searchResults.results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
                {searchResults.results.map((result) => (
                  <button
                    key={result.symbol}
                    className="w-full text-left px-3 py-2 hover-elevate"
                    onClick={() => {
                      setSelectedSymbol(result.symbol);
                      setSearchQuery("");
                    }}
                    data-testid={`search-result-${result.symbol}`}
                  >
                    <span className="font-medium">{result.symbol}</span>
                    <span className="text-muted-foreground text-sm ml-2">{result.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-32" data-testid="select-symbol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="THYAO">THYAO</SelectItem>
              <SelectItem value="GARAN">GARAN</SelectItem>
              <SelectItem value="AKBNK">AKBNK</SelectItem>
              <SelectItem value="SISE">SISE</SelectItem>
              <SelectItem value="KCHOL">KCHOL</SelectItem>
              <SelectItem value="TUPRS">TUPRS</SelectItem>
              <SelectItem value="EREGL">EREGL</SelectItem>
              <SelectItem value="BIMAS">BIMAS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card data-testid="card-bist100">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BIST 100</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {marketLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-bist100-value">
                  {marketData?.bist100?.value?.toLocaleString('tr-TR') || '---'}
                </div>
                <div className={`flex items-center gap-1 text-sm ${getChangeColor(marketData?.bist100?.changePercent || 0)}`}>
                  {(marketData?.bist100?.changePercent || 0) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span data-testid="text-bist100-change">
                    {(marketData?.bist100?.changePercent || 0).toFixed(2)}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-bist30">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BIST 30</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {marketLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-bist30-value">
                  {marketData?.bist30?.value?.toLocaleString('tr-TR') || '---'}
                </div>
                <div className={`flex items-center gap-1 text-sm ${getChangeColor(marketData?.bist30?.changePercent || 0)}`}>
                  {(marketData?.bist30?.changePercent || 0) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span data-testid="text-bist30-change">
                    {(marketData?.bist30?.changePercent || 0).toFixed(2)}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-bist50">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BIST 50</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {marketLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-bist50-value">
                  {marketData?.bist50?.value?.toLocaleString('tr-TR') || '---'}
                </div>
                <div className={`flex items-center gap-1 text-sm ${getChangeColor(marketData?.bist50?.changePercent || 0)}`}>
                  {(marketData?.bist50?.changePercent || 0) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span data-testid="text-bist50-change">
                    {(marketData?.bist50?.changePercent || 0).toFixed(2)}%
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-usdtry">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USD/TRY</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-usdtry-value">
              {currencies?.rates?.find(r => r.symbol === 'USD/TRY')?.selling?.toFixed(4) || '---'}
            </div>
            <div className={`flex items-center gap-1 text-sm ${getChangeColor(currencies?.rates?.find(r => r.symbol === 'USD/TRY')?.changePercent || 0)}`}>
              {(currencies?.rates?.find(r => r.symbol === 'USD/TRY')?.changePercent || 0) >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span data-testid="text-usdtry-change">
                {(currencies?.rates?.find(r => r.symbol === 'USD/TRY')?.changePercent || 0).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-eurtry">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EUR/TRY</CardTitle>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-eurtry-value">
              {currencies?.rates?.find(r => r.symbol === 'EUR/TRY')?.selling?.toFixed(4) || '---'}
            </div>
            <div className={`flex items-center gap-1 text-sm ${getChangeColor(currencies?.rates?.find(r => r.symbol === 'EUR/TRY')?.changePercent || 0)}`}>
              {(currencies?.rates?.find(r => r.symbol === 'EUR/TRY')?.changePercent || 0) >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span data-testid="text-eurtry-change">
                {(currencies?.rates?.find(r => r.symbol === 'EUR/TRY')?.changePercent || 0).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-sentiment">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Piyasa Duygusu</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sentiment-score">
              {sentiment?.overall?.toFixed(0) || 50}
            </div>
            <Progress value={sentiment?.overall || 50} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {(sentiment?.overall || 50) >= 60 ? 'Olumlu' : (sentiment?.overall || 50) <= 40 ? 'Olumsuz' : 'Nötr'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              En Çok Yükselenler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(gainers?.stocks || []).slice(0, 5).map((stock, idx) => (
                <div 
                  key={stock.symbol}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  data-testid={`gainer-${stock.symbol}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-500">{idx + 1}</span>
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground">{stock.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" data-testid={`text-price-${stock.symbol}`}>{stock.price?.toFixed(2)} TL</p>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid={`badge-change-${stock.symbol}`}>
                      +{stock.changePercent?.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
              {(!gainers?.stocks || gainers.stocks.length === 0) && (
                <div className="text-center py-8 text-muted-foreground" data-testid="loading-gainers">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Veri yükleniyor...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              En Çok Düşenler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(losers?.stocks || []).slice(0, 5).map((stock, idx) => (
                <div 
                  key={stock.symbol}
                  className="flex items-center justify-between p-2 rounded-lg border hover-elevate cursor-pointer"
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  data-testid={`loser-${stock.symbol}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-500">{idx + 1}</span>
                    <p className="font-medium text-sm">{stock.symbol}</p>
                  </div>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30" data-testid={`badge-loser-${stock.symbol}`}>
                    {stock.changePercent?.toFixed(2)}%
                  </Badge>
                </div>
              ))}
              {(!losers?.stocks || losers.stocks.length === 0) && (
                <div className="text-center py-4 text-muted-foreground" data-testid="loading-losers">
                  <p className="text-sm">Veri yükleniyor...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="technical" className="space-y-4">
        <TabsList>
          <TabsTrigger value="technical" data-testid="tab-technical">
            <BarChart3 className="w-4 h-4 mr-2" />
            Teknik Analiz
          </TabsTrigger>
          <TabsTrigger value="ml" data-testid="tab-ml">
            <Brain className="w-4 h-4 mr-2" />
            ML Tahmin
          </TabsTrigger>
          <TabsTrigger value="risk" data-testid="tab-risk">
            <Shield className="w-4 h-4 mr-2" />
            Risk Metrikleri
          </TabsTrigger>
          <TabsTrigger value="sentiment" data-testid="tab-sentiment">
            <MessageSquare className="w-4 h-4 mr-2" />
            Sosyal Duygu
          </TabsTrigger>
          <TabsTrigger value="sectors" data-testid="tab-sectors">
            <Building className="w-4 h-4 mr-2" />
            Sektörler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {selectedSymbol} - Teknik Göstergeler
              </CardTitle>
              <CardDescription>RSI, MACD, Bollinger Bantları ve hareketli ortalamalar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">RSI (14)</p>
                  <p className={`text-2xl font-bold ${getRsiColor(technicals?.indicators?.rsi || 50)}`} data-testid="text-rsi">
                    {technicals?.indicators?.rsi?.toFixed(2) || '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(technicals?.indicators?.rsi || 50) >= 70 ? 'Aşırı Alım' : 
                     (technicals?.indicators?.rsi || 50) <= 30 ? 'Aşırı Satım' : 'Nötr'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">MACD</p>
                  <p className={`text-2xl font-bold ${getChangeColor(technicals?.indicators?.macd?.histogram || 0)}`} data-testid="text-macd">
                    {technicals?.indicators?.macd?.value?.toFixed(2) || '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sinyal: {technicals?.indicators?.macd?.signal?.toFixed(2) || '--'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">SMA 20</p>
                  <p className="text-2xl font-bold" data-testid="text-sma20">
                    {technicals?.indicators?.sma20?.toFixed(2) || '--'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">SMA 50</p>
                  <p className="text-2xl font-bold" data-testid="text-sma50">
                    {technicals?.indicators?.sma50?.toFixed(2) || '--'}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <p className="font-medium">Teknik Sinyaller</p>
                <div className="flex flex-wrap gap-2">
                  {technicals?.signals?.map((signal, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border">
                      <span className="text-sm">{signal.type}</span>
                      {getSignalBadge(signal.signal)}
                    </div>
                  ))}
                  {(!technicals?.signals || technicals.signals.length === 0) && (
                    <p className="text-sm text-muted-foreground">Sinyal verisi bekleniyor...</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm font-medium">Genel Görünüm:</span>
                {technicals?.overall && getSignalBadge(technicals.overall)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ml" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                {selectedSymbol} - ML Fiyat Tahmini
              </CardTitle>
              <CardDescription>Makine öğrenimi tabanlı fiyat tahmini</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Mevcut Fiyat</p>
                  <p className="text-2xl font-bold" data-testid="text-current-price">
                    {mlPrediction?.currentPrice?.toFixed(2) || '--'} TL
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Tahmini Fiyat</p>
                  <p className={`text-2xl font-bold ${getChangeColor((mlPrediction?.predictedPrice || 0) - (mlPrediction?.currentPrice || 0))}`} data-testid="text-predicted-price">
                    {mlPrediction?.predictedPrice?.toFixed(2) || '--'} TL
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Horizon: {mlPrediction?.horizon || '7 gün'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Güven Oranı</p>
                  <p className="text-2xl font-bold" data-testid="text-confidence">
                    {((mlPrediction?.confidence || 0) * 100).toFixed(0)}%
                  </p>
                  <Progress value={(mlPrediction?.confidence || 0) * 100} className="mt-2" />
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Yön</p>
                  <div className="flex items-center gap-2">
                    {mlPrediction?.direction === 'up' ? (
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    ) : mlPrediction?.direction === 'down' ? (
                      <TrendingDown className="w-8 h-8 text-red-500" />
                    ) : (
                      <Activity className="w-8 h-8 text-yellow-500" />
                    )}
                    <span className="text-lg font-medium capitalize">
                      {mlPrediction?.direction === 'up' ? 'Yükseliş' : 
                       mlPrediction?.direction === 'down' ? 'Düşüş' : 'Yatay'}
                    </span>
                  </div>
                </div>
              </div>

              {mlPrediction?.signals && mlPrediction.signals.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <p className="font-medium">ML Sinyalleri</p>
                    <div className="flex flex-wrap gap-2">
                      {mlPrediction.signals.map((signal, idx) => (
                        <Badge key={idx} variant="outline">{signal}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {selectedSymbol} - Risk Metrikleri
              </CardTitle>
              <CardDescription>VaR, Sharpe oranı ve volatilite analizi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">VaR (95%)</p>
                  <p className="text-2xl font-bold text-red-400" data-testid="text-var95">
                    {riskMetrics?.var95?.toFixed(2) || '--'}%
                  </p>
                  <p className="text-xs text-muted-foreground">Günlük maksimum kayıp</p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">VaR (99%)</p>
                  <p className="text-2xl font-bold text-red-400" data-testid="text-var99">
                    {riskMetrics?.var99?.toFixed(2) || '--'}%
                  </p>
                  <p className="text-xs text-muted-foreground">En kötü senaryo</p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Sharpe Oranı</p>
                  <p className={`text-2xl font-bold ${(riskMetrics?.sharpeRatio || 0) >= 1 ? 'text-green-500' : (riskMetrics?.sharpeRatio || 0) >= 0 ? 'text-yellow-500' : 'text-red-500'}`} data-testid="text-sharpe">
                    {riskMetrics?.sharpeRatio?.toFixed(2) || '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">Risk-getiri dengesi</p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Beta</p>
                  <p className="text-2xl font-bold" data-testid="text-beta">
                    {riskMetrics?.beta?.toFixed(2) || '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">Piyasa hassasiyeti</p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Maks. Düşüş</p>
                  <p className="text-2xl font-bold text-red-400" data-testid="text-maxdrawdown">
                    {riskMetrics?.maxDrawdown?.toFixed(2) || '--'}%
                  </p>
                  <p className="text-xs text-muted-foreground">Tarihsel en yüksek kayıp</p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Volatilite</p>
                  <p className="text-2xl font-bold" data-testid="text-volatility">
                    {riskMetrics?.volatility?.toFixed(2) || '--'}%
                  </p>
                  <p className="text-xs text-muted-foreground">Yıllık standart sapma</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm text-yellow-200">
                  Risk metrikleri geçmiş performansa dayalıdır ve gelecekteki sonuçları garanti etmez.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Sosyal Medya Duygu Analizi
              </CardTitle>
              <CardDescription>Twitter, Reddit ve finans forumlarından duygu analizi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Genel Duygu</p>
                  <p className="text-3xl font-bold" data-testid="text-overall-sentiment">
                    {sentiment?.overall?.toFixed(0) || 50}
                  </p>
                  <Progress value={sentiment?.overall || 50} className="mt-2" />
                </div>

                <div className="p-4 rounded-lg border bg-green-500/10">
                  <p className="text-sm text-muted-foreground mb-1">Olumlu</p>
                  <p className="text-2xl font-bold text-green-500" data-testid="text-bullish">
                    {sentiment?.bullish?.toFixed(0) || 0}%
                  </p>
                </div>

                <div className="p-4 rounded-lg border bg-red-500/10">
                  <p className="text-sm text-muted-foreground mb-1">Olumsuz</p>
                  <p className="text-2xl font-bold text-red-500" data-testid="text-bearish">
                    {sentiment?.bearish?.toFixed(0) || 0}%
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Nötr</p>
                  <p className="text-2xl font-bold" data-testid="text-neutral">
                    {sentiment?.neutral?.toFixed(0) || 0}%
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="font-medium mb-3">Trend Konular</p>
                  <div className="flex flex-wrap gap-2">
                    {sentiment?.trending?.map((topic, idx) => (
                      <Badge key={idx} variant="outline" className="text-primary">
                        #{topic}
                      </Badge>
                    ))}
                    {(!sentiment?.trending || sentiment.trending.length === 0) && (
                      <p className="text-sm text-muted-foreground">Trend konusu bulunamadı</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-3">En Çok Bahsedilenler</p>
                  <div className="space-y-2">
                    {sentiment?.topMentions?.slice(0, 5).map((mention, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-medium">{mention.symbol}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{mention.mentions} bahis</span>
                          <Badge className={mention.sentiment >= 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                            {mention.sentiment}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sectors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Sektör Performansları
              </CardTitle>
              <CardDescription>BIST sektör bazlı performans analizi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sectors?.sectors?.map((sector, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-lg border ${getChangeBg(sector.performance)}`}
                    data-testid={`sector-${sector.sector}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{sector.sector}</p>
                      <span className={`font-bold ${getChangeColor(sector.performance)}`}>
                        {sector.performance >= 0 ? '+' : ''}{sector.performance?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sector.topStocks?.slice(0, 3).map((stock) => (
                        <Badge key={stock} variant="secondary" className="text-xs">
                          {stock}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {(!sectors?.sectors || sectors.sectors.length === 0) && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sektör verisi yükleniyor...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
