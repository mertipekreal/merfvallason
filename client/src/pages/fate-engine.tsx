import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  User, 
  Brain, 
  Zap, 
  Moon, 
  Target, 
  TrendingUp,
  Plus,
  Play,
  Trash2,
  Calendar,
  Star,
  Activity,
  Eye,
  Loader2,
  Database,
  Search,
  BarChart3
} from "lucide-react";

interface Skill {
  name: string;
  proficiency: number;
  resonanceFrequency: number;
  masteryLevel: number;
  yearsPracticed: number;
  isInnate: boolean;
}

interface HumanProfile {
  id: string;
  name: string;
  birthDate: string;
  personalityType: string;
  baseScore: number;
  potentialCeiling: number;
  resilienceFactor: number;
  currentConsciousness: number;
  skills: Skill[];
}

interface SimulationResult {
  fateScore: number;
  fateTrajectory: string;
  consciousnessLevel: number;
  synchronizationType: number;
  synchronicityMatches: Array<{
    event: string;
    symbol: string;
    similarity: number;
    timeDelta: number;
  }>;
  dreamAnalysis: {
    energySignature: number;
    isProphetic: boolean;
    interpretation: string;
  };
  butterflyEffects: string[];
  recommendations: string[];
}

interface GlobalDreamMatch {
  dreamId: string;
  title: string;
  matchedThemes: string[];
  matchedObjects: string[];
  emotion: string;
  similarity: number;
  dreamerInfo?: string;
  source: string;
}

interface DreamPatternStats {
  totalDreams: number;
  themeFrequency: Record<string, number>;
  emotionDistribution: Record<string, number>;
  objectFrequency: Record<string, number>;
  avgIntensity: number;
}

interface CollectiveDreamInsight {
  matchingDreams: GlobalDreamMatch[];
  patternStats: DreamPatternStats;
  collectiveThemes: string[];
  synchronicityScore: number;
  archetypeMatches: string[];
}

function ConsciousnessLevelBadge({ level }: { level: number }) {
  const getName = () => {
    if (level <= 0.2) return { name: 'NPC', color: 'bg-gray-500' };
    if (level <= 0.4) return { name: 'Uyanış', color: 'bg-yellow-500' };
    if (level <= 0.6) return { name: 'Oyuncu', color: 'bg-blue-500' };
    if (level <= 0.85) return { name: 'Mimar', color: 'bg-purple-500' };
    return { name: 'Yükseltilmiş', color: 'bg-cyan-500' };
  };
  const { name, color } = getName();
  return <Badge className={color}>{name}</Badge>;
}

function FateTrajectoryBadge({ trajectory }: { trajectory: string }) {
  const getColor = () => {
    switch (trajectory) {
      case 'Yükselen Kader': return 'bg-green-500';
      case 'Olumlu Akış': return 'bg-blue-500';
      case 'Dengeli Yol': return 'bg-yellow-500';
      case 'Zorlayıcı Dönem': return 'bg-orange-500';
      case 'Karanlık Gece': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  return <Badge className={getColor()}>{trajectory}</Badge>;
}

export default function FateEnginePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profiles");
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Form states
  const [newProfile, setNewProfile] = useState({
    name: "",
    birthDate: "",
    personalityType: "INTJ",
    socioeconomicLevel: 5,
    parentalSupport: 5,
    culturalEntropy: 5,
    geographicalAdvantage: 5,
    healthBaseline: 7,
  });

  const [dreamState, setDreamState] = useState({
    lucidityLevel: 0.5,
    vividness: 0.5,
    symbolDensity: 0.5,
    dejavuIntensity: 0.3,
    precognitionSignal: 0.2,
    emotionalCharge: 0,
    dreamSymbols: "",
  });

  const [newSkill, setNewSkill] = useState({
    name: "",
    proficiency: 0.5,
    masteryLevel: 5,
    yearsPracticed: 1,
    isInnate: false,
  });

  const [skills, setSkills] = useState<Skill[]>([]);

  // Queries
  const { data: profiles = [], isLoading: profilesLoading } = useQuery<HumanProfile[]>({
    queryKey: ["/api/fate-engine/profiles"],
  });

  const { data: stats } = useQuery<{
    profiles: number;
    simulations: number;
    lifeEvents: number;
    dreams: number;
  }>({
    queryKey: ["/api/fate-engine/stats"],
  });

  const { data: simulations = [] } = useQuery({
    queryKey: ["/api/fate-engine/simulations", selectedProfile],
    enabled: !!selectedProfile,
  });

  // Global Dream Database Queries
  const { data: dreamStats, isLoading: dreamStatsLoading } = useQuery<DreamPatternStats>({
    queryKey: ["/api/fate-engine/dreams/stats"],
  });

  const [dreamSearchTerms, setDreamSearchTerms] = useState("");
  const [collectiveInsight, setCollectiveInsight] = useState<CollectiveDreamInsight | null>(null);

  const searchDreamsMutation = useMutation({
    mutationFn: async (symbols: string[]) => {
      const res = await apiRequest("POST", "/api/fate-engine/dreams/synchronicity", { symbols, emotion: "neutral" });
      return res.json();
    },
    onSuccess: (data) => {
      setCollectiveInsight(data);
      toast({ title: "Analiz tamamlandı", description: `${data.matchingDreams?.length || 0} eşleşen rüya bulundu.` });
    },
    onError: () => {
      toast({ title: "Hata", description: "Rüya araması başarısız.", variant: "destructive" });
    },
  });

  const handleSearchDreams = () => {
    const symbols = dreamSearchTerms.split(",").map(s => s.trim()).filter(Boolean);
    if (symbols.length === 0) {
      toast({ title: "Hata", description: "En az bir sembol girin.", variant: "destructive" });
      return;
    }
    searchDreamsMutation.mutate(symbols);
  };

  // Mutations
  const createProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/fate-engine/profiles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fate-engine/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fate-engine/stats"] });
      toast({ title: "Profil oluşturuldu", description: "İnsan CV başarıyla kaydedildi." });
      setNewProfile({
        name: "",
        birthDate: "",
        personalityType: "INTJ",
        socioeconomicLevel: 5,
        parentalSupport: 5,
        culturalEntropy: 5,
        geographicalAdvantage: 5,
        healthBaseline: 7,
      });
      setSkills([]);
    },
    onError: () => {
      toast({ title: "Hata", description: "Profil oluşturulamadı.", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/fate-engine/profiles/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fate-engine/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fate-engine/stats"] });
      if (selectedProfile) setSelectedProfile(null);
      toast({ title: "Profil silindi" });
    },
  });

  const runSimulationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/fate-engine/simulate", data);
      return res.json();
    },
    onSuccess: (data) => {
      setSimulationResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/fate-engine/simulations", selectedProfile] });
      queryClient.invalidateQueries({ queryKey: ["/api/fate-engine/stats"] });
      toast({ title: "Simülasyon tamamlandı", description: `Kader Skoru: ${data.fateScore.toFixed(1)}` });
    },
    onError: () => {
      toast({ title: "Hata", description: "Simülasyon çalıştırılamadı.", variant: "destructive" });
    },
  });

  const handleCreateProfile = () => {
    if (!newProfile.name || !newProfile.birthDate) {
      toast({ title: "Hata", description: "İsim ve doğum tarihi gerekli.", variant: "destructive" });
      return;
    }
    createProfileMutation.mutate({
      ...newProfile,
      skills: skills.map(s => ({
        ...s,
        resonanceFrequency: 0.5,
      })),
    });
  };

  const handleAddSkill = () => {
    if (!newSkill.name) return;
    setSkills([...skills, { ...newSkill, resonanceFrequency: 0.5 }]);
    setNewSkill({
      name: "",
      proficiency: 0.5,
      masteryLevel: 5,
      yearsPracticed: 1,
      isInnate: false,
    });
  };

  const handleRunSimulation = () => {
    if (!selectedProfile) {
      toast({ title: "Hata", description: "Önce bir profil seçin.", variant: "destructive" });
      return;
    }
    runSimulationMutation.mutate({
      profileId: selectedProfile,
      ...dreamState,
      dreamSymbols: dreamState.dreamSymbols.split(",").map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              Kader Motoru v2.0
            </h1>
            <p className="text-muted-foreground mt-1">
              Gelişmiş Simülasyon & Sinkronizasyon Sistemi
            </p>
          </div>
          <div className="flex gap-4">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-medium">{stats?.profiles ?? 0}</span>
                <span className="text-muted-foreground text-sm">Profil</span>
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="font-medium">{stats?.simulations ?? 0}</span>
                <span className="text-muted-foreground text-sm">Simülasyon</span>
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{stats?.dreams ?? 0}</span>
                <span className="text-muted-foreground text-sm">Rüya</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profiles" className="flex items-center gap-2" data-testid="tab-profiles">
              <User className="w-4 h-4" />
              İnsan CV
            </TabsTrigger>
            <TabsTrigger value="dreams" className="flex items-center gap-2" data-testid="tab-dreams">
              <Database className="w-4 h-4" />
              Global Rüya
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex items-center gap-2" data-testid="tab-simulation">
              <Brain className="w-4 h-4" />
              Simülasyon
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2" data-testid="tab-results">
              <TrendingUp className="w-4 h-4" />
              Sonuçlar
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
              <Calendar className="w-4 h-4" />
              Geçmiş
            </TabsTrigger>
          </TabsList>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Profile Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Yeni Profil Oluştur
                  </CardTitle>
                  <CardDescription>
                    Kader simülasyonu için kişisel profil tanımlayın
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>İsim</Label>
                      <Input 
                        value={newProfile.name}
                        onChange={(e) => setNewProfile({...newProfile, name: e.target.value})}
                        placeholder="Ahmet Yılmaz"
                        data-testid="input-profile-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Doğum Tarihi</Label>
                      <Input 
                        type="date"
                        value={newProfile.birthDate}
                        onChange={(e) => setNewProfile({...newProfile, birthDate: e.target.value})}
                        data-testid="input-profile-birthdate"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Kişilik Tipi (MBTI)</Label>
                    <Input 
                      value={newProfile.personalityType}
                      onChange={(e) => setNewProfile({...newProfile, personalityType: e.target.value.toUpperCase()})}
                      placeholder="INTJ"
                      maxLength={4}
                      data-testid="input-personality"
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Kökensel Faktörler (0-10)</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Sosyoekonomik Seviye</Label>
                        <span className="text-sm font-medium">{newProfile.socioeconomicLevel}</span>
                      </div>
                      <Slider 
                        value={[newProfile.socioeconomicLevel]}
                        onValueChange={([v]) => setNewProfile({...newProfile, socioeconomicLevel: v})}
                        min={0} max={10} step={1}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Aile Desteği</Label>
                        <span className="text-sm font-medium">{newProfile.parentalSupport}</span>
                      </div>
                      <Slider 
                        value={[newProfile.parentalSupport]}
                        onValueChange={([v]) => setNewProfile({...newProfile, parentalSupport: v})}
                        min={0} max={10} step={1}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Kültürel Entropi (Baskı)</Label>
                        <span className="text-sm font-medium">{newProfile.culturalEntropy}</span>
                      </div>
                      <Slider 
                        value={[newProfile.culturalEntropy]}
                        onValueChange={([v]) => setNewProfile({...newProfile, culturalEntropy: v})}
                        min={0} max={10} step={1}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Coğrafi Avantaj</Label>
                        <span className="text-sm font-medium">{newProfile.geographicalAdvantage}</span>
                      </div>
                      <Slider 
                        value={[newProfile.geographicalAdvantage]}
                        onValueChange={([v]) => setNewProfile({...newProfile, geographicalAdvantage: v})}
                        min={0} max={10} step={1}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Sağlık Temeli</Label>
                        <span className="text-sm font-medium">{newProfile.healthBaseline}</span>
                      </div>
                      <Slider 
                        value={[newProfile.healthBaseline]}
                        onValueChange={([v]) => setNewProfile({...newProfile, healthBaseline: v})}
                        min={0} max={10} step={1}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Skills */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Yetenekler</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        value={newSkill.name}
                        onChange={(e) => setNewSkill({...newSkill, name: e.target.value})}
                        placeholder="Yetenek adı"
                      />
                      <Button onClick={handleAddSkill} variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-1" /> Ekle
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="flex items-center gap-1">
                          {skill.name}
                          <button onClick={() => setSkills(skills.filter((_, j) => j !== i))}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateProfile} 
                    className="w-full"
                    disabled={createProfileMutation.isPending}
                    data-testid="button-create-profile"
                  >
                    {createProfileMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Profil Oluştur
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Profiles */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Mevcut Profiller
                  </CardTitle>
                  <CardDescription>
                    Simülasyon için bir profil seçin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {profilesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : profiles.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Henüz profil yok. Sol taraftan yeni profil oluşturun.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {profiles.map((profile) => (
                          <Card 
                            key={profile.id}
                            className={`cursor-pointer transition-colors hover-elevate ${
                              selectedProfile === profile.id ? 'border-primary' : ''
                            }`}
                            onClick={() => setSelectedProfile(profile.id)}
                            data-testid={`card-profile-${profile.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{profile.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {profile.personalityType} • Temel Skor: {profile.baseScore?.toFixed(0) ?? 'N/A'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ConsciousnessLevelBadge level={profile.currentConsciousness ?? 0.6} />
                                  <Button 
                                    size="icon" 
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteProfileMutation.mutate(profile.id);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
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

          {/* Global Dreams Tab */}
          <TabsContent value="dreams" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Dream Search */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Kolektif Rüya Analizi
                  </CardTitle>
                  <CardDescription>
                    Global rüya veritabanında sembol ve tema araması yapın
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Semboller (virgülle ayırın)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={dreamSearchTerms}
                        onChange={(e) => setDreamSearchTerms(e.target.value)}
                        placeholder="su, uçmak, düşmek, ev, hayvan..."
                        className="flex-1"
                        data-testid="input-dream-search"
                      />
                      <Button 
                        onClick={handleSearchDreams}
                        disabled={searchDreamsMutation.isPending}
                        data-testid="button-search-dreams"
                      >
                        {searchDreamsMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Örnek: water, flying, death, falling, lost, house, animal
                    </p>
                  </div>

                  {collectiveInsight && (
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-1">Sinkronizasyon Skoru</p>
                          <p className="text-3xl font-bold text-purple-500">
                            {(collectiveInsight.synchronicityScore * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-xl p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-1">Eşleşen Rüya</p>
                          <p className="text-3xl font-bold">
                            {collectiveInsight.matchingDreams?.length || 0}
                          </p>
                        </div>
                      </div>

                      {collectiveInsight.archetypeMatches && collectiveInsight.archetypeMatches.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Tespit Edilen Arketipler
                          </h4>
                          <div className="space-y-2">
                            {collectiveInsight.archetypeMatches.map((archetype, i) => (
                              <div key={i} className="bg-muted/30 rounded-lg p-3 text-sm">
                                {archetype}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {collectiveInsight.matchingDreams && collectiveInsight.matchingDreams.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Moon className="w-4 h-4" />
                            Eşleşen Rüyalar
                          </h4>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                              {collectiveInsight.matchingDreams.map((dream, i) => (
                                <Card key={i} className="bg-muted/20">
                                  <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm line-clamp-1">{dream.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <Badge variant="outline" className="text-xs">{dream.emotion}</Badge>
                                          <Badge variant="secondary" className="text-xs">{dream.source}</Badge>
                                          {dream.dreamerInfo && (
                                            <span className="text-xs text-muted-foreground">{dream.dreamerInfo}</span>
                                          )}
                                        </div>
                                      </div>
                                      <Badge className="bg-primary/20 text-primary">
                                        {(dream.similarity * 100).toFixed(0)}%
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dream Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Rüya İstatistikleri
                  </CardTitle>
                  <CardDescription>
                    Global veritabanı analizi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dreamStatsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : dreamStats ? (
                    <div className="space-y-4">
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-sm text-muted-foreground">Toplam Rüya</p>
                        <p className="text-3xl font-bold">{dreamStats.totalDreams.toLocaleString()}</p>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm font-medium mb-2">Ortalama Yoğunluk</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2" 
                              style={{ width: `${(dreamStats.avgIntensity / 10) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{dreamStats.avgIntensity.toFixed(1)}/10</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">En Sık Temalar</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(dreamStats.themeFrequency)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8)
                            .map(([theme, count]) => (
                              <Badge key={theme} variant="outline" className="text-xs">
                                {theme} ({count})
                              </Badge>
                            ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Duygu Dağılımı</p>
                        <div className="space-y-1">
                          {Object.entries(dreamStats.emotionDistribution)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([emotion, count]) => (
                              <div key={emotion} className="flex items-center justify-between text-xs">
                                <span className="capitalize">{emotion}</span>
                                <span className="text-muted-foreground">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Rüya verisi bulunamadı
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Simulation Tab */}
          <TabsContent value="simulation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dream State Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="w-5 h-5" />
                    Rüya Durumu Yapılandırması
                  </CardTitle>
                  <CardDescription>
                    Simülasyon parametrelerini ayarlayın
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedProfile && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                      <p className="text-sm text-yellow-600">
                        Simülasyon çalıştırmak için önce "İnsan CV" sekmesinden bir profil seçin.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Lüsidite Seviyesi</Label>
                      <span className="text-sm font-medium">{(dreamState.lucidityLevel * 100).toFixed(0)}%</span>
                    </div>
                    <Slider 
                      value={[dreamState.lucidityLevel]}
                      onValueChange={([v]) => setDreamState({...dreamState, lucidityLevel: v})}
                      min={0} max={1} step={0.1}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Rüya Netliği</Label>
                      <span className="text-sm font-medium">{(dreamState.vividness * 100).toFixed(0)}%</span>
                    </div>
                    <Slider 
                      value={[dreamState.vividness]}
                      onValueChange={([v]) => setDreamState({...dreamState, vividness: v})}
                      min={0} max={1} step={0.1}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Sembol Yoğunluğu</Label>
                      <span className="text-sm font-medium">{(dreamState.symbolDensity * 100).toFixed(0)}%</span>
                    </div>
                    <Slider 
                      value={[dreamState.symbolDensity]}
                      onValueChange={([v]) => setDreamState({...dreamState, symbolDensity: v})}
                      min={0} max={1} step={0.1}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Dejavu Şiddeti</Label>
                      <span className="text-sm font-medium">{(dreamState.dejavuIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <Slider 
                      value={[dreamState.dejavuIntensity]}
                      onValueChange={([v]) => setDreamState({...dreamState, dejavuIntensity: v})}
                      min={0} max={1} step={0.1}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Önceden Görme Sinyali</Label>
                      <span className="text-sm font-medium">{(dreamState.precognitionSignal * 100).toFixed(0)}%</span>
                    </div>
                    <Slider 
                      value={[dreamState.precognitionSignal]}
                      onValueChange={([v]) => setDreamState({...dreamState, precognitionSignal: v})}
                      min={0} max={1} step={0.1}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Duygusal Yük</Label>
                      <span className="text-sm font-medium">{dreamState.emotionalCharge > 0 ? '+' : ''}{dreamState.emotionalCharge.toFixed(1)}</span>
                    </div>
                    <Slider 
                      value={[dreamState.emotionalCharge]}
                      onValueChange={([v]) => setDreamState({...dreamState, emotionalCharge: v})}
                      min={-1} max={1} step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rüya Sembolleri (virgülle ayırın)</Label>
                    <Input 
                      value={dreamState.dreamSymbols}
                      onChange={(e) => setDreamState({...dreamState, dreamSymbols: e.target.value})}
                      placeholder="su, uçmak, kaybolmak, ışık"
                      data-testid="input-dream-symbols"
                    />
                  </div>

                  <Button 
                    onClick={handleRunSimulation}
                    className="w-full"
                    disabled={!selectedProfile || runSimulationMutation.isPending}
                    data-testid="button-run-simulation"
                  >
                    {runSimulationMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Simülasyonu Çalıştır
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Seçili Profil
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedProfile ? (
                    (() => {
                      const profile = profiles.find(p => p.id === selectedProfile);
                      if (!profile) return <p className="text-muted-foreground">Profil bulunamadı</p>;
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{profile.name}</h3>
                              <p className="text-sm text-muted-foreground">{profile.personalityType}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">Temel Skor</p>
                              <p className="text-2xl font-bold">{profile.baseScore?.toFixed(0) ?? 'N/A'}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">Potansiyel Tavan</p>
                              <p className="text-2xl font-bold">{profile.potentialCeiling?.toFixed(0) ?? 'N/A'}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">Dirençlilik</p>
                              <p className="text-2xl font-bold">{profile.resilienceFactor?.toFixed(2) ?? 'N/A'}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3">
                              <p className="text-sm text-muted-foreground">Bilinç Seviyesi</p>
                              <ConsciousnessLevelBadge level={profile.currentConsciousness ?? 0.6} />
                            </div>
                          </div>

                          {profile.skills && profile.skills.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Yetenekler</p>
                              <div className="flex flex-wrap gap-2">
                                {profile.skills.map((skill: Skill, i: number) => (
                                  <Badge key={i} variant="outline">
                                    <Star className="w-3 h-3 mr-1" />
                                    {skill.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Simülasyon için bir profil seçin</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {simulationResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Result */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Simülasyon Sonucu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Kader Skoru</p>
                        <p className="text-5xl font-bold text-primary">{simulationResult.fateScore.toFixed(1)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Kader Çizgisi</p>
                        <FateTrajectoryBadge trajectory={simulationResult.fateTrajectory} />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Rüya Analizi
                      </h4>
                      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Enerji İmzası</span>
                          <span className="font-medium">{(simulationResult.dreamAnalysis.energySignature * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Kehanet Rüyası</span>
                          <Badge variant={simulationResult.dreamAnalysis.isProphetic ? "default" : "secondary"}>
                            {simulationResult.dreamAnalysis.isProphetic ? "Evet" : "Hayır"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {simulationResult.dreamAnalysis.interpretation}
                        </p>
                      </div>
                    </div>

                    {simulationResult.synchronicityMatches.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Sinkronizasyon Eşleşmeleri
                        </h4>
                        <div className="space-y-2">
                          {simulationResult.synchronicityMatches.map((match, i) => (
                            <div key={i} className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <span className="font-medium">{match.symbol}</span>
                                <span className="text-muted-foreground mx-2">→</span>
                                <span>{match.event}</span>
                              </div>
                              <Badge>{(match.similarity * 100).toFixed(0)}% uyum</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Side Panel */}
                <div className="space-y-6">
                  {/* Butterfly Effects */}
                  {simulationResult.butterflyEffects.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Kelebek Etkileri
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {simulationResult.butterflyEffects.map((effect, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {effect}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {simulationResult.recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Öneriler
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {simulationResult.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-green-500">✓</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    Henüz simülasyon çalıştırılmadı. "Simülasyon" sekmesinden başlayın.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Simülasyon Geçmişi
                </CardTitle>
                <CardDescription>
                  {selectedProfile ? "Seçili profil için geçmiş simülasyonlar" : "Bir profil seçin"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedProfile ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Geçmişi görmek için önce bir profil seçin.
                  </div>
                ) : Array.isArray(simulations) && simulations.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {simulations.map((sim: any) => (
                        <Card key={sim.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Kader Skoru: {sim.fateScore?.toFixed(1)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(sim.createdAt).toLocaleString('tr-TR')}
                                </p>
                              </div>
                              <FateTrajectoryBadge trajectory={sim.fateTrajectory} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Bu profil için henüz simülasyon yok.
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
