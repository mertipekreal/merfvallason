import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Moon, 
  Sparkles, 
  Brain, 
  History, 
  Trash2, 
  Search,
  Zap,
  MapPin,
  Heart,
  Calendar,
  Tag,
  Loader2,
  Eye,
  ChevronRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  Activity,
  Target,
  Repeat,
  Lightbulb,
  Palette,
  Image,
} from "lucide-react";
import { EnhancedDreamForm } from "@/components/enhanced-dream-form";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Dream, DejavuEntry } from "@shared/schema";

const dreamFormSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalıdır"),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalıdır"),
  location: z.string().min(1, "Mekan seçiniz"),
  emotion: z.string().min(1, "Duygu seçiniz"),
  themes: z.string().optional(),
  objects: z.string().optional(),
  intensity: z.number().min(1).max(10).default(5),
  dreamDate: z.string(),
});

const dejavuFormSchema = z.object({
  description: z.string().min(10, "Açıklama en az 10 karakter olmalıdır"),
  location: z.string().min(1, "Mekan seçiniz"),
  emotion: z.string().min(1, "Duygu seçiniz"),
  familiarity: z.number().min(1).max(10).default(5),
  triggerContext: z.string().optional(),
  entryDate: z.string(),
});

type DreamFormData = z.infer<typeof dreamFormSchema>;
type DejavuFormData = z.infer<typeof dejavuFormSchema>;

const locations = [
  { value: "ev", label: "Ev" },
  { value: "okul", label: "Okul" },
  { value: "is", label: "İş yeri" },
  { value: "dogal", label: "Doğal ortam" },
  { value: "sehir", label: "Şehir" },
  { value: "ulasim", label: "Ulaşım aracı" },
  { value: "bilinmeyen", label: "Bilinmeyen yer" },
  { value: "fantastik", label: "Fantastik mekan" },
  { value: "diger", label: "Diğer" },
];

const emotions = [
  { value: "mutlu", label: "Mutlu", color: "bg-green-500" },
  { value: "uzgun", label: "Üzgün", color: "bg-blue-500" },
  { value: "korkulu", label: "Korkulu", color: "bg-purple-500" },
  { value: "endiseli", label: "Endişeli", color: "bg-yellow-500" },
  { value: "heyecanli", label: "Heyecanlı", color: "bg-orange-500" },
  { value: "saskin", label: "Şaşkın", color: "bg-pink-500" },
  { value: "notr", label: "Nötr", color: "bg-gray-500" },
  { value: "karisik", label: "Karışık", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
];

function getEmotionLabel(value: string): string {
  return emotions.find(e => e.value === value)?.label || value;
}

function getLocationLabel(value: string): string {
  return locations.find(l => l.value === value)?.label || value;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DreamAnalysis() {
  const { toast } = useToast();
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [selectedDejavu, setSelectedDejavu] = useState<DejavuEntry | null>(null);
  const [activeTab, setActiveTab] = useState("dreams");
  const [findSelectedDreamId, setFindSelectedDreamId] = useState<string | null>(null);

  const dreamForm = useForm<DreamFormData>({
    resolver: zodResolver(dreamFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      emotion: "",
      themes: "",
      objects: "",
      intensity: 5,
      dreamDate: new Date().toISOString().split('T')[0],
    },
  });

  const dejavuForm = useForm<DejavuFormData>({
    resolver: zodResolver(dejavuFormSchema),
    defaultValues: {
      description: "",
      location: "",
      emotion: "",
      familiarity: 5,
      triggerContext: "",
      entryDate: new Date().toISOString().split('T')[0],
    },
  });

  const { data: dreamsData, isLoading: loadingDreams } = useQuery<{ success: boolean; dreams: Dream[] }>({
    queryKey: ['/api/dreams'],
  });

  const { data: dejavuData, isLoading: loadingDejavu } = useQuery<{ success: boolean; entries: DejavuEntry[] }>({
    queryKey: ['/api/dejavu'],
  });

  const { data: statsData } = useQuery<{ 
    success: boolean; 
    stats: { 
      totalDreams: number;
      totalDejavu: number;
      emotionDistribution: Record<string, number>;
      locationDistribution: Record<string, number>;
      avgDreamIntensity: number;
      avgDejavuFamiliarity: number;
    } 
  }>({
    queryKey: ['/api/dreams/stats'],
  });

  // DejaVu Likelihood query for selected dream
  const { data: likelihoodData, isLoading: loadingLikelihood } = useQuery<{
    success: boolean;
    dreamId: string;
    likelihood: {
      score: number;
      riskLevel: "low" | "medium" | "high";
      keyMotifs: string[];
      motifRiskScores: { motif: string; risk: number }[];
      emotionalIntensity: number;
      noveltyScore: number;
      repetitionScore: number;
      patternNotes: string;
    };
  }>({
    queryKey: ['/api/dreams/likelihood', selectedDream?.id],
    enabled: !!selectedDream?.id,
  });

  // DejaVu Suggestions query for "Rüyadan DejaVu Bul" tab
  const { data: suggestionsData, isLoading: loadingSuggestions } = useQuery<{
    success: boolean;
    dreamId: string;
    dreamTitle: string;
    suggestions: Array<{
      rank: number;
      dejavuId: string;
      dejavu: DejavuEntry;
      similarity: number;
      sharedMotifs: string[];
      emotionMatch: boolean;
      locationMatch: boolean;
      daysBetween: number;
      connectionStrength: 'güçlü' | 'orta' | 'zayıf';
      briefSummary: string;
    }>;
    totalDejavus: number;
  }>({
    queryKey: [`/api/dreams/${findSelectedDreamId}/suggestions`],
    enabled: !!findSelectedDreamId,
  });

  const createDreamMutation = useMutation({
    mutationFn: async (data: DreamFormData) => {
      const themes = data.themes?.split(',').map(t => t.trim()).filter(Boolean) || [];
      const objects = data.objects?.split(',').map(o => o.trim()).filter(Boolean) || [];
      
      const res = await apiRequest('POST', '/api/dreams', {
        ...data,
        themes,
        objects,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rüya kaydedildi", description: "Rüyanız başarıyla kaydedildi." });
      dreamForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/dreams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dreams/stats'] });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const createDejavuMutation = useMutation({
    mutationFn: async (data: DejavuFormData) => {
      const res = await apiRequest('POST', '/api/dejavu', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "DejaVu kaydedildi", description: "DejaVu deneyiminiz başarıyla kaydedildi." });
      dejavuForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/dejavu'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dreams/stats'] });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteDreamMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/dreams/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Silindi", description: "Rüya kaydı silindi." });
      queryClient.invalidateQueries({ queryKey: ['/api/dreams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dreams/stats'] });
      setSelectedDream(null);
    },
  });

  const deleteDejavuMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/dejavu/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Silindi", description: "DejaVu kaydı silindi." });
      queryClient.invalidateQueries({ queryKey: ['/api/dejavu'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dreams/stats'] });
      setSelectedDejavu(null);
    },
  });

  const matchMutation = useMutation({
    mutationFn: async (params: { dreamId?: string; dejavuId?: string }) => {
      const res = await apiRequest('POST', '/api/dreams/match', {
        ...params,
        topN: 5,
        minScore: 0.3,
      });
      return res.json();
    },
    onSuccess: (data: { success: boolean; matches: any[]; totalMatches: number }) => {
      const matchCount = data?.totalMatches || 0;
      toast({ 
        title: "Eşleşme Tamamlandı", 
        description: `${matchCount} potansiyel eşleşme bulundu.` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const dreams = dreamsData?.dreams || [];
  const dejavuEntries = dejavuData?.entries || [];
  const stats = statsData?.stats;

  // Prepare time series data for chart
  const timeSeriesData = useMemo(() => {
    const dataMap = new Map<string, { 
      date: string; 
      dreamIntensitySum: number; 
      dejavuFamiliaritySum: number; 
      dreamCount: number; 
      dejavuCount: number 
    }>();
    
    // Accumulate dream intensities
    dreams.forEach(dream => {
      const dateStr = new Date(dream.dreamDate).toISOString().split('T')[0];
      const existing = dataMap.get(dateStr) || { date: dateStr, dreamIntensitySum: 0, dejavuFamiliaritySum: 0, dreamCount: 0, dejavuCount: 0 };
      existing.dreamIntensitySum += dream.intensity;
      existing.dreamCount += 1;
      dataMap.set(dateStr, existing);
    });
    
    // Accumulate dejavu familiarities
    dejavuEntries.forEach(dejavu => {
      const dateStr = new Date(dejavu.entryDate).toISOString().split('T')[0];
      const existing = dataMap.get(dateStr) || { date: dateStr, dreamIntensitySum: 0, dejavuFamiliaritySum: 0, dreamCount: 0, dejavuCount: 0 };
      existing.dejavuFamiliaritySum += dejavu.familiarity;
      existing.dejavuCount += 1;
      dataMap.set(dateStr, existing);
    });
    
    // Sort by date, compute averages, and format
    return Array.from(dataMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        date: new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        dreamIntensity: item.dreamCount > 0 ? Math.round((item.dreamIntensitySum / item.dreamCount) * 10) / 10 : null,
        dejavuFamiliarity: item.dejavuCount > 0 ? Math.round((item.dejavuFamiliaritySum / item.dejavuCount) * 10) / 10 : null,
        dreamCount: item.dreamCount,
        dejavuCount: item.dejavuCount,
      }));
  }, [dreams, dejavuEntries]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg shadow-primary/25">
              <Moon className="h-6 w-6 text-primary-foreground" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Rüya Analizi</h1>
              <p className="text-muted-foreground text-sm">
                Rüyalarınızı ve DejaVu deneyimlerinizi kaydedin, AI ile bağlantıları keşfedin
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Moon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-total-dreams">{stats.totalDreams}</p>
                    <p className="text-xs text-muted-foreground">Toplam Rüya</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="stat-total-dejavu">{stats.totalDejavu}</p>
                    <p className="text-xs text-muted-foreground">Toplam DejaVu</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Zap className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.avgDreamIntensity}</p>
                    <p className="text-xs text-muted-foreground">Ort. Rüya Yoğunluğu</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <Eye className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.avgDejavuFamiliarity}</p>
                    <p className="text-xs text-muted-foreground">Ort. DejaVu Aşinalığı</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Time Series Chart */}
        {timeSeriesData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Zaman Serisi Analizi
              </CardTitle>
              <CardDescription>
                Rüya yoğunluğu ve DejaVu aşinalığı zaman içindeki değişimi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      tick={{ fontSize: 11 }} 
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="dreamIntensity" 
                      name="Rüya Yoğunluğu"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                      connectNulls
                    />
                    <Line 
                      type="monotone" 
                      dataKey="dejavuFamiliarity" 
                      name="DejaVu Aşinalığı"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ fill: '#a855f7' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Rüya yoğunluğu arttığında bilinçaltı daha aktif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span>DejaVu patternleri bilinçaltı mesajların göstergesi</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dreams" className="flex items-center gap-2" data-testid="tab-dreams">
              <Moon className="h-4 w-4" />
              <span>Rüya Kaydı</span>
            </TabsTrigger>
            <TabsTrigger value="dejavu" className="flex items-center gap-2" data-testid="tab-dejavu">
              <Sparkles className="h-4 w-4" />
              <span>DejaVu Kaydı</span>
            </TabsTrigger>
            <TabsTrigger value="find" className="flex items-center gap-2" data-testid="tab-find">
              <Search className="h-4 w-4" />
              <span>DejaVu Bul</span>
            </TabsTrigger>
            <TabsTrigger value="match" className="flex items-center gap-2" data-testid="tab-match">
              <Brain className="h-4 w-4" />
              <span>Eşleşme</span>
            </TabsTrigger>
          </TabsList>

          {/* Dreams Tab */}
          <TabsContent value="dreams" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enhanced Dream Form */}
              <EnhancedDreamForm />

              {/* Dream History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    Rüya Geçmişi
                  </CardTitle>
                  <CardDescription>
                    Kaydettiğiniz rüyalar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {loadingDreams ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : dreams.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Moon className="h-12 w-12 mb-2 opacity-20" />
                        <p>Henüz rüya kaydı yok</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dreams.map((dream) => (
                          <Card 
                            key={dream.id} 
                            className={`cursor-pointer transition-all hover-elevate ${
                              selectedDream?.id === dream.id ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => setSelectedDream(dream)}
                            data-testid={`card-dream-${dream.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{dream.title}</h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                    {dream.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge variant="secondary" className="text-xs">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {getLocationLabel(dream.location)}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      <Heart className="h-3 w-3 mr-1" />
                                      {getEmotionLabel(dream.emotion)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      <Zap className="h-3 w-3 mr-1" />
                                      {dream.intensity}/10
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(dream.dreamDate)}
                                  </p>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDreamMutation.mutate(dream.id);
                                  }}
                                  data-testid={`button-delete-dream-${dream.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* DejaVu Likelihood Card - Shows when a dream is selected */}
            {selectedDream && (
              <Card className="mt-4" data-testid="card-dejavu-likelihood">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    DejaVu Olasılık Analizi
                  </CardTitle>
                  <CardDescription>
                    "{selectedDream.title}" rüyasının gelecekte DejaVu tetikleme olasılığı
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingLikelihood ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Analiz ediliyor...</span>
                    </div>
                  ) : likelihoodData?.likelihood ? (
                    <div className="space-y-4">
                      {/* Main Score */}
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-full ${
                            likelihoodData.likelihood.riskLevel === 'high' ? 'bg-red-500/20' :
                            likelihoodData.likelihood.riskLevel === 'medium' ? 'bg-amber-500/20' :
                            'bg-green-500/20'
                          }`}>
                            <Target className={`h-6 w-6 ${
                              likelihoodData.likelihood.riskLevel === 'high' ? 'text-red-500' :
                              likelihoodData.likelihood.riskLevel === 'medium' ? 'text-amber-500' :
                              'text-green-500'
                            }`} />
                          </div>
                          <div>
                            <p className="text-3xl font-bold">%{likelihoodData.likelihood.score}</p>
                            <p className="text-sm text-muted-foreground">DejaVu Olasılığı</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-sm px-3 py-1 ${
                            likelihoodData.likelihood.riskLevel === 'high' ? 'border-red-500 text-red-500' :
                            likelihoodData.likelihood.riskLevel === 'medium' ? 'border-amber-500 text-amber-500' :
                            'border-green-500 text-green-500'
                          }`}
                        >
                          {likelihoodData.likelihood.riskLevel === 'high' ? 'Yüksek Risk' :
                           likelihoodData.likelihood.riskLevel === 'medium' ? 'Orta Risk' : 'Düşük Risk'}
                        </Badge>
                      </div>

                      {/* Score Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Emotional Intensity */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Activity className="h-4 w-4 text-pink-500" />
                            <span className="text-muted-foreground">Duygusal Yoğunluk</span>
                          </div>
                          <Progress 
                            value={likelihoodData.likelihood.emotionalIntensity * 100} 
                            className="h-2"
                          />
                          <p className="text-xs text-right text-muted-foreground">
                            %{Math.round(likelihoodData.likelihood.emotionalIntensity * 100)}
                          </p>
                        </div>

                        {/* Novelty Score */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Lightbulb className="h-4 w-4 text-cyan-500" />
                            <span className="text-muted-foreground">Benzersizlik</span>
                          </div>
                          <Progress 
                            value={likelihoodData.likelihood.noveltyScore * 100} 
                            className="h-2"
                          />
                          <p className="text-xs text-right text-muted-foreground">
                            %{Math.round(likelihoodData.likelihood.noveltyScore * 100)}
                          </p>
                        </div>

                        {/* Repetition Score */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Repeat className="h-4 w-4 text-purple-500" />
                            <span className="text-muted-foreground">Tekrar Skoru</span>
                          </div>
                          <Progress 
                            value={likelihoodData.likelihood.repetitionScore * 100} 
                            className="h-2"
                          />
                          <p className="text-xs text-right text-muted-foreground">
                            %{Math.round(likelihoodData.likelihood.repetitionScore * 100)}
                          </p>
                        </div>
                      </div>

                      {/* Key Motifs with Risk Bars */}
                      {likelihoodData.likelihood.motifRiskScores.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Tag className="h-4 w-4 text-amber-500" />
                            <span>Tespit Edilen Motifler</span>
                          </div>
                          <div className="space-y-2">
                            {likelihoodData.likelihood.motifRiskScores.map((motif, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                <Badge variant="secondary" className="min-w-[100px] justify-center">
                                  {motif.motif}
                                </Badge>
                                <div className="flex-1">
                                  <Progress 
                                    value={motif.risk * 100} 
                                    className={`h-2 ${
                                      motif.risk >= 0.8 ? '[&>div]:bg-red-500' :
                                      motif.risk >= 0.6 ? '[&>div]:bg-amber-500' :
                                      '[&>div]:bg-green-500'
                                    }`}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  %{Math.round(motif.risk * 100)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pattern Notes */}
                      {likelihoodData.likelihood.patternNotes && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">AI Değerlendirmesi</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {likelihoodData.likelihood.patternNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mb-2 opacity-20" />
                      <p>Olasılık analizi yapılamadı</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* DejaVu Tab */}
          <TabsContent value="dejavu" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DejaVu Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Yeni DejaVu Kaydet
                  </CardTitle>
                  <CardDescription>
                    DejaVu deneyiminizin detaylarını girin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...dejavuForm}>
                    <form onSubmit={dejavuForm.handleSubmit((data) => createDejavuMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={dejavuForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>DejaVu Açıklaması</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="DejaVu deneyiminizi detaylı olarak anlatın..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="input-dejavu-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={dejavuForm.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mekan</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-dejavu-location">
                                    <SelectValue placeholder="Mekan seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {locations.map((loc) => (
                                    <SelectItem key={loc.value} value={loc.value}>
                                      {loc.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={dejavuForm.control}
                          name="emotion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duygu</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-dejavu-emotion">
                                    <SelectValue placeholder="Duygu seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {emotions.map((emo) => (
                                    <SelectItem key={emo.value} value={emo.value}>
                                      {emo.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={dejavuForm.control}
                        name="triggerContext"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tetikleyici Bağlam</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="DejaVu'yu ne tetikledi?"
                                {...field}
                                data-testid="input-dejavu-trigger"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dejavuForm.control}
                        name="familiarity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aşinalık: {field.value}/10</FormLabel>
                            <FormControl>
                              <Slider
                                min={1}
                                max={10}
                                step={1}
                                value={[field.value]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                                className="py-4"
                                data-testid="slider-dejavu-familiarity"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dejavuForm.control}
                        name="entryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tarih</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                data-testid="input-dejavu-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={createDejavuMutation.isPending}
                        data-testid="button-save-dejavu"
                      >
                        {createDejavuMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Kaydediliyor...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            DejaVu Kaydet
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* DejaVu History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    DejaVu Geçmişi
                  </CardTitle>
                  <CardDescription>
                    Kaydettiğiniz DejaVu deneyimleri
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {loadingDejavu ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : dejavuEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                        <Sparkles className="h-12 w-12 mb-2 opacity-20" />
                        <p>Henüz DejaVu kaydı yok</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dejavuEntries.map((entry) => (
                          <Card 
                            key={entry.id} 
                            className={`cursor-pointer transition-all hover-elevate ${
                              selectedDejavu?.id === entry.id ? 'ring-2 ring-purple-500' : ''
                            }`}
                            onClick={() => setSelectedDejavu(entry)}
                            data-testid={`card-dejavu-${entry.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm line-clamp-3">
                                    {entry.description}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge variant="secondary" className="text-xs">
                                      <MapPin className="h-3 w-3 mr-1" />
                                      {getLocationLabel(entry.location)}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      <Heart className="h-3 w-3 mr-1" />
                                      {getEmotionLabel(entry.emotion)}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      <Eye className="h-3 w-3 mr-1" />
                                      {entry.familiarity}/10
                                    </Badge>
                                  </div>
                                  {entry.triggerContext && (
                                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                      <Tag className="h-3 w-3" />
                                      {entry.triggerContext}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(entry.entryDate)}
                                  </p>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDejavuMutation.mutate(entry.id);
                                  }}
                                  data-testid={`button-delete-dejavu-${entry.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Find DejaVu Tab - Rüyadan DejaVu Bul */}
          <TabsContent value="find" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Rüyadan DejaVu Bul
                </CardTitle>
                <CardDescription>
                  Bir rüya seçin ve kayıtlı DejaVu deneyimleri arasında eşleşenları bulun
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dream Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Rüya Seçin</h4>
                  <Select
                    value={findSelectedDreamId || ""}
                    onValueChange={(value) => setFindSelectedDreamId(value)}
                  >
                    <SelectTrigger className="w-full" data-testid="select-find-dream">
                      <SelectValue placeholder="Rüya seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dreamsData?.dreams?.map((dream) => (
                        <SelectItem key={dream.id} value={dream.id}>
                          <div className="flex items-center gap-2">
                            <Moon className="h-3 w-3 text-primary" />
                            <span>{dream.title}</span>
                            <span className="text-muted-foreground text-xs">
                              ({formatDate(dream.dreamDate)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Loading State */}
                {loadingSuggestions && findSelectedDreamId && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">DejaVu eşleşmeleri aranıyor...</span>
                  </div>
                )}

                {/* No Dream Selected */}
                {!findSelectedDreamId && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Moon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Eşleşmeleri görmek için yukarıdan bir rüya seçin</p>
                  </div>
                )}

                {/* Suggestions Results */}
                {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        "{suggestionsData.dreamTitle}" için Eşleşen DejaVu'lar
                      </h4>
                      <Badge variant="outline">
                        {suggestionsData.suggestions.length} / {suggestionsData.totalDejavus} eşleşme
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {suggestionsData.suggestions.map((suggestion) => (
                        <Card 
                          key={suggestion.dejavuId} 
                          className={`hover-elevate cursor-pointer ${
                            suggestion.connectionStrength === 'güçlü' 
                              ? 'border-green-500/30' 
                              : suggestion.connectionStrength === 'orta' 
                                ? 'border-yellow-500/30' 
                                : 'border-muted'
                          }`}
                          data-testid={`card-suggestion-${suggestion.rank}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  className={`${
                                    suggestion.rank === 1 
                                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                                      : suggestion.rank === 2 
                                        ? 'bg-gray-300/20 text-gray-300 border-gray-300/30'
                                        : suggestion.rank === 3
                                          ? 'bg-amber-600/20 text-amber-500 border-amber-500/30'
                                          : 'bg-muted'
                                  }`}
                                >
                                  #{suggestion.rank}
                                </Badge>
                                <Badge 
                                  variant="outline"
                                  className={`${
                                    suggestion.similarity >= 70 
                                      ? 'text-green-400 border-green-500/30' 
                                      : suggestion.similarity >= 50 
                                        ? 'text-yellow-400 border-yellow-500/30' 
                                        : 'text-orange-400 border-orange-500/30'
                                  }`}
                                >
                                  %{suggestion.similarity} Benzerlik
                                </Badge>
                                <Badge 
                                  variant="outline"
                                  className={`text-xs ${
                                    suggestion.connectionStrength === 'güçlü'
                                      ? 'text-green-400 border-green-500/30'
                                      : suggestion.connectionStrength === 'orta'
                                        ? 'text-yellow-400 border-yellow-500/30'
                                        : 'text-muted-foreground'
                                  }`}
                                >
                                  {suggestion.connectionStrength === 'güçlü' ? 'Güçlü Bağ' :
                                   suggestion.connectionStrength === 'orta' ? 'Orta Bağ' : 'Zayıf Bağ'}
                                </Badge>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {suggestion.daysBetween === 0 ? 'Aynı gün' : `${suggestion.daysBetween} gün`}
                              </Badge>
                            </div>

                            <p className="text-sm line-clamp-2 mb-3">
                              {suggestion.dejavu.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {suggestion.emotionMatch && (
                                <Badge variant="secondary" className="text-xs">
                                  <Heart className="h-3 w-3 mr-1 text-pink-400" />
                                  Aynı duygu
                                </Badge>
                              )}
                              {suggestion.locationMatch && (
                                <Badge variant="secondary" className="text-xs">
                                  <MapPin className="h-3 w-3 mr-1 text-blue-400" />
                                  Aynı mekan
                                </Badge>
                              )}
                              {suggestion.sharedMotifs.map((motif) => (
                                <Badge 
                                  key={motif} 
                                  className="text-xs bg-primary/20 text-primary border-primary/30"
                                >
                                  {motif}
                                </Badge>
                              ))}
                            </div>

                            <p className="text-xs text-muted-foreground italic">
                              <Lightbulb className="h-3 w-3 inline mr-1" />
                              {suggestion.briefSummary}
                            </p>

                            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-muted">
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {getLocationLabel(suggestion.dejavu.location)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Heart className="h-3 w-3 mr-1" />
                                {getEmotionLabel(suggestion.dejavu.emotion)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                {suggestion.dejavu.familiarity}/10
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {formatDate(suggestion.dejavu.entryDate)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Matches Found */}
                {suggestionsData && suggestionsData.suggestions.length === 0 && findSelectedDreamId && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Bu rüya için eşleşen DejaVu bulunamadı</p>
                    <p className="text-xs mt-2">DejaVu kaydı ekleyerek eşleşme şansını artırabilirsiniz</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Match Analysis Tab */}
          <TabsContent value="match" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Selection Panel */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Eşleşme Seçimi
                  </CardTitle>
                  <CardDescription>
                    Analiz için bir rüya veya DejaVu seçin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Seçili Rüya</h4>
                    {selectedDream ? (
                      <Card className="bg-muted/50">
                        <CardContent className="p-3">
                          <p className="font-medium text-sm">{selectedDream.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {selectedDream.description}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto mt-2 text-primary"
                            onClick={() => setSelectedDream(null)}
                          >
                            Seçimi Kaldır
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Rüya Kaydı sekmesinden bir rüya seçin
                      </p>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Seçili DejaVu</h4>
                    {selectedDejavu ? (
                      <Card className="bg-muted/50">
                        <CardContent className="p-3">
                          <p className="text-sm line-clamp-3">{selectedDejavu.description}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto mt-2 text-primary"
                            onClick={() => setSelectedDejavu(null)}
                          >
                            Seçimi Kaldır
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        DejaVu Kaydı sekmesinden bir kayıt seçin
                      </p>
                    )}
                  </div>

                  <Separator />

                  <Button
                    className="w-full"
                    disabled={matchMutation.isPending || (!selectedDream && !selectedDejavu)}
                    onClick={() => {
                      matchMutation.mutate({
                        dreamId: selectedDream?.id,
                        dejavuId: selectedDejavu?.id,
                      });
                    }}
                    data-testid="button-find-matches"
                  >
                    {matchMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analiz Ediliyor...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Eşleşmeleri Bul
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={matchMutation.isPending}
                    onClick={() => {
                      matchMutation.mutate({});
                    }}
                    data-testid="button-find-all-matches"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Tüm Eşleşmeleri Bul
                  </Button>
                </CardContent>
              </Card>

              {/* Results Panel */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Eşleşme Sonuçları
                  </CardTitle>
                  <CardDescription>
                    AI tarafından bulunan rüya-DejaVu bağlantıları
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {matchMutation.isPending ? (
                    <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                      <Loader2 className="h-12 w-12 animate-spin mb-4" />
                      <p>Hugging Face AI ile analiz ediliyor...</p>
                      <p className="text-xs mt-1">Semantik benzerlikler hesaplanıyor</p>
                    </div>
                  ) : (matchMutation.data?.matches?.length ?? 0) > 0 ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-4">
                        {(matchMutation.data?.matches ?? []).map((match: any, index: number) => (
                          <Card key={index} className="hover-elevate" data-testid={`card-match-${index}`}>
                            <CardContent className="p-4">
                              {/* Header with rank and scores */}
                              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="text-xs">
                                    #{index + 1}
                                  </Badge>
                                  <Badge 
                                    variant="secondary"
                                    className={`${
                                      match.similarityScore >= 0.7 ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                                      match.similarityScore >= 0.5 ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                                      'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                                    }`}
                                  >
                                    %{Math.round(match.similarityScore * 100)} Benzerlik
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  {match.enhancedAnalysis?.daysBetween !== undefined && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {match.enhancedAnalysis.daysBetween === 0 ? 'Aynı gün' : `${match.enhancedAnalysis.daysBetween} gün`}
                                    </Badge>
                                  )}
                                  {match.enhancedAnalysis?.connectionStrength && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        match.enhancedAnalysis.connectionStrength === 'güçlü' ? 'border-green-500 text-green-600' :
                                        match.enhancedAnalysis.connectionStrength === 'orta' ? 'border-yellow-500 text-yellow-600' :
                                        'border-orange-500 text-orange-600'
                                      }`}
                                    >
                                      {match.enhancedAnalysis.connectionStrength === 'güçlü' ? 'Güçlü Bağ' :
                                       match.enhancedAnalysis.connectionStrength === 'orta' ? 'Orta Bağ' : 'Zayıf Bağ'}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Dream and DejaVu comparison */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Moon className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">Rüya</span>
                                  </div>
                                  <h4 className="font-medium text-sm">{match.dream.title}</h4>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                    {match.dream.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(match.dream.dreamDate)}
                                  </p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    <span className="text-sm font-medium">DejaVu</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {match.dejavu.description}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(match.dejavu.entryDate)}
                                  </p>
                                </div>
                              </div>

                              {/* Common Motifs */}
                              {match.enhancedAnalysis?.commonMotifs?.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Tag className="h-4 w-4 text-cyan-500" />
                                    <span className="text-xs font-medium text-muted-foreground">Ortak Motifler</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {match.enhancedAnalysis.commonMotifs.map((motif: string, i: number) => (
                                      <Badge key={i} variant="secondary" className="text-xs bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
                                        {motif}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* AI Analysis Summary */}
                              {match.analysisNotes && (
                                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Brain className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-medium">AI Yorumu</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {match.analysisNotes}
                                  </p>
                                </div>
                              )}

                              {/* Enhanced Analysis Details */}
                              {match.enhancedAnalysis && (
                                <div className="mt-3 space-y-2">
                                  {match.enhancedAnalysis.emotionalConnection && (
                                    <div className="flex items-start gap-2">
                                      <Heart className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium">Duygusal Bağ:</span> {match.enhancedAnalysis.emotionalConnection}
                                      </p>
                                    </div>
                                  )}
                                  {match.enhancedAnalysis.timeDimensionInsight && (
                                    <div className="flex items-start gap-2">
                                      <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium">Zaman Boyutu:</span> {match.enhancedAnalysis.timeDimensionInsight}
                                      </p>
                                    </div>
                                  )}
                                  {match.enhancedAnalysis.predictiveNote && (
                                    <div className="flex items-start gap-2">
                                      <Eye className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium">Öngörü:</span> {match.enhancedAnalysis.predictiveNote}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Progress bar */}
                              <div className="mt-3">
                                <Progress 
                                  value={match.similarityScore * 100} 
                                  className="h-2"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                      <Brain className="h-12 w-12 mb-2 opacity-20" />
                      <p>Henüz eşleşme analizi yapılmadı</p>
                      <p className="text-xs mt-1">Rüya veya DejaVu seçerek analiz başlatın</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
